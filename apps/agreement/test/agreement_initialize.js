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
  let arbitrator, collateralToken, agreement

  const title = 'Sample Agreement'
  const content = '0xabcd'
  const collateralAmount = bigExp(100, 18)
  const delayPeriod = 5 * DAY
  const settlementPeriod = 2 * DAY
  const challengeLeverage = 200

  before('deploy base instances', async () => {
    agreement = await deployer.deploy()
    collateralToken = await deployer.deployCollateralToken()
    arbitrator = await deployer.deployArbitrator()
  })

  describe('initialize', () => {
    it('cannot initialize the base app', async () => {
      const base = deployer.base

      assert(await base.isPetrified(), 'base agreement contract should be petrified')
      await assertRevert(base.initialize(title, content, collateralToken.address, collateralAmount, challengeLeverage, arbitrator.address, delayPeriod, settlementPeriod), 'INIT_ALREADY_INITIALIZED')
    })

    context('when the initialization fails', () => {
      it('fails when using a non-contract collateral token', async () => {
        const collateralToken = EOA

        await assertRevert(agreement.initialize(title, content, collateralToken, collateralAmount, challengeLeverage, arbitrator.address, delayPeriod, settlementPeriod), ERRORS.ERROR_COLLATERAL_TOKEN_NOT_CONTRACT)
      })

      it('fails when using a non-contract arbitrator', async () => {
        const court = EOA

        await assertRevert(agreement.initialize(title, content, collateralToken.address, collateralAmount, challengeLeverage, court, delayPeriod, settlementPeriod), ERRORS.ERROR_ARBITRATOR_NOT_CONTRACT)
      })
    })

    context('when the initialization succeeds', () => {
      before('initialize agreement DAO', async () => {
        const receipt = await agreement.initialize(title, content, collateralToken.address, collateralAmount, challengeLeverage, arbitrator.address, delayPeriod, settlementPeriod)
        const logs = decodeEventsOfType(receipt, deployer.abi, EVENTS.SETTING_CHANGED)
        assertEvent({ logs }, EVENTS.SETTING_CHANGED, { settingId: 0 })
      })

      it('cannot be initialized again', async () => {
        await assertRevert(agreement.initialize(title, content, collateralToken.address, collateralAmount, challengeLeverage, arbitrator.address, delayPeriod, settlementPeriod), ERRORS.ERROR_ALREADY_INITIALIZED)
      })

      it('initializes the agreement setting', async () => {
        const actualTitle = await agreement.title()
        const actualCollateralToken = await agreement.collateralToken()
        const [actualContent, actualCollateralAmount, actualChallengeLeverage, actualArbitratorAddress, actualDelayPeriod, actualSettlementPeriod] = await agreement.getCurrentSetting()

        assert.equal(actualTitle, title, 'title does not match')
        assert.equal(actualContent, content, 'content does not match')
        assert.equal(actualArbitratorAddress, arbitrator.address, 'arbitrator does not match')
        assert.equal(actualCollateralToken, collateralToken.address, 'collateral token does not match')
        assertBn(actualCollateralAmount, collateralAmount, 'collateral amount does not match')
        assertBn(actualDelayPeriod, delayPeriod, 'delay period does not match')
        assertBn(actualSettlementPeriod, settlementPeriod, 'settlement period does not match')
        assertBn(actualChallengeLeverage, challengeLeverage, 'challenge leverage does not match')
      })
    })
  })
})
