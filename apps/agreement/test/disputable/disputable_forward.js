const { assertBn } = require('../helpers/assert/assertBn')
const { assertRevert } = require('../helpers/assert/assertThrow')
const { assertAmountOfEvents, assertEvent } = require('../helpers/assert/assertEvent')
const { ACTIONS_STATE } = require('../helpers/utils/enums')
const { DISPUTABLE_EVENTS } = require('../helpers/utils/events')
const { DISPUTABLE_ERRORS, AGREEMENT_ERRORS, STAKING_ERRORS } = require('../helpers/utils/errors')

const deployer = require('../helpers/utils/deployer')(web3, artifacts)

contract('DisputableApp', ([_, submitter, someone]) => {
  let disputable

  beforeEach('deploy disputable instance', async () => {
    disputable = await deployer.deployAndInitializeWrapperWithDisputable({ submitters: [submitter] })
  })

  describe('isForwarder', () => {
    it('returns true', async () => {
      assert.isTrue(await disputable.disputable.isForwarder(), 'disputable is not a forwarder')
    })
  })

  describe('canForward', () => {
    context('when the sender has permissions', () => {
      const from = submitter

      it('returns true', async () => {
        assert.isTrue(await disputable.canForward(from), 'sender cannot forward')
      })
    })

    context('when the sender does not have permissions', () => {
      const from = someone

      it('returns false', async () => {
        assert.isFalse(await disputable.canForward(from), 'sender can forward')
      })
    })
  })

  describe('forward', () => {
    context('when the sender has permissions', () => {
      const from = submitter

      context('when the sender has already signed the agreement', () => {
        beforeEach('sign agreement', async () => {
          await disputable.sign(submitter)
        })

        context('when the sender has some amount staked before', () => {
          beforeEach('stake tokens', async () => {
            await disputable.stake({ user: submitter })
          })

          context('when the signer has enough balance', () => {
            it('submits a new action', async () => {
              const { disputableActionId, actionId } = await disputable.forward({ from })

              const actionData = await disputable.getAction(actionId)

              assert.equal(actionData.submitter, submitter, 'action submitter does not match')
              assertBn(actionData.disputableActionId, disputableActionId, 'disputable action ID does not match')
              assertBn(actionData.state, ACTIONS_STATE.SUBMITTED, 'action state does not match')
            })

            it('emits an event', async () => {
              const { receipt, disputableActionId } = await disputable.forward({ from })

              assertAmountOfEvents(receipt, DISPUTABLE_EVENTS.SUBMITTED, 1)
              assertEvent(receipt, DISPUTABLE_EVENTS.SUBMITTED, { id: disputableActionId })
            })

            it('locks the collateral amount', async () => {
              const { locked: previousLockedBalance, available: previousAvailableBalance } = await disputable.getBalance(submitter)

              await disputable.forward({ from })

              const { actionCollateral } = disputable
              const { locked: currentLockedBalance, available: currentAvailableBalance } = await disputable.getBalance(submitter)
              assertBn(currentLockedBalance, previousLockedBalance.add(actionCollateral), 'locked balance does not match')
              assertBn(currentAvailableBalance, previousAvailableBalance.sub(actionCollateral), 'available balance does not match')
            })

            it('does not affect token balances', async () => {
              const { collateralToken } = disputable
              const previousSubmitterBalance = await collateralToken.balanceOf(submitter)
              const previousStakingBalance = await collateralToken.balanceOf(disputable.address)

              await disputable.forward({ from })

              const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
              assertBn(currentSubmitterBalance, previousSubmitterBalance, 'submitter balance does not match')

              const currentStakingBalance = await collateralToken.balanceOf(disputable.address)
              assertBn(currentStakingBalance, previousStakingBalance, 'staking balance does not match')
            })

            it('can be stopped, paused, challenged or proceed', async () => {
              const { actionId } = await disputable.forward({ from })

              const { canProceed, canChallenge, canSettle, canDispute, canClaimSettlement, canRuleDispute } = await disputable.getAllowedPaths(actionId)
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
              await disputable.forward({ from })
            })

            it('reverts', async () => {
              await assertRevert(disputable.forward({ from }), STAKING_ERRORS.ERROR_NOT_ENOUGH_AVAILABLE_STAKE)
            })
          })
        })

        context('when the sender does not have an amount staked before', () => {
          it('reverts', async () => {
            await assertRevert(disputable.forward({ from }), STAKING_ERRORS.ERROR_NOT_ENOUGH_AVAILABLE_STAKE)
          })
        })
      })

      context('when the sender has not signed the agreement', () => {
        it('reverts', async () => {
          await assertRevert(disputable.forward({ from }), AGREEMENT_ERRORS.ERROR_SIGNER_MUST_SIGN)
        })
      })
    })

    context('when the sender does not have permissions', () => {
      const from = someone

      it('reverts', async () => {
        await assertRevert(disputable.forward({ from }), DISPUTABLE_ERRORS.ERROR_CANNOT_SUBMIT)
      })
    })
  })
})
