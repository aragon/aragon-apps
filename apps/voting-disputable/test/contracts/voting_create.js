const deployer = require('../helpers/deployer')(web3, artifacts)
const { ARAGON_OS_ERRORS, VOTING_ERRORS } = require('../helpers/errors')
const { VOTER_STATE, createVote, voteScript, getVoteState } = require('../helpers/voting')

const { ONE_DAY, bigExp, pct16, getEventArgument } = require('@aragon/contract-helpers-test')
const { assertBn, assertRevert, assertEvent, assertAmountOfEvents } = require('@aragon/contract-helpers-test/src/asserts')

contract('Voting', ([_, owner, holder1, holder2, holder20, holder29, holder51, nonHolder]) => {
  let voting, token

  const CONTEXT = '0xabcdef'
  const VOTE_DURATION = 5 * ONE_DAY
  const OVERRULE_WINDOW = ONE_DAY
  const EXECUTION_DELAY = 0
  const QUIET_ENDING_PERIOD = ONE_DAY
  const QUIET_ENDING_EXTENSION = ONE_DAY / 2
  const REQUIRED_SUPPORT = pct16(50)
  const MINIMUM_ACCEPTANCE_QUORUM = pct16(20)

  beforeEach('deploy voting', async () => {
    voting = await deployer.deploy({ owner })
  })

  describe('newVote', () => {
    it('it is a forwarder', async () => {
      assert.isTrue(await voting.isForwarder())
    })

    context('when the app was not initialized', async () => {
      it('fails creating a vote', async () => {
        await assertRevert(createVote({ voting, script: false }), ARAGON_OS_ERRORS.APP_AUTH_FAILED)
      })

      it('fails to forward actions', async () => {
        const { script } = await voteScript()
        await assertRevert(voting.forward(script, { from: holder51 }), VOTING_ERRORS.VOTING_CANNOT_FORWARD)
      })
    })

    context('when the app was initialized', () => {
      beforeEach('initialize voting', async () => {
        token = await deployer.deployToken({})
        await voting.initialize(token.address, REQUIRED_SUPPORT, MINIMUM_ACCEPTANCE_QUORUM, VOTE_DURATION, OVERRULE_WINDOW, QUIET_ENDING_PERIOD, QUIET_ENDING_EXTENSION, EXECUTION_DELAY)
      })

      context('when there is some supply', () => {
        let voteId

        context('with normal token supply', () => {
          let script, executionTarget

          beforeEach('mint tokens', async () => {
            await deployer.token.generateTokens(holder51, bigExp(51, 18))
            await deployer.token.generateTokens(holder29, bigExp(29, 18))
            await deployer.token.generateTokens(holder20, bigExp(20, 18))
          })

          beforeEach('build script', async () => {
            ({ script, executionTarget } = await voteScript())
          })

          beforeEach('create vote', async () => {
            ({ voteId, receipt } = await createVote({ voting, script, voteContext: CONTEXT, from: holder51 }))
          })

          it('can be forwarded', async () => {
            const receipt = await voting.forward(script, { from: holder51 })
            voteId = getEventArgument(receipt, 'StartVote', 'voteId')

            assertBn(voteId, 1, 'voting should have been created')
          })

          it('emits an event', async () => {
            assertAmountOfEvents(receipt, 'StartVote')
            assertEvent(receipt, 'StartVote', { expectedArgs: { voteId, creator: holder51, context: CONTEXT } })
          })

          it('has correct state', async () => {
            const { isOpen, isExecuted, snapshotBlock, support, quorum, overruleWindow, executionDelay, yeas, nays, votingPower, script: execScript } = await getVoteState(voting, voteId)

            assert.isTrue(isOpen, 'vote should be open')
            assert.isFalse(isExecuted, 'vote should not be executed')
            assertBn(snapshotBlock, await web3.eth.getBlockNumber() - 1, 'snapshot block should be correct')
            assertBn(support, REQUIRED_SUPPORT, 'required support should be app required support')
            assertBn(quorum, MINIMUM_ACCEPTANCE_QUORUM, 'min quorum should be app min quorum')
            assertBn(overruleWindow, OVERRULE_WINDOW, 'default overrule window should be correct')
            assertBn(executionDelay, EXECUTION_DELAY, 'default execution delay should be correct')
            assertBn(yeas, 0, 'initial yea should be 0')
            assertBn(nays, 0, 'initial nay should be 0')
            assertBn(votingPower, bigExp(100, 18), 'voting power should be 100')
            assert.equal(execScript, script, 'script should be correct')
            assertBn(await voting.getVoterState(voteId, nonHolder), VOTER_STATE.ABSENT, 'nonHolder should not have voted')
          })

          it('fails getting a vote out of bounds', async () => {
            await assertRevert(voting.getVote(voteId + 1), VOTING_ERRORS.VOTING_NO_VOTE)
          })
        })

        context('token supply = 1', () => {
          beforeEach('mint tokens', async () => {
            await token.generateTokens(holder1, 1)
          })

          it('new vote cannot be executed before voting', async () => {
            // Account creating vote does not have any tokens and therefore doesn't vote
            ({ voteId } = await createVote({ voting, script: false }))

            assert.isFalse(await voting.canExecute(voteId), 'vote cannot be executed')

            await voting.vote(voteId, true, { from: holder1 })
            await voting.mockIncreaseTime(VOTE_DURATION)
            await voting.executeVote(voteId)

            const { isOpen, isExecuted } = await getVoteState(voting, voteId)

            assert.isFalse(isOpen, 'vote should be closed')
            assert.isTrue(isExecuted, 'vote should have been executed')
          })

          it('creates a vote without executing', async () => {
            ({ voteId } = await createVote({ voting, script: false, from: holder1 }))

            const { isOpen, isExecuted } = await getVoteState(voting, voteId)
            assert.isTrue(isOpen, 'vote should be open')
            assert.isFalse(isExecuted, 'vote should not have been executed')
          })
        })

        context('token supply = 3', () => {
          beforeEach('mint tokens', async () => {
            await token.generateTokens(holder1, 1)
            await token.generateTokens(holder2, 2)
          })

          it('new vote cannot be executed even after holder2 voting', async () => {
            ({ voteId } = await createVote({ voting, script: false }))

            await voting.vote(voteId, true, { from: holder1 })
            await voting.vote(voteId, true, { from: holder2 })

            const { isOpen, isExecuted } = await getVoteState(voting, voteId)
            assert.isTrue(isOpen, 'vote should still be open')
            assert.isFalse(isExecuted, 'vote should have not been executed')
            assert.isFalse(await voting.canExecute(voteId), 'vote cannot be executed')
          })

          it('creating vote as holder2 does not execute vote', async () => {
            ({ voteId } = await createVote({ voting, script: false, from: holder2 }))

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
            ({ voteId } = await createVote({ voting, script: false }))
            await token.generateTokens(holder2, 1)

            const { snapshotBlock, votingPower } = await getVoteState(voting, voteId)

            // Generating tokens advanced the block by one
            assertBn(snapshotBlock, await web3.eth.getBlockNumber() - 2, 'snapshot block should be correct')
            assertBn(votingPower, await token.totalSupplyAt(snapshotBlock), 'voting power should match snapshot supply')
            assertBn(votingPower, 2, 'voting power should be correct')
          })

          it('uses the correct snapshot value if tokens are minted in the same block', async () => {
            // Create vote and generate some tokens in the same transaction
            // Requires the voting mock to be the token's owner
            await token.changeController(voting.address)
            const receipt = await voting.newTokenAndVote(holder2, 1, CONTEXT)
            voteId = getEventArgument(receipt, 'StartVote', 'voteId')

            const { snapshotBlock, votingPower } = await getVoteState(voting, voteId)

            assertBn(snapshotBlock, await web3.eth.getBlockNumber() - 1, 'snapshot block should be correct')
            assertBn(votingPower, await token.totalSupplyAt(snapshotBlock), 'voting power should match snapshot supply')
            assertBn(votingPower, 2, 'voting power should be correct')
          })
        })
      })

      context('when there is no supply', () => {
        it('reverts', async () => {
          await assertRevert(createVote({ voting, script: false }), VOTING_ERRORS.VOTING_NO_VOTING_POWER)
        })
      })
    })
  })
})
