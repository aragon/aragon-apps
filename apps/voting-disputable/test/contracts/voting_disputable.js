const { toAscii, utf8ToHex } = require('web3-utils')
const { RULINGS } = require('@aragon/apps-agreement/test/helpers/utils/enums')
const { assertBn, assertRevert } = require('@aragon/contract-helpers-test/src/asserts')
const { ONE_DAY, pct16, bigExp, bn } = require('@aragon/contract-helpers-test')
const { createVote, voteScript, getVoteState } = require('../helpers/voting')

const votingDeployer = require('../helpers/deployer')(web3, artifacts)
const agreementDeployer = require('@aragon/apps-agreement/test/helpers/utils/deployer')(web3, artifacts)

const VOTE_STATUS = {
  ACTIVE: 0,
  PAUSED: 1,
  CANCELLED: 2,
  EXECUTED: 3,
}

contract('Voting disputable', ([_, owner, voter51, voter49]) => {
  let voting, token, agreement, voteId, actionId, collateralToken, executionTarget, script

  const MIN_QUORUM = pct16(20)
  const MIN_SUPPORT = pct16(50)
  const VOTING_DURATION = ONE_DAY * 5
  const OVERRULE_WINDOW = ONE_DAY
  const CONTEXT = utf8ToHex('some context')

  before('deploy agreement and base voting', async () => {
    agreement = await agreementDeployer.deployAndInitializeAgreementWrapper({ owner })
    collateralToken = await agreementDeployer.deployCollateralToken()
    votingDeployer.previousDeploy = agreementDeployer.previousDeploy

    await agreement.sign(voter51)
    await votingDeployer.deployBase({ owner, agreement: true })
  })

  before('mint vote tokens', async () => {
    token = await votingDeployer.deployToken({})
    await token.generateTokens(voter51, bigExp(51, 18))
    await token.generateTokens(voter49, bigExp(49, 18))
  })

  beforeEach('create voting app', async () => {
    voting = await votingDeployer.deployAndInitialize({ owner, agreement: true, requiredSupport: MIN_SUPPORT, minimumAcceptanceQuorum: MIN_QUORUM, voteDuration: VOTING_DURATION, overruleWindow: OVERRULE_WINDOW })
    await voting.mockSetTimestamp(await agreement.currentTimestamp())

    const SET_AGREEMENT_ROLE = await voting.SET_AGREEMENT_ROLE()
    await votingDeployer.acl.createPermission(agreement.address, voting.address, SET_AGREEMENT_ROLE, owner, { from: owner })
    await agreement.activate({ disputable: voting, collateralToken, actionCollateral: 0, challengeCollateral: 0, challengeDuration: ONE_DAY, from: owner })
  })

  beforeEach('create script', async () => {
    ({ executionTarget, script } = await voteScript())
  })

  beforeEach('create vote', async () => {
    ({ voteId } = await createVote({ voting, script, voteContext: CONTEXT, from: voter51 }))
    actionId = (await voting.getVoteDisputableInfo(voteId))[0]
  })

  describe('newVote', () => {
    it('saves the agreement action data', async () => {
      const { pausedAt, pauseDuration, status } = await voting.getVoteDisputableInfo(voteId)

      assertBn(actionId, 1, 'action ID does not match')
      assertBn(pausedAt, 0, 'paused at does not match')
      assertBn(pauseDuration, 0, 'pause duration does not match')
      assertBn(status, VOTE_STATUS.ACTIVE, 'vote status does not match')
    })

    it('registers a new action in the agreement', async () => {
      const { disputable, disputableActionId, collateralRequirementId, context, closed, submitter } = await agreement.getAction(actionId)

      assertBn(disputableActionId, voteId, 'disputable ID does not match')
      assert.equal(disputable, voting.address, 'disputable address does not match')
      assertBn(collateralRequirementId, 1, 'collateral ID does not match')
      assert.equal(toAscii(context), 'some context', 'context does not match')
      assert.equal(submitter, voter51, 'action submitter does not match')
      assert.isFalse(closed, 'action is not closed')
    })

    it('cannot be paused if ready to be executed', async () => {
      await voting.vote(voteId, true, { from: voter51 })
      await voting.mockIncreaseTime(VOTING_DURATION)

      await assertRevert(agreement.challenge({ actionId }), 'AGR_CANNOT_CHALLENGE_ACTION')
    })
  })

  describe('execute', () => {
    beforeEach('vote', async () => {
      await voting.vote(voteId, true, { from: voter51 })
      await voting.mockIncreaseTime(VOTING_DURATION)
      await voting.executeVote(voteId)
    })

    it('changes the disputable state to closed', async () => {
      const { actionId: voteActionId, pausedAt, pauseDuration, status } = await voting.getVoteDisputableInfo(voteId)
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
      assert.equal(submitter, voter51, 'action submitter does not match')
    })

    it('cannot be paused', async () => {
      await assertRevert(agreement.challenge({ actionId }), 'AGR_CANNOT_CHALLENGE_ACTION')
    })
  })

  describe('challenge', () => {
    let currentTimestamp

    beforeEach('challenge vote', async () => {
      currentTimestamp = await voting.getTimestampPublic()
      await agreement.challenge({ actionId })
    })

    it('pauses the vote', async () => {
      const { actionId: voteActionId, pausedAt, pauseDuration, status } = await voting.getVoteDisputableInfo(voteId)
      assertBn(status, VOTE_STATUS.PAUSED, 'vote status does not match')

      assertBn(voteActionId, actionId, 'action ID does not match')
      assertBn(pausedAt, currentTimestamp, 'paused at does not match')
      assertBn(pauseDuration, 0, 'pause duration does not match')
    })

    it('does not allow a voter to vote', async () => {
      assert.isFalse(await voting.canVote(voteId, voter49), 'voter can vote')

      await assertRevert(voting.vote(voteId, false, { from: voter49 }), 'VOTING_CANNOT_VOTE')
    })

    it('does not allow to execute the vote', async () => {
      assert.isFalse(await voting.canExecute(voteId), 'voting can be executed')
      await assertRevert(voting.executeVote(voteId), 'VOTING_CANNOT_EXECUTE')

      await voting.mockIncreaseTime(VOTING_DURATION)

      assert.isFalse(await voting.canExecute(voteId), 'voting can be executed')
      await assertRevert(voting.executeVote(voteId), 'VOTING_CANNOT_EXECUTE')
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
      await agreement.challenge({ actionId })

      currentTimestamp = pauseTimestamp.add(bn(ONE_DAY))
      await voting.mockSetTimestamp(currentTimestamp)
    })

    const itResumesTheVote = () => {
      it('resumes the vote', async () => {
        const { actionId: voteActionId, pausedAt, pauseDuration, status } = await voting.getVoteDisputableInfo(voteId)
        assertBn(status, VOTE_STATUS.ACTIVE, 'vote status does not match')

        assertBn(voteActionId, actionId, 'action ID does not match')
        assertBn(pausedAt, pauseTimestamp, 'paused at does not match')
        assertBn(pauseDuration, ONE_DAY, 'pause duration does not match')
      })

      it('allows voter to vote and execute', async () => {
        assert.isTrue(await voting.canVote(voteId, voter51), 'voter cannot vote')
        await voting.vote(voteId, true, { from: voter51 })
        await voting.mockIncreaseTime(VOTING_DURATION)

        assert.isTrue(await voting.canExecute(voteId), 'voting cannot be executed')
        await voting.executeVote(voteId)
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
        const voteTime = await voting.voteTime()
        const beforeVoteEndDate = currentTimestamp.add(voteTime).sub(bn(1))
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

      it('cannot be challenged again', async () => {
        assert.isFalse(await voting.canChallenge(voteId), 'vote should not be challenged')

        await assertRevert(agreement.challenge({ actionId }), 'AGR_CANNOT_CHALLENGE_ACTION')
      })
    }

    context('when allowed', () => {
      beforeEach('dispute and allow vote', async () => {
        await agreement.dispute({ actionId })
        await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER })
      })

      itResumesTheVote()
    })

    context('when voided', () => {
      beforeEach('dispute and void vote', async () => {
        await agreement.dispute({ actionId })
        await agreement.executeRuling({ actionId, ruling: RULINGS.REFUSED })
      })

      itResumesTheVote()
    })
  })

  describe('cancelled', () => {
    let pauseTimestamp, currentTimestamp

    beforeEach('challenge vote', async () => {
      pauseTimestamp = await voting.getTimestampPublic()
      await agreement.challenge({ actionId })

      currentTimestamp = pauseTimestamp.add(bn(ONE_DAY))
      await voting.mockSetTimestamp(currentTimestamp)
    })

    const itCancelsTheVote = () => {
      it('cancels the vote', async () => {
        const { actionId: voteActionId, pausedAt, pauseDuration, status } = await voting.getVoteDisputableInfo(voteId)
        assertBn(status, VOTE_STATUS.CANCELLED, 'vote status does not match')

        assertBn(voteActionId, actionId, 'action ID does not match')
        assertBn(pausedAt, pauseTimestamp, 'paused at does not match')
        assertBn(pauseDuration, ONE_DAY, 'pause duration does not match')
      })

      it('does not allow a voter to vote', async () => {
        assert.isFalse(await voting.canVote(voteId, voter49), 'voter can vote')

        await assertRevert(voting.vote(voteId, false, { from: voter49 }), 'VOTING_CANNOT_VOTE')
      })

      it('does not allow to execute the vote', async () => {
        assert.isFalse(await voting.canExecute(voteId), 'voting can be executed')

        await assertRevert(voting.executeVote(voteId), 'VOTING_CANNOT_EXECUTE')
      })

      it('marks the vote as closed', async () => {
        const voteTime = await voting.voteTime()
        const beforeVoteEndDate = currentTimestamp.add(voteTime).sub(bn(1))
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
  })
})
