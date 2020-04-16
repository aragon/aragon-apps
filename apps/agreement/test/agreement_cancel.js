const ERRORS = require('./helpers/utils/errors')
const EVENTS = require('./helpers/utils/events')
const { assertBn } = require('./helpers/lib/assertBn')
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { RULINGS, ACTIONS_STATE } = require('./helpers/utils/enums')
const { assertEvent, assertAmountOfEvents } = require('./helpers/lib/assertEvent')

const deployer = require('./helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, submitter, someone]) => {
  let agreement, actionId

  beforeEach('deploy agreement instance', async () => {
    agreement = await deployer.deployAndInitializeWrapper()
  })

  describe('cancel', () => {
    context('when the given action exists', () => {
      beforeEach('create action', async () => {
        ({ actionId } = await agreement.schedule({ submitter }))
      })

      const itCancelsTheActionProperly = unlocksBalance => {
        context('when the sender is the submitter', () => {
          const from = submitter

          it('updates the action state only', async () => {
            const previousActionState = await agreement.getAction(actionId)

            await agreement.cancel({ actionId, from })

            const currentActionState = await agreement.getAction(actionId)
            assert.equal(currentActionState.state, ACTIONS_STATE.CANCELLED, 'action state does not match')

            assert.equal(currentActionState.script, previousActionState.script, 'action script does not match')
            assert.equal(currentActionState.context, previousActionState.context, 'action context does not match')
            assert.equal(currentActionState.submitter, previousActionState.submitter, 'submitter does not match')
            assertBn(currentActionState.createdAt, previousActionState.createdAt, 'created at does not match')
            assertBn(currentActionState.settingId, previousActionState.settingId, 'setting ID does not match')
          })

          if (unlocksBalance) {
            it('unlocks the collateral amount', async () => {
              const { collateralAmount } = agreement
              const { locked: previousLockedBalance, available: previousAvailableBalance } = await agreement.getBalance(submitter)

              await agreement.cancel({ actionId, from })

              const { locked: currentLockedBalance, available: currentAvailableBalance } = await agreement.getBalance(submitter)
              assertBn(currentLockedBalance, previousLockedBalance.sub(collateralAmount), 'locked balance does not match')
              assertBn(currentAvailableBalance, previousAvailableBalance.add(collateralAmount), 'available balance does not match')
            })

            it('does not affect the challenged balance', async () => {
              const { challenged: previousChallengedBalance } = await agreement.getBalance(submitter)

              await agreement.cancel({ actionId, from })

              const { challenged: currentChallengedBalance } = await agreement.getBalance(submitter)
              assertBn(currentChallengedBalance, previousChallengedBalance, 'challenged balance does not match')
            })
          } else {
            it('does not affect the submitter staked balances', async () => {
              const previousBalance = await agreement.getBalance(submitter)

              await agreement.cancel({ actionId, from })

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

            await agreement.cancel({ actionId, from })

            const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
            assertBn(currentSubmitterBalance, previousSubmitterBalance, 'submitter balance does not match')

            const currentAgreementBalance = await collateralToken.balanceOf(agreement.address)
            assertBn(currentAgreementBalance, previousAgreementBalance, 'agreement balance does not match')
          })

          it('emits an event', async () => {
            const receipt = await agreement.cancel({ actionId, from })

            assertAmountOfEvents(receipt, EVENTS.ACTION_CANCELLED, 1)
            assertEvent(receipt, EVENTS.ACTION_CANCELLED, { actionId })
          })

          it('there are no more paths allowed', async () => {
            await agreement.cancel({ actionId, from })

            const { canCancel, canChallenge, canAnswerChallenge, canRuleDispute, canSubmitEvidence, canExecute } = await agreement.getAllowedPaths(actionId)
            assert.isFalse(canCancel, 'action can be cancelled')
            assert.isFalse(canChallenge, 'action can be challenged')
            assert.isFalse(canAnswerChallenge, 'action challenge can be answered')
            assert.isFalse(canRuleDispute, 'action dispute can be ruled')
            assert.isFalse(canSubmitEvidence, 'action evidence can be submitted')
            assert.isFalse(canExecute, 'action can be executed')
          })
        })

        context('when the sender is not the submitter', () => {
          const from = someone

          it('reverts', async () => {
            await assertRevert(agreement.cancel({ actionId, from }), ERRORS.ERROR_SENDER_NOT_ALLOWED)
          })
        })
      }

      const itCannotBeCancelled = () => {
        it('reverts', async () => {
          await assertRevert(agreement.cancel({ actionId }), ERRORS.ERROR_CANNOT_CANCEL_ACTION)
        })
      }

      context('when the action was not cancelled', () => {
        context('when the action was not challenged', () => {
          const unlocksBalance = true

          context('at the beginning of the challenge period', () => {
            itCancelsTheActionProperly(unlocksBalance)
          })

          context('in the middle of the challenge period', () => {
            beforeEach('move before challenge period end date', async () => {
              await agreement.moveBeforeEndOfChallengePeriod(actionId)
            })

            itCancelsTheActionProperly(unlocksBalance)
          })

          context('at the end of the challenge period', () => {
            beforeEach('move to the challenge period end date', async () => {
              await agreement.moveToEndOfChallengePeriod(actionId)
            })

            itCancelsTheActionProperly(unlocksBalance)
          })

          context('after the challenge period', () => {
            beforeEach('move after the challenge period end date', async () => {
              await agreement.moveAfterChallengePeriod(actionId)
            })

            context('when the action was not executed', () => {
              context('when the action was not cancelled', () => {
                itCancelsTheActionProperly(unlocksBalance)
              })

              context('when the action was cancelled', () => {
                beforeEach('cancel action', async () => {
                  await agreement.cancel({ actionId })
                })

                itCannotBeCancelled()
              })
            })

            context('when the action was executed', () => {
              beforeEach('execute action', async () => {
                await agreement.execute({ actionId })
              })

              itCannotBeCancelled()
            })
          })
        })

        context('when the action was challenged', () => {
          beforeEach('challenge action', async () => {
            await agreement.challenge({ actionId })
          })

          context('when the challenge was not answered', () => {
            context('at the beginning of the answer period', () => {
              itCannotBeCancelled()
            })

            context('in the middle of the answer period', () => {
              beforeEach('move before settlement period end date', async () => {
                await agreement.moveBeforeEndOfSettlementPeriod(actionId)
              })

              itCannotBeCancelled()
            })

            context('at the end of the answer period', () => {
              beforeEach('move to the settlement period end date', async () => {
                await agreement.moveToEndOfSettlementPeriod(actionId)
              })

              itCannotBeCancelled()
            })

            context('after the answer period', () => {
              beforeEach('move after the settlement period end date', async () => {
                await agreement.moveAfterSettlementPeriod(actionId)
              })

              itCannotBeCancelled()
            })
          })

          context('when the challenge was answered', () => {
            context('when the challenge was settled', () => {
              beforeEach('settle challenge', async () => {
                await agreement.settle({ actionId })
              })

              itCannotBeCancelled()
            })

            context('when the challenge was disputed', () => {
              beforeEach('dispute action', async () => {
                await agreement.dispute({ actionId })
              })

              context('when the dispute was not ruled', () => {
                itCannotBeCancelled()
              })

              context('when the dispute was ruled', () => {
                context('when the dispute was ruled in favor the submitter', () => {
                  beforeEach('rule action', async () => {
                    await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER })
                  })

                  context('when the action was executed', () => {
                    beforeEach('execute action', async () => {
                      await agreement.execute({ actionId })
                    })

                    itCannotBeCancelled()
                  })

                  context('when the action was not executed', () => {
                    context('when the action was not cancelled', () => {
                      const unlocksBalance = false

                      itCancelsTheActionProperly(unlocksBalance)
                    })

                    context('when the action was cancelled', () => {
                      beforeEach('cancel action', async () => {
                        await agreement.cancel({ actionId })
                      })

                      itCannotBeCancelled()
                    })
                  })
                })

                context('when the dispute was ruled in favor the challenger', () => {
                  beforeEach('rule action', async () => {
                    await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER })
                  })

                  itCannotBeCancelled()
                })

                context('when the dispute was refused', () => {
                  beforeEach('rule action', async () => {
                    await agreement.executeRuling({ actionId, ruling: RULINGS.REFUSED })
                  })

                  itCannotBeCancelled()
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

        itCannotBeCancelled()
      })
    })
  })

  context('when the given action does not exist', () => {
    it('reverts', async () => {
      await assertRevert(agreement.cancel({ actionId: 0 }), ERRORS.ERROR_ACTION_DOES_NOT_EXIST)
    })
  })
})
