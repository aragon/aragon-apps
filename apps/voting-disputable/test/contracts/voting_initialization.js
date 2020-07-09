const { pct } = require('../helpers/voting')()
const { DAY } = require('@aragon/apps-agreement/test/helpers/lib/time')
const { assertBn } = require('@aragon/apps-agreement/test/helpers/assert/assertBn')
const { assertRevert } = require('@aragon/apps-agreement/test/helpers/assert/assertThrow')
const { ARAGON_OS_ERRORS, VOTING_ERRORS } = require('../helpers/errors')

const deployer = require('../helpers/deployer')(web3, artifacts)

contract('Voting initialization', ([_, owner]) => {
  let voting, token

  const VOTE_DURATION = 5 * DAY
  const OVERRULE_WINDOW = DAY
  const EXECUTION_DELAY = DAY
  const NEEDED_SUPPORT = pct(50)
  const MINIMUM_ACCEPTANCE_QUORUM = pct(20)

  before('deploy voting', async () => {
    token = await deployer.deployToken({})
    voting = await deployer.deploy({ owner })
  })

  describe('initialize', () => {
    it('cannot initialize base app', async () => {
      const votingBase = deployer.base

      assert.isTrue(await votingBase.isPetrified(), 'voting base is not petrified')
      await assertRevert(votingBase.initialize(token.address, NEEDED_SUPPORT, MINIMUM_ACCEPTANCE_QUORUM, VOTE_DURATION, OVERRULE_WINDOW, EXECUTION_DELAY), ARAGON_OS_ERRORS.INIT_ALREADY_INITIALIZED)
    })

    context('when the app was not initialized', () => {
      it('is not initialized', async () => {
        assert.isFalse(await voting.hasInitialized(), 'voting is initialized')
      })

      it('fails if acceptance quorum is greater than min support', async () => {
        const neededSupport = pct(20)
        const minimumAcceptanceQuorum = pct(50)

        await assertRevert(voting.initialize(token.address, neededSupport, minimumAcceptanceQuorum, VOTE_DURATION, OVERRULE_WINDOW, EXECUTION_DELAY), VOTING_ERRORS.VOTING_CHANGE_QUORUM_PCTS)
      })

      it('fails if support is 100% or more', async () => {
        const minimumAcceptanceQuorum = pct(20)

        await assertRevert(voting.initialize(token.address, pct(101), minimumAcceptanceQuorum, VOTE_DURATION, OVERRULE_WINDOW, EXECUTION_DELAY), VOTING_ERRORS.VOTING_CHANGE_SUPP_TOO_BIG)
        await assertRevert(voting.initialize(token.address, pct(100), minimumAcceptanceQuorum, VOTE_DURATION, OVERRULE_WINDOW, EXECUTION_DELAY), VOTING_ERRORS.VOTING_CHANGE_SUPP_TOO_BIG)
      })
    })

    context('when the app is already initialized', () => {
      before('initialize app', async () => {
        await voting.initialize(token.address, NEEDED_SUPPORT, MINIMUM_ACCEPTANCE_QUORUM, VOTE_DURATION, OVERRULE_WINDOW, EXECUTION_DELAY)
      })

      it('cannot be re-initialized', async () => {
        await assertRevert(voting.initialize(token.address, NEEDED_SUPPORT, MINIMUM_ACCEPTANCE_QUORUM, VOTE_DURATION, OVERRULE_WINDOW, EXECUTION_DELAY), ARAGON_OS_ERRORS.INIT_ALREADY_INITIALIZED)
      })

      it('is initialized', async () => {
        assert.isTrue(await voting.hasInitialized(), 'voting is not initialized')

        assertBn(await voting.token(), token.address, 'token address does not match')
        assertBn(await voting.voteTime(), VOTE_DURATION, 'vote duration does not match')
        assertBn(await voting.overruleWindow(), OVERRULE_WINDOW, 'overrule window does not match')
        assertBn(await voting.executionDelay(), EXECUTION_DELAY, 'execution delay does not match')
        assertBn(await voting.supportRequiredPct(), NEEDED_SUPPORT, 'needed support does not match')
        assertBn(await voting.minAcceptQuorumPct(), MINIMUM_ACCEPTANCE_QUORUM, 'minimum acceptance quorum does not match')
      })
    })
  })
})
