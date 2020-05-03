const ERRORS = require('./helpers/utils/errors')
const EVENTS = require('./helpers/utils/events')
const { NOW } = require('./helpers/lib/time')
const { bn } = require('./helpers/lib/numbers')
const { assertBn } = require('./helpers/assert/assertBn')
const { ACTIONS_STATE } = require('./helpers/utils/enums')
const { assertRevert } = require('./helpers/assert/assertThrow')
const { assertAmountOfEvents, assertEvent } = require('./helpers/assert/assertEvent')

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
    const sign = false // do not sign before scheduling actions
    const stake = false // do not stake before scheduling actions

    context('when the sender has some amount staked before', () => {
      beforeEach('stake', async () => {
        await agreement.stake({ amount: collateralAmount, signer: submitter })
      })

      context('when the signer has enough balance', () => {
        context('when the signer has already signed the agreement', () => {
          beforeEach('sign agreement', async () => {
            await agreement.sign(submitter)
          })

          context('when the agreement settings did not change', () => {
            it('creates a new scheduled action', async () => {
              const { actionId } = await agreement.schedule({ submitter, script, actionContext, stake, sign })

              const actionData = await agreement.getAction(actionId)
              assert.equal(actionData.script, script, 'action script does not match')
              assert.equal(actionData.context, actionContext, 'action context does not match')
              assert.equal(actionData.state, ACTIONS_STATE.SCHEDULED, 'action state does not match')
              assert.equal(actionData.submitter, submitter, 'submitter does not match')
              assertBn(actionData.challengeEndDate, agreement.delayPeriod.add(bn(NOW)), 'challenge end date does not match')
              assertBn(actionData.settingId, 1, 'setting ID does not match')
            })

            it('locks the collateral amount', async () => {
              const { locked: previousLockedBalance, available: previousAvailableBalance } = await agreement.getSigner(submitter)

              await agreement.schedule({ submitter, script, actionContext, stake, sign })

              const { locked: currentLockedBalance, available: currentAvailableBalance } = await agreement.getSigner(submitter)
              assertBn(currentLockedBalance, previousLockedBalance.add(collateralAmount), 'locked balance does not match')
              assertBn(currentAvailableBalance, previousAvailableBalance.sub(collateralAmount), 'available balance does not match')
            })

            it('does not affect the challenged balance', async () => {
              const { challenged: previousChallengedBalance } = await agreement.getSigner(submitter)

              await agreement.schedule({ submitter, script, actionContext, stake, sign })

              const { challenged: currentChallengedBalance } = await agreement.getSigner(submitter)
              assertBn(currentChallengedBalance, previousChallengedBalance, 'challenged balance does not match')
            })

            it('does not affect token balances', async () => {
              const { collateralToken } = agreement
              const previousSubmitterBalance = await collateralToken.balanceOf(submitter)
              const previousAgreementBalance = await collateralToken.balanceOf(agreement.address)

              await agreement.schedule({ submitter, script, actionContext, stake, sign })

              const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
              assertBn(currentSubmitterBalance, previousSubmitterBalance, 'submitter balance does not match')

              const currentAgreementBalance = await collateralToken.balanceOf(agreement.address)
              assertBn(currentAgreementBalance, previousAgreementBalance, 'agreement balance does not match')
            })

            it('emits an event', async () => {
              const { receipt, actionId } = await agreement.schedule({ submitter, script, actionContext, stake, sign })

              assertAmountOfEvents(receipt, EVENTS.ACTION_SCHEDULED, 1)
              assertEvent(receipt, EVENTS.ACTION_SCHEDULED, { actionId })
            })

            it('can be challenged or cancelled', async () => {
              const { actionId } = await agreement.schedule({ submitter, script, actionContext, stake, sign })

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

          context('when the agreement settings changed', () => {
            beforeEach('change agreement setting', async () => {
              await agreement.changeSetting({ content: '0xabcd', from: owner })
            })

            it('still have available balance', async () => {
              const { available } = await agreement.getSigner(submitter)
              assertBn(available, collateralAmount, 'submitter does not have enough staked balance')
            })

            it('can not schedule actions', async () => {
              await assertRevert(agreement.schedule({ submitter, script, actionContext, stake, sign }), ERRORS.ERROR_SIGNER_MUST_SIGN_SETTING)
            })

            it('can unstake the available balance', async () => {
              await agreement.unstake({ signer: submitter, collateralAmount })

              const { available } = await agreement.getSigner(submitter)
              assertBn(available, 0, 'submitter available balance does not match')
            })
          })
        })

        context('when the signer did not sign the agreement', () => {
          it('reverts', async () => {
            await assertRevert(agreement.schedule({ submitter, script, actionContext, stake, sign }), ERRORS.ERROR_SIGNER_MUST_SIGN_SETTING)
          })
        })
      })

      context('when the signer does not have enough stake', () => {
        beforeEach('schedule other actions', async () => {
          await agreement.schedule({ submitter, script, actionContext, stake })
        })

        it('reverts', async () => {
          await assertRevert(agreement.schedule({ submitter, script, actionContext, stake, sign }), ERRORS.ERROR_NOT_ENOUGH_AVAILABLE_STAKE)
        })
      })
    })

    context('when the sender does not have an amount staked before', () => {
      context('when the signer has already signed the agreement', () => {
        beforeEach('sign agreement', async () => {
          await agreement.sign(submitter)
        })

        it('reverts', async () => {
          await assertRevert(agreement.schedule({ submitter, script, actionContext, stake, sign }), ERRORS.ERROR_NOT_ENOUGH_AVAILABLE_STAKE)
        })
      })

      context('when the signer did not sign the agreement', () => {
        it('reverts', async () => {
          await assertRevert(agreement.schedule({ submitter, script, actionContext, stake, sign }), ERRORS.ERROR_SIGNER_MUST_SIGN_SETTING)
        })
      })
    })
  })
})
