const ERRORS = require('./helpers/utils/errors')
const EVENTS = require('./helpers/utils/events')
const { DAY } = require('./helpers/lib/time')
const { assertBn } = require('./helpers/assert/assertBn')
const { bigExp, bn } = require('./helpers/lib/numbers')
const { assertRevert } = require('./helpers/assert/assertThrow')
const { getEventArgument } = require('@aragon/contract-test-helpers/events')
const { assertAmountOfEvents, assertEvent } = require('./helpers/assert/assertEvent')

const deployer = require('./helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, owner, someone, signer]) => {
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

        const previousSettings = await agreement.getSetting(newSettingId.sub(bn(1)))
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

      it('marks signers to review its content', async () => {
        assert.isTrue((await agreement.getSigner(signer)).shouldReviewCurrentSetting, 'signer should have to review current setting')

        await agreement.schedule({ submitter: signer })
        assert.isFalse((await agreement.getSigner(signer)).shouldReviewCurrentSetting, 'signer should not have to review current setting')

        await agreement.changeSetting({ ...newSettings, from })
        assert.isTrue((await agreement.getSigner(signer)).shouldReviewCurrentSetting, 'signer should have to review current setting')

        await agreement.schedule({ submitter: signer })
        assert.isFalse((await agreement.getSigner(signer)).shouldReviewCurrentSetting, 'signer should not have to review current setting')
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
      const signPermissionBalance = bigExp(101, 18)
      const challengePermissionBalance = bigExp(202, 18)
      const signPermissionToken = await deployer.deployToken({ name: 'Sign Permission Token', symbol: 'SPT', decimals: 18 })
      const challengePermissionToken = await deployer.deployToken({ name: 'Challenge Permission Token', symbol: 'CPT', decimals: 18 })
      newTokenBalancePermission = { signPermissionToken, signPermissionBalance, challengePermissionBalance, challengePermissionToken }
    })

    const assertCurrentTokenBalancePermission = async (actualPermission, expectedPermission) => {
      assertBn(actualPermission.signPermissionBalance, expectedPermission.signPermissionBalance, 'sign permission balance does not match')
      assert.equal(actualPermission.signPermissionToken, expectedPermission.signPermissionToken.address, 'sign permission token does not match')
      assertBn(actualPermission.challengePermissionBalance, expectedPermission.challengePermissionBalance, 'challenge permission balance does not match')
      assert.equal(actualPermission.challengePermissionToken, expectedPermission.challengePermissionToken.address, 'challenge permission token does not match')
    }

    it('starts with the expected initial permission', async () => {
      const nullToken = { address: '0x0000000000000000000000000000000000000000' }
      const initialPermission = { signPermissionToken: nullToken, signPermissionBalance: bn(0), challengePermissionToken: nullToken, challengePermissionBalance: bn(0) }
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
          signToken: newTokenBalancePermission.signPermissionToken.address,
          signBalance: newTokenBalancePermission.signPermissionBalance,
          challengeToken: newTokenBalancePermission.challengePermissionToken.address,
          challengeBalance: newTokenBalancePermission.challengePermissionBalance,
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
