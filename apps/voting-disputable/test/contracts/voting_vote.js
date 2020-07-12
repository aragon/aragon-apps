const VOTER_STATE = require('../helpers/state')

const { DAY } = require('@aragon/apps-agreement/test/helpers/lib/time')
const { assertBn } = require('@aragon/apps-agreement/test/helpers/assert/assertBn')
const { bn, bigExp } = require('@aragon/apps-agreement/test/helpers/lib/numbers')
const { assertRevert } = require('@aragon/apps-agreement/test/helpers/assert/assertThrow')
const { VOTING_ERRORS } = require('../helpers/errors')
const { pct, createVote, voteScript, getVoteState } = require('../helpers/voting')(web3, artifacts)

const deployer = require('../helpers/deployer')(web3, artifacts)

contract('Voting', ([_, owner, holder20, holder29, holder51, nonHolder]) => {
  let voting, token

  const CONTEXT = '0xabcdef'
  const VOTE_DURATION = 5 * DAY
  const OVERRULE_WINDOW = DAY
  const EXECUTION_DELAY = 0
  const REQUIRED_SUPPORT = pct(50)
  const MINIMUM_ACCEPTANCE_QUORUM = pct(20)

  beforeEach('deploy and mint tokens', async () => {
    token = await deployer.deployToken({})
    await token.generateTokens(holder51, bigExp(51, 18))
    await token.generateTokens(holder29, bigExp(29, 18))
    await token.generateTokens(holder20, bigExp(20, 18))
  })

  beforeEach('deploy voting', async () => {
    voting = await deployer.deployAndInitialize({ owner, minimumAcceptanceQuorum: MINIMUM_ACCEPTANCE_QUORUM, requiredSupport: REQUIRED_SUPPORT, voteDuration: VOTE_DURATION, overruleWindow: OVERRULE_WINDOW, executionDelay: EXECUTION_DELAY })
  })

  describe('vote', () => {
    let voteId

    beforeEach('create vote', async () => {
      ({ voteId } = await createVote({ voting, voteContext: CONTEXT, from: holder51 }))
    })

    it('holder can vote', async () => {
      await voting.vote(voteId, false, { from: holder29 })
      const { nays } = await getVoteState(voting, voteId)
      const voterState = await voting.getVoterState(voteId, holder29)

      assertBn(nays, bigExp(29, 18), 'nay vote should have been counted')
      assert.equal(voterState, VOTER_STATE.NAY, 'holder29 should have nay voter status')
    })

    it('holder can not modify vote', async () => {
      await voting.vote(voteId, true, { from: holder29 })
      const firstTime = await getVoteState(voting, voteId)
      assertBn(firstTime.nays, 0, 'nay vote should have been removed')
      assertBn(firstTime.yeas, bigExp(29, 18), 'yea vote should have been counted')

      await assertRevert(voting.vote(voteId, false, { from: holder29 }), VOTING_ERRORS.VOTING_CANNOT_VOTE)
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
      await voting.mockIncreaseTime(VOTE_DURATION)
      await assertRevert(voting.vote(voteId, true, { from: holder29 }), VOTING_ERRORS.VOTING_CANNOT_VOTE)
    })

    it('cannot vote on executed vote', async () => {
      await voting.vote(voteId, true, { from: holder51 })
      await voting.mockIncreaseTime(VOTE_DURATION)
      await voting.executeVote(voteId)

      await assertRevert(voting.vote(voteId, true, { from: holder20 }), VOTING_ERRORS.VOTING_CANNOT_VOTE)
    })
  })

  describe('isValuePct', () => {
    it('tests total = 0', async () => {
      const result1 = await voting.isValuePct(0, 0, pct(50))
      assert.equal(result1, false, 'total 0 should always return false')

      const result2 = await voting.isValuePct(1, 0, pct(50))
      assert.equal(result2, false, 'total 0 should always return false')
    })

    it('tests value = 0', async () => {
      const result1 = await voting.isValuePct(0, 10, pct(50))
      assert.equal(result1, false, 'value 0 should return false if pct is non-zero')

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
