const { toAscii } = require('web3-utils')
const { bigExp, bn } = require('@aragon/apps-agreement/test/helpers/lib/numbers')
const { assertBn } = require('@aragon/apps-agreement/test/helpers/assert/assertBn')
const { assertRevert } = require('@aragon/apps-agreement/test/helpers/assert/assertThrow')
const { decodeEventsOfType } = require('@aragon/apps-agreement/test/helpers/lib/decodeEvent')
const { ACTIONS_STATE, RULINGS } = require('@aragon/apps-agreement/test/helpers/utils/enums')

const { pct, getVoteState } = require('../helpers/voting')
const { encodeCallScript } = require('@aragon/contract-test-helpers/evmScript')
const { getEventArgument, getNewProxyAddress } = require('@aragon/contract-test-helpers/events')

const deployer = require('@aragon/apps-agreement/test/helpers/utils/deployer')(web3, artifacts)

const Voting = artifacts.require('DisputableVotingMock')
const ExecutionTarget = artifacts.require('ExecutionTarget')

const ONE_DAY = 60 * 60 * 24
const ANY_ADDR = '0xffffffffffffffffffffffffffffffffffffffff'

const VOTE_STATUS = {
  ACTIVE: 0,
  PAUSED: 1,
  CANCELLED: 2,
  CLOSED: 3,
}

contract('Voting disputable', ([_, owner, voter51, voter49]) => {
  let votingBase, agreement, voting, token, collateralToken, executionTarget, script
  let voteId, actionId

  const MIN_QUORUM = pct(20)
  const MIN_SUPPORT = pct(50)
  const VOTING_DURATION = ONE_DAY * 5

  before('deploy agreement and base voting', async () => {
    votingBase = await Voting.new()
    agreement = await deployer.deployAndInitializeWrapper({ owner })
    collateralToken = await deployer.deployCollateralToken()
    await agreement.sign(voter51)
  })

  before('mint vote tokens', async () => {
    token = await deployer.deployToken({})
    await token.generateTokens(voter51, bigExp(51, 18))
    await token.generateTokens(voter49, bigExp(49, 18))
  })

  beforeEach('create voting app', async () => {
    const receipt = await deployer.dao.newAppInstance('0x1234', votingBase.address, '0x', false, { from: owner })
    voting = await Voting.at(getNewProxyAddress(receipt))

    const SET_AGREEMENT_ROLE = await voting.SET_AGREEMENT_ROLE()
    await deployer.acl.createPermission(agreement.address, voting.address, SET_AGREEMENT_ROLE, owner, { from: owner })

    const CREATE_VOTES_ROLE = await voting.CREATE_VOTES_ROLE()
    await deployer.acl.createPermission(ANY_ADDR, voting.address, CREATE_VOTES_ROLE, owner, { from: owner })

    const CHALLENGE_ROLE = await deployer.base.CHALLENGE_ROLE()
    await deployer.acl.createPermission(ANY_ADDR, voting.address, CHALLENGE_ROLE, owner, { from: owner })

    await voting.mockSetTimestamp(await agreement.currentTimestamp())
    await voting.initialize(token.address, MIN_SUPPORT, MIN_QUORUM, VOTING_DURATION, { from: owner })
    await agreement.register({ disputable: voting, collateralToken, actionCollateral: 0, challengeCollateral: 0, challengeDuration: ONE_DAY, from: owner })
  })

  const createVote = async voter => {
    executionTarget = await ExecutionTarget.new()
    script = encodeCallScript([{ to: executionTarget.address, calldata: executionTarget.contract.methods.execute().encodeABI() }])

    const receipt = await voting.newVote(script, 'metadata', { from: voter })
    const logs = decodeEventsOfType(receipt, Voting.abi, 'StartVote')

    voteId = getEventArgument({ logs }, 'StartVote', 'voteId')
    actionId = (await voting.getDisputableInfo(voteId))[0]
  }

  describe('newVote', () => {
    beforeEach(async () => await createVote(voter51))

    it('saves the agreement action data', async () => {
      const { pausedAt, pauseDuration, status } = await voting.getDisputableInfo(voteId)

      assertBn(actionId, 0, 'action ID does not match')
      assertBn(pausedAt, 0, 'paused at does not match')
      assertBn(pauseDuration, 0, 'pause duration does not match')
      assertBn(status, VOTE_STATUS.ACTIVE, 'vote status does not match')
    })

    it('registers a new action in the agreement', async () => {
      const { disputable, disputableActionId, collateralId, context, state, submitter } = await agreement.getAction(actionId)

      assertBn(disputableActionId, voteId, 'disputable ID does not match')
      assert.equal(disputable, voting.address, 'disputable address does not match')
      assertBn(collateralId, 0, 'collateral ID does not match')
      assert.equal(toAscii(context), 'metadata', 'context does not match')
      assert.equal(submitter, voter51, 'action submitter does not match')
      assertBn(state, ACTIONS_STATE.SUBMITTED, 'action status does not match')
    })
  })

  describe('execute', () => {
    beforeEach(async () => {
      await createVote(voter51)
      await voting.vote(voteId, true, { from: voter51 })
      await voting.mockIncreaseTime(VOTING_DURATION)
      await voting.executeVote(voteId)
    })

    it('changes the disputable state to closed', async () => {
      const { actionId: voteActionId, pausedAt, pauseDuration, status } = await voting.getDisputableInfo(voteId)
      assertBn(status, VOTE_STATUS.CLOSED, 'vote status does not match')

      assertBn(voteActionId, actionId, 'action ID does not match')
      assertBn(pausedAt, 0, 'paused at does not match')
      assertBn(pauseDuration, 0, 'pause duration does not match')
    })

    it('closes the action on the agreement and executed the vote', async () => {
      assertBn(await executionTarget.counter(), 1, 'vote was not executed')

      const { disputable, disputableActionId, collateralId, context, state, submitter } = await agreement.getAction(actionId)
      assertBn(state, ACTIONS_STATE.CLOSED, 'action status does not match')

      assertBn(disputableActionId, voteId, 'disputable ID does not match')
      assert.equal(disputable, voting.address, 'disputable address does not match')
      assertBn(collateralId, 0, 'collateral ID does not match')
      assert.equal(toAscii(context), 'metadata', 'context does not match')
      assert.equal(submitter, voter51, 'action submitter does not match')
    })
  })

  describe('challenge', () => {
    let currentTimestamp

    beforeEach(async () => {
      await createVote(voter51)
      currentTimestamp = await voting.getTimestampPublic()
      await agreement.challenge({ actionId })
    })

    it('pauses the vote', async () => {
      const { actionId: voteActionId, pausedAt, pauseDuration, status } = await voting.getDisputableInfo(voteId)
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
  })

  describe('resumes', () => {
    let pauseTimestamp, currentTimestamp

    beforeEach('create vote and challenge', async () => {
      await createVote(voter51)
      pauseTimestamp = await voting.getTimestampPublic()
      await agreement.challenge({ actionId })

      currentTimestamp = pauseTimestamp.add(bn(ONE_DAY))
      await voting.mockSetTimestamp(currentTimestamp)
    })

    const itResumesTheVote = () => {
      it('resumes the vote', async () => {
        const { actionId: voteActionId, pausedAt, pauseDuration, status } = await voting.getDisputableInfo(voteId)
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

        const { state } = await agreement.getAction(actionId)
        assertBn(state, ACTIONS_STATE.CLOSED, 'action status does not match')
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

    beforeEach('create vote and challenge', async () => {
      await createVote(voter51)
      pauseTimestamp = await voting.getTimestampPublic()
      await agreement.challenge({ actionId })

      currentTimestamp = pauseTimestamp.add(bn(ONE_DAY))
      await voting.mockSetTimestamp(currentTimestamp)
    })

    const itCancelsTheVote = () => {
      it('cancels the vote', async () => {
        const { actionId: voteActionId, pausedAt, pauseDuration, status } = await voting.getDisputableInfo(voteId)
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
