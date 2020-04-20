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

  let initialSettings = {
    content: '0xabcd',
    delayPeriod: 2 * DAY,
    settlementPeriod: 3 * DAY,
    collateralAmount: bigExp(200, 18),
    challengeLeverage: 100,
  }

  let newSettings = {
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

  const assertCurrentSettings = async (actualSettings, expectedSettings) => {
    assert.equal(actualSettings.content, expectedSettings.content, 'content does not match')
    assertBn(actualSettings.collateralAmount, expectedSettings.collateralAmount, 'collateral amount does not match')
    assertBn(actualSettings.delayPeriod, expectedSettings.delayPeriod, 'delay period amount does not match')
    assertBn(actualSettings.settlementPeriod, expectedSettings.settlementPeriod, 'settlement period amount does not match')
    assertBn(actualSettings.challengeLeverage, expectedSettings.challengeLeverage, 'challenge leverage period amount does not match')
    assert.equal(actualSettings.arbitrator, expectedSettings.arbitrator.address, 'arbitrator does not match')
  }

  describe('changeSettings', () => {
    context('for permission based agreements', () => {
      const type = 'permission'

      before('deploy base agreement', async () => {
        await deployer.deployBase({ type })
      })

      beforeEach('deploy agreement', async () => {
        agreement = await deployer.deployAndInitializeWrapper({ owner, type, ...initialSettings })
      })

      it('starts with expected initial settings', async () => {
        const currentSettings = await agreement.getSetting()
        await assertCurrentSettings(currentSettings, initialSettings)
      })

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

    context('for token balance based agreements', () => {
      const type = 'token'

      initialSettings = {
        ...initialSettings,
        permissionBalance: bigExp(101, 18),
      }

      newSettings = {
        ...newSettings,
        permissionBalance: bigExp(151, 18),
      }

      before('deploy base agreement', async () => {
        await deployer.deployBase({ type })
      })

      before('setup permission tokens', async () => {
        newSettings.permissionToken = await deployer.deployPermissionToken()
        initialSettings.permissionToken = await deployer.deployPermissionToken()
      })

      beforeEach('deploy agreement', async () => {
        agreement = await deployer.deployAndInitializeWrapper({ owner, type, ...initialSettings })
      })

      const assertCurrentTokenBalancePermission = async (actualSettings, expectedSettings) => {
        assertBn(actualSettings.permissionBalance, expectedSettings.permissionBalance, 'permission balance does not match')
        assert.equal(actualSettings.permissionToken, expectedSettings.permissionToken.address, 'permission token does not match')
      }

      it('starts with expected initial settings', async () => {
        const currentSettings = await agreement.getSetting()
        await assertCurrentSettings(currentSettings, initialSettings)

        const currentTokenPermission = await agreement.getTokenBalancePermission()
        await assertCurrentTokenBalancePermission(currentTokenPermission, initialSettings)
      })

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

          assertAmountOfEvents(receipt, EVENTS.PERMISSION_CHANGED, 1)
          assertEvent(receipt, EVENTS.PERMISSION_CHANGED, { token: newSettings.permissionToken.address, balance: newSettings.permissionBalance })
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
})
