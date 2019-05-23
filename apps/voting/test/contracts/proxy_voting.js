const VOTER_STATE = require('../helpers/state')
const { bigExp, pct } = require('../helpers/numbers')(web3)
const getBlockNumber = require('@aragon/test-helpers/blockNumber')(web3)
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { encodeCallScript } = require('@aragon/test-helpers/evmScript')
const { decodeEventsOfType } = require('@aragon/os/test/helpers/decodeEvent')
const { getEventArgument, getNewProxyAddress } = require('@aragon/test-helpers/events')
const { assertEvent, assertAmountOfEvents } = require('@aragon/test-helpers/assertEvent')(web3)

const Voting = artifacts.require('VotingMock')
const ProxyVoting = artifacts.require('ProxyVotingMock')
const ExecutionTarget = artifacts.require('ExecutionTarget')

const ACL = artifacts.require('@aragon/os/contracts/acl/ACL')
const Kernel = artifacts.require('@aragon/os/contracts/kernel/Kernel')
const DAOFactory = artifacts.require('@aragon/os/contracts/factory/DAOFactory')
const EVMScriptRegistryFactory = artifacts.require('@aragon/os/contracts/factory/EVMScriptRegistryFactory')
const MiniMeToken = artifacts.require('@aragon/apps-shared-minime/contracts/MiniMeToken')

const ANY_ADDR = '0xffffffffffffffffffffffffffffffffffffffff'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

contract('ProxyVoting', ([_, root, holder20, holder29, holder51, anyone, anotherVoting]) => {
  let votingBase, kernelBase, aclBase, daoFactory
  let dao, acl, voting, token, executionTarget, script, voteId, holder51Proxy
  let APP_MANAGER_ROLE, CREATE_VOTES_ROLE, MODIFY_SUPPORT_ROLE, MODIFY_QUORUM_ROLE

  const NOW = 1553703809  // random fixed timestamp in seconds
  const ONE_DAY = 60 * 60 * 24
  const OVERRULE_WINDOW = ONE_DAY
  const VOTING_DURATION = ONE_DAY * 5

  const MIN_QUORUM = pct(20)
  const MIN_SUPPORT = pct(70)

  before('deploy base implementations', async () => {
    kernelBase = await Kernel.new(true) // petrify immediately
    aclBase = await ACL.new()
    const regFact = await EVMScriptRegistryFactory.new()
    daoFactory = await DAOFactory.new(kernelBase.address, aclBase.address, regFact.address)
    votingBase = await Voting.new()
  })

  before('load roles', async () => {
    APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()
    CREATE_VOTES_ROLE = await votingBase.CREATE_VOTES_ROLE()
    MODIFY_SUPPORT_ROLE = await votingBase.MODIFY_SUPPORT_ROLE()
    MODIFY_QUORUM_ROLE = await votingBase.MODIFY_QUORUM_ROLE()
  })

  before('create dao', async () => {
    const receipt = await daoFactory.newDAO(root)
    dao = Kernel.at(getEventArgument(receipt, 'DeployDAO', 'dao'))
    acl = ACL.at(await dao.acl())
    await acl.createPermission(root, dao.address, APP_MANAGER_ROLE, root, { from: root })
  })

  before('mint tokens', async () => {
    token = await MiniMeToken.new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'n', 18, 'n', true, { from: root }) // empty parameters minime
    await token.generateTokens(holder20, bigExp(20, 18), { from: root })
    await token.generateTokens(holder29, bigExp(29, 18), { from: root })
    await token.generateTokens(holder51, bigExp(51, 18), { from: root })
  })

  before('deploy proxy voting', async () => {
    holder51Proxy = await ProxyVoting.new(holder51, OVERRULE_WINDOW)
    await token.transfer(holder51Proxy.address, bigExp(51, 18), { from: holder51 })
  })

  beforeEach('create voting app', async () => {
    const receipt = await dao.newAppInstance('0x1234', votingBase.address, '0x', false, { from: root })
    voting = Voting.at(getNewProxyAddress(receipt))

    await holder51Proxy.mockSetTimestamp(NOW)
    await voting.mockSetTimestamp(NOW)
    await voting.initialize(token.address, MIN_SUPPORT, MIN_QUORUM, VOTING_DURATION, { from: root })

    await acl.createPermission(ANY_ADDR, voting.address, CREATE_VOTES_ROLE, root, { from: root })
    await acl.createPermission(ANY_ADDR, voting.address, MODIFY_SUPPORT_ROLE, root, { from: root })
    await acl.createPermission(ANY_ADDR, voting.address, MODIFY_QUORUM_ROLE, root, { from: root })
  })

  const createVote = async (from = holder51) => {
    executionTarget = await ExecutionTarget.new()
    const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
    script = encodeCallScript([action])

    const { tx } = await holder51Proxy.newVote(voting.address, script, 'metadata', { from })
    const receipt = await web3.eth.getTransactionReceipt(tx)
    const events = decodeEventsOfType(receipt, Voting.abi, 'StartVote')
    assert.equal(events.length, 1, 'number of StartVote emitted events does not match')
    const startVoteEvent = events[0].args
    voteId = startVoteEvent.voteId
    return startVoteEvent
  }

  const getVoteState = async () => {
    const [open, executed, startDate, snapshotBlock, support, quorum, yeas, nays, votingPower, execScript] = await voting.getVote(voteId)
    return { open, executed, startDate, snapshotBlock, support, quorum, yeas, nays, votingPower, execScript }
  }

  const getVoterState = async (voter) => voting.getVoterState(voteId, voter)

  const increaseTime = async (seconds) => {
    await voting.mockIncreaseTime(seconds)
    await holder51Proxy.mockIncreaseTime(seconds)
  }

  describe('setFullRepresentative', () => {
    context('when the sender is the principal', async () => {
      const from = holder51

      it('is not allowed by default', async () => {
        assert.isFalse(await holder51Proxy.isRepresentativeFullyAllowed(holder20))
      })

      context('when the representative was not set yet', () => {
        it('sets the given representative', async () => {
          const receipt = await holder51Proxy.setFullRepresentative(holder20, true, { from })

          assertAmountOfEvents(receipt, 'ChangeFullRepresentative')
          assertEvent(receipt, 'ChangeFullRepresentative', { representative: holder20, allowed: true })

          assert.isTrue(await holder51Proxy.isRepresentativeFullyAllowed(holder20))
        })
      })

      context('when the representative was already set', () => {
        beforeEach('add representative', async () => {
          await holder51Proxy.setFullRepresentative(holder20, true, { from })
        })

        it('updates the given representative', async () => {
          const receipt = await holder51Proxy.setFullRepresentative(holder20, false, { from })

          assertAmountOfEvents(receipt, 'ChangeFullRepresentative')
          assertEvent(receipt, 'ChangeFullRepresentative', { representative: holder20, allowed: false })

          assert.isFalse(await holder51Proxy.isRepresentativeFullyAllowed(holder20))
        })
      })
    })

    context('when the sender is not the principal', async () => {
      const from = anyone

      it('reverts', async () => {
        await assertRevert(holder51Proxy.setFullRepresentative(holder20, true, { from }), 'PV_SENDER_NOT_PRINCIPAL')
      })
    })
  })

  describe('setInstanceRepresentative', () => {
    context('when the sender is the principal', async () => {
      const from = holder51

      it('is not allowed by default', async () => {
        assert.isFalse(await holder51Proxy.isRepresentativeAllowedForInstance(holder20, voting.address))
      })

      context('when the representative was not set yet', () => {
        it('sets the given representative', async () => {
          const receipt = await holder51Proxy.setInstanceRepresentative(holder20, voting.address, true, { from })

          assertAmountOfEvents(receipt, 'ChangeInstanceRepresentative')
          assertEvent(receipt, 'ChangeInstanceRepresentative', { representative: holder20, voting: voting.address, allowed: true })

          assert.isTrue(await holder51Proxy.isRepresentativeAllowedForInstance(holder20, voting.address))
        })
      })

      context('when the representative was already set', () => {
        beforeEach('add representative', async () => {
          await holder51Proxy.setInstanceRepresentative(holder20, voting.address, true, { from })
        })

        it('updates the given representative', async () => {
          const receipt = await holder51Proxy.setInstanceRepresentative(holder20, voting.address, false, { from })

          assertAmountOfEvents(receipt, 'ChangeInstanceRepresentative')
          assertEvent(receipt, 'ChangeInstanceRepresentative', { representative: holder20, voting: voting.address, allowed: false })

          assert.isFalse(await holder51Proxy.isRepresentativeAllowedForInstance(holder20, voting.address))
        })
      })
    })

    context('when the sender is not the principal', async () => {
      const from = anyone

      it('reverts', async () => {
        await assertRevert(holder51Proxy.setInstanceRepresentative(holder20, voting.address, true, { from }), 'PV_SENDER_NOT_PRINCIPAL')
      })
    })
  })

  describe('setVoteRepresentative', () => {
    beforeEach('create a vote', createVote)

    context('when the sender is the principal', async () => {
      const from = holder51

      it('is not allowed by default', async () => {
        assert.isFalse(await holder51Proxy.isRepresentativeAllowedForVote(holder20, voting.address, voteId))
      })

      context('when the representative was not set yet', () => {
        it('sets the given representative', async () => {
          const receipt = await holder51Proxy.setVoteRepresentative(holder20, voting.address, voteId, true, { from })

          assertAmountOfEvents(receipt, 'ChangeVoteRepresentative')
          assertEvent(receipt, 'ChangeVoteRepresentative', { representative: holder20, voting: voting.address, voteId, allowed: true })

          assert.isTrue(await holder51Proxy.isRepresentativeAllowedForVote(holder20, voting.address, voteId))
        })
      })

      context('when the representative was already set', () => {
        beforeEach('add representative', async () => {
          await holder51Proxy.setVoteRepresentative(holder20, voting.address, voteId, true, { from })
        })

        it('updates the given representative', async () => {
          const receipt = await holder51Proxy.setVoteRepresentative(holder20, voting.address, voteId, false, { from })

          assertAmountOfEvents(receipt, 'ChangeVoteRepresentative')
          assertEvent(receipt, 'ChangeVoteRepresentative', { representative: holder20, voting: voting.address, voteId, allowed: false })

          assert.isFalse(await holder51Proxy.isRepresentativeAllowedForVote(holder20, voting.address, voteId))
        })
      })
    })

    context('when the sender is not the principal', async () => {
      const from = anyone

      it('reverts', async () => {
        await assertRevert(holder51Proxy.setVoteRepresentative(holder20, voting.address, voteId, true, { from }), 'PV_SENDER_NOT_PRINCIPAL')
      })
    })
  })

  describe('newVote', () => {
    context('when the sender is the principal', () => {
      let startVoteEvent
      const from = holder51

      beforeEach('create a vote', async () => {
        startVoteEvent = await createVote(from)
      })

      it('creates a vote', async () => {
        assert.equal(voteId, 0, 'vote id should be correct')
        assert.equal(startVoteEvent.metadata, 'metadata', 'should have returned correct metadata')
        assert.equal(startVoteEvent.creator, web3.toChecksumAddress(holder51Proxy.address), 'creator should be correct')
      })

      it('does not cast the principal votes and has the correct state', async () => {
        const { open, executed, yeas, nays } = await getVoteState()

        assert.isTrue(open, 'vote should be open')
        assert.isFalse(executed, 'vote should not be executed')
        assert.equal(yeas.toString(), 0, 'initial yea should be 0')
        assert.equal(nays.toString(), 0, 'initial nay should be 0')
        assert.equal(await getVoterState(holder51), VOTER_STATE.ABSENT, 'principal should not have voted yet')
        assert.equal(await getVoterState(holder51Proxy.address), VOTER_STATE.ABSENT, 'principal proxy should not have voted yet')
      })

      it('sets it up correctly', async () => {
        const { startDate, snapshotBlock, support, quorum, votingPower, execScript } = await getVoteState()

        assert.equal(startDate.toString(), NOW, 'start date should be correct')
        assert.equal(snapshotBlock.toString(), await getBlockNumber() - 1, 'snapshot block should be correct')
        assert.equal(support.toString(), MIN_SUPPORT.toString(), 'required support should be app required support')
        assert.equal(quorum.toString(), MIN_QUORUM.toString(), 'min quorum should be app min quorum')
        assert.equal(votingPower.toString(), bigExp(100, 18).toString(), 'voting power should be 100')
        assert.equal(execScript, script, 'script should be correct')
      })
    })

    context('when the sender is not the principal', () => {
      const from = anyone

      it('reverts', async () => {
        await assertRevert(holder51Proxy.newVote(voting.address, script, 'metadata', { from }), 'PV_SENDER_NOT_PRINCIPAL')
      })
    })
  })

  describe('proxyVote', () => {
    context('when the vote exists', () => {
      beforeEach('create a vote', createVote)

      context('when the representative is not allowed', () => {
        const from = holder20

        const itReverts = () => {
          it('reverts', async () => {
            await assertRevert(holder51Proxy.proxyVote(voting.address, voteId, true, { from }), 'PV_REPRESENTATIVE_NOT_ALLOWED')
          })
        }

        context('when the representative is not allowed at all', () => {
          itReverts()
        })

        context('when the representative is allowed for a another vote instance', () => {
          beforeEach('allow representative for another instance', async () => {
            await holder51Proxy.setInstanceRepresentative(holder20, anotherVoting, true, { from: holder51 })
          })

          itReverts()
        })

        context('when the representative is allowed for a another vote', () => {
          beforeEach('allow representative for another vote', async () => {
            await holder51Proxy.setVoteRepresentative(holder20, voting.address, voteId + 1, true, { from: holder51 })
          })

          itReverts()
        })
      })

      context('when the representative is allowed', () => {
        const from = holder20

        context('when not within the overrule window', () => {
          const itCastsTheProxiedVote = () => {
            beforeEach('proxy representative\'s vote', async () => {
              await holder51Proxy.proxyVote(voting.address, voteId, false, { from: holder20 })
            })

            it('casts the proxied vote', async () => {
              const { yeas, nays } = await getVoteState()

              assert.equal(yeas.toString(), 0, 'initial yea should be 0')
              assert.equal(nays.toString(), bigExp(51, 18).toString(), 'initial nay should be 51%')
              assert.equal(await getVoterState(holder51), VOTER_STATE.ABSENT, 'principal proxy should have voted')
              assert.equal(await getVoterState(holder51Proxy.address), VOTER_STATE.NAY, 'principal proxy should have voted')
            })

            it('cannot be changed by the same representative', async () => {
              await assertRevert(holder51Proxy.proxyVote(voting.address, voteId, true, { from }), 'PV_VOTE_ALREADY_CASTED')
            })

            it('cannot be overruled by another representative', async () => {
              await holder51Proxy.setFullRepresentative(holder29, true, { from: holder51 })
              await assertRevert(holder51Proxy.proxyVote(voting.address, voteId, true, { from: holder29 }), 'PV_VOTE_ALREADY_CASTED')
            })
          }

          context('when the representative is allowed for any vote instance', () => {
            beforeEach('allow representative for any instance', async () => {
              await holder51Proxy.setFullRepresentative(holder20, true, { from: holder51 })
            })

            itCastsTheProxiedVote()
          })

          context('when the representative is allowed for that particular vote instance', () => {
            beforeEach('allow representative for instance', async () => {
              await holder51Proxy.setInstanceRepresentative(holder20, voting.address, true, { from: holder51 })
            })

            itCastsTheProxiedVote()
          })

          context('when the representative is allowed for that particular vote', () => {
            beforeEach('allow representative for vote', async () => {
              await holder51Proxy.setVoteRepresentative(holder20, voting.address, voteId, true, { from: holder51 })
            })

            itCastsTheProxiedVote()
          })
        })

        context('when within the overrule window', () => {
          beforeEach('move within overrule window', async () => {
            await increaseTime(VOTING_DURATION - OVERRULE_WINDOW)
          })

          const itReverts = () => {
            it('reverts', async () => {
              await assertRevert(holder51Proxy.proxyVote(voting.address, voteId, true, { from }), 'PV_WITHIN_OVERRULE_WINDOW')
            })
          }

          context('when the representative is allowed for any vote instance', () => {
            beforeEach('allow representative for any instance', async () => {
              await holder51Proxy.setFullRepresentative(holder20, true, { from: holder51 })
            })

            itReverts()
          })

          context('when the representative is allowed for that particular vote instance', () => {
            beforeEach('allow representative for instance', async () => {
              await holder51Proxy.setInstanceRepresentative(holder20, voting.address, true, { from: holder51 })
            })

            itReverts()
          })

          context('when the representative is allowed for that particular vote', () => {
            beforeEach('allow representative for vote', async () => {
              await holder51Proxy.setVoteRepresentative(holder20, voting.address, voteId, true, { from: holder51 })
            })

            itReverts()
          })
        })
      })
    })

    context('when the vote does not exist', () => {
      it('reverts', async () => {
        await holder51Proxy.setFullRepresentative(holder20, true, { from: holder51 })
        await assertRevert(holder51Proxy.proxyVote(voting.address, voteId, true, { from: holder20 }), 'VOTING_NO_VOTE')
      })
    })
  })

  describe('vote', () => {
    beforeEach('create a vote', createVote)

    context('when the sender is the principal', () => {
      const from = holder51

      const itCastsTheProxiedVote = () => {
        it('casts the proxied vote', async () => {
          await holder51Proxy.vote(voting.address, voteId, true, false, { from })

          const { yeas, nays } = await getVoteState()

          assert.equal(yeas.toString(), bigExp(51, 18).toString(), 'initial yea should be 51%')
          assert.equal(nays.toString(), 0, 'initial nay should be 0')
          assert.equal(await getVoterState(holder51), VOTER_STATE.ABSENT, 'principal proxy should have voted')
          assert.equal(await getVoterState(holder51Proxy.address), VOTER_STATE.YEA, 'principal proxy should have voted')
        })
      }

      context('when no one proxied a vote yet', () => {
        itCastsTheProxiedVote()
      })

      context('when a representative already proxied a vote', () => {
        beforeEach('proxy representative\'s vote', async () => {
          await holder51Proxy.setFullRepresentative(holder20, true, { from: holder51 })
          await holder51Proxy.proxyVote(voting.address, voteId, false, { from: holder20 })
        })

        itCastsTheProxiedVote()
      })

      context('when the principal already proxied a vote', () => {
        beforeEach('proxy principal\'s vote', async () => {
          await holder51Proxy.vote(voting.address, voteId, false, false, { from: holder51 })
        })

        itCastsTheProxiedVote()
      })
    })

    context('when the sender is not the principal', () => {
      const from = anyone

      it('reverts', async () => {
        await assertRevert(holder51Proxy.vote(voting.address, voteId, true, false, { from }), 'PV_SENDER_NOT_PRINCIPAL')
      })
    })
  })

  describe('hasNotVoteYet', () => {
    beforeEach('create a vote', createVote)

    context('when no one has vote yet', () => {
      it('returns true', async () => {
        assert.isTrue(await holder51Proxy.hasNotVoteYet(voting.address, voteId))
      })
    })

    context('when a representative has proxied a vote', () => {
      beforeEach('proxy representative\'s vote', async () => {
        await holder51Proxy.setFullRepresentative(holder20, true, { from: holder51 })
        await holder51Proxy.proxyVote(voting.address, voteId, true, { from: holder20 })
      })

      it('returns false', async () => {
        assert.isFalse(await holder51Proxy.hasNotVoteYet(voting.address, voteId))
      })
    })

    context('when the principal has proxied a vote', () => {
      beforeEach('proxy principal\'s vote', async () => {
        await holder51Proxy.vote(voting.address, voteId, true, false, { from: holder51 })
      })

      it('returns false', async () => {
        assert.isFalse(await holder51Proxy.hasNotVoteYet(voting.address, voteId))
      })
    })
  })

  describe('withinOverruleWindow', () => {
    beforeEach('create a vote', createVote)

    context('when previous to the overrule window', () => {
      beforeEach('increase time', async () => {
        await increaseTime(ONE_DAY)
      })

      it('returns false', async () => {
        assert.isFalse(await holder51Proxy.withinOverruleWindow(voting.address, voteId))
      })
    })

    context('when right at the beginning of the overrule window', () => {
      beforeEach('increase time', async () => {
        await increaseTime(VOTING_DURATION - OVERRULE_WINDOW)
      })

      it('returns true', async () => {
        assert.isTrue(await holder51Proxy.withinOverruleWindow(voting.address, voteId))
      })
    })

    context('when in the middle of the overrule window', () => {
      beforeEach('increase time', async () => {
        await increaseTime(VOTING_DURATION - OVERRULE_WINDOW/2 )
      })

      it('returns true', async () => {
        assert.isTrue(await holder51Proxy.withinOverruleWindow(voting.address, voteId))
      })
    })

    context('when right at the end of the overrule window', () => {
      beforeEach('increase time', async () => {
        await increaseTime(VOTING_DURATION)
      })

      it('returns false', async () => {
        assert.isFalse(await holder51Proxy.withinOverruleWindow(voting.address, voteId))
      })
    })

    context('when after the end of the overrule window', () => {
      beforeEach('increase time', async () => {
        await increaseTime(VOTING_DURATION + 1)
      })

      it('returns false', async () => {
        assert.isFalse(await holder51Proxy.withinOverruleWindow(voting.address, voteId))
      })
    })
  })

  describe('withdraw', () => {
    context('when the sender is the principal', () => {
      const from = holder51

      context('when the transfer succeeds', () => {
        const amount = bigExp(1, 18)

        it('transfers the requested amount of tokens to the principal', async () => {
          const previousProxyBalance = await token.balanceOf(holder51Proxy.address)
          const previousPrincipalBalance = await token.balanceOf(holder51)

          await holder51Proxy.withdraw(token.address, amount, { from })

          const currentProxyBalance = await token.balanceOf(holder51Proxy.address)
          assert.equal(currentProxyBalance.toString(), previousProxyBalance.minus(amount).toString())

          const currentPrincipalBalance = await token.balanceOf(holder51)
          assert.equal(currentPrincipalBalance.toString(), previousPrincipalBalance.plus(amount).toString())
        })

        it('emits an event', async () => {
          const receipt = await holder51Proxy.withdraw(token.address, amount, { from })

          assertAmountOfEvents(receipt, 'Withdraw')
          assertEvent(receipt, 'Withdraw', { token: token.address, amount })
        })
      })

      context('when the transfer does not succeed', () => {
        const amount = bigExp(100, 18)

        it('reverts', async () => {
          await assertRevert(holder51Proxy.withdraw(token.address, amount, { from }), 'PV_WITHDRAW_FAILED')
        })
      })
    })

    context('when the sender is not the principal', () => {
      const from = anyone

      it('reverts', async () => {
        await assertRevert(holder51Proxy.withdraw(token.address, 1, { from }), 'PV_SENDER_NOT_PRINCIPAL')
      })
    })
  })
})
