const deployer = require('../helpers/deployer')(web3, artifacts)
const { ARAGON_OS_ERRORS, VOTING_ERRORS } = require('../helpers/errors')

const { ONE_DAY, pct16 } = require('@aragon/contract-helpers-test')
const { assertBn, assertRevert } = require('@aragon/contract-helpers-test/src/asserts')

contract('Voting initialization', ([_, owner]) => {
  let voting, token

  const VOTE_DURATION = 5 * ONE_DAY
  const DELEGATED_VOTING_PERIOD = ONE_DAY * 4
  const EXECUTION_DELAY = ONE_DAY
  const QUIET_ENDING_PERIOD = ONE_DAY
  const QUIET_ENDING_EXTENSION = ONE_DAY / 2
  const REQUIRED_SUPPORT = pct16(50)
  const MINIMUM_ACCEPTANCE_QUORUM = pct16(20)

  before('deploy voting', async () => {
    token = await deployer.deployToken({})
    voting = await deployer.deploy({ owner })
  })

  describe('initialize', () => {
    it('cannot initialize base app', async () => {
      const votingBase = deployer.base

      assert.isTrue(await votingBase.isPetrified(), 'voting base is not petrified')
      await assertRevert(votingBase.initialize(token.address, VOTE_DURATION, REQUIRED_SUPPORT, MINIMUM_ACCEPTANCE_QUORUM, DELEGATED_VOTING_PERIOD, QUIET_ENDING_PERIOD, QUIET_ENDING_EXTENSION, EXECUTION_DELAY), ARAGON_OS_ERRORS.INIT_ALREADY_INITIALIZED)
    })

    context('when the app was not initialized', () => {
      it('is not initialized', async () => {
        assert.isFalse(await voting.hasInitialized(), 'voting is initialized')
      })

      it('fails if acceptance quorum is greater than min support', async () => {
        const requiredSupport = pct16(20)
        const minimumAcceptanceQuorum = pct16(50)

        await assertRevert(voting.initialize(token.address, VOTE_DURATION, requiredSupport, minimumAcceptanceQuorum, DELEGATED_VOTING_PERIOD, QUIET_ENDING_PERIOD, QUIET_ENDING_EXTENSION, EXECUTION_DELAY), VOTING_ERRORS.VOTING_CHANGE_QUORUM_TOO_BIG)
      })

      it('fails if support is 100% or more', async () => {
        await assertRevert(voting.initialize(token.address, VOTE_DURATION, pct16(101), MINIMUM_ACCEPTANCE_QUORUM, DELEGATED_VOTING_PERIOD, QUIET_ENDING_PERIOD, QUIET_ENDING_EXTENSION, EXECUTION_DELAY), VOTING_ERRORS.VOTING_CHANGE_SUPPORT_TOO_BIG)
        await assertRevert(voting.initialize(token.address, VOTE_DURATION, pct16(100), MINIMUM_ACCEPTANCE_QUORUM, DELEGATED_VOTING_PERIOD, QUIET_ENDING_PERIOD, QUIET_ENDING_EXTENSION, EXECUTION_DELAY), VOTING_ERRORS.VOTING_CHANGE_SUPPORT_TOO_BIG)
      })

      it('fails if the quiet ending period is greater than the vote duration', async () => {
        const quietEndingPeriod = VOTE_DURATION + 1

        await assertRevert(voting.initialize(token.address, VOTE_DURATION, REQUIRED_SUPPORT, MINIMUM_ACCEPTANCE_QUORUM, DELEGATED_VOTING_PERIOD, quietEndingPeriod, QUIET_ENDING_EXTENSION, EXECUTION_DELAY), VOTING_ERRORS.VOTING_INVALID_QUIET_END_PERIOD)
      })
    })

    context('when the app is already initialized', () => {
      before('initialize app', async () => {
        await voting.initialize(token.address, VOTE_DURATION, REQUIRED_SUPPORT, MINIMUM_ACCEPTANCE_QUORUM, DELEGATED_VOTING_PERIOD, QUIET_ENDING_PERIOD, QUIET_ENDING_EXTENSION, EXECUTION_DELAY)
      })

      it('cannot be re-initialized', async () => {
        await assertRevert(voting.initialize(token.address, VOTE_DURATION, REQUIRED_SUPPORT, MINIMUM_ACCEPTANCE_QUORUM, DELEGATED_VOTING_PERIOD, QUIET_ENDING_PERIOD, QUIET_ENDING_EXTENSION, EXECUTION_DELAY), ARAGON_OS_ERRORS.INIT_ALREADY_INITIALIZED)
      })

      it('is initialized correctly', async () => {
        assert.isTrue(await voting.hasInitialized(), 'voting is not initialized')

        assertBn(await voting.token(), token.address, 'token address does not match')

        const currentSettingId = await voting.getCurrentSettingId()
        const { voteTime, supportRequiredPct, minAcceptQuorumPct, executionDelay, delegatedVotingPeriod, quietEndingPeriod, quietEndingExtension } = await voting.getSetting(currentSettingId)
        assertBn(voteTime, VOTE_DURATION, 'vote duration does not match')
        assertBn(delegatedVotingPeriod, DELEGATED_VOTING_PERIOD, 'delegated voting period does not match')
        assertBn(executionDelay, EXECUTION_DELAY, 'execution delay does not match')
        assertBn(quietEndingPeriod, QUIET_ENDING_PERIOD, 'quiet ending period does not match')
        assertBn(quietEndingExtension, QUIET_ENDING_EXTENSION, 'quiet ending extension does not match')
        assertBn(supportRequiredPct, REQUIRED_SUPPORT, 'needed support does not match')
        assertBn(minAcceptQuorumPct, MINIMUM_ACCEPTANCE_QUORUM, 'minimum acceptance quorum does not match')
      })
    })
  })
})
