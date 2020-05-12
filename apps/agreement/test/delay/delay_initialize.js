const { DAY } = require('../helpers/lib/time')
const { bigExp } = require('../helpers/lib/numbers')
const { assertBn } = require('../helpers/assert/assertBn')
const { assertRevert } = require('../helpers/assert/assertThrow')
const { ARAGON_OS_ERRORS, DISPUTABLE_ERRORS } = require('../helpers/utils/errors')

const deployer = require('../helpers/utils/deployer')(web3, artifacts)

contract('Delay', () => {
  let delay, arbitrator, collateralToken, submitPermissionToken, challengePermissionToken

  const delayPeriod = 5 * DAY
  const submitPermissionBalance = bigExp(64, 18)
  const challengePermissionBalance = bigExp(2, 18)

  const actionCollateral = bigExp(100, 18)
  const challengeCollateral = bigExp(200, 18)
  const challengeDuration = 2 * DAY

  before('deploy instances', async () => {
    arbitrator = await deployer.deployArbitrator()
    collateralToken = await deployer.deployCollateralToken()
    submitPermissionToken = await deployer.deploySubmitPermissionToken()
    challengePermissionToken = await deployer.deployChallengePermissionToken()
    delay = await deployer.deployAndInitializeWrapperWithDisputable({ delay: true, submitPermissionBalance, challengePermissionBalance })
  })

  describe('initialize', () => {
    it('cannot initialize the base app', async () => {
      const base = deployer.baseDisputable

      assert(await base.isPetrified(), 'base agreement contract should be petrified')
      await assertRevert(base.initialize(delayPeriod, delay.disputable.address, collateralToken.address, actionCollateral, challengeCollateral, challengeDuration, submitPermissionToken.address, submitPermissionBalance, challengePermissionToken.address, challengePermissionBalance), ARAGON_OS_ERRORS.ERROR_ALREADY_INITIALIZED)
    })

    it('cannot be initialized again', async () => {
      await assertRevert(delay.disputable.initialize(delayPeriod, delay.disputable.address, collateralToken.address, actionCollateral, challengeCollateral, challengeDuration, submitPermissionToken.address, submitPermissionBalance, challengePermissionToken.address, challengePermissionBalance), ARAGON_OS_ERRORS.ERROR_ALREADY_INITIALIZED)
    })

    it('cannot set the agreement', async () => {
      await assertRevert(delay.disputable.setAgreement(delay.address), DISPUTABLE_ERRORS.ERROR_AGREEMENT_ALREADY_SET)
    })

    it('initializes the delay app', async () => {
      const actualDelayPeriod = await delay.delayPeriod()
      assert.equal(actualDelayPeriod, delayPeriod, 'delay period does not match')

      const actualCollateralRequirement = await delay.getCollateralRequirement()
      assert.equal(actualCollateralRequirement.collateralToken.address, collateralToken.address, 'collateral token does not match')
      assertBn(actualCollateralRequirement.actionCollateral, actionCollateral, 'action collateral does not match')
      assertBn(actualCollateralRequirement.challengeCollateral, challengeCollateral, 'challenge collateral does not match')
      assertBn(actualCollateralRequirement.challengeDuration, challengeDuration, 'challenge duration does not match')

      const actualTokenBalancePermission = await delay.getTokenBalancePermission()
      assert.equal(actualTokenBalancePermission.submitPermissionToken, submitPermissionToken.address, 'submit permission token does not match')
      assertBn(actualTokenBalancePermission.submitPermissionBalance, submitPermissionBalance, 'submit permission balance does not match')
      assert.equal(actualTokenBalancePermission.challengePermissionToken, challengePermissionToken.address, 'challenge permission token does not match')
      assertBn(actualTokenBalancePermission.challengePermissionBalance, challengePermissionBalance, 'challenge permission balance does not match')
    })
  })
})
