const { assertBn } = require('../helpers/assert/assertBn')
const { assertRevert } = require('../helpers/assert/assertThrow')
const { decodeEventsOfType } = require('../helpers/lib/decodeEvent')
const { assertAmountOfEvents, assertEvent } = require('../helpers/assert/assertEvent')
const { ACTIONS_STATE } = require('../helpers/utils/enums')
const { AGREEMENT_EVENTS } = require('../helpers/utils/events')
const { AGREEMENT_ERRORS, ARAGON_OS_ERRORS } = require('../helpers/utils/errors')

const deployer = require('../helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, owner, submitter, someone]) => {
  let agreement, actionCollateral

  const actionContext = '0x123456'

  beforeEach('deploy agreement instance', async () => {
    agreement = await deployer.deployAndInitializeWrapperWithDisputable({ owner, submitters: [submitter] })
    actionCollateral = agreement.actionCollateral
  })

  describe('newAction', () => {
    context('when the submitter has permissions', () => {
      const sign = false // do not sign before scheduling actions
      const stake = false // do not stake before scheduling actions

      context('when the sender has some amount staked before', () => {
        beforeEach('stake', async () => {
          await agreement.stake({ amount: actionCollateral, user: submitter })
        })

        context('when the signer has already signed the agreement', () => {
          beforeEach('sign agreement', async () => {
            await agreement.sign(submitter)
          })

          context('when the signer has enough balance', () => {
            context('when the agreement settings did not change', () => {
              it('creates a new scheduled action', async () => {
                const currentCollateralId = await agreement.getCurrentCollateralRequirementId()
                const { actionId } = await agreement.newAction({ submitter, actionContext, stake, sign })

                const actionData = await agreement.getAction(actionId)
                assert.equal(actionData.disputable, agreement.disputable.address, 'disputable does not match')
                assert.equal(actionData.submitter, submitter, 'submitter does not match')
                assert.equal(actionData.context, actionContext, 'action context does not match')
                assert.equal(actionData.state, ACTIONS_STATE.SUBMITTED, 'action state does not match')
                assertBn(actionData.collateralId, currentCollateralId, 'action collateral ID does not match')
              })

              it('locks the collateral amount', async () => {
                const { locked: previousLockedBalance, available: previousAvailableBalance } = await agreement.getBalance(submitter)

                await agreement.newAction({ submitter, actionContext, stake, sign })

                const { locked: currentLockedBalance, available: currentAvailableBalance } = await agreement.getBalance(submitter)
                assertBn(currentLockedBalance, previousLockedBalance.add(actionCollateral), 'locked balance does not match')
                assertBn(currentAvailableBalance, previousAvailableBalance.sub(actionCollateral), 'available balance does not match')
              })

              it('does not affect token balances', async () => {
                const stakingAddress = await agreement.getStakingAddress()
                const { collateralToken } = agreement

                const previousSubmitterBalance = await collateralToken.balanceOf(submitter)
                const previousStakingBalance = await collateralToken.balanceOf(stakingAddress)

                await agreement.newAction({ submitter, actionContext, stake, sign })

                const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
                assertBn(currentSubmitterBalance, previousSubmitterBalance, 'submitter balance does not match')

                const currentStakingBalance = await collateralToken.balanceOf(stakingAddress)
                assertBn(currentStakingBalance, previousStakingBalance, 'staking balance does not match')
              })

              it('emits an event', async () => {
                const { receipt, actionId } = await agreement.newAction({ submitter, actionContext, stake, sign })
                const logs = decodeEventsOfType(receipt, agreement.abi, AGREEMENT_EVENTS.ACTION_SUBMITTED)

                assertAmountOfEvents({ logs }, AGREEMENT_EVENTS.ACTION_SUBMITTED, 1)
                assertEvent({ logs }, AGREEMENT_EVENTS.ACTION_SUBMITTED, { actionId })
              })

              it('can be challenged or cancelled', async () => {
                const { actionId } = await agreement.newAction({ submitter, actionContext, stake, sign })

                const { canProceed, canChallenge, canSettle, canDispute, canClaimSettlement, canRuleDispute } = await agreement.getAllowedPaths(actionId)
                assert.isTrue(canProceed, 'action cannot be cancelled')
                assert.isTrue(canChallenge, 'action cannot be challenged')
                assert.isFalse(canSettle, 'action can be settled')
                assert.isFalse(canDispute, 'action can be disputed')
                assert.isFalse(canRuleDispute, 'action dispute can be ruled')
                assert.isFalse(canClaimSettlement, 'action settlement can be claimed')
              })
            })

            context('when the agreement content changed', () => {
              beforeEach('change agreement content', async () => {
                await agreement.changeContent({ content: '0xabcd', from: owner })
              })

              it('still have available balance', async () => {
                const { available } = await agreement.getBalance(submitter)
                assertBn(available, actionCollateral, 'submitter does not have enough staked balance')
              })

              it('can not schedule actions', async () => {
                await assertRevert(agreement.newAction({ submitter, actionContext, stake, sign }), AGREEMENT_ERRORS.ERROR_SIGNER_MUST_SIGN)
              })

              it('can unstake the available balance', async () => {
                const { available: previousAvailableBalance } = await agreement.getBalance(submitter)
                await agreement.unstake({ user: submitter, amount: previousAvailableBalance })

                const { available: currentAvailableBalance } = await agreement.getBalance(submitter)
                assertBn(currentAvailableBalance, 0, 'submitter available balance does not match')
              })
            })
          })

          context('when the signer does not have enough stake', () => {
            beforeEach('unstake available balance', async () => {
              await agreement.unstake({ user: submitter })
            })

            it('reverts', async () => {
              await assertRevert(agreement.newAction({ submitter, actionContext, stake, sign }), AGREEMENT_ERRORS.ERROR_NOT_ENOUGH_AVAILABLE_STAKE)
            })
          })
        })

        context('when the signer did not sign the agreement', () => {
          it('reverts', async () => {
            await assertRevert(agreement.newAction({ submitter, actionContext, stake, sign }), AGREEMENT_ERRORS.ERROR_SIGNER_MUST_SIGN)
          })
        })
      })

      context('when the sender does not have an amount staked before', () => {
        const submitter = someone

        it('reverts', async () => {
          await assertRevert(agreement.newAction({ submitter, actionContext, stake, sign }), AGREEMENT_ERRORS.ERROR_NOT_ENOUGH_AVAILABLE_STAKE)
        })
      })
    })

    context('when the submitter does not have permissions', () => {
      const submitter = someone

      it('reverts', async () => {
        await assertRevert(agreement.newAction({ submitter }), AGREEMENT_ERRORS.ERROR_CAN_NOT_FORWARD)
      })
    })
  })
})
