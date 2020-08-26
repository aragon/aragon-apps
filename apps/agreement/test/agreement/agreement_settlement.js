const deployer = require('../helpers/utils/deployer')(web3, artifacts)
const { AGREEMENT_ERRORS } = require('../helpers/utils/errors')
const { CHALLENGES_STATE, RULINGS } = require('../helpers/utils/enums')
const { AGREEMENT_EVENTS, DISPUTABLE_EVENTS } = require('../helpers/utils/events')

const { injectWeb3, injectArtifacts } = require('@aragon/contract-helpers-test')
const { assertBn, assertRevert, assertEvent, assertAmountOfEvents } = require('@aragon/contract-helpers-test/src/asserts')

injectWeb3(web3)
injectArtifacts(artifacts)

contract('Agreement', ([_, someone, submitter, challenger]) => {
  let disputable, actionId

  beforeEach('deploy agreement instance', async () => {
    disputable = await deployer.deployAndInitializeDisputableWrapper()
  })

  describe('settlement', () => {
    context('when the given action exists', () => {
      beforeEach('create action', async () => {
        ({ actionId } = await disputable.newAction({ submitter }))
      })

      const itCanSettleActions = () => {
        const itCannotSettleAction = () => {
          it('reverts', async () => {
            await assertRevert(disputable.settle({ actionId }), AGREEMENT_ERRORS.ERROR_CANNOT_SETTLE_ACTION)
          })
        }

        const itCannotSettleNonExistingChallenge = () => {
          it('reverts', async () => {
            await assertRevert(disputable.settle({ actionId }), AGREEMENT_ERRORS.ERROR_CHALLENGE_DOES_NOT_EXIST)
          })
        }

        context('when the action was not closed', () => {
          context('when the action was not challenged', () => {
            itCannotSettleNonExistingChallenge()
          })

          context('when the action was challenged', () => {
            let challengeId, challengeStartTime

            beforeEach('challenge action', async () => {
              challengeStartTime = await disputable.currentTimestamp()
              const result = await disputable.challenge({ actionId, challenger })
              challengeId = result.challengeId
            })

            context('when the challenge was not answered', () => {
              const itSettlesTheChallengeProperly = from => {
                it('updates the challenge state only', async () => {
                  const previousChallengeState = await disputable.getChallengeWithArbitratorFees(challengeId)

                  await disputable.settle({ actionId, from })

                  const currentChallengeState = await disputable.getChallengeWithArbitratorFees(challengeId)
                  assertBn(currentChallengeState.state, CHALLENGES_STATE.SETTLED, 'challenge state does not match')

                  assert.equal(currentChallengeState.context, previousChallengeState.context, 'challenge context does not match')
                  assert.equal(currentChallengeState.challenger, previousChallengeState.challenger, 'challenger does not match')
                  assertBn(currentChallengeState.endDate, previousChallengeState.endDate, 'challenge end date does not match')
                  assertBn(currentChallengeState.settlementOffer, previousChallengeState.settlementOffer, 'challenge settlement offer does not match')
                  assertBn(currentChallengeState.challengerArbitratorFeesAmount, previousChallengeState.challengerArbitratorFeesAmount, 'challenger arbitrator amount does not match')
                  assert.equal(currentChallengeState.challengerArbitratorFeesToken, previousChallengeState.challengerArbitratorFeesToken, 'challenger arbitrator token does not match')
                  assertBn(currentChallengeState.submitterArbitratorFeesAmount, previousChallengeState.submitterArbitratorFeesAmount, 'submitter arbitrator amount does not match')
                  assert.equal(currentChallengeState.submitterArbitratorFeesToken, previousChallengeState.submitterArbitratorFeesToken, 'submitter arbitrator token does not match')
                  assertBn(currentChallengeState.disputeId, previousChallengeState.disputeId, 'challenge dispute ID does not match')
                })

                it('marks the action closed state', async () => {
                  const previousActionState = await disputable.getAction(actionId)

                  await disputable.settle({ actionId, from })

                  const currentActionState = await disputable.getAction(actionId)
                  assert.isTrue(currentActionState.closed, 'action is not closed')
                  assert.isFalse(currentActionState.lastChallengeActive, 'action challenge should not be active')

                  assert.equal(currentActionState.disputable, previousActionState.disputable, 'disputable does not match')
                  assert.equal(currentActionState.submitter, previousActionState.submitter, 'submitter does not match')
                  assert.equal(currentActionState.context, previousActionState.context, 'action context does not match')
                  assertBn(currentActionState.settingId, previousActionState.settingId, 'setting ID does not match')
                  assertBn(currentActionState.lastChallengeId, previousActionState.lastChallengeId, 'challenge ID does not match')
                  assertBn(currentActionState.disputableActionId, previousActionState.disputableActionId, 'disputable action ID does not match')
                  assertBn(currentActionState.collateralRequirementId, previousActionState.collateralRequirementId, 'collateral requirement ID does not match')
                })

                it('slashes the submitter challenged balance', async () => {
                  const { settlementOffer } = await disputable.getChallenge(challengeId)
                  const { available: previousAvailableBalance, locked: previousLockedBalance } = await disputable.getBalance(submitter)

                  await disputable.settle({ actionId, from })

                  const { available: currentAvailableBalance, locked: currentLockedBalance } = await disputable.getBalance(submitter)

                  const expectedUnchallengedBalance = disputable.actionCollateral.sub(settlementOffer)
                  assertBn(currentLockedBalance, previousLockedBalance.sub(disputable.actionCollateral), 'locked balance does not match')
                  assertBn(currentAvailableBalance, previousAvailableBalance.add(expectedUnchallengedBalance), 'available balance does not match')
                })

                it('transfers the settlement offer and the collateral to the challenger', async () => {
                  const stakingAddress = await disputable.getStakingAddress()
                  const { collateralToken, challengeCollateral } = disputable
                  const { settlementOffer } = await disputable.getChallenge(challengeId)

                  const previousStakingBalance = await collateralToken.balanceOf(stakingAddress)
                  const previousAgreementBalance = await collateralToken.balanceOf(disputable.address)
                  const previousChallengerBalance = await collateralToken.balanceOf(challenger)

                  await disputable.settle({ actionId, from })

                  const currentStakingBalance = await collateralToken.balanceOf(stakingAddress)
                  assertBn(currentStakingBalance, previousStakingBalance.sub(settlementOffer), 'staking balance does not match')

                  const currentAgreementBalance = await collateralToken.balanceOf(disputable.address)
                  assertBn(currentAgreementBalance, previousAgreementBalance.sub(challengeCollateral), 'agreement balance does not match')

                  const currentChallengerBalance = await collateralToken.balanceOf(challenger)
                  assertBn(currentChallengerBalance, previousChallengerBalance.add(settlementOffer).add(challengeCollateral), 'challenger balance does not match')
                })

                it('transfers the arbitrator fees back to the challenger', async () => {
                  const arbitratorToken = await disputable.arbitratorToken()
                  const arbitratorFees = await disputable.arbitratorFees()

                  const previousAgreementBalance = await arbitratorToken.balanceOf(disputable.address)
                  const previousChallengerBalance = await arbitratorToken.balanceOf(challenger)

                  await disputable.settle({ actionId, from })

                  const currentAgreementBalance = await arbitratorToken.balanceOf(disputable.address)
                  assertBn(currentAgreementBalance, previousAgreementBalance.sub(arbitratorFees), 'agreement balance does not match')

                  const currentChallengerBalance = await arbitratorToken.balanceOf(challenger)
                  assertBn(currentChallengerBalance, previousChallengerBalance.add(arbitratorFees), 'challenger balance does not match')
                })

                it('emits an event', async () => {
                  const { lastChallengeId } = await disputable.getAction(actionId)
                  const receipt = await disputable.settle({ actionId, from })

                  assertAmountOfEvents(receipt, AGREEMENT_EVENTS.ACTION_SETTLED)
                  assertEvent(receipt, AGREEMENT_EVENTS.ACTION_SETTLED, { expectedArgs: { actionId, challengeId: lastChallengeId } })
                })

                it('there are no more paths allowed', async () => {
                  await disputable.settle({ actionId, from })

                  const { canClose, canChallenge, canSettle, canDispute, canClaimSettlement, canRuleDispute } = await disputable.getAllowedPaths(actionId)
                  assert.isFalse(canClose, 'action can be close')
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
                    await assertRevert(disputable.settle({ actionId, from }), AGREEMENT_ERRORS.ERROR_CANNOT_SETTLE_ACTION)
                  })
                })

                context('when the sender is someone else', () => {
                  const from = someone

                  it('reverts', async () => {
                    await assertRevert(disputable.settle({ actionId, from }), AGREEMENT_ERRORS.ERROR_CANNOT_SETTLE_ACTION)
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
                beforeEach('move before the challenge end date', async () => {
                  await disputable.moveBeforeChallengeEndDate(challengeId)
                })

                itCanOnlyBeSettledByTheSubmitter()
              })

              context('at the end of the answer period', () => {
                beforeEach('move to the challenge end date', async () => {
                  await disputable.moveToChallengeEndDate(challengeId)
                })

                itCanBeSettledByAnyone()
              })

              context('after the answer period', () => {
                beforeEach('move after the challenge end date', async () => {
                  await disputable.moveAfterChallengeEndDate(challengeId)
                })

                itCanBeSettledByAnyone()
              })
            })

            context('when the challenge was answered', () => {
              context('when the challenge was settled', () => {
                beforeEach('settle challenge', async () => {
                  await disputable.settle({ actionId })
                })

                itCannotSettleAction()
              })

              context('when the challenge was disputed', () => {
                beforeEach('dispute action', async () => {
                  await disputable.dispute({ actionId })
                })

                context('when the dispute was not ruled', () => {
                  itCannotSettleAction()
                })

                context('when the dispute was ruled', () => {
                  context('when the dispute was refused', () => {
                    beforeEach('rule action', async () => {
                      await disputable.executeRuling({ actionId, ruling: RULINGS.REFUSED })
                    })

                    context('when the action was not closed', () => {
                      itCannotSettleAction()
                    })

                    context('when the action was closed', () => {
                      beforeEach('close action', async () => {
                        await disputable.close(actionId)
                      })

                      itCannotSettleAction()
                    })
                  })

                  context('when the dispute was ruled in favor the submitter', () => {
                    beforeEach('rule action', async () => {
                      await disputable.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER })
                    })

                    context('when the action was not closed', () => {
                      itCannotSettleAction()
                    })

                    context('when the action was closed', () => {
                      beforeEach('close action', async () => {
                        await disputable.close(actionId)
                      })

                      itCannotSettleAction()
                    })
                  })

                  context('when the dispute was ruled in favor the challenger', () => {
                    beforeEach('rule action', async () => {
                      await disputable.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER })
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
            await disputable.close(actionId)
          })

          itCannotSettleNonExistingChallenge()
        })
      }

      context('when the app was activated', () => {
        itCanSettleActions()
      })

      context('when the app was deactivated', () => {
        beforeEach('mark app as unregistered', async () => {
          await disputable.deactivate()
        })

        itCanSettleActions()
      })
    })

    context('when the given action does not exist', () => {
      it('reverts', async () => {
        await assertRevert(disputable.settle({ actionId: 0 }), AGREEMENT_ERRORS.ERROR_ACTION_DOES_NOT_EXIST)
      })
    })
  })
})
