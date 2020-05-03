const ERRORS = require('./helpers/utils/errors')
const EVENTS = require('./helpers/utils/events')
const { DAY } = require('./helpers/lib/time')
const { bigExp } = require('./helpers/lib/numbers')
const { assertBn } = require('./helpers/assert/assertBn')
const { assertEvent } = require('./helpers/assert/assertEvent')
const { assertRevert } = require('./helpers/assert/assertThrow')
const { decodeEventsOfType } = require('./helpers/lib/decodeEvent')

const deployer = require('./helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, EOA]) => {
  let arbitrator, collateralToken, signPermissionToken, challengePermissionToken, agreement

  const title = 'Sample Agreement'
  const content = '0xabcd'
  const collateralAmount = bigExp(100, 18)
  const delayPeriod = 5 * DAY
  const settlementPeriod = 2 * DAY
  const challengeCollateral = bigExp(200, 18)
  const signPermissionBalance = bigExp(64, 18)
  const challengePermissionBalance = bigExp(2, 18)

  before('deploy instances', async () => {
    arbitrator = await deployer.deployArbitrator()
    collateralToken = await deployer.deployCollateralToken()
    signPermissionToken = await deployer.deploySignPermissionToken()
    challengePermissionToken = await deployer.deployChallengePermissionToken()
    agreement = await deployer.deploy()
  })

  describe('initialize', () => {
    it('cannot initialize the base app', async () => {
      const base = deployer.base

      assert(await base.isPetrified(), 'base agreement contract should be petrified')
      await assertRevert(base.initialize(title, content, collateralToken.address, collateralAmount, challengeCollateral, arbitrator.address, delayPeriod, settlementPeriod, signPermissionToken.address, signPermissionBalance, challengePermissionToken.address, challengePermissionBalance), 'INIT_ALREADY_INITIALIZED')
    })

    context('when the initialization fails', () => {
      it('fails when using a non-contract collateral token', async () => {
        const collateralToken = EOA

        await assertRevert(agreement.initialize(title, content, collateralToken, collateralAmount, challengeCollateral, arbitrator.address, delayPeriod, settlementPeriod, signPermissionToken.address, signPermissionBalance, challengePermissionToken.address, challengePermissionBalance), ERRORS.ERROR_COLLATERAL_TOKEN_NOT_CONTRACT)
      })

      it('fails when using a non-contract arbitrator', async () => {
        const court = EOA

        await assertRevert(agreement.initialize(title, content, collateralToken.address, collateralAmount, challengeCollateral, court, delayPeriod, settlementPeriod, signPermissionToken.address, signPermissionBalance, challengePermissionToken.address, challengePermissionBalance), ERRORS.ERROR_ARBITRATOR_NOT_CONTRACT)
      })
    })

    context('when the initialization succeeds', () => {
      before('initialize agreement DAO', async () => {
        const receipt = await agreement.initialize(title, content, collateralToken.address, collateralAmount, challengeCollateral, arbitrator.address, delayPeriod, settlementPeriod, signPermissionToken.address, signPermissionBalance, challengePermissionToken.address, challengePermissionBalance)

        const currentSettingId = await agreement.getCurrentSettingId()
        const settingChangedLogs = decodeEventsOfType(receipt, deployer.abi, EVENTS.SETTING_CHANGED)
        assertEvent({ logs: settingChangedLogs }, EVENTS.SETTING_CHANGED, { settingId: currentSettingId })

        const permissionChangedLogs = decodeEventsOfType(receipt, deployer.abi, EVENTS.PERMISSION_CHANGED)
        assertEvent({ logs: permissionChangedLogs }, EVENTS.PERMISSION_CHANGED, { signToken: signPermissionToken.address, signBalance: signPermissionBalance, challengeToken: challengePermissionToken.address, challengeBalance: challengePermissionBalance })
      })

      it('cannot be initialized again', async () => {
        await assertRevert(agreement.initialize(title, content, collateralToken.address, collateralAmount, challengeCollateral, arbitrator.address, delayPeriod, settlementPeriod, signPermissionToken.address, signPermissionBalance, challengePermissionToken.address, challengePermissionBalance), ERRORS.ERROR_ALREADY_INITIALIZED)
      })

      it('initializes the agreement setting', async () => {
        const actualTitle = await agreement.title()
        assert.equal(actualTitle, title, 'title does not match')

        const actualArbitrator = await agreement.arbitrator()
        assert.equal(actualArbitrator, arbitrator.address, 'arbitrator does not match')

        const actualCollateralToken = await agreement.collateralToken()
        assert.equal(actualCollateralToken, collateralToken.address, 'collateral token does not match')

        const currentSettingId = await agreement.getCurrentSettingId()
        assertBn(currentSettingId, 1, 'current setting ID does not match')

        const actualSettings = await agreement.getSetting(1)
        assert.equal(actualSettings.content, content, 'content does not match')
        assertBn(actualSettings.delayPeriod, delayPeriod, 'delay period does not match')
        assertBn(actualSettings.settlementPeriod, settlementPeriod, 'settlement period does not match')
        assertBn(actualSettings.collateralAmount, collateralAmount, 'collateral amount does not match')
        assertBn(actualSettings.challengeCollateral, challengeCollateral, 'challenge collateral does not match')

        const actualTokenBalancePermission = await agreement.getTokenBalancePermission()
        assert.equal(actualTokenBalancePermission.signPermissionToken, signPermissionToken.address, 'sign permission token does not match')
        assertBn(actualTokenBalancePermission.signPermissionBalance, signPermissionBalance, 'sign permission balance does not match')
        assert.equal(actualTokenBalancePermission.challengePermissionToken, challengePermissionToken.address, 'challenge permission token does not match')
        assertBn(actualTokenBalancePermission.challengePermissionBalance, challengePermissionBalance, 'challenge permission balance does not match')
      })
    })
  })
})
