const ERRORS = require('./helpers/utils/errors')
const EVENTS = require('./helpers/utils/events')
const { DAY } = require('./helpers/lib/time')
const { bigExp } = require('./helpers/lib/numbers')
const { assertBn } = require('./helpers/lib/assertBn')
const { assertEvent } = require('./helpers/lib/assertEvent')
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { decodeEventsOfType } = require('./helpers/lib/decodeEvent')

const deployer = require('./helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, EOA]) => {
  let arbitrator, collateralToken, permissionToken, agreement

  const title = 'Sample Agreement'
  const content = '0xabcd'
  const collateralAmount = bigExp(100, 18)
  const delayPeriod = 5 * DAY
  const settlementPeriod = 2 * DAY
  const challengeCollateral = bigExp(200, 18)
  const permissionBalance = bigExp(64, 18)

  before('deploy instances', async () => {
    arbitrator = await deployer.deployArbitrator()
    collateralToken = await deployer.deployCollateralToken()
    permissionToken = await deployer.deployPermissionToken()
    agreement = await deployer.deploy()
  })

  describe('initialize', () => {
    it('cannot initialize the base app', async () => {
      const base = deployer.base

      assert(await base.isPetrified(), 'base agreement contract should be petrified')
      await assertRevert(base.initialize(title, content, collateralToken.address, collateralAmount, challengeCollateral, arbitrator.address, delayPeriod, settlementPeriod, permissionToken.address, permissionBalance), 'INIT_ALREADY_INITIALIZED')
    })

    context('when the initialization fails', () => {
      it('fails when using a non-contract collateral token', async () => {
        const collateralToken = EOA

        await assertRevert(agreement.initialize(title, content, collateralToken, collateralAmount, challengeCollateral, arbitrator.address, delayPeriod, settlementPeriod, permissionToken.address, permissionBalance), ERRORS.ERROR_COLLATERAL_TOKEN_NOT_CONTRACT)
      })

      it('fails when using a non-contract arbitrator', async () => {
        const court = EOA

        await assertRevert(agreement.initialize(title, content, collateralToken.address, collateralAmount, challengeCollateral, court, delayPeriod, settlementPeriod, permissionToken.address, permissionBalance), ERRORS.ERROR_ARBITRATOR_NOT_CONTRACT)
      })
    })

    context('when the initialization succeeds', () => {
      before('initialize agreement DAO', async () => {
        const receipt = await agreement.initialize(title, content, collateralToken.address, collateralAmount, challengeCollateral, arbitrator.address, delayPeriod, settlementPeriod, permissionToken.address, permissionBalance)

        const settingChangedLogs = decodeEventsOfType(receipt, deployer.abi, EVENTS.SETTING_CHANGED)
        assertEvent({ logs: settingChangedLogs }, EVENTS.SETTING_CHANGED, { settingId: 0 })

        const permissionChangedLogs = decodeEventsOfType(receipt, deployer.abi, EVENTS.PERMISSION_CHANGED)
        assertEvent({ logs: permissionChangedLogs }, EVENTS.PERMISSION_CHANGED, { token: permissionToken.address, balance: permissionBalance })
      })

      it('cannot be initialized again', async () => {
        await assertRevert(agreement.initialize(title, content, collateralToken.address, collateralAmount, challengeCollateral, arbitrator.address, delayPeriod, settlementPeriod, permissionToken.address, permissionBalance), ERRORS.ERROR_ALREADY_INITIALIZED)
      })

      it('initializes the agreement setting', async () => {
        const actualTitle = await agreement.title()
        assert.equal(actualTitle, title, 'title does not match')

        const actualArbitrator = await agreement.arbitrator()
        assert.equal(actualArbitrator, arbitrator.address, 'arbitrator does not match')

        const actualCollateralToken = await agreement.collateralToken()
        assert.equal(actualCollateralToken, collateralToken.address, 'collateral token does not match')

        const [actualContent, actualDelayPeriod, actualSettlementPeriod, actualCollateralAmount, actualChallengeCollateral] = await agreement.getSetting(0)
        assert.equal(actualContent, content, 'content does not match')
        assertBn(actualDelayPeriod, delayPeriod, 'delay period does not match')
        assertBn(actualSettlementPeriod, settlementPeriod, 'settlement period does not match')
        assertBn(actualCollateralAmount, collateralAmount, 'collateral amount does not match')
        assertBn(actualChallengeCollateral, challengeCollateral, 'challenge collateral does not match')

        const [actualPermissionToken, actualPermissionAmount] = await agreement.getTokenBalancePermission()
        assert.equal(actualPermissionToken, permissionToken.address, 'permission token does not match')
        assertBn(actualPermissionAmount, permissionBalance, 'permission balance does not match')
      })
    })
  })
})
