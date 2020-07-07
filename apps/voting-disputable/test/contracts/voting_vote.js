const VOTER_STATE = require('../helpers/state')
const getBlockNumber = require('@aragon/contract-test-helpers/blockNumber')(web3)

const { DAY } = require('@aragon/apps-agreement/test/helpers/lib/time')
const { assertBn } = require('@aragon/apps-agreement/test/helpers/assert/assertBn')
const { bn, bigExp } = require('@aragon/apps-agreement/test/helpers/lib/numbers')
const { assertRevert } = require('@aragon/apps-agreement/test/helpers/assert/assertThrow')
const { pct, getVoteState } = require('../helpers/voting')
const { encodeCallScript } = require('@aragon/contract-test-helpers/evmScript')
const { getEventArgument } = require('@aragon/contract-test-helpers/events')
const { ARAGON_OS_ERRORS, VOTING_ERRORS } = require('../helpers/errors')

const deployer = require('../helpers/deployer')(web3, artifacts)

const ExecutionTarget = artifacts.require('ExecutionTarget')

contract('Voting', ([_, owner, holder1, holder2, holder20, holder29, holder51, nonHolder]) => {
  let voting, token, executionTarget

  const CONTEXT = '0xabcdef'
  const EMPTY_SCRIPT = '0x00000001'
  const VOTE_DURATION = 5 * DAY
  const OVERRULE_WINDOW = DAY
  const REQUIRED_SUPPORT = pct(50)
  const MINIMUM_ACCEPTANCE_QUORUM = pct(20)

  const createdVoteId = receipt => getEventArgument(receipt, 'StartVote', 'voteId')

  beforeEach('deploy voting', async () => {
    voting = await deployer.deploy({ owner })
    executionTarget = await ExecutionTarget.new()
  })

  describe('newVote', () => {
    it('it is a forwarder', async () => {
      assert.isTrue(await voting.isForwarder())
    })

    context('when the app was not initialized', async () => {
      it('fails creating a vote', async () => {
        await assertRevert(voting.newVote(encodeCallScript([]), CONTEXT), ARAGON_OS_ERRORS.APP_AUTH_FAILED)
      })

      it('fails to forward actions', async () => {
        const script = encodeCallScript([{ to: executionTarget.address, calldata: executionTarget.contract.methods.execute().encodeABI() }])
        await assertRevert(voting.forward(script, { from: holder51 }), VOTING_ERRORS.VOTING_CANNOT_FORWARD)
      })
    })

    context('when the app was initialized', async () => {
      beforeEach('initialize voting', async () => {
        token = await deployer.deployToken({})
        voting.initialize(token.address, REQUIRED_SUPPORT, MINIMUM_ACCEPTANCE_QUORUM, VOTE_DURATION, OVERRULE_WINDOW)
      })

      context('when there is some supply', async () => {
        context('with normal token supply', () => {
          beforeEach('mint tokens', async () => {
            await deployer.token.generateTokens(holder51, bigExp(51, 18))
            await deployer.token.generateTokens(holder29, bigExp(29, 18))
            await deployer.token.generateTokens(holder20, bigExp(20, 18))
          })

          it('can be forwarded', async () => {
            const script = encodeCallScript([{ to: executionTarget.address, calldata: executionTarget.contract.methods.execute().encodeABI() }])
            const voteId = createdVoteId(await voting.forward(script, { from: holder51 }))
            assertBn(voteId, 0, 'voting should have been created')
          })

          context('with a normal script', () => {
            let script, voteId, creator, voteContext

            beforeEach(async () => {
              const action = { to: executionTarget.address, calldata: executionTarget.contract.methods.execute().encodeABI() }
              script = encodeCallScript([action, action])

              const receipt = await voting.newVote(script, CONTEXT, { from: holder51 })
              voteId = getEventArgument(receipt, 'StartVote', 'voteId')
              creator = getEventArgument(receipt, 'StartVote', 'creator')
              voteContext = getEventArgument(receipt, 'StartVote', 'context')
            })

            it('cannot be immediately executed', async () => {
              const script = encodeCallScript([{ to: executionTarget.address, calldata: executionTarget.contract.methods.execute().encodeABI() }])
              await voting.newVote(script, CONTEXT, { from: holder51 })
              assertBn(await executionTarget.counter(), 0, 'should have received execution call')
            })

            it('has correct state', async () => {
              const { isOpen, isExecuted, snapshotBlock, support, quorum, overruleWindow, yeas, nays, votingPower, script: execScript } = await getVoteState(voting, voteId)

              assert.isTrue(isOpen, 'vote should be open')
              assert.isFalse(isExecuted, 'vote should not be executed')
              assert.equal(creator, holder51, 'creator should be correct')
              assertBn(snapshotBlock, await getBlockNumber() - 1, 'snapshot block should be correct')
              assertBn(support, REQUIRED_SUPPORT, 'required support should be app required support')
              assertBn(quorum, MINIMUM_ACCEPTANCE_QUORUM, 'min quorum should be app min quorum')
              assertBn(overruleWindow, OVERRULE_WINDOW, 'default overrule window should be correct')
              assertBn(yeas, 0, 'initial yea should be 0')
              assertBn(nays, 0, 'initial nay should be 0')
              assertBn(votingPower, bigExp(100, 18), 'voting power should be 100')
              assert.equal(execScript, script, 'script should be correct')
              assert.equal(voteContext, CONTEXT, 'should have returned correct context')
              assertBn(await voting.getVoterState(voteId, nonHolder), VOTER_STATE.ABSENT, 'nonHolder should not have voted')
            })

            it('fails getting a vote out of bounds', async () => {
              await assertRevert(voting.getVote(voteId + 1), VOTING_ERRORS.VOTING_NO_VOTE)
            })

            it('holder can vote', async () => {
              await voting.vote(voteId, false, { from: holder29 })
              const { nays } = await getVoteState(voting, voteId)
              const voterState = await voting.getVoterState(voteId, holder29)

              assertBn(nays, bigExp(29, 18), 'nay vote should have been counted')
              assert.equal(voterState, VOTER_STATE.NAY, 'holder29 should have nay voter status')
            })

            it('holder can modify vote', async () => {
              await voting.vote(voteId, true, { from: holder29 })
              await voting.vote(voteId, false, { from: holder29 })
              await voting.vote(voteId, true, { from: holder29 })
              const { yeas, nays } = await getVoteState(voting, voteId)

              assertBn(nays, 0, 'nay vote should have been removed')
              assertBn(yeas, bigExp(29, 18), 'yea vote should have been counted')
            })

            it('token transfers dont affect voting', async () => {
              await token.transfer(nonHolder, bigExp(29, 18), { from: holder29 })

              await voting.vote(voteId, true, { from: holder29 })
              const { yeas } = await getVoteState(voting, voteId)

              assertBn(yeas, bigExp(29, 18), 'yea vote should have been counted')
              assert.equal(await token.balanceOf(holder29), 0, 'balance should be 0 at current block')
            })

            it('throws when non-holder votes', async () => {
              await assertRevert(voting.vote(voteId, true, { from: nonHolder }), VOTING_ERRORS.VOTING_CANNOT_VOTE)
            })

            it('throws when voting after voting closes', async () => {
              await voting.mockIncreaseTime(VOTE_DURATION + 1)
              await assertRevert(voting.vote(voteId, true, { from: holder29 }), VOTING_ERRORS.VOTING_CANNOT_VOTE)
            })

            it('can execute if vote is approved with support and quorum', async () => {
              await voting.vote(voteId, true, { from: holder29 })
              await voting.vote(voteId, false, { from: holder20 })
              await voting.mockIncreaseTime(VOTE_DURATION + 1)
              await voting.executeVote(voteId)
              assertBn(await executionTarget.counter(), 2, 'should have executed result')
            })

            it('cannot execute vote if not enough quorum met', async () => {
              await voting.vote(voteId, true, { from: holder20 })
              await voting.mockIncreaseTime(VOTE_DURATION + 1)
              await assertRevert(voting.executeVote(voteId), VOTING_ERRORS.VOTING_CANNOT_EXECUTE)
            })

            it('cannot execute vote if not support met', async () => {
              await voting.vote(voteId, false, { from: holder29 })
              await voting.vote(voteId, false, { from: holder20 })
              await voting.mockIncreaseTime(VOTE_DURATION + 1)
              await assertRevert(voting.executeVote(voteId), VOTING_ERRORS.VOTING_CANNOT_EXECUTE)
            })

            it('vote cannot be executed automatically if decided', async () => {
              await voting.vote(voteId, true, { from: holder51 })
              assertBn(await executionTarget.counter(), 0, 'should not have executed result')

              await voting.mockIncreaseTime(VOTE_DURATION + 1)
              await voting.executeVote(voteId)
              assertBn(await executionTarget.counter(), 2, 'should have executed result')
            })

            it('cannot re-execute vote', async () => {
              await voting.vote(voteId, true, { from: holder51 })
              await voting.mockIncreaseTime(VOTE_DURATION)
              await voting.executeVote(voteId)

              await assertRevert(voting.executeVote(voteId), VOTING_ERRORS.VOTING_CANNOT_EXECUTE)
            })

            it('cannot vote on executed vote', async () => {
              await voting.vote(voteId, true, { from: holder51 })
              await voting.mockIncreaseTime(VOTE_DURATION)
              await voting.executeVote(voteId)

              await assertRevert(voting.vote(voteId, true, { from: holder20 }), VOTING_ERRORS.VOTING_CANNOT_VOTE)
            })
          })

          context('with a particular script', async () => {
            it('can execute multiple actions', async () => {
              const action = { to: executionTarget.address, calldata: executionTarget.contract.methods.execute().encodeABI() }
              const script = encodeCallScript([action, action, action])

              const receipt = await voting.newVote(script, CONTEXT, { from: holder51 })
              const voteId = getEventArgument(receipt, 'StartVote', 'voteId')

              await voting.vote(voteId, true, { from: holder51 })
              await voting.mockIncreaseTime(VOTE_DURATION)
              await voting.executeVote(voteId)
              assertBn(await executionTarget.counter(), 3, 'should have executed multiple times')
            })

            it('can be empty', async () => {
              await voting.newVote(encodeCallScript([]), CONTEXT, { from: holder51 })
            })

            it('throws if any action in the script throws', async () => {
              let script = encodeCallScript([{ to: executionTarget.address, calldata: executionTarget.contract.methods.execute().encodeABI() }])
              script = script.slice(0, -2) // remove one byte from calldata for it to fail

              const receipt = await voting.newVote(script, CONTEXT, { from: holder51 })
              const voteId = getEventArgument(receipt, 'StartVote', 'voteId')

              await voting.mockIncreaseTime(VOTE_DURATION)
              await assertRevert(voting.executeVote(voteId))
            })
          })
        })

        context('token supply = 1', () => {
          beforeEach('mint tokens', async () => {
            await token.generateTokens(holder1, 1)
          })

          it('new vote cannot be executed before voting', async () => {
            // Account creating vote does not have any tokens and therefore doesn't vote
            const voteId = createdVoteId(await voting.newVote(EMPTY_SCRIPT, CONTEXT))

            assert.isFalse(await voting.canExecute(voteId), 'vote cannot be executed')

            await voting.vote(voteId, true, { from: holder1 })
            await voting.mockIncreaseTime(VOTE_DURATION)
            await voting.executeVote(voteId)

            const { isOpen, isExecuted } = await getVoteState(voting, voteId)

            assert.isFalse(isOpen, 'vote should be closed')
            assert.isTrue(isExecuted, 'vote should have been executed')
          })

          context('new vote parameters', () => {
            it('creates a vote without executing', async () => {
              const voteId = createdVoteId(await voting.newVote(EMPTY_SCRIPT, CONTEXT, { from: holder1 }))
              const { isOpen, isExecuted } = await getVoteState(voting, voteId)

              assert.isTrue(isOpen, 'vote should be open')
              assert.isFalse(isExecuted, 'vote should not have been executed')
            })
          })
        })

        context('token supply = 3', () => {
          beforeEach('mint tokens', async () => {
            await token.generateTokens(holder1, 1)
            await token.generateTokens(holder2, 2)
          })

          it('new vote cannot be executed even after holder2 voting', async () => {
            const voteId = createdVoteId(await voting.newVote(EMPTY_SCRIPT, CONTEXT))

            await voting.vote(voteId, true, { from: holder1 })
            await voting.vote(voteId, true, { from: holder2 })

            const { isOpen, isExecuted } = await getVoteState(voting, voteId)

            assert.isTrue(isOpen, 'vote should still be open')
            assert.isFalse(isExecuted, 'vote should have not been executed')
            assert.isFalse(await voting.canExecute(voteId), 'vote cannot be executed')
          })

          it('creating vote as holder2 does not execute vote', async () => {
            const voteId = createdVoteId(await voting.newVote(EMPTY_SCRIPT, CONTEXT, { from: holder2 }))
            const { isOpen, isExecuted } = await getVoteState(voting, voteId)

            assert.isTrue(isOpen, 'vote should still be open')
            assert.isFalse(isExecuted, 'vote should have not been executed')
            assert.isFalse(await voting.canExecute(voteId), 'vote cannot be executed')
          })
        })

        context('with changing token supply', () => {
          beforeEach('mint tokens', async () => {
            await token.generateTokens(holder1, 1)
            await token.generateTokens(holder2, 1)
          })

          it('uses the correct snapshot value if tokens are minted afterwards', async () => {
            // Create vote and afterwards generate some tokens
            const voteId = createdVoteId(await voting.newVote(EMPTY_SCRIPT, CONTEXT))
            await token.generateTokens(holder2, 1)

            const { snapshotBlock, votingPower } = await getVoteState(voting, voteId)

            // Generating tokens advanced the block by one
            assertBn(snapshotBlock, await getBlockNumber() - 2, 'snapshot block should be correct')
            assertBn(votingPower, await token.totalSupplyAt(snapshotBlock), 'voting power should match snapshot supply')
            assertBn(votingPower, 2, 'voting power should be correct')
          })

          it('uses the correct snapshot value if tokens are minted in the same block', async () => {
            // Create vote and generate some tokens in the same transaction
            // Requires the voting mock to be the token's owner
            await token.changeController(voting.address)
            const voteId = createdVoteId(await voting.newTokenAndVote(holder2, 1, CONTEXT))

            const { snapshotBlock, votingPower } = await getVoteState(voting, voteId)

            assertBn(snapshotBlock, await getBlockNumber() - 1, 'snapshot block should be correct')
            assertBn(votingPower, await token.totalSupplyAt(snapshotBlock), 'voting power should match snapshot supply')
            assertBn(votingPower, 2, 'voting power should be correct')
          })
        })
      })

      context('when there is no supply', async () => {
        it('reverts', async () => {
          await assertRevert(voting.newVote(EMPTY_SCRIPT, CONTEXT), VOTING_ERRORS.VOTING_NO_VOTING_POWER)
        })
      })
    })
  })

  describe('isValuePct', async () => {
    it('tests total = 0', async () => {
      const result1 = await voting.isValuePct(0, 0, pct(50))
      assert.equal(result1, false, 'total 0 should always return false')

      const result2 = await voting.isValuePct(1, 0, pct(50))
      assert.equal(result2, false, 'total 0 should always return false')
    })

    it('tests value = 0', async () => {
      const result1 = await voting.isValuePct(0, 10, pct(50))
      assert.equal(result1, false, 'value 0 should false if pct is non-zero')

      const result2 = await voting.isValuePct(0, 10, 0)
      assert.equal(result2, false, 'value 0 should return false if pct is zero')
    })

    it('tests pct ~= 100', async () => {
      const result1 = await voting.isValuePct(10, 10, pct(100).sub(bn(1)))
      assert.equal(result1, true, 'value 10 over 10 should pass')
    })

    it('tests strict inequality', async () => {
      const result1 = await voting.isValuePct(10, 20, pct(50))
      assert.equal(result1, false, 'value 10 over 20 should not pass for 50%')

      const result2 = await voting.isValuePct(pct(50).sub(bn(1)), pct(100), pct(50))
      assert.equal(result2, false, 'off-by-one down should not pass')

      const result3 = await voting.isValuePct(pct(50).add(bn(1)), pct(100), pct(50))
      assert.equal(result3, true, 'off-by-one up should pass')
    })
  })
})
