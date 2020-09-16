const deployer = require('../helpers/deployer')(web3, artifacts)
const { VOTING_ERRORS } = require('../helpers/errors')
const { VOTE_STATUS, VOTER_STATE, createVote, voteScript, getVoteState } = require('../helpers/voting')

const { toAscii, utf8ToHex } = require('web3-utils')
const { RULINGS } = require('@aragon/apps-agreement/test/helpers/utils/enums')
const { ONE_DAY, pct16, bigExp, bn } = require('@aragon/contract-helpers-test')
const { assertBn, assertRevert, assertEvent, assertAmountOfEvents } = require('@aragon/contract-helpers-test/src/asserts')

contract('Voting disputable', ([_, owner, representative, voter10, voter20, voter29, voter40]) => {
  let voting, token, agreement, voteId, actionId, executionTarget, script

  const MIN_QUORUM = pct16(10)
  const MIN_SUPPORT = pct16(50)
  const VOTING_DURATION = ONE_DAY * 5
  const DELEGATED_VOTING_PERIOD = ONE_DAY * 4
  const QUIET_ENDING_PERIOD = ONE_DAY * 2
  const QUIET_ENDING_EXTENSION = ONE_DAY
  const CONTEXT = utf8ToHex('some context')

  before('deploy and sign agreement', async () => {
    agreement = await deployer.deployAgreement({ owner })
    await agreement.sign({ from: voter40 })
  })

  before('mint vote tokens', async () => {
    token = await deployer.deployToken({})
    await token.generateTokens(voter40, bigExp(40, 18))
    await token.generateTokens(voter29, bigExp(29, 18))
    await token.generateTokens(voter20, bigExp(20, 18))
    await token.generateTokens(voter10, bigExp(10, 18))
  })

  beforeEach('create voting app', async () => {
    voting = await deployer.deployAndInitialize({ owner, requiredSupport: MIN_SUPPORT, minimumAcceptanceQuorum: MIN_QUORUM, voteDuration: VOTING_DURATION, quietEndingPeriod: QUIET_ENDING_PERIOD, quietEndingExtension: QUIET_ENDING_EXTENSION, delegatedVotingPeriod: DELEGATED_VOTING_PERIOD })
  })

  beforeEach('create script', async () => {
    ({ executionTarget, script } = await voteScript())
  })

  beforeEach('create vote', async () => {
    ({ voteId } = await createVote({ voting, script, voteContext: CONTEXT, from: voter40 }))
    actionId = (await voting.getVote(voteId)).actionId
  })

  describe('newVote', () => {
    it('saves the agreement action data', async () => {
      const { pausedAt, pauseDuration, status } = await getVoteState(voting, voteId)

      assertBn(actionId, 1, 'action ID does not match')
      assertBn(pausedAt, 0, 'paused at does not match')
      assertBn(pauseDuration, 0, 'pause duration does not match')
      assertBn(status, VOTE_STATUS.NORMAL, 'vote status does not match')
    })

    it('registers a new action in the agreement', async () => {
      const { disputable, disputableActionId, collateralRequirementId, context, closed, submitter } = await agreement.getAction(actionId)

      assertBn(disputableActionId, voteId, 'disputable ID does not match')
      assert.equal(disputable, voting.address, 'disputable address does not match')
      assertBn(collateralRequirementId, 1, 'collateral ID does not match')
      assert.equal(toAscii(context), 'some context', 'context does not match')
      assert.equal(submitter, voter40, 'action submitter does not match')
      assert.isFalse(closed, 'action is not closed')
    })

    it('cannot be paused if ready to be executed', async () => {
      await voting.vote(voteId, true, { from: voter40 })
      await voting.mockIncreaseTime(VOTING_DURATION)

      await assertRevert(agreement.challenge({ actionId }), 'AGR_CANNOT_CHALLENGE_ACTION')
    })
  })

  describe('execute', () => {
    beforeEach('vote', async () => {
      await voting.vote(voteId, true, { from: voter40 })
      await voting.mockIncreaseTime(VOTING_DURATION)
      await voting.executeVote(voteId, script)
    })

    it('changes the disputable state to closed', async () => {
      const { actionId: voteActionId, pausedAt, pauseDuration, status } = await getVoteState(voting, voteId)
      assertBn(status, VOTE_STATUS.EXECUTED, 'vote status does not match')

      assertBn(voteActionId, actionId, 'action ID does not match')
      assertBn(pausedAt, 0, 'paused at does not match')
      assertBn(pauseDuration, 0, 'pause duration does not match')
    })

    it('closes the action on the agreement and executed the vote', async () => {
      assertBn(await executionTarget.counter(), 1, 'vote was not executed')

      const { disputable, disputableActionId, collateralRequirementId, context, closed, submitter } = await agreement.getAction(actionId)
      assert.isTrue(closed, 'action is not closed')

      assertBn(disputableActionId, voteId, 'disputable ID does not match')
      assert.equal(disputable, voting.address, 'disputable address does not match')
      assertBn(collateralRequirementId, 1, 'collateral ID does not match')
      assert.equal(toAscii(context), 'some context', 'context does not match')
      assert.equal(submitter, voter40, 'action submitter does not match')
    })

    it('cannot be paused', async () => {
      await assertRevert(agreement.challenge({ actionId }), 'AGR_CANNOT_CHALLENGE_ACTION')
    })
  })

  describe('challenge', () => {
    let currentTimestamp

    beforeEach('challenge vote', async () => {
      currentTimestamp = await voting.getTimestampPublic()
      await voting.vote(voteId, true, { from: voter40 })
      await agreement.challenge({ actionId })
    })

    it('pauses the vote', async () => {
      const { actionId: voteActionId, pausedAt, pauseDuration, status } = await getVoteState(voting, voteId)
      assertBn(status, VOTE_STATUS.PAUSED, 'vote status does not match')

      assertBn(voteActionId, actionId, 'action ID does not match')
      assertBn(pausedAt, currentTimestamp, 'paused at does not match')
      assertBn(pauseDuration, 0, 'pause duration does not match')
    })

    it('does not allow a voter to vote', async () => {
      assert.isFalse(await voting.canVote(voteId, voter29), 'voter can vote')

      await assertRevert(voting.vote(voteId, false, { from: voter29 }), VOTING_ERRORS.VOTING_CANNOT_VOTE)
    })

    it('does not allow to execute the vote', async () => {
      assert.isFalse(await voting.canExecute(voteId), 'voting can be executed')
      await assertRevert(voting.executeVote(voteId, script), VOTING_ERRORS.VOTING_CANNOT_EXECUTE)

      await voting.mockIncreaseTime(VOTING_DURATION)

      assert.isFalse(await voting.canExecute(voteId), 'voting can be executed')
      await assertRevert(voting.executeVote(voteId, script), VOTING_ERRORS.VOTING_CANNOT_EXECUTE)
    })

    it('marks the vote as closed', async () => {
      const { isOpen, isExecuted } = await getVoteState(voting, voteId)

      assert.isFalse(isOpen, 'vote is open')
      assert.isFalse(isExecuted, 'vote is executed')
    })

    it('cannot be paused twice', async () => {
      await assertRevert(agreement.challenge({ actionId }), 'AGR_CANNOT_CHALLENGE_ACTION')
    })
  })

  describe('resumes', () => {
    let pauseTimestamp, currentTimestamp

    beforeEach('challenge vote', async () => {
      pauseTimestamp = await voting.getTimestampPublic()
      await voting.vote(voteId, true, { from: voter20 })
      await agreement.challenge({ actionId })

      currentTimestamp = pauseTimestamp.add(bn(ONE_DAY))
      await voting.mockSetTimestamp(currentTimestamp)
    })

    context('when allowed', () => {
      beforeEach('dispute and allow vote', async () => {
        await agreement.dispute({ actionId })
        await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER })
      })

      it('resumes the vote', async () => {
        const { actionId: voteActionId, pausedAt, pauseDuration, status } = await getVoteState(voting, voteId)
        assertBn(status, VOTE_STATUS.NORMAL, 'vote status does not match')

        assertBn(voteActionId, actionId, 'action ID does not match')
        assertBn(pausedAt, pauseTimestamp, 'paused at does not match')
        assertBn(pauseDuration, ONE_DAY, 'pause duration does not match')
      })

      it('allows voter to vote and execute', async () => {
        assert.isTrue(await voting.canVote(voteId, voter29), 'voter cannot vote')
        await voting.vote(voteId, true, { from: voter29 })
        await voting.mockIncreaseTime(VOTING_DURATION)

        assert.isTrue(await voting.canExecute(voteId), 'voting cannot be executed')
        await voting.executeVote(voteId, script)
        assertBn(await executionTarget.counter(), 1, 'vote was not executed')

        const { closed } = await agreement.getAction(actionId)
        assert.isTrue(closed, 'action is not closed')
      })

      it('marks the vote as open', async () => {
        const { isOpen, isExecuted } = await getVoteState(voting, voteId)

        assert.isTrue(isOpen, 'vote is not open')
        assert.isFalse(isExecuted, 'vote is executed')
      })

      it('does not affect the voting period', async () => {
        const beforeVoteEndDate = currentTimestamp.add(bn(VOTING_DURATION)).sub(bn(1))
        await voting.mockSetTimestamp(beforeVoteEndDate)

        const { isOpen: isOpenBeforeEndDate } = await getVoteState(voting, voteId)
        assert.isTrue(isOpenBeforeEndDate, 'vote is not open before end date')

        await voting.mockIncreaseTime(1)

        const { isOpen: isOpenAtVoteEndDate } = await getVoteState(voting, voteId)
        assert.isFalse(isOpenAtVoteEndDate, 'vote is open at end date')

        await voting.mockIncreaseTime(1)

        const { isOpen: isOpenAtAfterEndDate } = await getVoteState(voting, voteId)
        assert.isFalse(isOpenAtAfterEndDate, 'vote is open after end date')
      })

      it('does not affect the delegated voting period', async () => {
        // the vote duration is 5 days and the delegated voting window is 4 days
        await voting.setRepresentative(representative, { from: voter40 })
        assert.isTrue(await voting.canVoteOnBehalfOf(voteId, [voter40], representative), 'should be able to vote')

        // move fwd just 1 day
        await voting.mockIncreaseTime(ONE_DAY)
        assert.isTrue(await voting.canVoteOnBehalfOf(voteId, [voter40], representative), 'should be able to vote')

        // move fwd right before the end of delegated voting period
        await voting.mockIncreaseTime(ONE_DAY * 3 - 1)
        assert.isTrue(await voting.canVoteOnBehalfOf(voteId, [voter40], representative), 'should be able to vote')

        // move fwd right at the end of the delegated voting period
        await voting.mockIncreaseTime(1)
        assert.isFalse(await voting.canVoteOnBehalfOf(voteId, [voter40], representative), 'should not be able to vote')
      })

      it('does not affect the quiet ending period', async () => {
        // move fwd right before the quiet ending period starts
        const beforeQuietEnding = currentTimestamp.add(bn(VOTING_DURATION)).sub(bn(QUIET_ENDING_PERIOD + 1))
        await voting.mockSetTimestamp(beforeQuietEnding)
        const firstReceipt = await voting.vote(voteId, false, { from: voter29 })
        assertAmountOfEvents(firstReceipt, 'QuietEndingExtendVote', { expectedAmount: 0 })

        const firstVoteState = await getVoteState(voting, voteId)
        assertBn(firstVoteState.quietEndingSnapshotSupport, VOTER_STATE.ABSENT, 'quiet ending snapshot does not match')

        // force flipped vote, move within quiet ending period
        await voting.mockIncreaseTime(QUIET_ENDING_PERIOD / 2)
        const secondReceipt = await voting.vote(voteId, true, { from: voter40 })
        assertAmountOfEvents(secondReceipt, 'QuietEndingExtendVote', { expectedAmount: 0 })

        const secondVoteState = await getVoteState(voting, voteId)
        assertBn(secondVoteState.quietEndingSnapshotSupport, VOTER_STATE.NAY, 'quiet ending snapshot does not match')

        // move after the end of the vote and vote
        await voting.mockIncreaseTime(QUIET_ENDING_PERIOD / 2 + QUIET_ENDING_EXTENSION / 2)
        assert.isTrue(await voting.canVote(voteId, voter10), 'voter cannot vote')
        const thirdReceipt = await voting.vote(voteId, true, { from: voter10 })
        assertAmountOfEvents(thirdReceipt, 'QuietEndingExtendVote', { expectedAmount: 1 })
        assertEvent(thirdReceipt, 'QuietEndingExtendVote', { voteId, passing: true })

        const thirdVoteState = await getVoteState(voting, voteId)
        assertBn(thirdVoteState.quietEndingSnapshotSupport, VOTER_STATE.NAY, 'quiet ending snapshot does not match')
      })

      it('cannot be challenged again', async () => {
        assert.isFalse(await voting.canChallenge(voteId), 'vote should not be challenged')

        await assertRevert(agreement.challenge({ actionId }), 'AGR_CANNOT_CHALLENGE_ACTION')
      })
    })
  })

  describe('cancelled', () => {
    let pauseTimestamp, currentTimestamp

    beforeEach('challenge vote', async () => {
      pauseTimestamp = await voting.getTimestampPublic()
      await voting.vote(voteId, true, { from: voter20 })
      await agreement.challenge({ actionId })

      currentTimestamp = pauseTimestamp.add(bn(ONE_DAY))
      await voting.mockSetTimestamp(currentTimestamp)
    })

    const itCancelsTheVote = () => {
      it('cancels the vote', async () => {
        const { actionId: voteActionId, pausedAt, pauseDuration, status } = await getVoteState(voting, voteId)
        assertBn(status, VOTE_STATUS.CANCELLED, 'vote status does not match')

        assertBn(voteActionId, actionId, 'action ID does not match')
        assertBn(pausedAt, pauseTimestamp, 'paused at does not match')
        assertBn(pauseDuration, ONE_DAY, 'pause duration does not match')
      })

      it('does not allow a voter to vote', async () => {
        assert.isFalse(await voting.canVote(voteId, voter29), 'voter can vote')

        await assertRevert(voting.vote(voteId, false, { from: voter29 }), VOTING_ERRORS.VOTING_CANNOT_VOTE)
      })

      it('does not allow to execute the vote', async () => {
        assert.isFalse(await voting.canExecute(voteId), 'voting can be executed')
        await assertRevert(voting.executeVote(voteId, script), VOTING_ERRORS.VOTING_CANNOT_EXECUTE)

        await voting.mockIncreaseTime(VOTING_DURATION)

        assert.isFalse(await voting.canExecute(voteId), 'voting can be executed')
        await assertRevert(voting.executeVote(voteId, script), VOTING_ERRORS.VOTING_CANNOT_EXECUTE)
      })

      it('marks the vote as closed', async () => {
        const beforeVoteEndDate = currentTimestamp.add(bn(VOTING_DURATION)).sub(bn(1))
        await voting.mockSetTimestamp(beforeVoteEndDate)

        const { isOpen: isOpenBeforeEndDate } = await getVoteState(voting, voteId)
        assert.isFalse(isOpenBeforeEndDate, 'vote is open before end date')

        await voting.mockIncreaseTime(1)

        const { isOpen: isOpenAtVoteEndDate } = await getVoteState(voting, voteId)
        assert.isFalse(isOpenAtVoteEndDate, 'vote is open at end date')

        await voting.mockIncreaseTime(1)

        const { isOpen: isOpenAtAfterEndDate } = await getVoteState(voting, voteId)
        assert.isFalse(isOpenAtAfterEndDate, 'vote is open after end date')
      })

      it('cannot be challenged again', async () => {
        assert.isFalse(await voting.canChallenge(voteId), 'vote can be challenged')

        await assertRevert(agreement.challenge({ actionId }), 'AGR_CANNOT_CHALLENGE_ACTION')
      })
    }

    context('when settled', () => {
      beforeEach('settle vote', async () => {
        await agreement.settle({ actionId })
      })

      itCancelsTheVote()
    })

    context('when rejected', () => {
      beforeEach('dispute and reject vote', async () => {
        await agreement.dispute({ actionId })
        await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER })
      })

      itCancelsTheVote()
    })

    context('when voided', () => {
      beforeEach('dispute and void vote', async () => {
        await agreement.dispute({ actionId })
        await agreement.executeRuling({ actionId, ruling: RULINGS.REFUSED })
      })

      itCancelsTheVote()
    })
  })
})
