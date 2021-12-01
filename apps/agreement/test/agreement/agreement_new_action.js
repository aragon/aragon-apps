const deployer = require('../helpers/utils/deployer')(web3, artifacts)
const { AGREEMENT_EVENTS, APP_FEES_CASHIER_EVENTS } = require('../helpers/utils/events')
const { AGREEMENT_ERRORS, DISPUTABLE_ERRORS, STAKING_ERRORS } = require('../helpers/utils/errors')

const { padLeft, toHex } = require('web3-utils')
const { bn, bigExp, injectWeb3, injectArtifacts } = require('@aragon/contract-helpers-test')
const { assertBn, assertRevert, assertAmountOfEvents, assertEvent } = require('@aragon/contract-helpers-test/src/asserts')

injectWeb3(web3)
injectArtifacts(artifacts)

contract('Agreement', ([_, owner, submitter, someone]) => {
  let disputable, actionCollateral, collateralToken

  const actionContext = '0x123456'

  beforeEach('deploy agreement instance', async () => {
    disputable = await deployer.deployAndInitializeDisputableWrapper({ owner, activate: false, setCashier: true, submitters: [submitter] })
    collateralToken = disputable.collateralToken
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
          context('when the signer did not sign the agreement', () => {
            it('reverts', async () => {
              await assertRevert(disputable.newAction({ submitter, actionContext, stake, sign }), AGREEMENT_ERRORS.ERROR_SIGNER_MUST_SIGN)
            })
          })

          context('when the signer has already signed the agreement', () => {
            beforeEach('sign and allow agreement', async () => {
              const { mustSign } = await disputable.getSigner(submitter)
              if (mustSign) await disputable.sign({ from: submitter })
            })

            context('when the signer did not allow the agreement as the lock manager', () => {
              it('reverts', async () => {
                await assertRevert(disputable.newAction({ submitter, actionContext, stake, sign }), STAKING_ERRORS.ERROR_NOT_ENOUGH_BALANCE)
              })
            })

            context('when the signer has already signed the agreement', () => {
              beforeEach('allow agreement as lock manager', async () => {
                await disputable.allowManager({ user: submitter })
              })

              context('when the sender has some amount staked before', () => {
                beforeEach('stake', async () => {
                  await disputable.stake({ amount: actionCollateral, user: submitter })
                })

                context('when the signer has enough balance', () => {
                  const itHandlesNewActionsCorrectly = (appFeesInCollateralTokens) => {
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
                        assertBn(currentAvailableBalance, previousAvailableBalance.sub(actionCollateral).sub(appFeesInCollateralTokens), 'available balance does not match')
                      })

                      it('does not affect token balances', async () => {
                        const stakingAddress = await disputable.getStakingAddress()
                        const previousSubmitterBalance = await collateralToken.balanceOf(submitter)
                        const previousStakingBalance = await collateralToken.balanceOf(stakingAddress)

                        await disputable.newAction({ submitter, actionContext, stake, sign })

                        const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
                        assertBn(currentSubmitterBalance, previousSubmitterBalance, 'submitter balance does not match')

                        const currentStakingBalance = await collateralToken.balanceOf(stakingAddress)
                        assertBn(currentStakingBalance, previousStakingBalance.sub(appFeesInCollateralTokens), 'staking balance does not match')
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

                      it('emits an event', async () => {
                        const { receipt, actionId } = await disputable.newAction({ submitter, actionContext, stake, sign })

                        assertAmountOfEvents(receipt, AGREEMENT_EVENTS.ACTION_SUBMITTED, { decodeForAbi: disputable.abi })
                        assertEvent(receipt, AGREEMENT_EVENTS.ACTION_SUBMITTED, { expectedArgs: { actionId, disputable: disputable.disputable.address }, decodeForAbi: disputable.abi })
                      })
                    })

                    context('when the agreement content changed', () => {
                      let previousAvailableBalance

                      beforeEach('change agreement content', async () => {
                        const previousBalance = await disputable.getBalance(submitter)
                        previousAvailableBalance = previousBalance.available

                        await disputable.changeSetting({ content: '0xabcd', setCashier: true, from: owner })
                      })

                      it('still have available balance', async () => {
                        const { available: currentAvailableBalance } = await disputable.getBalance(submitter)
                        assertBn(currentAvailableBalance, previousAvailableBalance, 'submitter does not have same available staked balance')
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
                  }

                  context('when the app fees cashier module is set', () => {
                    let aragonAppFeesCashier

                    beforeEach('load app fees cashier', async () => {
                      aragonAppFeesCashier = await disputable.appFeesCashier()
                    })

                    context('when the app fee is zero', () => {
                      const appFeesInCollateralTokens = bn(0)

                      beforeEach('set app fees', async () => {
                        await disputable.setAppFee({ amount: bn(0) })
                      })

                      itHandlesNewActionsCorrectly(appFeesInCollateralTokens)

                      it('does not transfer any app fees', async () => {
                        const previousAppFeesCashierEthBalance = await web3.eth.getBalance(aragonAppFeesCashier.address)
                        const previousAppFeesCashierTokenBalance = await collateralToken.balanceOf(aragonAppFeesCashier.address)

                        await disputable.newAction({ submitter, actionContext, stake, sign })

                        const currentAppFeesCashierBalance = await web3.eth.getBalance(aragonAppFeesCashier.address)
                        assertBn(currentAppFeesCashierBalance, previousAppFeesCashierEthBalance, 'app fees cashier eth balance does not match')

                        const currentAppFeesCashierTokenBalance = await collateralToken.balanceOf(aragonAppFeesCashier.address)
                        assertBn(currentAppFeesCashierTokenBalance, previousAppFeesCashierTokenBalance, 'app fees cashier token balance does not match')
                      })
                    })

                    context('when the app fee is not zero', () => {
                      const appFeeAmount = bigExp(1, 16)

                      context('when the app fee token is the collateral token', () => {
                        const appFeesInCollateralTokens = appFeeAmount

                        beforeEach('set app fees', async () => {
                          await disputable.setAppFee({ amount: appFeeAmount })
                        })

                        context('when the submitter has allowed enough balance in the staking pool', () => {
                          beforeEach('stake', async () => {
                            await disputable.stake({ amount: appFeeAmount, user: submitter })
                          })

                          context('when the submitter does not send ETH', () => {
                            itHandlesNewActionsCorrectly(appFeesInCollateralTokens)

                            it('transfer the tokens from the staking pool to the cashier', async () => {
                              const stakingAddress = await disputable.getStakingAddress()
                              const previousStakingBalance = await collateralToken.balanceOf(stakingAddress)
                              const previousCashierBalance = await collateralToken.balanceOf(aragonAppFeesCashier.address)

                              await disputable.newAction({ submitter, actionContext, stake, sign })

                              const currentStakingBalance = await collateralToken.balanceOf(stakingAddress)
                              assertBn(currentStakingBalance, previousStakingBalance.sub(appFeeAmount), 'staking balance does not match')

                              const currentCashierBalance = await collateralToken.balanceOf(aragonAppFeesCashier.address)
                              assertBn(currentCashierBalance, previousCashierBalance.add(appFeeAmount), 'cashier balance does not match')
                            })

                            it('references the agreement action ID in the cashier', async () => {
                              const { actionId, receipt } = await disputable.newAction({ submitter, actionContext, stake, sign })

                              assertAmountOfEvents(receipt, APP_FEES_CASHIER_EVENTS.APP_FEE_PAID, { decodeForAbi: aragonAppFeesCashier.abi })
                              assertEvent(receipt, APP_FEES_CASHIER_EVENTS.APP_FEE_PAID, { expectedArgs: { by: disputable.agreement.address, appId: (await disputable.appId()), data: padLeft(toHex(actionId), 64) }, decodeForAbi: aragonAppFeesCashier.abi })
                            })
                          })

                          context('when the submitter adds some ETH as well', () => {
                            const sentEth = bn(1)

                            it('reverts', async () => {
                              await assertRevert(disputable.newAction({ submitter, actionContext, stake, sign, value: sentEth }))
                            })
                          })
                        })

                        context('when the submitter has no allowed balance in the staking pool', () => {
                          beforeEach('decrease allowance', async () => {
                            const staking = await disputable.getStaking(collateralToken)
                            const { allowance, amount: locked } = await staking.getLock(submitter, disputable.address)
                            await staking.decreaseLockAllowance(submitter, disputable.address, allowance.sub(locked), { from: submitter })
                          })

                          it('reverts', async () => {
                            await assertRevert(disputable.newAction({ submitter, actionContext, stake, sign }), STAKING_ERRORS.ERROR_NOT_ENOUGH_ALLOWANCE)
                          })
                        })
                      })

                      context('when the app fee token is not the collateral token', () => {
                          let token
                          const appFeesInCollateralTokens = bn(0)

                          beforeEach('set app fees', async () => {
                            token = await deployer.deployToken({})
                            await disputable.setAppFee({ token, amount: appFeeAmount })
                          })

                          context('when the app fee payment succeeds', () => {
                            beforeEach('stake and allow manager for new staking pool for app fees', async () => {
                              await disputable.stake({ token, amount: appFeeAmount, user: submitter })
                              await disputable.allowManager({ token, user: submitter, amount: appFeeAmount })
                            })

                            context('when the submitter does not send ETH', () => {
                              itHandlesNewActionsCorrectly(appFeesInCollateralTokens)

                              it('transfer the tokens from the staking pool to the cashier', async () => {
                                const stakingAddress = await disputable.getStakingAddress(token)
                                const previousStakingBalance = await token.balanceOf(stakingAddress)
                                const previousCashierBalance = await token.balanceOf(aragonAppFeesCashier.address)

                                await disputable.newAction({ submitter, actionContext, stake, sign })

                                const currentStakingBalance = await token.balanceOf(stakingAddress)
                                assertBn(currentStakingBalance, previousStakingBalance.sub(appFeeAmount), 'staking balance does not match')

                                const currentCashierBalance = await token.balanceOf(aragonAppFeesCashier.address)
                                assertBn(currentCashierBalance, previousCashierBalance.add(appFeeAmount), 'cashier balance does not match')
                              })

                              it('references the agreement action ID in the cashier', async () => {
                                const { actionId, receipt } = await disputable.newAction({ submitter, actionContext, stake, sign })

                                assertAmountOfEvents(receipt, APP_FEES_CASHIER_EVENTS.APP_FEE_PAID, { decodeForAbi: aragonAppFeesCashier.abi })
                                assertEvent(receipt, APP_FEES_CASHIER_EVENTS.APP_FEE_PAID, { expectedArgs: { by: disputable.agreement.address, appId: (await disputable.appId()), data: padLeft(toHex(actionId), 64) }, decodeForAbi: aragonAppFeesCashier.abi })
                              })
                            })

                            context('when the submitter adds some ETH as well', () => {
                              const sentEth = bn(1)

                              it('reverts', async () => {
                                await assertRevert(disputable.newAction({ submitter, actionContext, stake, sign, value: sentEth }))
                              })
                            })
                          })

                          context('when the submitter has no allowed balance in the staking pool', () => {
                            it('reverts', async () => {
                              await assertRevert(disputable.newAction({ submitter, actionContext, stake, sign }), STAKING_ERRORS.ERROR_NOT_ENOUGH_BALANCE)
                            })
                          })
                        })
                    })
                  })

                  context('when the app fees module is not set', () => {
                    const appFeesInCollateralTokens = bn(0)

                    beforeEach('remove app fee cashier', async () => {
                      await disputable.changeSetting({ setCashier: false, from: owner })
                      await disputable.sign({ from: submitter })
                    })

                    itHandlesNewActionsCorrectly(appFeesInCollateralTokens)
                  })
                })

                context('when the signer does not have enough stake', () => {
                  beforeEach('unstake available balance', async () => {
                    await disputable.unstake({ user: submitter })
                  })

                  it('reverts', async () => {
                    await assertRevert(disputable.newAction({ submitter, actionContext, stake, sign }), AGREEMENT_ERRORS.ERROR_NOT_ENOUGH_BALANCE)
                  })
                })
              })

              context('when the sender does not have an amount staked before', () => {
                const submitter = someone

                it('reverts', async () => {
                  await assertRevert(disputable.newAction({ submitter, actionContext, stake, sign }), AGREEMENT_ERRORS.ERROR_NOT_ENOUGH_BALANCE)
                })
              })
            })
          })
        })

        context('when the app is unregistered', () => {
          beforeEach('mark as unregistered', async () => {
            await disputable.changeSetting({ setCashier: false, from: owner })
            await disputable.sign({ from: submitter })
            await disputable.newAction({ submitter })
            await disputable.deactivate({ from: owner })
          })

          it('reverts', async () => {
            await assertRevert(disputable.newAction({ submitter, actionContext, stake, sign }), AGREEMENT_ERRORS.ERROR_DISPUTABLE_NOT_ACTIVE)
          })
        })
      })

      context('when the app was deactivated', () => {
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
