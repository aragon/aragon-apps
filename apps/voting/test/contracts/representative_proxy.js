const VOTER_STATE = require('../helpers/state')
const { bigExp, pct } = require('../helpers/numbers')(web3)
const getBlockNumber = require('@aragon/test-helpers/blockNumber')(web3)
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { encodeCallScript } = require('@aragon/test-helpers/evmScript')
const { decodeEventsOfType } = require('@aragon/os/test/helpers/decodeEvent')
const { getEventArgument, getNewProxyAddress } = require('@aragon/test-helpers/events')
const { assertEvent, assertAmountOfEvents } = require('@aragon/test-helpers/assertEvent')(web3)

const Voting = artifacts.require('VotingMock')
const RepresentativeProxy = artifacts.require('RepresentativeProxyMock')
const ExecutionTarget = artifacts.require('ExecutionTarget')

const ACL = artifacts.require('@aragon/os/contracts/acl/ACL')
const Kernel = artifacts.require('@aragon/os/contracts/kernel/Kernel')
const DAOFactory = artifacts.require('@aragon/os/contracts/factory/DAOFactory')
const EVMScriptRegistryFactory = artifacts.require('@aragon/os/contracts/factory/EVMScriptRegistryFactory')
const MiniMeToken = artifacts.require('@aragon/apps-shared-minime/contracts/MiniMeToken')

const ANY_ADDR = '0xffffffffffffffffffffffffffffffffffffffff'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

contract('RepresentativeProxy', ([_, root, holder20, holder29, holder51, representative, anyone]) => {
  let votingBase, kernelBase, aclBase, daoFactory
  let dao, acl, voting, token, executionTarget, script, voteId, representativeProxy
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

  beforeEach('mint tokens', async () => {
    token = await MiniMeToken.new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'n', 18, 'n', true, { from: root }) // empty parameters minime
    await token.generateTokens(holder20, bigExp(20, 18), { from: root })
    await token.generateTokens(holder29, bigExp(29, 18), { from: root })
    await token.generateTokens(holder51, bigExp(51, 18), { from: root })
  })

  beforeEach('create representative proxy', async () => {
    representativeProxy = await RepresentativeProxy.new(representative, OVERRULE_WINDOW)
    await token.approve(representativeProxy.address, bigExp(51, 18), { from: holder51 })
    await token.approve(representativeProxy.address, bigExp(20, 18), { from: holder20 })
  })

  beforeEach('create voting app', async () => {
    const receipt = await dao.newAppInstance('0x1234', votingBase.address, '0x', false, { from: root })
    voting = Voting.at(getNewProxyAddress(receipt))

    await representativeProxy.mockSetTimestamp(NOW)
    await voting.mockSetTimestamp(NOW)
    await voting.initialize(token.address, MIN_SUPPORT, MIN_QUORUM, VOTING_DURATION, { from: root })

    await acl.createPermission(ANY_ADDR, voting.address, CREATE_VOTES_ROLE, root, { from: root })
    await acl.createPermission(ANY_ADDR, voting.address, MODIFY_SUPPORT_ROLE, root, { from: root })
    await acl.createPermission(ANY_ADDR, voting.address, MODIFY_QUORUM_ROLE, root, { from: root })
  })

  const createVote = async (from = representative) => {
    executionTarget = await ExecutionTarget.new()
    const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
    script = encodeCallScript([action])

    const { tx } = await representativeProxy.newVote(voting.address, script, 'metadata', { from })
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
    await representativeProxy.mockIncreaseTime(seconds)
  }

  describe('delegate', () => {
    const from = holder51

    it('is not allowed by default', async () => {
      assert.isFalse(await representativeProxy.isAllowedBy(holder51, token.address))
    })

    context('when the token transfer does not fail', () => {
      const amount = bigExp(2, 18)

      it('transfers given amount of tokens to the representative proxy', async () => {
        const previousProxyBalance = await token.balanceOf(representativeProxy.address)
        const previousPrincipalBalance = await token.balanceOf(holder51)

        await representativeProxy.delegate(token.address, amount, { from })

        assert.isTrue(await representativeProxy.isAllowedBy(holder51, token.address))

        const currentProxyBalance = await token.balanceOf(representativeProxy.address)
        assert.equal(currentProxyBalance.toString(), previousProxyBalance.plus(amount).toString())

        const currentPrincipalBalance = await token.balanceOf(holder51)
        assert.equal(currentPrincipalBalance.toString(), previousPrincipalBalance.minus(amount).toString())
      })

      it('emits an event', async () => {
        const receipt = await representativeProxy.delegate(token.address, amount, { from })

        assertAmountOfEvents(receipt, 'Delegate')
        assertEvent(receipt, 'Delegate', { principal: holder51, token: token.address, amount, totalAmount: amount })
      })
    })

    context('when the token transfer fails', () => {
      const amount = bigExp(100, 18)

      it('reverts', async () => {
        await assertRevert(representativeProxy.delegate(token.address, amount, { from }), 'RP_TRANSFER_FROM_TOKEN_FAILED')
      })
    })
  })

  describe('withdraw', () => {
    const from = holder51

    context('when the token transfer does not fail', () => {
      const amount = bigExp(2, 18)

      beforeEach('delegate amount', async () => {
        await representativeProxy.delegate(token.address, amount, { from })
      })

      it('withdraw given amount of tokens from the representative proxy', async () => {
        const previousProxyBalance = await token.balanceOf(representativeProxy.address)
        const previousPrincipalBalance = await token.balanceOf(holder51)

        await representativeProxy.withdraw(token.address, amount, { from })

        assert.isFalse(await representativeProxy.isAllowedBy(holder51, token.address))

        const currentProxyBalance = await token.balanceOf(representativeProxy.address)
        assert.equal(currentProxyBalance.toString(), previousProxyBalance.minus(amount).toString())

        const currentPrincipalBalance = await token.balanceOf(holder51)
        assert.equal(currentPrincipalBalance.toString(), previousPrincipalBalance.plus(amount).toString())
      })

      it('emits an event', async () => {
        const receipt = await representativeProxy.withdraw(token.address, amount, { from })

        assertAmountOfEvents(receipt, 'Withdraw')
        assertEvent(receipt, 'Withdraw', { principal: holder51, token: token.address, amount, totalAmount: 0 })
      })
    })

    context('when the token transfer fails', () => {
      const amount = bigExp(100, 18)

      it('reverts', async () => {
        await assertRevert(representativeProxy.withdraw(token.address, amount, { from }), 'RP_DISALLOW_AMOUNT_UNAVAILABLE')
      })
    })
  })

  describe('newVote', () => {
    context('when the sender is the representative', () => {
      let startVoteEvent
      const from = representative

      beforeEach('create a vote', async () => {
        startVoteEvent = await createVote(from)
      })

      it('creates a vote', async () => {
        assert.equal(voteId, 0, 'vote id should be correct')
        assert.equal(startVoteEvent.metadata, 'metadata', 'should have returned correct metadata')
        assert.equal(startVoteEvent.creator, web3.toChecksumAddress(representativeProxy.address), 'creator should be correct')
      })

      it('does not cast the representatives votes and has the correct state', async () => {
        const { open, executed, yeas, nays } = await getVoteState()

        assert.isTrue(open, 'vote should be open')
        assert.isFalse(executed, 'vote should not be executed')
        assert.equal(yeas.toString(), 0, 'yeas should be 0')
        assert.equal(nays.toString(), 0, 'nays should be 0')
        assert.equal(await getVoterState(representativeProxy.address), VOTER_STATE.ABSENT, 'representative proxy should not have voted yet')
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

    context('when the sender is not the representative', () => {
      const from = anyone

      it('reverts', async () => {
        await assertRevert(representativeProxy.newVote(voting.address, script, 'metadata', { from }), 'RP_SENDER_NOT_REPRESENTATIVE')
      })
    })
  })

  describe('proxyVotes', () => {
    context('when the vote exists', () => {

      context('when the sender is the representative', () => {
        const from = representative

        context('when the representative is allowed', () => {
          beforeEach('allow representative', async () => {
            await representativeProxy.delegate(token.address, bigExp(51, 18), { from: holder51 })
            await representativeProxy.delegate(token.address, bigExp(20, 18), { from: holder20 })
          })

          beforeEach('create a vote', createVote)

          context('when not within the overrule window', () => {
            beforeEach('proxy vote', async () => {
              await representativeProxy.proxyVotes([voting.address], [voteId], [false], { from })
            })

            it('casts the proxied vote', async () => {
              const { yeas, nays } = await getVoteState()

              assert.equal(yeas.toString(), 0, 'yeas should be 0')
              assert.equal(nays.toString(), bigExp(71, 18).toString(), 'nays should be 71%')
              assert.equal(await getVoterState(representativeProxy.address), VOTER_STATE.NAY, 'representative proxy should have voted')
            })

            it('can be changed by the same representative', async () => {
              await representativeProxy.proxyVotes([voting.address], [voteId], [true], { from })

              const { yeas, nays } = await getVoteState()

              assert.equal(nays.toString(), 0, 'nays should be 0')
              assert.equal(yeas.toString(), bigExp(71, 18).toString(), 'yeas should be 71%')
              assert.equal(await getVoterState(representativeProxy.address), VOTER_STATE.YEA, 'representative proxy should have voted')
            })
          })

          context('when within the overrule window', () => {
            beforeEach('move within overrule window', async () => {
              await increaseTime(VOTING_DURATION - OVERRULE_WINDOW)
            })

            it('reverts', async () => {
              await assertRevert(representativeProxy.proxyVotes([voting.address], [voteId], [false], { from }), 'RP_WITHIN_OVERRULE_WINDOW')
            })
          })
        })

        context('when the representative is not allowed', () => {
          beforeEach('create a vote', createVote)

          it('reverts', async () => {
            await assertRevert(representativeProxy.proxyVotes([voting.address], [voteId], [false], { from }), 'VOTING_CAN_NOT_VOTE')
          })
        })
      })

      context('when the sender is not the representative', () => {
        const from = anyone

        beforeEach('create a vote', createVote)

        it('reverts', async () => {
          await assertRevert(representativeProxy.proxyVotes([voting.address], [voteId], [true], { from }), 'RP_SENDER_NOT_REPRESENTATIVE')
        })
      })
    })

    context('when the vote does not exist', () => {
      it('reverts', async () => {
        await assertRevert(representativeProxy.proxyVotes([voting.address], [voteId], [false], { from: representative }), 'VOTING_NO_VOTE')
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
        assert.isFalse(await representativeProxy.withinOverruleWindow(voting.address, voteId))
      })
    })

    context('when right at the beginning of the overrule window', () => {
      beforeEach('increase time', async () => {
        await increaseTime(VOTING_DURATION - OVERRULE_WINDOW)
      })

      it('returns true', async () => {
        assert.isTrue(await representativeProxy.withinOverruleWindow(voting.address, voteId))
      })
    })

    context('when in the middle of the overrule window', () => {
      beforeEach('increase time', async () => {
        await increaseTime(VOTING_DURATION - OVERRULE_WINDOW/2 )
      })

      it('returns true', async () => {
        assert.isTrue(await representativeProxy.withinOverruleWindow(voting.address, voteId))
      })
    })

    context('when right at the end of the overrule window', () => {
      beforeEach('increase time', async () => {
        await increaseTime(VOTING_DURATION)
      })

      it('returns false', async () => {
        assert.isFalse(await representativeProxy.withinOverruleWindow(voting.address, voteId))
      })
    })

    context('when after the end of the overrule window', () => {
      beforeEach('increase time', async () => {
        await increaseTime(VOTING_DURATION + 1)
      })

      it('returns false', async () => {
        assert.isFalse(await representativeProxy.withinOverruleWindow(voting.address, voteId))
      })
    })
  })
})
