const ERRORS = require('./helpers/utils/errors')
const EVENTS = require('./helpers/utils/events')
const { NOW } = require('./helpers/lib/time')
const { assertBn } = require('./helpers/lib/assertBn')
const { ACTIONS_STATE } = require('./helpers/utils/enums')
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { assertAmountOfEvents, assertEvent } = require('./helpers/lib/assertEvent')

const deployer = require('./helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, owner, submitter]) => {
  let agreement, collateralAmount

  const script = '0xabcdef'
  const actionContext = '0x123456'

  beforeEach('deploy agreement instance', async () => {
    agreement = await deployer.deployAndInitializeWrapper({ owner, signers: [submitter] })
    collateralAmount = agreement.collateralAmount
  })

  describe('schedule', () => {
    const stake = false // do not stake before scheduling actions

    context('when the sender has some amount staked before', () => {
      beforeEach('stake', async () => {
        await agreement.stake({ amount: collateralAmount, signer: submitter })
      })

      context('when the signer has enough balance', () => {
        context('when the signer has permissions to sign', () => {
          it('creates a new scheduled action', async () => {
            const { actionId } = await agreement.schedule({ submitter, script, actionContext, stake })

            const actionData = await agreement.getAction(actionId)
            assert.equal(actionData.script, script, 'action script does not match')
            assert.equal(actionData.context, actionContext, 'action context does not match')
            assert.equal(actionData.state, ACTIONS_STATE.SCHEDULED, 'action state does not match')
            assert.equal(actionData.submitter, submitter, 'submitter does not match')
            assertBn(actionData.challengeEndDate, agreement.delayPeriod.add(NOW), 'challenge end date does not match')
            assertBn(actionData.settingId, 0, 'setting ID does not match')
          })

          it('locks the collateral amount', async () => {
            const { locked: previousLockedBalance, available: previousAvailableBalance } = await agreement.getBalance(submitter)

            await agreement.schedule({ submitter, script, actionContext, stake })

            const { locked: currentLockedBalance, available: currentAvailableBalance } = await agreement.getBalance(submitter)
            assertBn(currentLockedBalance, previousLockedBalance.add(collateralAmount), 'locked balance does not match')
            assertBn(currentAvailableBalance, previousAvailableBalance.sub(collateralAmount), 'available balance does not match')
          })

          it('does not affect the challenged balance', async () => {
            const { challenged: previousChallengedBalance } = await agreement.getBalance(submitter)

            await agreement.schedule({ submitter, script, actionContext, stake })

            const { challenged: currentChallengedBalance } = await agreement.getBalance(submitter)
            assertBn(currentChallengedBalance, previousChallengedBalance, 'challenged balance does not match')
          })

          it('does not affect token balances', async () => {
            const { collateralToken } = agreement
            const previousSubmitterBalance = await collateralToken.balanceOf(submitter)
            const previousAgreementBalance = await collateralToken.balanceOf(agreement.address)

            await agreement.schedule({ submitter, script, actionContext, stake })

            const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
            assertBn(currentSubmitterBalance, previousSubmitterBalance, 'submitter balance does not match')

            const currentAgreementBalance = await collateralToken.balanceOf(agreement.address)
            assertBn(currentAgreementBalance, previousAgreementBalance, 'agreement balance does not match')
          })

          it('emits an event', async () => {
            const { receipt, actionId } = await agreement.schedule({ submitter, script, actionContext, stake })

            assertAmountOfEvents(receipt, EVENTS.ACTION_SCHEDULED, 1)
            assertEvent(receipt, EVENTS.ACTION_SCHEDULED, { actionId })
          })

          it('can be challenged or cancelled', async () => {
            const { actionId } = await agreement.schedule({ submitter, script, actionContext, stake })

            const { canCancel, canChallenge, canSettle, canDispute, canClaimSettlement, canRuleDispute, canExecute } = await agreement.getAllowedPaths(actionId)
            assert.isTrue(canCancel, 'action cannot be cancelled')
            assert.isTrue(canChallenge, 'action cannot be challenged')
            assert.isFalse(canSettle, 'action can be settled')
            assert.isFalse(canDispute, 'action can be disputed')
            assert.isFalse(canRuleDispute, 'action dispute can be ruled')
            assert.isFalse(canClaimSettlement, 'action settlement can be claimed')
            assert.isFalse(canExecute, 'action can be executed')
          })
        })

        context('when the signer permissions are revoked', () => {
          beforeEach('revoke signer permissions', async () => {
            const SIGN_ROLE = await deployer.base.SIGN_ROLE()
            await deployer.acl.revokePermission(submitter, agreement.address, SIGN_ROLE, { from: owner })
            assert.isFalse(await agreement.canSign(submitter), 'submitter can sign the agreement')
          })

          it('still have available balance', async () => {
            const { available } = await agreement.getBalance(submitter)
            assertBn(available, collateralAmount, 'submitter does not have enough staked balance')
          })

          it('can not schedule actions', async () => {
            await assertRevert(agreement.schedule({ submitter, script, actionContext, stake }), ERRORS.ERROR_AUTH_FAILED)
          })

          it('can unstake the available balance', async () => {
            await agreement.unstake({ signer: submitter, collateralAmount })

            const { available } = await agreement.getBalance(submitter)
            assertBn(available, 0, 'submitter available balance does not match')
          })
        })
      })

      context('when the signer does not have enough stake', () => {
        beforeEach('schedule other actions', async () => {
          await agreement.schedule({ submitter, script, actionContext, stake })
        })

        it('reverts', async () => {
          await assertRevert(agreement.schedule({ submitter, script, actionContext, stake }), ERRORS.ERROR_NOT_ENOUGH_AVAILABLE_STAKE)
        })
      })
    })

    context('when the sender does not have an amount staked before', () => {
      it('reverts', async () => {
        await assertRevert(agreement.schedule({ submitter, script, actionContext, stake }), ERRORS.ERROR_NOT_ENOUGH_AVAILABLE_STAKE)
      })
    })
  })
})
