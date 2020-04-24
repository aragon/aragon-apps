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

        const settingChangedLogs = decodeEventsOfType(receipt, deployer.abi, EVENTS.SETTING_CHANGED)
        assertEvent({ logs: settingChangedLogs }, EVENTS.SETTING_CHANGED, { settingId: 0 })

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

        const [actualContent, actualDelayPeriod, actualSettlementPeriod, actualCollateralAmount, actualChallengeCollateral] = await agreement.getSetting(0)
        assert.equal(actualContent, content, 'content does not match')
        assertBn(actualDelayPeriod, delayPeriod, 'delay period does not match')
        assertBn(actualSettlementPeriod, settlementPeriod, 'settlement period does not match')
        assertBn(actualCollateralAmount, collateralAmount, 'collateral amount does not match')
        assertBn(actualChallengeCollateral, challengeCollateral, 'challenge collateral does not match')

        const [actualSignPermissionToken, actualSignPermissionBalance, actualChallengePermissionToken, actualChallengePermissionBalance] = await agreement.getTokenBalancePermission()
        assert.equal(actualSignPermissionToken, signPermissionToken.address, 'sign permission token does not match')
        assertBn(actualSignPermissionBalance, signPermissionBalance, 'sign permission balance does not match')
        assert.equal(actualChallengePermissionToken, challengePermissionToken.address, 'challenge permission token does not match')
        assertBn(actualChallengePermissionBalance, challengePermissionBalance, 'challenge permission balance does not match')
      })
    })
  })
})
