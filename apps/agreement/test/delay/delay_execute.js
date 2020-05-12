const { assertBn } = require('../helpers/assert/assertBn')
const { assertRevert } = require('../helpers/assert/assertThrow')
const { decodeEventsOfType } = require('../helpers/lib/decodeEvent')
const { assertEvent, assertAmountOfEvents } = require('../helpers/assert/assertEvent')
const { DELAY_EVENTS } = require('../helpers/utils/events')
const { DELAY_ERRORS } = require('../helpers/utils/errors')
const { DELAY_STATE, RULINGS } = require('../helpers/utils/enums')

const deployer = require('../helpers/utils/deployer')(web3, artifacts)

contract('Delay', ([_, submitter]) => {
  let delay, delayableId

  beforeEach('deploy delay instance', async () => {
    delay = await deployer.deployAndInitializeWrapperWithDisputable({ delay: true })
  })

  describe('execute', () => {
    context('when the given delayable exists', () => {
      beforeEach('create delayable', async () => {
        ({ delayableId } = await delay.schedule({ submitter }))
      })

      const itCannotBeExecuted = () => {
        it('reverts', async () => {
          await assertRevert(delay.execute({ delayableId }), DELAY_ERRORS.ERROR_CANNOT_EXECUTE_DELAYABLE)
        })
      }

      const itExecutesTheActionProperly = unlocksBalance => {
        it('executes the delayable', async () => {
          const ExecutionTarget = artifacts.require('ExecutionTarget')

          const receipt = await delay.execute({ delayableId })
          const logs = decodeEventsOfType(receipt, ExecutionTarget.abi, 'TargetExecuted')

          assertAmountOfEvents({ logs }, 'TargetExecuted', 1)
          assertEvent({ logs }, 'TargetExecuted', { counter: 1 })
        })

        it('updates the delayable state only', async () => {
          const previousDelayableState = await delay.getDelayable(delayableId)

          await delay.execute({ delayableId })

          const currentDelayableState = await delay.getDelayable(delayableId)
          assertBn(currentDelayableState.state, DELAY_STATE.EXECUTED, 'delayable state does not match')

          assert.equal(currentDelayableState.script, previousDelayableState.script, 'delayable script does not match')
          assertBn(currentDelayableState.executableAt, previousDelayableState.executableAt, 'delayable disputable date does not match')
          assert.equal(currentDelayableState.submitter, previousDelayableState.submitter, 'submitter does not match')
          assertBn(currentDelayableState.actionId, previousDelayableState.actionId, 'action ID does not match')
        })

        if (unlocksBalance) {
          it('unlocks the collateral amount', async () => {
            const { actionCollateral } = delay
            const { locked: previousLockedBalance, available: previousAvailableBalance } = await delay.getBalance(submitter)

            await delay.execute({ delayableId })

            const { locked: currentLockedBalance, available: currentAvailableBalance } = await delay.getBalance(submitter)
            assertBn(currentLockedBalance, previousLockedBalance.sub(actionCollateral), 'locked balance does not match')
            assertBn(currentAvailableBalance, previousAvailableBalance.add(actionCollateral), 'available balance does not match')
          })
        } else {
          it('does not affect the submitter staked balances', async () => {
            const previousBalance = await delay.getBalance(submitter)

            await delay.execute({ delayableId })

            const currentBalance = await delay.getBalance(submitter)
            assertBn(currentBalance.available, previousBalance.available, 'available balance does not match')
            assertBn(currentBalance.locked, previousBalance.locked, 'locked balance does not match')
          })
        }

        it('does not affect token balances', async () => {
          const { collateralToken } = delay
          const previousSubmitterBalance = await collateralToken.balanceOf(submitter)
          const previousStakingBalance = await collateralToken.balanceOf(delay.address)

          await delay.execute({ delayableId })

          const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
          assertBn(currentSubmitterBalance, previousSubmitterBalance, 'submitter balance does not match')

          const currentStakingBalance = await collateralToken.balanceOf(delay.address)
          assertBn(currentStakingBalance, previousStakingBalance, 'staking balance does not match')
        })

        it('emits an event', async () => {
          const receipt = await delay.execute({ delayableId })

          assertAmountOfEvents(receipt, DELAY_EVENTS.EXECUTED, 1)
          assertEvent(receipt, DELAY_EVENTS.EXECUTED, { id: delayableId })
        })

        it('there are no more paths allowed', async () => {
          await delay.execute({ delayableId })

          const { canStop, canPause, canExecute, canProceed, canChallenge, canSettle, canDispute, canRuleDispute } = await delay.getAllowedPaths(delayableId)
          assert.isFalse(canStop, 'delayable can be stopped')
          assert.isFalse(canPause, 'delayable can be paused')
          assert.isFalse(canExecute, 'delayable can be executed')

          assert.isFalse(canProceed, 'action can proceed')
          assert.isFalse(canChallenge, 'action can be challenged')
          assert.isFalse(canSettle, 'action can be settled')
          assert.isFalse(canDispute, 'action can be disputed')
          assert.isFalse(canRuleDispute, 'action dispute can be ruled')
          assert.isFalse(canExecute, 'action can be executed')
        })
      }

      context('when the delayable was not stopped', () => {
        context('when the delayable was not challenged', () => {
          const unlocksBalance = true

          context('at the beginning of the delay period', () => {
            itCannotBeExecuted()
          })

          context('in the middle of the challenge period', () => {
            beforeEach('move before the delay period end date', async () => {
              await delay.moveBeforeEndOfDelayPeriod(delayableId)
            })

            itCannotBeExecuted()
          })

          context('at the end of the delay period', () => {
            beforeEach('move to the delay period end date', async () => {
              await delay.moveToEndOfDelayPeriod(delayableId)
            })

            context('when the delayable was not executed', () => {
              context('when the delayable was not stopped', () => {
                itExecutesTheActionProperly(unlocksBalance)
              })

              context('when the delayable was stopped', () => {
                beforeEach('cancel delayable', async () => {
                  await delay.stop({ delayableId })
                })

                itCannotBeExecuted()
              })
            })

            context('when the delayable was executed', () => {
              beforeEach('execute delayable', async () => {
                await delay.execute({ delayableId })
              })

              itCannotBeExecuted()
            })
          })

          context('after the delay period', () => {
            beforeEach('move after the delay period', async () => {
              await delay.moveAfterDelayPeriod(delayableId)
            })

            context('when the delayable was not executed', () => {
              context('when the delayable was not stopped', () => {
                itExecutesTheActionProperly(unlocksBalance)
              })

              context('when the delayable was stopped', () => {
                beforeEach('cancel delayable', async () => {
                  await delay.stop({ delayableId })
                })

                itCannotBeExecuted()
              })
            })

            context('when the delayable was executed', () => {
              beforeEach('execute delayable', async () => {
                await delay.execute({ delayableId })
              })

              itCannotBeExecuted()
            })
          })
        })

        context('when the delayable was challenged', () => {
          beforeEach('challenge delayable', async () => {
            await delay.challenge({ delayableId })
          })

          context('when the challenge was not answered', () => {
            context('at the beginning of the answer period', () => {
              itCannotBeExecuted()
            })

            context('in the middle of the answer period', () => {
              beforeEach('move before settlement period end date', async () => {
                await delay.moveBeforeChallengeEndDate(delayableId)
              })

              itCannotBeExecuted()
            })

            context('at the end of the answer period', () => {
              beforeEach('move to the settlement period end date', async () => {
                await delay.moveToChallengeEndDate(delayableId)
              })

              itCannotBeExecuted()
            })

            context('after the answer period', () => {
              beforeEach('move after the settlement period end date', async () => {
                await delay.moveAfterChallengeEndDate(delayableId)
              })

              itCannotBeExecuted()
            })
          })

          context('when the challenge was answered', () => {
            context('when the challenge was settled', () => {
              beforeEach('settle challenge', async () => {
                await delay.settle({ delayableId })
              })

              itCannotBeExecuted()
            })

            context('when the challenge was disputed', () => {
              beforeEach('dispute delayable', async () => {
                await delay.dispute({ delayableId })
              })

              context('when the dispute was not ruled', () => {
                itCannotBeExecuted()
              })

              context('when the dispute was ruled', () => {
                context('when the dispute was ruled in favor the submitter', () => {
                  beforeEach('rule delayable', async () => {
                    await delay.executeRuling({ delayableId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER })
                  })

                  context('when the delayable was not executed', () => {
                    context('when the delayable was not stopped', () => {
                      const unlocksBalance = false

                      itExecutesTheActionProperly(unlocksBalance)
                    })

                    context('when the delayable was stopped', () => {
                      beforeEach('cancel delayable', async () => {
                        await delay.stop({ delayableId })
                      })

                      itCannotBeExecuted()
                    })
                  })

                  context('when the delayable was executed', () => {
                    beforeEach('execute delayable', async () => {
                      await delay.execute({ delayableId })
                    })

                    itCannotBeExecuted()
                  })
                })

                context('when the dispute was ruled in favor the challenger', () => {
                  beforeEach('rule delayable', async () => {
                    await delay.executeRuling({ delayableId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER })
                  })

                  itCannotBeExecuted()
                })

                context('when the dispute was refused', () => {
                  beforeEach('rule delayable', async () => {
                    await delay.executeRuling({ delayableId, ruling: RULINGS.REFUSED })
                  })

                  itCannotBeExecuted()
                })
              })
            })
          })
        })
      })

      context('when the delayable was stopped', () => {
        beforeEach('cancel delayable', async () => {
          await delay.stop({ delayableId })
        })

        itCannotBeExecuted()
      })
    })

    context('when the given delayable does not exist', () => {
      it('reverts', async () => {
        await assertRevert(delay.execute({ delayableId: 0 }), DELAY_ERRORS.ERROR_DELAYABLE_DOES_NOT_EXIST)
      })
    })
  })
})
