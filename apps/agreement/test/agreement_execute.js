const ERRORS = require('./helpers/utils/errors')
const EVENTS = require('./helpers/utils/events')
const { assertBn } = require('./helpers/assert/assertBn')
const { assertRevert } = require('./helpers/assert/assertThrow')
const { decodeEventsOfType } = require('./helpers/lib/decodeEvent')
const { ACTIONS_STATE, RULINGS } = require('./helpers/utils/enums')
const { assertEvent, assertAmountOfEvents } = require('./helpers/assert/assertEvent')

const deployer = require('./helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, submitter]) => {
  let agreement, actionId

  beforeEach('deploy agreement instance', async () => {
    agreement = await deployer.deployAndInitializeWrapper()
  })

  describe('execute', () => {
    context('when the given action exists', () => {
      beforeEach('create action', async () => {
        ({ actionId } = await agreement.schedule({ submitter }))
      })

      const itCannotBeExecuted = () => {
        it('reverts', async () => {
          await assertRevert(agreement.execute({ actionId }), ERRORS.ERROR_CANNOT_EXECUTE_ACTION)
        })
      }

      const itExecutesTheActionProperly = unlocksBalance => {
        it('executes the action', async () => {
          const ExecutionTarget = artifacts.require('ExecutionTarget')

          const receipt = await agreement.execute({ actionId })
          const logs = decodeEventsOfType(receipt, ExecutionTarget.abi, 'Executed')

          assertAmountOfEvents({ logs }, 'Executed', 1)
          assertEvent({ logs }, 'Executed', { counter: 1 })
        })

        it('updates the action state only', async () => {
          const previousActionState = await agreement.getAction(actionId)

          await agreement.execute({ actionId })

          const currentActionState = await agreement.getAction(actionId)
          assert.equal(currentActionState.state, ACTIONS_STATE.EXECUTED, 'action state does not match')

          assert.equal(currentActionState.script, previousActionState.script, 'action script does not match')
          assert.equal(currentActionState.context, previousActionState.context, 'action context does not match')
          assert.equal(currentActionState.submitter, previousActionState.submitter, 'submitter does not match')
          assertBn(currentActionState.challengeEndDate, previousActionState.challengeEndDate, 'challenge end date does not match')
          assertBn(currentActionState.settingId, previousActionState.settingId, 'setting ID does not match')
        })

        if (unlocksBalance) {
          it('unlocks the collateral amount', async () => {
            const { collateralAmount } = agreement
            const { locked: previousLockedBalance, available: previousAvailableBalance } = await agreement.getBalance(submitter)

            await agreement.execute({ actionId })

            const { locked: currentLockedBalance, available: currentAvailableBalance } = await agreement.getBalance(submitter)
            assertBn(currentLockedBalance, previousLockedBalance.sub(collateralAmount), 'locked balance does not match')
            assertBn(currentAvailableBalance, previousAvailableBalance.add(collateralAmount), 'available balance does not match')
          })

          it('does not affect the challenged balance', async () => {
            const { challenged: previousChallengedBalance } = await agreement.getBalance(submitter)

            await agreement.execute({ actionId })

            const { challenged: currentChallengedBalance } = await agreement.getBalance(submitter)
            assertBn(currentChallengedBalance, previousChallengedBalance, 'challenged balance does not match')
          })
        } else {
          it('does not affect the submitter staked balances', async () => {
            const previousBalance = await agreement.getBalance(submitter)

            await agreement.execute({ actionId })

            const currentBalance = await agreement.getBalance(submitter)
            assertBn(currentBalance.available, previousBalance.available, 'available balance does not match')
            assertBn(currentBalance.locked, previousBalance.locked, 'locked balance does not match')
            assertBn(currentBalance.challenged, previousBalance.challenged, 'challenged balance does not match')
          })
        }

        it('does not affect token balances', async () => {
          const { collateralToken } = agreement
          const previousSubmitterBalance = await collateralToken.balanceOf(submitter)
          const previousAgreementBalance = await collateralToken.balanceOf(agreement.address)

          await agreement.execute({ actionId })

          const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
          assertBn(currentSubmitterBalance, previousSubmitterBalance, 'submitter balance does not match')

          const currentAgreementBalance = await collateralToken.balanceOf(agreement.address)
          assertBn(currentAgreementBalance, previousAgreementBalance, 'agreement balance does not match')
        })

        it('emits an event', async () => {
          const receipt = await agreement.execute({ actionId })

          assertAmountOfEvents(receipt, EVENTS.ACTION_EXECUTED, 1)
          assertEvent(receipt, EVENTS.ACTION_EXECUTED, { actionId })
        })

        it('there are no more paths allowed', async () => {
          await agreement.execute({ actionId })

          const { canCancel, canChallenge, canSettle, canDispute, canClaimSettlement, canRuleDispute, canExecute } = await agreement.getAllowedPaths(actionId)
          assert.isFalse(canCancel, 'action can be cancelled')
          assert.isFalse(canChallenge, 'action can be challenged')
          assert.isFalse(canSettle, 'action can be settled')
          assert.isFalse(canDispute, 'action can be disputed')
          assert.isFalse(canClaimSettlement, 'action settlement can be claimed')
          assert.isFalse(canRuleDispute, 'action dispute can be ruled')
          assert.isFalse(canExecute, 'action can be executed')
        })
      }

      context('when the action was not cancelled', () => {
        context('when the action was not challenged', () => {
          const unlocksBalance = true

          context('at the beginning of the challenge period', () => {
            itCannotBeExecuted()
          })

          context('in the middle of the challenge period', () => {
            beforeEach('move before challenge period end date', async () => {
              await agreement.moveBeforeEndOfChallengePeriod(actionId)
            })

            itCannotBeExecuted()
          })

          context('at the end of the challenge period', () => {
            beforeEach('move to the challenge period end date', async () => {
              await agreement.moveToEndOfChallengePeriod(actionId)
            })

            itCannotBeExecuted()
          })

          context('after the challenge period', () => {
            beforeEach('move after the challenge period', async () => {
              await agreement.moveAfterChallengePeriod(actionId)
            })

            context('when the action was not executed', () => {
              context('when the action was not cancelled', () => {
                itExecutesTheActionProperly(unlocksBalance)
              })

              context('when the action was cancelled', () => {
                beforeEach('cancel action', async () => {
                  await agreement.cancel({ actionId })
                })

                itCannotBeExecuted()
              })
            })

            context('when the action was executed', () => {
              beforeEach('execute action', async () => {
                await agreement.execute({ actionId })
              })

              itCannotBeExecuted()
            })
          })
        })

        context('when the action was challenged', () => {
          beforeEach('challenge action', async () => {
            await agreement.challenge({ actionId })
          })

          context('when the challenge was not answered', () => {
            context('at the beginning of the answer period', () => {
              itCannotBeExecuted()
            })

            context('in the middle of the answer period', () => {
              beforeEach('move before settlement period end date', async () => {
                await agreement.moveBeforeEndOfSettlementPeriod(actionId)
              })

              itCannotBeExecuted()
            })

            context('at the end of the answer period', () => {
              beforeEach('move to the settlement period end date', async () => {
                await agreement.moveToEndOfSettlementPeriod(actionId)
              })

              itCannotBeExecuted()
            })

            context('after the answer period', () => {
              beforeEach('move after the settlement period end date', async () => {
                await agreement.moveAfterSettlementPeriod(actionId)
              })

              itCannotBeExecuted()
            })
          })

          context('when the challenge was answered', () => {
            context('when the challenge was settled', () => {
              beforeEach('settle challenge', async () => {
                await agreement.settle({ actionId })
              })

              itCannotBeExecuted()
            })

            context('when the challenge was disputed', () => {
              beforeEach('dispute action', async () => {
                await agreement.dispute({ actionId })
              })

              context('when the dispute was not ruled', () => {
                itCannotBeExecuted()
              })

              context('when the dispute was ruled', () => {
                context('when the dispute was ruled in favor the submitter', () => {
                  beforeEach('rule action', async () => {
                    await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER })
                  })

                  context('when the action was not executed', () => {
                    context('when the action was not cancelled', () => {
                      const unlocksBalance = false

                      itExecutesTheActionProperly(unlocksBalance)
                    })

                    context('when the action was cancelled', () => {
                      beforeEach('cancel action', async () => {
                        await agreement.cancel({ actionId })
                      })

                      itCannotBeExecuted()
                    })
                  })

                  context('when the action was executed', () => {
                    beforeEach('execute action', async () => {
                      await agreement.execute({ actionId })
                    })

                    itCannotBeExecuted()
                  })
                })

                context('when the dispute was ruled in favor the challenger', () => {
                  beforeEach('rule action', async () => {
                    await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER })
                  })

                  itCannotBeExecuted()
                })

                context('when the dispute was refused', () => {
                  beforeEach('rule action', async () => {
                    await agreement.executeRuling({ actionId, ruling: RULINGS.REFUSED })
                  })

                  itCannotBeExecuted()
                })
              })
            })
          })
        })
      })

      context('when the action was cancelled', () => {
        beforeEach('cancel action', async () => {
          await agreement.cancel({ actionId })
        })

        itCannotBeExecuted()
      })
    })

    context('when the given action does not exist', () => {
      it('reverts', async () => {
        await assertRevert(agreement.execute({ actionId: 0 }), ERRORS.ERROR_ACTION_DOES_NOT_EXIST)
      })
    })
  })
})
