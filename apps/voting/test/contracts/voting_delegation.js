const VOTER_STATE = require('../helpers/state')
const { bigExp, pct } = require('../helpers/numbers')(web3)
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { skipCoverage } = require('@aragon/os/test/helpers/coverage')
const { encodeCallScript } = require('@aragon/test-helpers/evmScript')
const { decodeEventsOfType } = require('@aragon/os/test/helpers/decodeEvent')
const { getEventArgument, getNewProxyAddress } = require('@aragon/test-helpers/events')
const { assertEvent, assertAmountOfEvents } = require('@aragon/test-helpers/assertEvent')(web3)

const Voting = artifacts.require('VotingMock')
const ExecutionTarget = artifacts.require('ExecutionTarget')

const ACL = artifacts.require('@aragon/os/contracts/acl/ACL')
const Kernel = artifacts.require('@aragon/os/contracts/kernel/Kernel')
const DAOFactory = artifacts.require('@aragon/os/contracts/factory/DAOFactory')
const EVMScriptRegistryFactory = artifacts.require('@aragon/os/contracts/factory/EVMScriptRegistryFactory')
const MiniMeToken = artifacts.require('@aragon/apps-shared-minime/contracts/MiniMeToken')

const ANY_ADDR = '0xffffffffffffffffffffffffffffffffffffffff'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

contract('Voting delegation', ([_, root, principal, representative, anotherRepresentative, anyone]) => {
  let votingBase, kernelBase, aclBase, daoFactory
  let dao, acl, token, executionTarget, script, voteId
  let APP_MANAGER_ROLE, CREATE_VOTES_ROLE, MODIFY_SUPPORT_ROLE, MODIFY_QUORUM_ROLE, MODIFY_OVERRULE_WINDOW_ROLE

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
    MODIFY_OVERRULE_WINDOW_ROLE = await votingBase.MODIFY_OVERRULE_WINDOW_ROLE()
  })

  before('create dao', async () => {
    const receipt = await daoFactory.newDAO(root)
    dao = Kernel.at(getEventArgument(receipt, 'DeployDAO', 'dao'))
    acl = ACL.at(await dao.acl())
    await acl.createPermission(root, dao.address, APP_MANAGER_ROLE, root, { from: root })
  })

  before('mint tokens', async () => {
    token = await MiniMeToken.new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'n', 18, 'n', true, { from: root }) // empty parameters minime
    await token.generateTokens(principal, bigExp(51, 18), { from: root })
  })

  beforeEach('create voting app', async () => {
    const receipt = await dao.newAppInstance('0x1234', votingBase.address, '0x', false, { from: root })
    voting = Voting.at(getNewProxyAddress(receipt))

    await acl.createPermission(ANY_ADDR, voting.address, CREATE_VOTES_ROLE, root, { from: root })
    await acl.createPermission(root, voting.address, MODIFY_OVERRULE_WINDOW_ROLE, root, { from: root })

    await voting.mockSetTimestamp(NOW)
    await voting.initialize(token.address, MIN_SUPPORT, MIN_QUORUM, VOTING_DURATION, { from: root })
    await voting.changeOverruleWindow(OVERRULE_WINDOW, { from: root })
  })

  const createVote = async (from = principal) => {
    executionTarget = await ExecutionTarget.new()
    const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
    script = encodeCallScript([action])

    const { tx } = await voting.newVoteExt(script, 'metadata', false, false, { from })
    const receipt = await web3.eth.getTransactionReceipt(tx)
    const events = decodeEventsOfType(receipt, Voting.abi, 'StartVote')
    assert.equal(events.length, 1, 'number of StartVote emitted events does not match')
    const startVoteEvent = events[0].args
    voteId = startVoteEvent.voteId
    return voteId
  }

  const getVoteState = async (id = voteId) => {
    const [open, executed, startDate, snapshotBlock, support, quorum, yeas, nays, votingPower, execScript] = await voting.getVote(id)
    return { open, executed, startDate, snapshotBlock, support, quorum, yeas, nays, votingPower, execScript }
  }

  const getVoterState = async (voter, id = voteId) => voting.getVoterState(id, voter)

  describe('setRepresentative', () => {
    it('is not allowed by default', async () => {
      assert.isFalse(await voting.isRepresentativeOf(principal, representative))
    })

    context('when the representative was not set yet', () => {
      it('sets the given representative', async () => {
        const receipt = await voting.setRepresentative(representative, true, { from: principal })

        assertAmountOfEvents(receipt, 'ChangeRepresentative')
        assertEvent(receipt, 'ChangeRepresentative', { principal: principal, representative, allowed: true })

        assert.isTrue(await voting.isRepresentativeOf(principal, representative))
      })
    })

    context('when the representative was already set', () => {
      beforeEach('add representative', async () => {
        await voting.setRepresentative(representative, true, { from: principal })
      })

      it('updates the given representative', async () => {
        const receipt = await voting.setRepresentative(representative, false, { from: principal })

        assertAmountOfEvents(receipt, 'ChangeRepresentative')
        assertEvent(receipt, 'ChangeRepresentative', { principal: principal, representative, allowed: false })

        assert.isFalse(await voting.isRepresentativeOf(principal, representative))
      })
    })
  })

  describe('canVoteOnBehalfOf', () => {

    context('when the vote exists', () => {
      beforeEach('create a vote', createVote)

      context('when the sender is a representative', () => {
        beforeEach('add representative', async () => {
          await voting.setRepresentative(representative, true, { from: principal })
        })

        context('when the principal can vote', () => {
          context('when not within the overrule window', () => {
            context('when the principal has not voted yet', () => {
              context('when the representative did not proxied a vote', () => {
                it('returns true', async () => {
                  assert.isTrue(await voting.canVoteOnBehalfOf(voteId, principal, representative), 'should not be able to vote')
                })
              })

              context('when the representative already proxied a vote', () => {
                beforeEach('proxy representative\'s vote', async () => {
                  await voting.voteOnBehalfOf(principal, voteId, true, { from: representative })
                })

                it('returns false', async () => {
                  assert.isFalse(await voting.canVoteOnBehalfOf(voteId, principal, representative), 'should not be able to vote')
                })
              })
            })

            context('when the principal has already voted', () => {
              beforeEach('move within overrule window', async () => {
                await voting.vote(voteId, true, false, { from: principal })
              })

              it('returns false', async () => {
                assert.isFalse(await voting.canVoteOnBehalfOf(voteId, principal, representative), 'should not be able to vote')
              })
            })
          })

          context('when within the overrule window', () => {
            beforeEach('move within overrule window', async () => {
              await voting.mockIncreaseTime(VOTING_DURATION - OVERRULE_WINDOW)
            })

            it('returns false', async () => {
              assert.isFalse(await voting.canVoteOnBehalfOf(voteId, principal, representative), 'should not be able to vote')
            })
          })
        })

        context('when the principal can not vote', () => {
          const invalidPrincipal = anyone

          beforeEach('add representative', async () => {
            await voting.setRepresentative(representative, true, { from: invalidPrincipal })
          })

          it('returns false', async () => {
            assert.isFalse(await voting.canVoteOnBehalfOf(voteId, invalidPrincipal, representative), 'should not be able to vote')
          })
        })
      })

      context('when the sender is the principal', () => {
        it('returns false', async () => {
          assert.isFalse(await voting.canVoteOnBehalfOf(voteId, principal, principal), 'should not be able to vote')
        })
      })

      context('when the sender is not a representative', () => {
        it('returns false', async () => {
          assert.isFalse(await voting.canVoteOnBehalfOf(voteId, principal, anyone), 'should not be able to vote')
        })
      })
    })

    context('when the vote does not exist', () => {
      beforeEach('add representative', async () => {
        await voting.setRepresentative(representative, true, { from: principal })
      })

      it('reverts', async () => {
        await assertRevert(voting.canVoteOnBehalfOf(voteId, principal, representative, { from: representative }), 'VOTING_NO_VOTE')
      })
    })
  })

  describe('voteOnBehalfOf', () => {

    context('when the vote exists', () => {
      beforeEach('create a vote', createVote)

      context('when the sender is a representative', () => {
        const from = representative

        beforeEach('add representative', async () => {
          await voting.setRepresentative(representative, true, { from: principal })
        })

        context('when the principal can vote', () => {
          context('when not within the overrule window', () => {
            context('when the principal has not voted yet', () => {
              beforeEach('proxy representative\'s vote', async () => {
                await voting.voteOnBehalfOf(principal, voteId, false, { from: representative })
              })

              it('casts the proxied vote', async () => {
                const { yeas, nays } = await getVoteState()

                assert.equal(yeas.toString(), 0, 'yeas should be 0')
                assert.equal(nays.toString(), bigExp(51, 18).toString(), 'nays should be 51%')
                assert.equal(await getVoterState(principal), VOTER_STATE.NAY, 'principal should have voted')
                assert.equal(await getVoterState(representative), VOTER_STATE.ABSENT, 'representative should not have voted')
              })

              it('cannot be changed by the same representative', async () => {
                await assertRevert(voting.voteOnBehalfOf(voting.address, voteId, true, { from }), 'VOTING_REPRESENTATIVE_CANT_VOTE')
              })

              it('cannot be overruled by another representative', async () => {
                await voting.setRepresentative(anotherRepresentative, true, { from: principal })
                await assertRevert(voting.voteOnBehalfOf(principal, voteId, true, { from: anotherRepresentative }), 'VOTING_REPRESENTATIVE_CANT_VOTE')
              })
            })

            context('when the principal has already voted', () => {
              beforeEach('move within overrule window', async () => {
                await voting.vote(voteId, true, false, { from: principal })
              })

              it('reverts', async () => {
                await assertRevert(voting.voteOnBehalfOf(principal, voteId, true, { from }), 'VOTING_REPRESENTATIVE_CANT_VOTE')
              })
            })
          })

          context('when within the overrule window', () => {
            beforeEach('move within overrule window', async () => {
              await voting.mockIncreaseTime(VOTING_DURATION - OVERRULE_WINDOW)
            })

            it('reverts', async () => {
              await assertRevert(voting.voteOnBehalfOf(principal, voteId, true, { from }), 'VOTING_REPRESENTATIVE_CANT_VOTE')
            })
          })
        })

        context('when the principal can not vote', () => {
          const invalidPrincipal = anyone

          beforeEach('add representative', async () => {
            await voting.setRepresentative(representative, true, { from: invalidPrincipal })
          })

          it('reverts', async () => {
            await assertRevert(voting.voteOnBehalfOf(invalidPrincipal, voteId, true, { from }), 'VOTING_REPRESENTATIVE_CANT_VOTE')
          })
        })
      })

      context('when the sender is the principal', () => {
        const from = principal

        it('reverts', async () => {
          await assertRevert(voting.voteOnBehalfOf(principal, voteId, true, { from }), 'VOTING_REPRESENTATIVE_CANT_VOTE')
        })
      })

      context('when the sender is not a representative', () => {
        const from = anyone

        it('reverts', async () => {
          await assertRevert(voting.voteOnBehalfOf(principal, voteId, true, { from }), 'VOTING_REPRESENTATIVE_CANT_VOTE')
        })
      })
    })

    context('when the vote does not exist', () => {
      it('reverts', async () => {
        await voting.setRepresentative(representative, true, { from: principal })
        await assertRevert(voting.voteOnBehalfOf(principal, voteId, true, { from: representative }), 'VOTING_NO_VOTE')
      })
    })
  })

  describe('voteOnBehalfOfMany', () => {

    context('when the input is valid', () => {
      beforeEach('add representative', async () => {
        await voting.setRepresentative(representative, true, { from: principal })
      })

      it('casts the successful votes', async () => {
        const voteId = await createVote()
        const anotherVoteId = await createVote()

        const voteIds = [voteId, anotherVoteId, anotherVoteId]
        const supports = [false, true, true]
        const principals = [principal, principal, anyone]
        const receipt = await voting.voteOnBehalfOfMany(principals, voteIds, supports, { from: representative })
        console.log(receipt)
        assertAmountOfEvents(receipt, 'CastVote', 2)

        const { yeas, nays } = await getVoteState(voteId)
        assert.equal(yeas.toString(), 0, 'yeas should be 0')
        assert.equal(nays.toString(), bigExp(51, 18).toString(), 'nays should be 51%')
        assert.equal(await getVoterState(principal, voteId), VOTER_STATE.NAY, 'principal should have voted')

        const { yeas: anotherYeas, nays: anotherNays } = await getVoteState(anotherVoteId)
        assert.equal(anotherNays.toString(), 0, 'nays should be 0')
        assert.equal(anotherYeas.toString(), bigExp(51, 18).toString(), 'yeas should be 51%')
        assert.equal(await getVoterState(principal, anotherVoteId), VOTER_STATE.YEA, 'principal should have voted')
        assert.equal(await getVoterState(anyone, anotherVoteId), VOTER_STATE.ABSENT, 'invalid principal should not have voted')
      })
    })

    context('when the input is not valid', () => {
      const repeat = (x, y) => [...Array(x).map(() => y)]

      context('when the input length exceeds the max length allowed', () => {
        it('reverts', async () => {
          const voteIds = repeat(101, voteId)
          const supports = repeat(101, true)
          const principals = repeat(101, principal)

          await assertRevert(voting.voteOnBehalfOfMany(principals, voteIds, supports), 'VOTING_DELEGATES_EXCEEDS_MAX_LEN')
        })
      })

      context('when the principals length does not match with the vote ids length', () => {
        it('reverts', async () => {
          const voteIds = [1]
          const supports = [true, true]
          const principals = [principal, principal]

          await assertRevert(voting.voteOnBehalfOfMany(principals, voteIds, supports), 'VOTING_INVALID_DELEGATES_INPUT_LEN')
        })
      })

      context('when the principals length does not match with the supports length', () => {
        it('reverts', async () => {
          const voteIds = [1, 2]
          const supports = [true]
          const principals = [principal, principal]

          await assertRevert(voting.voteOnBehalfOfMany(principals, voteIds, supports), 'VOTING_INVALID_DELEGATES_INPUT_LEN')
        })
      })

      context('when the vote ids length does not match with the supports length', () => {
        it('reverts', async () => {
          const voteIds = [1, 2]
          const supports = [true, true]
          const principals = [principal]

          await assertRevert(voting.voteOnBehalfOfMany(principals, voteIds, supports), 'VOTING_INVALID_DELEGATES_INPUT_LEN')
        })
      })
    })
  })

  describe('changeOverruleWindow', () => {
    context('when the sender is allowed', () => {
      const from = root

      context('when the new window is valid', () => {
        const newWindow = ONE_DAY

        it('changes the overrule window', async () => {
          await voting.changeOverruleWindow(newWindow, { from })

          assert.equal((await voting.overruleWindow()).toString(), newWindow)
        })

        it('emits an event', async () => {
          const receipt = await voting.changeOverruleWindow(newWindow, { from })

          assertAmountOfEvents(receipt, 'ChangeOverruleWindow')
          assertEvent(receipt, 'ChangeOverruleWindow', { previousOverruleWindow: OVERRULE_WINDOW, newOverruleWindow: newWindow })
        })
      })

      context('when the new window is not valid', () => {
        const newWindow = VOTING_DURATION + 1

        it('reverts', async () => {
          await assertRevert(voting.changeOverruleWindow(newWindow, { from }), 'VOTING_INVALID_OVERRULE_WINDOW')
        })
      })
    })

    context('when the sender is not allowed', () => {
      const from = anyone
      const newWindow = VOTING_DURATION

      it('reverts', async () => {
        await assertRevert(voting.changeOverruleWindow(newWindow, { from }), 'APP_AUTH_FAILED')
      })
    })
  })

  describe('withinOverruleWindow', () => {
    beforeEach('create a vote', createVote)

    context('when previous to the overrule window', () => {
      beforeEach('increase time', async () => {
        await voting.mockIncreaseTime(ONE_DAY)
      })

      it('returns false', async () => {
        assert.isFalse(await voting.withinOverruleWindow(voteId))
      })
    })

    context('when right at the beginning of the overrule window', () => {
      beforeEach('increase time', async () => {
        await voting.mockIncreaseTime(VOTING_DURATION - OVERRULE_WINDOW)
      })

      it('returns true', async () => {
        assert.isTrue(await voting.withinOverruleWindow(voteId))
      })
    })

    context('when in the middle of the overrule window', () => {
      beforeEach('increase time', async () => {
        await voting.mockIncreaseTime(VOTING_DURATION - OVERRULE_WINDOW / 2)
      })

      it('returns true', async () => {
        assert.isTrue(await voting.withinOverruleWindow(voteId))
      })
    })

    context('when right at the end of the overrule window', () => {
      beforeEach('increase time', async () => {
        await voting.mockIncreaseTime(VOTING_DURATION)
      })

      it('returns false', async () => {
        assert.isFalse(await voting.withinOverruleWindow(voteId))
      })
    })

    context('when after the end of the overrule window', () => {
      beforeEach('increase time', async () => {
        await voting.mockIncreaseTime(VOTING_DURATION + 1)
      })

      it('returns false', async () => {
        assert.isFalse(await voting.withinOverruleWindow(voteId))
      })
    })
  })

  describe('gas costs', () => {
    it('adds 65k of gas per casted vote', skipCoverage(async () => {
      const voteId1 = await createVote()
      const voteId2 = await createVote()
      const voteId3 = await createVote()

      await voting.setRepresentative(representative, true, { from: principal })
      const { receipt: { cumulativeGasUsed: oneVoteCumulativeGasUsed } } = await voting.voteOnBehalfOfMany([principal], [voteId1], [true], { from: representative })
      const { receipt: { cumulativeGasUsed: twoVotesCumulativeGasUsed } } = await voting.voteOnBehalfOfMany([principal, principal], [voteId2, voteId3], [true, true], { from: representative })

      assert.isAtMost(twoVotesCumulativeGasUsed - oneVoteCumulativeGasUsed, 65000)
    }))

    it('can delegate up to 100 votes', skipCoverage(async () => {
      const voteIds = [], principals = [], supports = []

      for (let i = 0; i < 100; i++) {
        principals.push(principal)
        voteIds.push(await createVote())
        supports.push(1 % 2 === 0)
      }

      await voting.setRepresentative(representative, true, { from: principal })
      const receipt = await voting.voteOnBehalfOfMany(principals, voteIds, supports, { from: representative })

      assertAmountOfEvents(receipt, 'CastVote', 100)
      assert.isAtMost(receipt.receipt.cumulativeGasUsed, 6.3e6)

      for (let i = 0; i < 100; i++) {
        const { yeas, nays } = await getVoteState(voteIds[i])
        assert.equal(nays.toString(), (1 % 2 === 0) ? 0 : bigExp(51, 18).toString(), 'nays does not match')
        assert.equal(yeas.toString(), (1 % 2 === 0) ? bigExp(51, 18).toString() : 0, 'yeas does not match')
        assert.equal(await getVoterState(principal, voteIds[i]), (1 % 2 === 0) ? VOTER_STATE.YEA : VOTER_STATE.NAY, 'principal should have voted')
      }
    }))
  })
})
