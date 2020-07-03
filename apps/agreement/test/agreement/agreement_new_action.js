const { assertBn } = require('../helpers/assert/assertBn')
const { assertRevert } = require('../helpers/assert/assertThrow')
const { decodeEventsOfType } = require('../helpers/lib/decodeEvent')
const { assertAmountOfEvents, assertEvent } = require('../helpers/assert/assertEvent')
const { bn, bigExp } = require('../helpers/lib/numbers')
const { AGREEMENT_EVENTS } = require('../helpers/utils/events')
const { AGREEMENT_ERRORS, DISPUTABLE_ERRORS } = require('../helpers/utils/errors')

const deployer = require('../helpers/utils/deployer')(web3, artifacts)

const ZERO_ADDRESS = '0x' + '0'.repeat(40)

contract('Agreement', ([_, owner, submitter, someone]) => {
  let disputable, actionCollateral

  const actionContext = '0x123456'

  beforeEach('deploy agreement instance', async () => {
    await deployer.deployStakingFactory()
    disputable = await deployer.deployAndInitializeWrapperWithDisputable({ owner, activate: false, submitters: [submitter] })
    actionCollateral = disputable.actionCollateral
  })

  describe('newAction', () => {
    context('when the submitter has permissions', () => {
      const sign = false // do not sign before scheduling actions
      const stake = false // do not stake before scheduling actions

      context('when the app was activated', () => {
        beforeEach('activate app', async () => {
          await disputable.activate({ from: owner })
        })

        context('when the app is activated', () => {
          context('when the signer has already signed the agreement', () => {
            beforeEach('sign agreement', async () => {
              await disputable.sign(submitter)
            })

            context('when the sender has some amount staked before', () => {
              beforeEach('stake', async () => {
                await disputable.stake({ amount: actionCollateral, user: submitter })
              })

              context('when the signer has enough balance', () => {
                const newActionFlow = (appFeeAmount) => {
                  context('when the agreement settings did not change', () => {
                    it('creates a new scheduled action', async () => {
                      const currentSettingId = await disputable.getCurrentSettingId()
                      const currentCollateralId = await disputable.getCurrentCollateralRequirementId()
                      const { actionId, disputableActionId } = await disputable.newAction({ submitter, actionContext, stake, sign })

                      const actionData = await disputable.getAction(actionId)
                      assert.equal(actionData.disputable, disputable.disputable.address, 'disputable does not match')
                      assert.equal(actionData.submitter, submitter, 'submitter does not match')
                      assert.equal(actionData.context, actionContext, 'action context does not match')
                      assert.isFalse(actionData.closed, 'action state does not match')
                      assertBn(actionData.settingId, currentSettingId, 'setting ID does not match')
                      assertBn(actionData.disputableActionId, disputableActionId, 'disputable action ID does not match')
                      assertBn(actionData.collateralRequirementId, currentCollateralId, 'action collateral ID does not match')
                    })

                    it('locks the collateral amount', async () => {
                      const { locked: previousLockedBalance, available: previousAvailableBalance } = await disputable.getBalance(submitter)

                      await disputable.newAction({ submitter, actionContext, stake, sign })

                      const { locked: currentLockedBalance, available: currentAvailableBalance } = await disputable.getBalance(submitter)
                      assertBn(currentLockedBalance, previousLockedBalance.add(actionCollateral), 'locked balance does not match')
                      assertBn(currentAvailableBalance, previousAvailableBalance.sub(actionCollateral).sub(appFeeAmount), 'available balance does not match')
                    })

                    it('does not affect token balances', async () => {
                      const stakingAddress = await disputable.getStakingAddress()
                      const { collateralToken } = disputable

                      const previousSubmitterBalance = await collateralToken.balanceOf(submitter)
                      const previousStakingBalance = await collateralToken.balanceOf(stakingAddress)

                      await disputable.newAction({ submitter, actionContext, stake, sign })

                      const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
                      assertBn(currentSubmitterBalance, previousSubmitterBalance, 'submitter balance does not match')

                      const currentStakingBalance = await collateralToken.balanceOf(stakingAddress)
                      assertBn(currentStakingBalance.add(appFeeAmount), previousStakingBalance, 'staking balance does not match')
                    })

                    it('emits an event', async () => {
                      const { receipt, actionId } = await disputable.newAction({ submitter, actionContext, stake, sign })
                      const logs = decodeEventsOfType(receipt, disputable.abi, AGREEMENT_EVENTS.ACTION_SUBMITTED)

                      assertAmountOfEvents({ logs }, AGREEMENT_EVENTS.ACTION_SUBMITTED, 1)
                      assertEvent({ logs }, AGREEMENT_EVENTS.ACTION_SUBMITTED, { actionId })
                    })

                    it('can be challenged or closed', async () => {
                      const { actionId } = await disputable.newAction({ submitter, actionContext, stake, sign })

                      const { canClose, canChallenge, canSettle, canDispute, canClaimSettlement, canRuleDispute } = await disputable.getAllowedPaths(actionId)
                      assert.isTrue(canClose, 'action cannot be closed')
                      assert.isTrue(canChallenge, 'action cannot be challenged')

                      assert.isFalse(canSettle, 'action can be settled')
                      assert.isFalse(canDispute, 'action can be disputed')
                      assert.isFalse(canRuleDispute, 'action dispute can be ruled')
                      assert.isFalse(canClaimSettlement, 'action settlement can be claimed')
                    })
                  })

                  context('when the agreement content changed', () => {
                    beforeEach('change agreement content', async () => {
                      await disputable.changeSetting({ content: '0xabcd', from: owner })
                    })

                    it('still have available balance', async () => {
                      const { available } = await disputable.getBalance(submitter)
                      assertBn(available, actionCollateral.add(appFeeAmount), 'submitter does not have enough staked balance')
                    })

                    it('can not schedule actions', async () => {
                      await assertRevert(disputable.newAction({ submitter, actionContext, stake, sign }), AGREEMENT_ERRORS.ERROR_SIGNER_MUST_SIGN)
                    })

                    it('can unstake the available balance', async () => {
                      const { available: previousAvailableBalance } = await disputable.getBalance(submitter)
                      await disputable.unstake({ user: submitter, amount: previousAvailableBalance })

                      const { available: currentAvailableBalance } = await disputable.getBalance(submitter)
                      assertBn(currentAvailableBalance, 0, 'submitter available balance does not match')
                    })
                  })

                  it('emits an event', async () => {
                    const { receipt, actionId } = await disputable.newAction({ submitter, actionContext, stake, sign })
                    const logs = decodeEventsOfType(receipt, disputable.abi, AGREEMENT_EVENTS.ACTION_SUBMITTED)

                    assertAmountOfEvents({ logs }, AGREEMENT_EVENTS.ACTION_SUBMITTED, 1)
                    assertEvent({ logs }, AGREEMENT_EVENTS.ACTION_SUBMITTED, { actionId, disputable: disputable.disputable.address })
                  })
                }

                context('when the transaction fees module is set', () => {
                  context('when the transaction fee is zero', () => {
                    newActionFlow(bn(0))
                  })

                  context('when the transaction fee is not zero', () => {
                    const appFeeAmount = bigExp(15, 18)

                    context('when the transaction fee token is the staking token', () => {
                      beforeEach('set transaction fees', async () => {
                        const { collateralToken } = disputable
                        await deployer.aragonAppFeesCashier.setAppFee('0x', collateralToken.address, appFeeAmount)
                      })

                      context('when the transaction fee payment succeeds', () => {
                        beforeEach('stake, allow', async () => {
                          await disputable.stake({ amount: appFeeAmount, user: submitter })
                          await disputable.allowManager({ user: submitter, amount: appFeeAmount })
                        })

                        newActionFlow(appFeeAmount)
                      })

                      context('when the transaction fee payment doesn’t succeed', () => {
                        it('reverts', async () => {
                          await assertRevert(disputable.newAction({ submitter, actionContext, stake, sign }), AGREEMENT_ERRORS.STAKING_NOT_ENOUGH_BALANCE)
                        })
                      })
                    })

                    context('when the transaction fee token is not the staking token', () => {
                      let token
                      
                      beforeEach('set transaction fees', async () => {
                        token = await deployer.deployToken({})
                        await deployer.aragonAppFeesCashier.setAppFee('0x', token.address, appFeeAmount)
                      })

                      context('when the transaction fee payment succeeds', () => {
                        beforeEach('stake and allow manager for new staking pool for transaction fees', async () => {
                          await disputable.stake({ token, amount: appFeeAmount, user: submitter })
                          await disputable.allowManager({ token, user: submitter, amount: appFeeAmount })
                        })

                        newActionFlow(bn(0))
                      })

                      context('when the transaction fee payment does not succeed', () => {
                        it('reverts', async () => {
                          await assertRevert(disputable.newAction({ submitter, actionContext, stake, sign }), AGREEMENT_ERRORS.STAKING_NOT_ENOUGH_BALANCE)
                        })
                      })
                    })
                  })
                })

                context('when the transaction fees module is not set', () => {
                  beforeEach('remove transactions module', async () => {
                    await disputable.changeSetting({ aragonAppFeesCashierAddress: ZERO_ADDRESS, from: owner })
                    await disputable.sign(submitter)
                  })

                  newActionFlow(bn(0))
                })
              })

              context('when the signer does not have enough stake', () => {
                beforeEach('unstake available balance', async () => {
                  await disputable.unstake({ user: submitter })
                })

                it('reverts', async () => {
                  await assertRevert(disputable.newAction({ submitter, actionContext, stake, sign }), AGREEMENT_ERRORS.ERROR_NOT_ENOUGH_AVAILABLE_STAKE)
                })
              })
            })

            context('when the sender does not have an amount staked before', () => {
              const submitter = someone

              it('reverts', async () => {
                await assertRevert(disputable.newAction({ submitter, actionContext, stake, sign }), AGREEMENT_ERRORS.ERROR_NOT_ENOUGH_AVAILABLE_STAKE)
              })
            })
          })

          context('when the signer did not sign the agreement', () => {
            it('reverts', async () => {
              await assertRevert(disputable.newAction({ submitter, actionContext, stake, sign }), AGREEMENT_ERRORS.ERROR_SIGNER_MUST_SIGN)
            })
          })
        })

        context('when the app is unregistered', () => {
          beforeEach('mark as unregistered', async () => {
            await disputable.changeSetting({ aragonAppFeesCashierAddress: ZERO_ADDRESS, from: owner })
            await disputable.sign(submitter)
            await disputable.newAction({ submitter })
            await disputable.deactivate({ from: owner })
          })

          it('reverts', async () => {
            await assertRevert(disputable.newAction({ submitter, actionContext, stake, sign }), AGREEMENT_ERRORS.ERROR_DISPUTABLE_APP_NOT_ACTIVE)
          })
        })
      })

      context('when the app was unregistered', () => {
        it('reverts', async () => {
          await assertRevert(disputable.newAction({ submitter, actionContext, stake, sign }), DISPUTABLE_ERRORS.ERROR_AGREEMENT_STATE_INVALID)
        })
      })
    })

    context('when the submitter does not have permissions', () => {
      const submitter = someone

      it('reverts', async () => {
        await assertRevert(disputable.newAction({ submitter }), DISPUTABLE_ERRORS.ERROR_CANNOT_SUBMIT)
      })
    })
  })
})
