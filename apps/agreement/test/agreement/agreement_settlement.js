const { assertBn } = require('../helpers/assert/assertBn')
const { assertRevert } = require('../helpers/assert/assertThrow')
const { assertEvent, assertAmountOfEvents } = require('../helpers/assert/assertEvent')
const { AGREEMENT_ERRORS } = require('../helpers/utils/errors')
const { AGREEMENT_EVENTS } = require('../helpers/utils/events')
const { CHALLENGES_STATE, RULINGS } = require('../helpers/utils/enums')

const deployer = require('../helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, someone, submitter, challenger]) => {
  let agreement, actionId

  beforeEach('deploy agreement instance', async () => {
    agreement = await deployer.deployAndInitializeWrapperWithDisputable()
  })

  describe('settlement', () => {
    context('when the given action exists', () => {
      beforeEach('create action', async () => {
        ({ actionId } = await agreement.newAction({ submitter }))
      })

      const itCannotSettleAction = () => {
        it('reverts', async () => {
          await assertRevert(agreement.settle({ actionId }), AGREEMENT_ERRORS.ERROR_CANNOT_SETTLE_ACTION)
        })
      }

      context('when the action was not closed', () => {
        context('when the action was not challenged', () => {
          itCannotSettleAction()
        })

        context('when the action was challenged', () => {
          beforeEach('challenge action', async () => {
            await agreement.challenge({ actionId, challenger })
          })

          context('when the challenge was not answered', () => {
            const itSettlesTheChallengeProperly = from => {
              it('updates the challenge state only', async () => {
                const previousChallengeState = await agreement.getChallenge(actionId)

                await agreement.settle({ actionId, from })

                const currentChallengeState = await agreement.getChallenge(actionId)
                assertBn(currentChallengeState.state, CHALLENGES_STATE.SETTLED, 'challenge state does not match')

                assert.equal(currentChallengeState.context, previousChallengeState.context, 'challenge context does not match')
                assert.equal(currentChallengeState.challenger, previousChallengeState.challenger, 'challenger does not match')
                assertBn(currentChallengeState.endDate, previousChallengeState.endDate, 'challenge end date does not match')
                assertBn(currentChallengeState.settlementOffer, previousChallengeState.settlementOffer, 'challenge settlement offer does not match')
                assertBn(currentChallengeState.arbitratorFeeAmount, previousChallengeState.arbitratorFeeAmount, 'arbitrator amount does not match')
                assert.equal(currentChallengeState.arbitratorFeeToken, previousChallengeState.arbitratorFeeToken, 'arbitrator token does not match')
                assertBn(currentChallengeState.disputeId, previousChallengeState.disputeId, 'challenge dispute ID does not match')
              })

              it('does not alter the action', async () => {
                const previousActionState = await agreement.getAction(actionId)

                await agreement.settle({ actionId, from })

                const currentActionState = await agreement.getAction(actionId)
                assertBn(currentActionState.state, previousActionState.state, 'action state does not match')
                assertBn(currentActionState.disputableId, previousActionState.disputableId, 'disputable ID does not match')
                assert.equal(currentActionState.disputable, previousActionState.disputable, 'disputable does not match')
                assert.equal(currentActionState.submitter, previousActionState.submitter, 'submitter does not match')
                assert.equal(currentActionState.context, previousActionState.context, 'action context does not match')
                assertBn(currentActionState.collateralId, previousActionState.collateralId, 'collateral ID does not match')
              })

              it('slashes the submitter challenged balance', async () => {
                const { settlementOffer } = await agreement.getChallenge(actionId)
                const { available: previousAvailableBalance, locked: previousLockedBalance } = await agreement.getBalance(submitter)

                await agreement.settle({ actionId, from })

                const { available: currentAvailableBalance, locked: currentLockedBalance } = await agreement.getBalance(submitter)

                const expectedUnchallengedBalance = agreement.actionCollateral.sub(settlementOffer)
                assertBn(currentLockedBalance, previousLockedBalance.sub(agreement.actionCollateral), 'locked balance does not match')
                assertBn(currentAvailableBalance, previousAvailableBalance.add(expectedUnchallengedBalance), 'available balance does not match')
              })

              it('transfers the settlement offer and the collateral to the challenger', async () => {
                const stakingAddress = await agreement.getStakingAddress()
                const { collateralToken, challengeCollateral } = agreement
                const { settlementOffer } = await agreement.getChallenge(actionId)

                const previousStakingBalance = await collateralToken.balanceOf(stakingAddress)
                const previousAgreementBalance = await collateralToken.balanceOf(agreement.address)
                const previousChallengerBalance = await collateralToken.balanceOf(challenger)

                await agreement.settle({ actionId, from })

                const currentStakingBalance = await collateralToken.balanceOf(stakingAddress)
                assertBn(currentStakingBalance, previousStakingBalance.sub(settlementOffer), 'staking balance does not match')

                const currentAgreementBalance = await collateralToken.balanceOf(agreement.address)
                assertBn(currentAgreementBalance, previousAgreementBalance.sub(challengeCollateral), 'agreement balance does not match')

                const currentChallengerBalance = await collateralToken.balanceOf(challenger)
                assertBn(currentChallengerBalance, previousChallengerBalance.add(settlementOffer).add(challengeCollateral), 'challenger balance does not match')
              })

              it('transfers the arbitrator fees back to the challenger', async () => {
                const arbitratorToken = await agreement.arbitratorToken()
                const halfArbitrationFees = await agreement.halfArbitrationFees()

                const previousAgreementBalance = await arbitratorToken.balanceOf(agreement.address)
                const previousChallengerBalance = await arbitratorToken.balanceOf(challenger)

                await agreement.settle({ actionId, from })

                const currentAgreementBalance = await arbitratorToken.balanceOf(agreement.address)
                assertBn(currentAgreementBalance, previousAgreementBalance.sub(halfArbitrationFees), 'agreement balance does not match')

                const currentChallengerBalance = await arbitratorToken.balanceOf(challenger)
                assertBn(currentChallengerBalance, previousChallengerBalance.add(halfArbitrationFees), 'challenger balance does not match')
              })

              it('emits an event', async () => {
                const receipt = await agreement.settle({ actionId, from })

                assertAmountOfEvents(receipt, AGREEMENT_EVENTS.ACTION_SETTLED, 1)
                assertEvent(receipt, AGREEMENT_EVENTS.ACTION_SETTLED, { actionId })
              })

              it('there are no more paths allowed', async () => {
                await agreement.settle({ actionId, from })

                const { canProceed, canChallenge, canSettle, canDispute, canClaimSettlement, canRuleDispute } = await agreement.getAllowedPaths(actionId)
                assert.isFalse(canProceed, 'action can proceed')
                assert.isFalse(canChallenge, 'action can be challenged')
                assert.isFalse(canSettle, 'action can be settled')
                assert.isFalse(canDispute, 'action can be disputed')
                assert.isFalse(canClaimSettlement, 'action settlement can be claimed')
                assert.isFalse(canRuleDispute, 'action dispute can be ruled')
              })
            }

            const itCanOnlyBeSettledByTheSubmitter = () => {
              context('when the sender is the action submitter', () => {
                const from = submitter

                itSettlesTheChallengeProperly(from)
              })

              context('when the sender is the challenger', () => {
                const from = challenger

                it('reverts', async () => {
                  await assertRevert(agreement.settle({ actionId, from }), AGREEMENT_ERRORS.ERROR_CANNOT_SETTLE_ACTION)
                })
              })

              context('when the sender is someone else', () => {
                const from = someone

                it('reverts', async () => {
                  await assertRevert(agreement.settle({ actionId, from }), AGREEMENT_ERRORS.ERROR_CANNOT_SETTLE_ACTION)
                })
              })
            }

            const itCanBeSettledByAnyone = () => {
              context('when the sender is the action submitter', () => {
                const from = submitter

                itSettlesTheChallengeProperly(from)
              })

              context('when the sender is the challenger', () => {
                const from = challenger

                itSettlesTheChallengeProperly(from)
              })

              context('when the sender is someone else', () => {
                const from = someone

                itSettlesTheChallengeProperly(from)
              })
            }

            context('at the beginning of the answer period', () => {
              itCanOnlyBeSettledByTheSubmitter()
            })

            context('in the middle of the answer period', () => {
              beforeEach('move before settlement period end date', async () => {
                await agreement.moveBeforeChallengeEndDate(actionId)
              })

              itCanOnlyBeSettledByTheSubmitter()
            })

            context('at the end of the answer period', () => {
              beforeEach('move to the settlement period end date', async () => {
                await agreement.moveToChallengeEndDate(actionId)
              })

              itCanOnlyBeSettledByTheSubmitter()
            })

            context('after the answer period', () => {
              beforeEach('move after the settlement period end date', async () => {
                await agreement.moveAfterChallengeEndDate(actionId)
              })

              itCanBeSettledByAnyone()
            })
          })

          context('when the challenge was answered', () => {
            context('when the challenge was settled', () => {
              beforeEach('settle challenge', async () => {
                await agreement.settle({ actionId })
              })

              itCannotSettleAction()
            })

            context('when the challenge was disputed', () => {
              beforeEach('dispute action', async () => {
                await agreement.dispute({ actionId })
              })

              context('when the dispute was not ruled', () => {
                itCannotSettleAction()
              })

              context('when the dispute was ruled', () => {
                context('when the dispute was ruled in favor the submitter', () => {
                  beforeEach('rule action', async () => {
                    await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER })
                  })

                  context('when the action was not closed', () => {
                    itCannotSettleAction()
                  })

                  context('when the action was closed', () => {
                    beforeEach('close action', async () => {
                      await agreement.close({ actionId })
                    })

                    itCannotSettleAction()
                  })
                })

                context('when the dispute was ruled in favor the challenger', () => {
                  beforeEach('rule action', async () => {
                    await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER })
                  })

                  itCannotSettleAction()
                })

                context('when the dispute was refused', () => {
                  beforeEach('rule action', async () => {
                    await agreement.executeRuling({ actionId, ruling: RULINGS.REFUSED })
                  })

                  itCannotSettleAction()
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

        itCannotSettleAction()
      })
    })

    context('when the given action does not exist', () => {
      it('reverts', async () => {
        await assertRevert(agreement.settle({ actionId: 0 }), AGREEMENT_ERRORS.ERROR_ACTION_DOES_NOT_EXIST)
      })
    })
  })
})
