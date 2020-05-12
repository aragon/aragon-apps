const { assertBn } = require('../helpers/assert/assertBn')
const { assertRevert } = require('../helpers/assert/assertThrow')
const { assertAmountOfEvents, assertEvent } = require('../helpers/assert/assertEvent')
const { DELAY_STATE } = require('../helpers/utils/enums')
const { DELAY_EVENTS } = require('../helpers/utils/events')
const { DELAY_ERRORS, AGREEMENT_ERRORS, STAKING_ERRORS } = require('../helpers/utils/errors')

const deployer = require('../helpers/utils/deployer')(web3, artifacts)

contract('Delay', ([_, submitter, someone]) => {
  let delay

  beforeEach('deploy delay instance', async () => {
    delay = await deployer.deployAndInitializeWrapperWithDisputable({ delay: true, submitters: [submitter] })
  })

  describe('isForwarder', () => {
    it('returns true', async () => {
      assert.isTrue(await delay.disputable.isForwarder(), 'disputable is not a forwarder')
    })
  })

  describe('canForward', () => {
    context('when the sender has permissions', () => {
      const from = submitter

      it('returns true', async () => {
        assert.isTrue(await delay.canForward(from), 'sender cannot forward')
      })
    })

    context('when the sender does not have permissions', () => {
      const from = someone

      it('returns false', async () => {
        assert.isFalse(await delay.canForward(from), 'sender can forward')
      })
    })
  })

  describe('forward', () => {
    const script = '0x1234'

    context('when the sender has permissions', () => {
      const from = submitter

      context('when the sender has already signed the agreement', () => {
        beforeEach('sign agreement', async () => {
          await delay.sign(submitter)
        })

        context('when the sender has some amount staked before', () => {
          beforeEach('stake tokens', async () => {
            await delay.stake({ user: submitter })
          })

          context('when the signer has enough balance', () => {
            it('creates a new delayable', async () => {
              const delayPeriod = await delay.delayPeriod()
              const currentTimestamp = await delay.currentTimestamp()
              const { delayableId, actionId } = await delay.forward({ script, from })

              const delayableData = await delay.getDelayable(delayableId)
              assert.equal(delayableData.script, script, 'delayable script does not match')
              assertBn(delayableData.executableAt, currentTimestamp.add(delayPeriod), 'delayable executable date does not match')
              assertBn(delayableData.state, DELAY_STATE.SCHEDULED, 'delayable state does not match')
              assert.equal(delayableData.submitter, submitter, 'submitter does not match')
              assertBn(delayableData.actionId, actionId, 'action ID does not match')
            })

            it('emits an event', async () => {
              const { receipt, delayableId } = await delay.forward({ script, from })

              assertAmountOfEvents(receipt, DELAY_EVENTS.SCHEDULED, 1)
              assertEvent(receipt, DELAY_EVENTS.SCHEDULED, { id: delayableId })
            })

            it('locks the collateral amount', async () => {
              const { locked: previousLockedBalance, available: previousAvailableBalance } = await delay.getBalance(submitter)

              await delay.forward({ script, from })

              const { actionCollateral } = delay
              const { locked: currentLockedBalance, available: currentAvailableBalance } = await delay.getBalance(submitter)
              assertBn(currentLockedBalance, previousLockedBalance.add(actionCollateral), 'locked balance does not match')
              assertBn(currentAvailableBalance, previousAvailableBalance.sub(actionCollateral), 'available balance does not match')
            })

            it('does not affect token balances', async () => {
              const { collateralToken } = delay
              const previousSubmitterBalance = await collateralToken.balanceOf(submitter)
              const previousStakingBalance = await collateralToken.balanceOf(delay.address)

              await delay.forward({ script, from })

              const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
              assertBn(currentSubmitterBalance, previousSubmitterBalance, 'submitter balance does not match')

              const currentStakingBalance = await collateralToken.balanceOf(delay.address)
              assertBn(currentStakingBalance, previousStakingBalance, 'staking balance does not match')
            })

            it('can be stopped, paused, challenged or proceed', async () => {
              const { delayableId } = await delay.forward({ script, from })

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

          context('when the signer does not have enough stake', () => {
            beforeEach('schedule other actions', async () => {
              await delay.forward({ script, from })
            })

            it('reverts', async () => {
              await assertRevert(delay.forward({ script, from }), STAKING_ERRORS.ERROR_NOT_ENOUGH_AVAILABLE_STAKE)
            })
          })
        })

        context('when the sender does not have an amount staked before', () => {
          it('reverts', async () => {
            await assertRevert(delay.forward({ script, from }), STAKING_ERRORS.ERROR_NOT_ENOUGH_AVAILABLE_STAKE)
          })
        })
      })

      context('when the sender has not signed the agreement', () => {
        it('reverts', async () => {
          await assertRevert(delay.forward({ script, from }), AGREEMENT_ERRORS.ERROR_SIGNER_MUST_SIGN)
        })
      })
    })

    context('when the sender does not have permissions', () => {
      const from = someone

      it('reverts', async () => {
        await assertRevert(delay.forward({ script, from }), DELAY_ERRORS.ERROR_CANNOT_FORWARD)
      })
    })
  })
})
