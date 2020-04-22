const ERRORS = require('./helpers/utils/errors')
const EVENTS = require('./helpers/utils/events')
const { DAY } = require('./helpers/lib/time')
const { assertBn } = require('./helpers/lib/assertBn')
const { bigExp, bn } = require('./helpers/lib/numbers')
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
    challengeCollateral: bigExp(100, 18),
  }

  beforeEach('deploy agreement', async () => {
    agreement = await deployer.deployAndInitializeWrapper({ owner, ...initialSettings })
  })

  describe('changeSettings', () => {
    let newSettings = {
      content: '0x1234',
      delayPeriod: 5 * DAY,
      settlementPeriod: 10 * DAY,
      collateralAmount: bigExp(100, 18),
      challengeCollateral: bigExp(50, 18),
    }

    const assertCurrentSettings = async (actualSettings, expectedSettings) => {
      assert.equal(actualSettings.content, expectedSettings.content, 'content does not match')
      assertBn(actualSettings.collateralAmount, expectedSettings.collateralAmount, 'collateral amount does not match')
      assertBn(actualSettings.delayPeriod, expectedSettings.delayPeriod, 'delay period does not match')
      assertBn(actualSettings.settlementPeriod, expectedSettings.settlementPeriod, 'settlement period does not match')
      assertBn(actualSettings.challengeCollateral, expectedSettings.challengeCollateral, 'challenge collateral does not match')
    }

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

      it('affects new actions', async () => {
        const { actionId: oldActionId } = await agreement.schedule({})

        await agreement.changeSetting({ ...newSettings, from })
        const { actionId: newActionId } = await agreement.schedule({})

        const { settingId: oldActionSettingId } = await agreement.getAction(oldActionId)
        assertBn(oldActionSettingId, 0, 'old action setting ID does not match')

        const { settingId: newActionSettingId } = await agreement.getAction(newActionId)
        assertBn(newActionSettingId, 1, 'new action setting ID does not match')
      })
    })

    context('when the sender does not have permissions', () => {
      const from = someone

      it('reverts', async () => {
        await assertRevert(agreement.changeSetting({ ...newSettings, from }), ERRORS.ERROR_AUTH_FAILED)
      })
    })
  })

  describe('changeTokenBalancePermission', () => {
    let newTokenBalancePermission

    beforeEach('deploy token balance permission', async () => {
      const permissionBalance = bigExp(101, 18)
      const permissionToken = await deployer.deployToken({ name: 'Permission Token Balance', symbol: 'PTB', decimals: 18 })
      newTokenBalancePermission = { permissionToken, permissionBalance }
    })

    const assertCurrentTokenBalancePermission = async (actualPermission, expectedPermission) => {
      assertBn(actualPermission.permissionBalance, expectedPermission.permissionBalance, 'permission balance does not match')
      assert.equal(actualPermission.permissionToken, expectedPermission.permissionToken.address, 'permission token does not match')
    }

    it('starts with the expected initial permission', async () => {
      const initialPermission = { permissionToken: { address: '0x0000000000000000000000000000000000000000' }, permissionBalance: bn(0) }
      const currentTokenPermission = await agreement.getTokenBalancePermission()

      await assertCurrentTokenBalancePermission(currentTokenPermission, initialPermission)
    })

    context('when the sender has permissions', () => {
      const from = owner

      it('changes the token balance permission', async () => {
        await agreement.changeTokenBalancePermission({ ...newTokenBalancePermission, from })

        const currentTokenPermission = await agreement.getTokenBalancePermission()
        await assertCurrentTokenBalancePermission(currentTokenPermission, newTokenBalancePermission)
      })

      it('emits an event', async () => {
        const receipt = await agreement.changeTokenBalancePermission({ ...newTokenBalancePermission, from })

        assertAmountOfEvents(receipt, EVENTS.PERMISSION_CHANGED, 1)
        assertEvent(receipt, EVENTS.PERMISSION_CHANGED, {
          balance: newTokenBalancePermission.permissionBalance,
          token: newTokenBalancePermission.permissionToken.address,
        })
      })
    })

    context('when the sender does not have permissions', () => {
      const from = someone

      it('reverts', async () => {
        await assertRevert(agreement.changeTokenBalancePermission({ ...newTokenBalancePermission, from }), ERRORS.ERROR_AUTH_FAILED)
      })
    })
  })
})
