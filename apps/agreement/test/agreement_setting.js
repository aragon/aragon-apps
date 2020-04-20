const ERRORS = require('./helpers/utils/errors')
const EVENTS = require('./helpers/utils/events')
const { DAY } = require('./helpers/lib/time')
const { assertBn } = require('./helpers/lib/assertBn')
const { bigExp } = require('./helpers/lib/numbers')
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { getEventArgument } = require('@aragon/test-helpers/events')
const { assertAmountOfEvents, assertEvent } = require('./helpers/lib/assertEvent')

const deployer = require('./helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, owner, someone]) => {
  let agreement

  const initialSettings = {
    content: '0xabcd',
    delayPeriod: 2 * DAY,
    settlementPeriod: 3 * DAY,
    collateralAmount: bigExp(200, 18),
    challengeLeverage: 100,
  }

  const newSettings = {
    content: '0x1234',
    delayPeriod: 5 * DAY,
    settlementPeriod: 10 * DAY,
    collateralAmount: bigExp(100, 18),
    challengeLeverage: 50,
  }

  before('setup arbitrators', async () => {
    newSettings.arbitrator = await deployer.deployArbitrator()
    initialSettings.arbitrator = await deployer.deployArbitrator()
  })

  beforeEach('deploy agreement instance', async () => {
    agreement = await deployer.deployAndInitializeWrapper({ owner, ...initialSettings })
  })

  const assertCurrentSettings = async (actualSettings, expectedSettings) => {
    assert.equal(actualSettings.content, expectedSettings.content, 'content does not match')
    assertBn(actualSettings.collateralAmount, expectedSettings.collateralAmount, 'collateral amount does not match')
    assertBn(actualSettings.delayPeriod, expectedSettings.delayPeriod, 'delay period amount does not match')
    assertBn(actualSettings.settlementPeriod, expectedSettings.settlementPeriod, 'settlement period amount does not match')
    assertBn(actualSettings.challengeLeverage, expectedSettings.challengeLeverage, 'challenge leverage period amount does not match')
    assert.equal(actualSettings.arbitrator, expectedSettings.arbitrator.address, 'arbitrator does not match')
  }

  it('starts with expected initial settings', async () => {
    const currentSettings = await agreement.getSetting()
    await assertCurrentSettings(currentSettings, initialSettings)
  })

  describe('changeSettings', () => {
    context('when the sender has permissions', () => {
      const from = owner

      it('changes the settings', async () => {
        await agreement.changeSetting({ ...newSettings, from })

        const currentSettings = await agreement.getSetting()
        await assertCurrentSettings(currentSettings, newSettings)
      })

      it('keeps previous settings', async () => {
        const receipt = await agreement.changeSetting({ ...newSettings, from })
        const newSettingId = getEventArgument(receipt, EVENTS.SETTING_CHANGED, 'settingId')

        const previousSettings = await agreement.getSetting(newSettingId.sub(1))
        await assertCurrentSettings(previousSettings, initialSettings)
      })

      it('emits an event', async () => {
        const receipt = await agreement.changeSetting({ ...newSettings, from })

        assertAmountOfEvents(receipt, EVENTS.SETTING_CHANGED, 1)
        assertEvent(receipt, EVENTS.SETTING_CHANGED, { settingId: 1 })
      })
    })

    context('when the sender does not have permissions', () => {
      const from = someone

      it('reverts', async () => {
        await assertRevert(agreement.changeSetting({ ...newSettings, from }), ERRORS.ERROR_AUTH_FAILED)
      })
    })
  })
})
