const { assertBn } = require('../helpers/assert/assertBn')
const { assertRevert } = require('../helpers/assert/assertThrow')
const { decodeEventsOfType } = require('../helpers/lib/decodeEvent')
const { assertEvent, assertAmountOfEvents } = require('../helpers/assert/assertEvent')
const { AGREEMENT_EVENTS } = require('../helpers/utils/events')
const { RULINGS, ACTIONS_STATE } = require('../helpers/utils/enums')
const { ARAGON_OS_ERRORS, AGREEMENT_ERRORS } = require('../helpers/utils/errors')

const deployer = require('../helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, submitter, someone]) => {
  let agreement, actionId

  beforeEach('deploy agreement instance', async () => {
    agreement = await deployer.deployAndInitializeWrapperWithDisputable()
  })

  describe('close', () => {
    context('when the given action exists', () => {
      beforeEach('create action', async () => {
        ({ actionId } = await agreement.newAction({ submitter }))
      })

      const itClosesTheActionProperly = unlocksBalance => {
        context('when the sender is the disputable', () => {
          it('updates the action state only', async () => {
            const previousActionState = await agreement.getAction(actionId)

            await agreement.close({ actionId })

            const currentActionState = await agreement.getAction(actionId)
            assertBn(currentActionState.state, ACTIONS_STATE.CLOSED, 'action state does not match')

            assertBn(currentActionState.disputableId, previousActionState.disputableId, 'disputable ID does not match')
            assert.equal(currentActionState.disputable, previousActionState.disputable, 'disputable does not match')
            assert.equal(currentActionState.submitter, previousActionState.submitter, 'submitter does not match')
            assert.equal(currentActionState.context, previousActionState.context, 'action context does not match')
            assertBn(currentActionState.collateralId, previousActionState.collateralId, 'collateral ID does not match')
          })

          if (unlocksBalance) {
            it('unlocks the collateral amount', async () => {
              const { actionCollateral } = agreement
              const { locked: previousLockedBalance, available: previousAvailableBalance } = await agreement.getBalance(submitter)

              await agreement.close({ actionId })

              const { locked: currentLockedBalance, available: currentAvailableBalance } = await agreement.getBalance(submitter)
              assertBn(currentLockedBalance, previousLockedBalance.sub(actionCollateral), 'locked balance does not match')
              assertBn(currentAvailableBalance, previousAvailableBalance.add(actionCollateral), 'available balance does not match')
            })
          } else {
            it('does not affect the submitter staked balances', async () => {
              const { locked: previousLockedBalance, available: previousAvailableBalance } = await agreement.getBalance(submitter)

              await agreement.close({ actionId })

              const { locked: currentLockedBalance, available: currentAvailableBalance } = await agreement.getBalance(submitter)
              assertBn(currentLockedBalance, previousLockedBalance, 'locked balance does not match')
              assertBn(currentAvailableBalance, previousAvailableBalance, 'available balance does not match')
            })
          }

          it('does not affect staked balances', async () => {
            const stakingAddress = await agreement.getStakingAddress()
            const { collateralToken } = agreement

            const previousSubmitterBalance = await collateralToken.balanceOf(submitter)
            const previousStakingBalance = await collateralToken.balanceOf(stakingAddress)

            await agreement.close({ actionId })

            const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
            assertBn(currentSubmitterBalance, previousSubmitterBalance, 'submitter balance does not match')

            const currentStakingBalance = await collateralToken.balanceOf(stakingAddress)
            assertBn(currentStakingBalance, previousStakingBalance, 'staking balance does not match')
          })

          it('emits an event', async () => {
            const receipt = await agreement.close({ actionId })
            const logs = decodeEventsOfType(receipt, agreement.abi, AGREEMENT_EVENTS.ACTION_CLOSED)

            assertAmountOfEvents({ logs }, AGREEMENT_EVENTS.ACTION_CLOSED, 1)
            assertEvent({ logs }, AGREEMENT_EVENTS.ACTION_CLOSED, { actionId })
          })

          it('there are no more paths allowed', async () => {
            await agreement.close({ actionId })

            const { canProceed, canChallenge, canSettle, canDispute, canRuleDispute } = await agreement.getAllowedPaths(actionId)
            assert.isFalse(canProceed, 'action can proceed')
            assert.isFalse(canChallenge, 'action can be challenged')
            assert.isFalse(canSettle, 'action can be settled')
            assert.isFalse(canDispute, 'action can be disputed')
            assert.isFalse(canRuleDispute, 'action dispute can be ruled')
          })
        })

        context('when the sender is not the disputable', () => {
          const from = someone

          it('reverts', async () => {
            await assertRevert(agreement.close({ actionId, from }), ARAGON_OS_ERRORS.ERROR_AUTH_FAILED)
          })
        })
      }

      const itCannotBeClosed = () => {
        it('reverts', async () => {
          await assertRevert(agreement.close({ actionId }), AGREEMENT_ERRORS.ERROR_CANNOT_CLOSE_ACTION)
        })
      }

      context('when the action was not closed', () => {
        context('when the action was not challenged', () => {
          const unlocksBalance = true

          itClosesTheActionProperly(unlocksBalance)
        })

        context('when the action was challenged', () => {
          beforeEach('challenge action', async () => {
            await agreement.challenge({ actionId })
          })

          context('when the challenge was not answered', () => {
            context('at the beginning of the answer period', () => {
              itCannotBeClosed()
            })

            context('in the middle of the answer period', () => {
              beforeEach('move before settlement period end date', async () => {
                await agreement.moveBeforeChallengeEndDate(actionId)
              })

              itCannotBeClosed()
            })

            context('at the end of the answer period', () => {
              beforeEach('move to the settlement period end date', async () => {
                await agreement.moveToChallengeEndDate(actionId)
              })

              itCannotBeClosed()
            })

            context('after the answer period', () => {
              beforeEach('move after the settlement period end date', async () => {
                await agreement.moveAfterChallengeEndDate(actionId)
              })

              itCannotBeClosed()
            })
          })

          context('when the challenge was answered', () => {
            context('when the challenge was settled', () => {
              beforeEach('settle challenge', async () => {
                await agreement.settle({ actionId })
              })

              itCannotBeClosed()
            })

            context('when the challenge was disputed', () => {
              beforeEach('dispute action', async () => {
                await agreement.dispute({ actionId })
              })

              context('when the dispute was not ruled', () => {
                itCannotBeClosed()
              })

              context('when the dispute was ruled', () => {
                context('when the dispute was ruled in favor the submitter', () => {
                  beforeEach('rule action', async () => {
                    await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER })
                  })

                  context('when the action was closed', () => {
                    beforeEach('close action', async () => {
                      await agreement.close({ actionId })
                    })

                    itCannotBeClosed()
                  })

                  context('when the action was not closed', () => {
                    const unlocksBalance = false

                    itClosesTheActionProperly(unlocksBalance)
                  })
                })

                context('when the dispute was ruled in favor the challenger', () => {
                  beforeEach('rule action', async () => {
                    await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER })
                  })

                  itCannotBeClosed()
                })

                context('when the dispute was refused', () => {
                  beforeEach('rule action', async () => {
                    await agreement.executeRuling({ actionId, ruling: RULINGS.REFUSED })
                  })

                  itCannotBeClosed()
                })
              })
            })
          })
        })
      })

      context('when the action was closed', () => {
        beforeEach('close action', async () => {
          await agreement.close({ actionId })
        })

        itCannotBeClosed()
      })
    })

    context('when the given action does not exist', () => {
      it('reverts', async () => {
        await assertRevert(agreement.close({ actionId: 0 }), AGREEMENT_ERRORS.ERROR_ACTION_DOES_NOT_EXIST)
      })
    })
  })
})
