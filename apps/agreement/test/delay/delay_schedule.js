const { assertBn } = require('../helpers/assert/assertBn')
const { assertRevert } = require('../helpers/assert/assertThrow')
const { assertAmountOfEvents, assertEvent } = require('../helpers/assert/assertEvent')
const { DELAY_STATE } = require('../helpers/utils/enums')
const { DELAY_EVENTS } = require('../helpers/utils/events')
const { AGREEMENT_ERRORS, STAKING_ERRORS } = require('../helpers/utils/errors')

const deployer = require('../helpers/utils/deployer')(web3, artifacts)

contract('Delay', ([_, owner, someone, submitter]) => {
  let delay, actionCollateral

  const script = '0xabcdef'
  const actionContext = '0x123456'

  beforeEach('deploy delay instance', async () => {
    delay = await deployer.deployAndInitializeWrapperWithDisputable({ delay: true, owner, signers: [submitter] })
    actionCollateral = delay.actionCollateral
  })

  describe('schedule', () => {
    const sign = false // do not sign before scheduling actions
    const stake = false // do not stake before scheduling actions

    context('when the sender has some amount staked before', () => {
      beforeEach('stake', async () => {
        await delay.stake({ amount: actionCollateral, user: submitter })
      })

      context('when the signer has already signed the agreement', () => {
        beforeEach('sign agreement', async () => {
          await delay.sign(submitter)
        })

        context('when the signer has enough balance', () => {
          context('when the agreement settings did not change', () => {
            it('creates a new delayable', async () => {
              const delayPeriod = await delay.delayPeriod()
              const currentTimestamp = await delay.currentTimestamp()
              const { delayableId, actionId } = await delay.schedule({ submitter, script, actionContext, stake, sign })

              const delayableData = await delay.getDelayable(delayableId)
              assert.equal(delayableData.script, script, 'delayable script does not match')
              assertBn(delayableData.executableAt, currentTimestamp.add(delayPeriod), 'delayable executable date does not match')
              assertBn(delayableData.state, DELAY_STATE.SCHEDULED, 'delayable state does not match')
              assert.equal(delayableData.submitter, submitter, 'submitter does not match')
              assertBn(delayableData.actionId, actionId, 'action ID does not match')
            })

            it('emits an event', async () => {
              const { receipt, delayableId } = await delay.schedule({ submitter, script, actionContext, stake, sign })

              assertAmountOfEvents(receipt, DELAY_EVENTS.SCHEDULED, 1)
              assertEvent(receipt, DELAY_EVENTS.SCHEDULED, { id: delayableId })
            })

            it('locks the collateral amount', async () => {
              const { locked: previousLockedBalance, available: previousAvailableBalance } = await delay.getBalance(submitter)

              await delay.schedule({ submitter, actionContext, stake, sign })

              const { locked: currentLockedBalance, available: currentAvailableBalance } = await delay.getBalance(submitter)
              assertBn(currentLockedBalance, previousLockedBalance.add(actionCollateral), 'locked balance does not match')
              assertBn(currentAvailableBalance, previousAvailableBalance.sub(actionCollateral), 'available balance does not match')
            })

            it('does not affect token balances', async () => {
              const { collateralToken } = delay
              const previousSubmitterBalance = await collateralToken.balanceOf(submitter)
              const previousStakingBalance = await collateralToken.balanceOf(delay.address)

              await delay.schedule({ submitter, actionContext, stake, sign })

              const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
              assertBn(currentSubmitterBalance, previousSubmitterBalance, 'submitter balance does not match')

              const currentStakingBalance = await collateralToken.balanceOf(delay.address)
              assertBn(currentStakingBalance, previousStakingBalance, 'staking balance does not match')
            })

            it('can be stopped, paused, challenged or proceed', async () => {
              const { delayableId } = await delay.schedule({ submitter, script, actionContext, stake, sign })

              const { canStop, canPause, canExecute, canProceed, canChallenge, canSettle, canDispute, canClaimSettlement, canRuleDispute } = await delay.getAllowedPaths(delayableId)
              assert.isTrue(canStop, 'delayable cannot be stopped')
              assert.isTrue(canPause, 'delayable cannot be paused')
              assert.isFalse(canExecute, 'delayable can be executed')

              assert.isTrue(canProceed, 'action cannot proceed')
              assert.isTrue(canChallenge, 'action cannot be challenged')
              assert.isFalse(canSettle, 'action can be settled')
              assert.isFalse(canDispute, 'action can be disputed')
              assert.isFalse(canRuleDispute, 'action dispute can be ruled')
              assert.isFalse(canClaimSettlement, 'action settlement can be claimed')
            })
          })

          context('when the agreement content changed', () => {
            beforeEach('change agreement content', async () => {
              await delay.changeContent({ content: '0xabcd', from: owner })
            })

            it('can not schedule actions', async () => {
              await assertRevert(delay.schedule({ submitter, script, actionContext, stake, sign }), AGREEMENT_ERRORS.ERROR_SIGNER_MUST_SIGN)
            })
          })
        })

        context('when the signer does not have enough stake', () => {
          beforeEach('unstake available balance', async () => {
            await delay.unstake({ user: submitter })
          })

          it('reverts', async () => {
            await assertRevert(delay.schedule({ submitter, script, actionContext, stake, sign }), STAKING_ERRORS.ERROR_NOT_ENOUGH_AVAILABLE_STAKE)
          })
        })
      })

      context('when the signer did not sign the agreement', () => {
        it('reverts', async () => {
          await assertRevert(delay.schedule({ submitter, script, actionContext, stake, sign }), AGREEMENT_ERRORS.ERROR_SIGNER_MUST_SIGN)
        })
      })
    })

    context('when the sender does not have an amount staked before', () => {
      const submitter = someone

      context('when the signer has already signed the agreement', () => {
        beforeEach('sign agreement and unstake', async () => {
          await delay.sign(submitter)
        })

        it('reverts', async () => {
          await assertRevert(delay.schedule({ submitter, script, actionContext, stake, sign }), STAKING_ERRORS.ERROR_NOT_ENOUGH_AVAILABLE_STAKE)
        })
      })

      context('when the signer did not sign the agreement', () => {
        it('reverts', async () => {
          await assertRevert(delay.schedule({ submitter, script, actionContext, stake, sign }), AGREEMENT_ERRORS.ERROR_SIGNER_MUST_SIGN)
        })
      })
    })
  })
})
