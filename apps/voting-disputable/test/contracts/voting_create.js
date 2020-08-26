const deployer = require('../helpers/deployer')(web3, artifacts)
const { ARAGON_OS_ERRORS, VOTING_ERRORS } = require('../helpers/errors')
const { createVote, voteScript, getVoteState } = require('../helpers/voting')

const { EMPTY_CALLS_SCRIPT } = require('@aragon/contract-helpers-test/src/aragon-os')
const { ONE_DAY, bigExp, pct16, getEventArgument } = require('@aragon/contract-helpers-test')
const { assertBn, assertRevert, assertEvent, assertAmountOfEvents } = require('@aragon/contract-helpers-test/src/asserts')

contract('Voting', ([_, owner, holder1, holder2, holder20, holder29, holder51, agreement]) => {
  let voting, token

  const CONTEXT = '0xabcdef'
  const VOTING_DURATION = 5 * ONE_DAY
  const DELEGATED_VOTING_PERIOD = ONE_DAY * 4
  const QUIET_ENDING_PERIOD = ONE_DAY
  const QUIET_ENDING_EXTENSION = ONE_DAY / 2
  const REQUIRED_SUPPORT = pct16(50)
  const MINIMUM_ACCEPTANCE_QUORUM = pct16(20)

  describe('newVote', () => {
    context('when the app was not initialized', async () => {
      beforeEach('deploy voting', async () => {
        voting = await deployer.deploy({ owner })
      })

      it('it is a forwarder', async () => {
        assert.isTrue(await voting.isForwarder())
      })

      it('fails creating a vote', async () => {
        await assertRevert(createVote({ voting, script: false }), ARAGON_OS_ERRORS.APP_AUTH_FAILED)
      })

      it('fails to forward actions', async () => {
        const { script } = await voteScript()
        await assertRevert(voting.forward(script, CONTEXT, { from: holder51 }), VOTING_ERRORS.VOTING_CANNOT_FORWARD)
      })
    })

    context('when the app was initialized', () => {
      beforeEach('deploy and initialize voting', async () => {
        token = await deployer.deployToken({})
        voting = await deployer.deployAndInitialize({ owner, requiredSupport: REQUIRED_SUPPORT, minimumAcceptanceQuorum: MINIMUM_ACCEPTANCE_QUORUM, voteDuration: VOTING_DURATION, quietEndingPeriod: QUIET_ENDING_PERIOD, quietEndingExtension: QUIET_ENDING_EXTENSION, delegatedVotingPeriod: DELEGATED_VOTING_PERIOD })
      })

      context('when there is some supply', () => {
        let voteId, receipt

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
            const receipt = await voting.forward(script, CONTEXT, { from: holder51 })

            assertAmountOfEvents(receipt, 'StartVote')
            assertEvent(receipt, 'StartVote', { expectedArgs: { voteId: 1, creator: holder51, context: CONTEXT, executionScript: script } })
          })

          it('emits an event', async () => {
            assertAmountOfEvents(receipt, 'StartVote')
            assertEvent(receipt, 'StartVote', { expectedArgs: { voteId, creator: holder51, context: CONTEXT, executionScript: script } })
          })

          it('has correct state', async () => {
            const currentSettingId = await voting.getCurrentSettingId()
            const { isOpen, isExecuted, snapshotBlock, settingId, yeas, nays, totalPower, pausedAt, pauseDuration, quietEndingExtensionDuration, executionScriptHash } = await getVoteState(voting, voteId)

            assert.isTrue(isOpen, 'vote should be open')
            assert.isFalse(isExecuted, 'vote should not be executed')
            assertBn(snapshotBlock, await web3.eth.getBlockNumber() - 1, 'snapshot block should be correct')
            assertBn(settingId, currentSettingId, 'required support should be app required support')
            assertBn(yeas, 0, 'initial yea should be 0')
            assertBn(nays, 0, 'initial nay should be 0')
            assertBn(totalPower, bigExp(100, 18), 'total voting power should be 100')
            assertBn(pausedAt, 0, 'paused at does not match')
            assertBn(pauseDuration, 0, 'pause duration does not match')
            assertBn(quietEndingExtensionDuration, 0, 'quiet ending extended seconds does not match')
            assert.equal(executionScriptHash, web3.utils.sha3(script), 'script should be correct')
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
            await voting.mockIncreaseTime(VOTING_DURATION)
            await voting.executeVote(voteId, EMPTY_CALLS_SCRIPT)

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

            const { snapshotBlock, totalPower } = await getVoteState(voting, voteId)

            // Generating tokens advanced the block by one
            assertBn(snapshotBlock, await web3.eth.getBlockNumber() - 2, 'snapshot block should be correct')
            assertBn(totalPower, await token.totalSupplyAt(snapshotBlock), 'total voting power should match snapshot supply')
            assertBn(totalPower, 2, 'total voting power should be correct')
          })

          it('uses the correct snapshot value if tokens are minted in the same block', async () => {
            // Create vote and generate some tokens in the same transaction
            // Requires the voting mock to be the token's owner
            await token.changeController(voting.address)
            const receipt = await voting.newTokenAndVote(holder2, 1, CONTEXT)
            voteId = getEventArgument(receipt, 'StartVote', 'voteId')

            const { snapshotBlock, totalPower } = await getVoteState(voting, voteId)

            assertBn(snapshotBlock, await web3.eth.getBlockNumber() - 1, 'snapshot block should be correct')
            assertBn(totalPower, await token.totalSupplyAt(snapshotBlock), 'total voting power should match snapshot supply')
            assertBn(totalPower, 2, 'total voting power should be correct')
          })
        })
      })

      context('when there is no supply', () => {
        it('reverts', async () => {
          await assertRevert(createVote({ voting, script: false }), VOTING_ERRORS.VOTING_NO_TOTAL_VOTING_POWER)
        })
      })
    })
  })
})
