const { assertBn } = require('../helpers/assert/assertBn')
const { assertRevert } = require('../helpers/assert/assertThrow')
const { assertEvent, assertAmountOfEvents } = require('../helpers/assert/assertEvent')
const { DELAY_EVENTS } = require('../helpers/utils/events')
const { DELAY_ERRORS } = require('../helpers/utils/errors')
const { RULINGS, DELAY_STATE } = require('../helpers/utils/enums')

const deployer = require('../helpers/utils/deployer')(web3, artifacts)

contract('Delay', ([_, submitter, someone]) => {
  let delay, delayableId

  beforeEach('deploy delay instance', async () => {
    delay = await deployer.deployAndInitializeWrapperWithDisputable({ delay: true })
  })

  describe('stop', () => {
    context('when the given delayable exists', () => {
      beforeEach('create delayable', async () => {
        ({ delayableId } = await delay.schedule({ submitter }))
      })

      const itStopsTheActionProperly = unlocksBalance => {
        context('when the sender is the submitter', () => {
          const from = submitter

          it('updates the delayable state only', async () => {
            const previousDelayableState = await delay.getDelayable(delayableId)

            await delay.stop({ delayableId, from })

            const currentDelayableState = await delay.getDelayable(delayableId)
            assertBn(currentDelayableState.state, DELAY_STATE.STOPPED, 'delayable state does not match')

            assert.equal(currentDelayableState.script, previousDelayableState.script, 'delayable script does not match')
            assertBn(currentDelayableState.executableAt, previousDelayableState.executableAt, 'delayable executable date does not match')
            assert.equal(currentDelayableState.submitter, previousDelayableState.submitter, 'submitter does not match')
            assertBn(currentDelayableState.actionId, previousDelayableState.actionId, 'action ID does not match')
          })

          if (unlocksBalance) {
            it('unlocks the collateral amount', async () => {
              const { actionCollateral } = delay
              const { locked: previousLockedBalance, available: previousAvailableBalance } = await delay.getBalance(submitter)

              await delay.stop({ delayableId, from })

              const { locked: currentLockedBalance, available: currentAvailableBalance } = await delay.getBalance(submitter)
              assertBn(currentLockedBalance, previousLockedBalance.sub(actionCollateral), 'locked balance does not match')
              assertBn(currentAvailableBalance, previousAvailableBalance.add(actionCollateral), 'available balance does not match')
            })
          } else {
            it('does not affect the submitter staked balances', async () => {
              const { locked: previousLockedBalance, available: previousAvailableBalance } = await delay.getBalance(submitter)

              await delay.stop({ delayableId, from })

              const { locked: currentLockedBalance, available: currentAvailableBalance } = await delay.getBalance(submitter)
              assertBn(currentLockedBalance, previousLockedBalance, 'locked balance does not match')
              assertBn(currentAvailableBalance, previousAvailableBalance, 'available balance does not match')
            })
          }

          it('does not affect token balances', async () => {
            const { collateralToken } = delay
            const previousSubmitterBalance = await collateralToken.balanceOf(submitter)
            const previousStakingBalance = await collateralToken.balanceOf(delay.address)

            await delay.stop({ delayableId, from })

            const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
            assertBn(currentSubmitterBalance, previousSubmitterBalance, 'submitter balance does not match')

            const currentStakingBalance = await collateralToken.balanceOf(delay.address)
            assertBn(currentStakingBalance, previousStakingBalance, 'staking balance does not match')
          })

          it('emits an event', async () => {
            const receipt = await delay.stop({ delayableId, from })

            assertAmountOfEvents(receipt, DELAY_EVENTS.STOPPED, 1)
            assertEvent(receipt, DELAY_EVENTS.STOPPED, { id: delayableId })
          })

          it('there are no more paths allowed', async () => {
            await delay.stop({ delayableId, from })

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
        })

        context('when the sender is not the submitter', () => {
          const from = someone

          it('reverts', async () => {
            await assertRevert(delay.stop({ delayableId, from }), DELAY_ERRORS.ERROR_SENDER_NOT_ALLOWED)
          })
        })
      }

      const itCannotBeStopped = () => {
        it('reverts', async () => {
          await assertRevert(delay.stop({ delayableId }), DELAY_ERRORS.ERROR_CANNOT_STOP_DELAYABLE)
        })
      }

      context('when the delayable was not stopped', () => {
        context('when the delayable was not challenged', () => {
          const unlocksBalance = true

          context('at the beginning of the delay period', () => {
            itStopsTheActionProperly(unlocksBalance)
          })

          context('in the middle of the challenge period', () => {
            beforeEach('move before the delay period end date', async () => {
              await delay.moveBeforeEndOfDelayPeriod(delayableId)
            })

            itStopsTheActionProperly(unlocksBalance)
          })

          context('at the end of the delay period', () => {
            beforeEach('move to the delay period end date', async () => {
              await delay.moveToEndOfDelayPeriod(delayableId)
            })

            itStopsTheActionProperly(unlocksBalance)
          })

          context('after the delay period', () => {
            beforeEach('move after the delay period end date', async () => {
              await delay.moveAfterDelayPeriod(delayableId)
            })

            context('when the delayable was not executed', () => {
              context('when the delayable was not stopped', () => {
                itStopsTheActionProperly(unlocksBalance)
              })

              context('when the delayable was stopped', () => {
                beforeEach('cancel delayable', async () => {
                  await delay.stop({ delayableId })
                })

                itCannotBeStopped()
              })
            })

            context('when the delayable was executed', () => {
              beforeEach('execute delayable', async () => {
                await delay.execute({ delayableId })
              })

              itCannotBeStopped()
            })
          })
        })

        context('when the delayable was challenged', () => {
          beforeEach('challenge delayable', async () => {
            await delay.challenge({ delayableId })
          })

          context('when the challenge was not answered', () => {
            context('at the beginning of the answer period', () => {
              itCannotBeStopped()
            })

            context('in the middle of the answer period', () => {
              beforeEach('move before settlement period end date', async () => {
                await delay.moveBeforeChallengeEndDate(delayableId)
              })

              itCannotBeStopped()
            })

            context('at the end of the answer period', () => {
              beforeEach('move to the settlement period end date', async () => {
                await delay.moveToChallengeEndDate(delayableId)
              })

              itCannotBeStopped()
            })

            context('after the answer period', () => {
              beforeEach('move after the settlement period end date', async () => {
                await delay.moveAfterChallengeEndDate(delayableId)
              })

              itCannotBeStopped()
            })
          })

          context('when the challenge was answered', () => {
            context('when the challenge was settled', () => {
              beforeEach('settle challenge', async () => {
                await delay.settle({ delayableId })
              })

              itCannotBeStopped()
            })

            context('when the challenge was disputed', () => {
              beforeEach('dispute delayable', async () => {
                await delay.dispute({ delayableId })
              })

              context('when the dispute was not ruled', () => {
                itCannotBeStopped()
              })

              context('when the dispute was ruled', () => {
                context('when the dispute was ruled in favor the submitter', () => {
                  beforeEach('rule delayable', async () => {
                    await delay.executeRuling({ delayableId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER })
                  })

                  context('when the delayable was executed', () => {
                    beforeEach('execute delayable', async () => {
                      await delay.execute({ delayableId })
                    })

                    itCannotBeStopped()
                  })

                  context('when the delayable was not executed', () => {
                    context('when the delayable was not stopped', () => {
                      const unlocksBalance = false

                      itStopsTheActionProperly(unlocksBalance)
                    })

                    context('when the delayable was stopped', () => {
                      beforeEach('cancel delayable', async () => {
                        await delay.stop({ delayableId })
                      })

                      itCannotBeStopped()
                    })
                  })
                })

                context('when the dispute was ruled in favor the challenger', () => {
                  beforeEach('rule delayable', async () => {
                    await delay.executeRuling({ delayableId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER })
                  })

                  itCannotBeStopped()
                })

                context('when the dispute was refused', () => {
                  beforeEach('rule delayable', async () => {
                    await delay.executeRuling({ delayableId, ruling: RULINGS.REFUSED })
                  })

                  itCannotBeStopped()
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

        itCannotBeStopped()
      })
    })

    context('when the given delayable does not exist', () => {
      it('reverts', async () => {
        await assertRevert(delay.stop({ delayableId: 0 }), DELAY_ERRORS.ERROR_DELAYABLE_DOES_NOT_EXIST)
      })
    })
  })
})
