const deployer = require('../helpers/utils/deployer')(web3, artifacts)
const { RULINGS } = require('../helpers/utils/enums')
const { AGREEMENT_ERRORS } = require('../helpers/utils/errors')
const { AGREEMENT_EVENTS } = require('../helpers/utils/events')

const { injectWeb3, injectArtifacts } = require('@aragon/contract-helpers-test')
const { assertBn, assertRevert, assertEvent, assertAmountOfEvents } = require('@aragon/contract-helpers-test/src/asserts')

injectWeb3(web3)
injectArtifacts(artifacts)

contract('Agreement', ([_, submitter]) => {
  let disputable, actionId, disputableActionId

  beforeEach('deploy agreement instance', async () => {
    disputable = await deployer.deployAndInitializeDisputableWrapper()
  })

  describe('close', () => {
    context('when the given action exists', () => {
      beforeEach('create action', async () => {
        ({ actionId, disputableActionId } = await disputable.newAction({ submitter }))
      })

      const itCanCloseActions = () => {
        const itClosesTheActionProperly = unlocksBalance => {
          it('marks the action as closed', async () => {
            const previousActionState = await disputable.getAction(actionId)

            await disputable.close(actionId)

            const currentActionState = await disputable.getAction(actionId)
            assert.isTrue(currentActionState.closed, 'action is not closed')
            assert.isFalse(currentActionState.lastChallengeActive, 'action challenge should not be active')

            assert.equal(currentActionState.disputable, previousActionState.disputable, 'disputable does not match')
            assert.equal(currentActionState.submitter, previousActionState.submitter, 'submitter does not match')
            assert.equal(currentActionState.context, previousActionState.context, 'action context does not match')
            assertBn(currentActionState.settingId, previousActionState.settingId, 'setting ID does not match')
            assertBn(currentActionState.disputableActionId, previousActionState.disputableActionId, 'disputable action ID does not match')
            assertBn(currentActionState.lastChallengeId, previousActionState.lastChallengeId, 'challenge ID does not match')
            assertBn(currentActionState.collateralRequirementId, previousActionState.collateralRequirementId, 'collateral requirement ID does not match')
          })

          it('can be closed by the disputable', async () => {
            const closedFromDisputable = true
            await disputable.mockDisputable({ canClose :false })

            await assertRevert(disputable.close(actionId), AGREEMENT_ERRORS.ERROR_CANNOT_CLOSE_ACTION)
            await disputable.close(disputableActionId, closedFromDisputable)

            const currentActionState = await disputable.getAction(actionId)
            assert.isTrue(currentActionState.closed, 'action is not closed')
          })

          if (unlocksBalance) {
            it('unlocks the collateral amount', async () => {
              const { actionCollateral } = disputable
              const { locked: previousLockedBalance, available: previousAvailableBalance } = await disputable.getBalance(submitter)

              await disputable.close(actionId)

              const { locked: currentLockedBalance, available: currentAvailableBalance } = await disputable.getBalance(submitter)
              assertBn(currentLockedBalance, previousLockedBalance.sub(actionCollateral), 'locked balance does not match')
              assertBn(currentAvailableBalance, previousAvailableBalance.add(actionCollateral), 'available balance does not match')
            })
          } else {
            it('does not affect the submitter staked balances', async () => {
              const { locked: previousLockedBalance, available: previousAvailableBalance } = await disputable.getBalance(submitter)

              await disputable.close(actionId)

              const { locked: currentLockedBalance, available: currentAvailableBalance } = await disputable.getBalance(submitter)
              assertBn(currentLockedBalance, previousLockedBalance, 'locked balance does not match')
              assertBn(currentAvailableBalance, previousAvailableBalance, 'available balance does not match')
            })
          }

          it('does not affect staked balances', async () => {
            const stakingAddress = await disputable.getStakingAddress()
            const { collateralToken } = disputable

            const previousSubmitterBalance = await collateralToken.balanceOf(submitter)
            const previousStakingBalance = await collateralToken.balanceOf(stakingAddress)

            await disputable.close(actionId)

            const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
            assertBn(currentSubmitterBalance, previousSubmitterBalance, 'submitter balance does not match')

            const currentStakingBalance = await collateralToken.balanceOf(stakingAddress)
            assertBn(currentStakingBalance, previousStakingBalance, 'staking balance does not match')
          })

          it('emits an event', async () => {
            const receipt = await disputable.close(actionId)

            assertAmountOfEvents(receipt, AGREEMENT_EVENTS.ACTION_CLOSED, { decodeForAbi: disputable.abi })
            assertEvent(receipt, AGREEMENT_EVENTS.ACTION_CLOSED, { expectedArgs: { actionId }, decodeForAbi: disputable.abi })
          })

          it('there are no more paths allowed', async () => {
            await disputable.close(actionId)

            const { canClose, canChallenge, canSettle, canDispute, canRuleDispute } = await disputable.getAllowedPaths(actionId)
            assert.isFalse(canClose, 'action can be closed')
            assert.isFalse(canChallenge, 'action can be challenged')
            assert.isFalse(canSettle, 'action can be settled')
            assert.isFalse(canDispute, 'action can be disputed')
            assert.isFalse(canRuleDispute, 'action dispute can be ruled')
          })
        }

        const itIgnoresTheRequest = () => {
          it('does not modify the action state', async () => {
            const previousActionState = await disputable.getAction(actionId)

            await disputable.close(actionId)

            const currentActionState = await disputable.getAction(actionId)
            assert.equal(currentActionState.closed, previousActionState.closed, 'action closed state does not match')
            assert.equal(currentActionState.disputable, previousActionState.disputable, 'disputable does not match')
            assert.equal(currentActionState.submitter, previousActionState.submitter, 'submitter does not match')
            assert.equal(currentActionState.context, previousActionState.context, 'action context does not match')
            assertBn(currentActionState.settingId, previousActionState.settingId, 'setting ID does not match')
            assertBn(currentActionState.disputableActionId, previousActionState.disputableActionId, 'disputable action ID does not match')
            assertBn(currentActionState.lastChallengeId, previousActionState.lastChallengeId, 'challenge ID does not match')
            assertBn(currentActionState.lastChallengeActive, previousActionState.lastChallengeActive, 'challenge active state does not match')
            assertBn(currentActionState.collateralRequirementId, previousActionState.collateralRequirementId, 'collateral requirement ID does not match')
          })

          it('ignores the disputable request', async () => {
            const closedFromDisputable = true
            await disputable.mockDisputable({ canClose :false })

            await disputable.close(disputableActionId, closedFromDisputable)
            const currentActionState = await disputable.getAction(actionId)
            assert.isTrue(currentActionState.closed, 'action is not closed')
          })

          it('does not affect the submitter staked balances', async () => {
            const { locked: previousLockedBalance, available: previousAvailableBalance } = await disputable.getBalance(submitter)

            await disputable.close(actionId)

            const { locked: currentLockedBalance, available: currentAvailableBalance } = await disputable.getBalance(submitter)
            assertBn(currentLockedBalance, previousLockedBalance, 'locked balance does not match')
            assertBn(currentAvailableBalance, previousAvailableBalance, 'available balance does not match')
          })

          it('does not affect staked balances', async () => {
            const stakingAddress = await disputable.getStakingAddress()
            const { collateralToken } = disputable

            const previousSubmitterBalance = await collateralToken.balanceOf(submitter)
            const previousStakingBalance = await collateralToken.balanceOf(stakingAddress)

            await disputable.close(actionId)

            const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
            assertBn(currentSubmitterBalance, previousSubmitterBalance, 'submitter balance does not match')

            const currentStakingBalance = await collateralToken.balanceOf(stakingAddress)
            assertBn(currentStakingBalance, previousStakingBalance, 'staking balance does not match')
          })

          it('does not emit an event', async () => {
            const receipt = await disputable.close(actionId)
            assertAmountOfEvents(receipt, AGREEMENT_EVENTS.ACTION_CLOSED, { decodeForAbi: disputable.abi, expectedAmount: 0 })
          })

          it('there are no more paths allowed', async () => {
            await disputable.close(actionId)

            const { canClose, canChallenge, canSettle, canDispute, canRuleDispute } = await disputable.getAllowedPaths(actionId)
            assert.isFalse(canClose, 'action can be closed')
            assert.isFalse(canChallenge, 'action can be challenged')
            assert.isFalse(canSettle, 'action can be settled')
            assert.isFalse(canDispute, 'action can be disputed')
            assert.isFalse(canRuleDispute, 'action dispute can be ruled')
          })
        }

        const itCannotBeClosed = () => {
          it('reverts', async () => {
            await assertRevert(disputable.close(actionId), AGREEMENT_ERRORS.ERROR_CANNOT_CLOSE_ACTION)
          })
        }

        context('when the action was not closed', () => {
          context('when the action was not challenged', () => {
            const unlocksBalance = true

            itClosesTheActionProperly(unlocksBalance)
          })

          context('when the action was challenged', () => {
            let challengeId

            beforeEach('challenge action', async () => {
              ({ challengeId } = await disputable.challenge({ actionId }))
            })

            context('when the challenge was not answered', () => {
              context('at the beginning of the answer period', () => {
                itCannotBeClosed()
              })

              context('in the middle of the answer period', () => {
                beforeEach('move before the challenge end date', async () => {
                  await disputable.moveBeforeChallengeEndDate(challengeId)
                })

                itCannotBeClosed()
              })

              context('at the end of the answer period', () => {
                beforeEach('move to the challenge end date', async () => {
                  await disputable.moveToChallengeEndDate(challengeId)
                })

                itCannotBeClosed()
              })

              context('after the answer period', () => {
                beforeEach('move after the challenge end date', async () => {
                  await disputable.moveAfterChallengeEndDate(challengeId)
                })

                itCannotBeClosed()
              })
            })

            context('when the challenge was answered', () => {
              context('when the challenge was settled', () => {
                beforeEach('settle challenge', async () => {
                  await disputable.settle({ actionId })
                })

                itIgnoresTheRequest()
              })

              context('when the challenge was disputed', () => {
                beforeEach('dispute action', async () => {
                  await disputable.dispute({ actionId })
                })

                context('when the dispute was not ruled', () => {
                  itCannotBeClosed()
                })

                context('when the dispute was ruled', () => {
                  context('when the dispute was refused', () => {
                    const unlocksBalance = true

                    beforeEach('rule action', async () => {
                      await disputable.executeRuling({ actionId, ruling: RULINGS.REFUSED })
                    })

                    context('when the action was closed', () => {
                      beforeEach('close action', async () => {
                        await disputable.close(actionId)
                      })

                      itIgnoresTheRequest()
                    })

                    context('when the action was not closed', () => {
                      itClosesTheActionProperly(unlocksBalance)
                    })
                  })

                  context('when the dispute was ruled in favor the submitter', () => {
                    const unlocksBalance = true

                    beforeEach('rule action', async () => {
                      await disputable.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER })
                    })

                    context('when the action was closed', () => {
                      beforeEach('close action', async () => {
                        await disputable.close(actionId)
                      })

                      itIgnoresTheRequest()
                    })

                    context('when the action was not closed', () => {

                      itClosesTheActionProperly(unlocksBalance)
                    })
                  })

                  context('when the dispute was ruled in favor the challenger', () => {
                    beforeEach('rule action', async () => {
                      await disputable.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER })
                    })

                    itIgnoresTheRequest()
                  })
                })
              })
            })
          })
        })

        context('when the action was closed', () => {
          beforeEach('close action', async () => {
            await disputable.close(actionId)
          })

          itIgnoresTheRequest()
        })
      }

      context('when the app was activated', () => {
        itCanCloseActions()
      })

      context('when the app was deactivated', () => {
        beforeEach('mark app as unregistered', async () => {
          await disputable.deactivate()
        })

        itCanCloseActions()
      })
    })

    context('when the given action does not exist', () => {
      it('reverts', async () => {
        await assertRevert(disputable.close(0), AGREEMENT_ERRORS.ERROR_ACTION_DOES_NOT_EXIST)
      })
    })
  })
})
