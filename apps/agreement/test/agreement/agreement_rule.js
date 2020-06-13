const { assertBn } = require('../helpers/assert/assertBn')
const { assertRevert } = require('../helpers/assert/assertThrow')
const { decodeEventsOfType } = require('../helpers/lib/decodeEvent')
const { assertEvent, assertAmountOfEvents } = require('../helpers/assert/assertEvent')
const { AGREEMENT_EVENTS } = require('../helpers/utils/events')
const { AGREEMENT_ERRORS } = require('../helpers/utils/errors')
const { RULINGS, CHALLENGES_STATE } = require('../helpers/utils/enums')

const deployer = require('../helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, submitter, challenger]) => {
  let disputable, actionId

  beforeEach('deploy agreement instance', async () => {
    disputable = await deployer.deployAndInitializeWrapperWithDisputable()
  })

  describe('rule', () => {
    context('when the given action exists', () => {
      beforeEach('create action', async () => {
        await disputable.newAction({ submitter })
        const result = await disputable.newAction({ submitter })
        actionId = result.actionId
      })

      const itCanRuleActions = () => {
        const itCannotRuleDispute = () => {
          it('reverts', async () => {
            await assertRevert(disputable.executeRuling({ actionId, ruling: RULINGS.REFUSED, mockRuling: false }), AGREEMENT_ERRORS.ERROR_CANNOT_RULE_ACTION)
          })
        }

        const itCannotRuleNonExistingDispute = () => {
          it('reverts', async () => {
            await assertRevert(disputable.executeRuling({ actionId, ruling: RULINGS.REFUSED, mockRuling: false }), AGREEMENT_ERRORS.ERROR_DISPUTE_DOES_NOT_EXIST)
          })
        }

        context('when the action was not closed', () => {
          context('when the action was not challenged', () => {
            itCannotRuleNonExistingDispute()
          })

          context('when the action was challenged', () => {
            let challengeId

            beforeEach('challenge action', async () => {
              ({ challengeId } = await disputable.challenge({ actionId, challenger }))
            })

            context('when the challenge was not answered', () => {
              context('at the beginning of the answer period', () => {
                itCannotRuleDispute()
              })

              context('in the middle of the answer period', () => {
                beforeEach('move before the challenge end date', async () => {
                  await disputable.moveBeforeChallengeEndDate(challengeId)
                })

                itCannotRuleDispute()
              })

              context('at the end of the answer period', () => {
                beforeEach('move to the challenge end date', async () => {
                  await disputable.moveToChallengeEndDate(challengeId)
                })

                itCannotRuleDispute()
              })

              context('after the answer period', () => {
                beforeEach('move after the challenge end date', async () => {
                  await disputable.moveAfterChallengeEndDate(challengeId)
                })

                itCannotRuleDispute()
              })
            })

            context('when the challenge was answered', () => {
              context('when the challenge was settled', () => {
                beforeEach('settle challenge', async () => {
                  await disputable.settle({ actionId })
                })

                itCannotRuleDispute()
              })

              context('when the challenge was disputed', () => {
                beforeEach('dispute action', async () => {
                  await disputable.dispute({ actionId })
                })

                context('when the dispute was not ruled', () => {
                  it('reverts', async () => {
                    await assertRevert(disputable.executeRuling({ actionId, ruling: RULINGS.REFUSED, mockRuling: false }), 'ARBITRATOR_DISPUTE_NOT_RULED_YET')
                  })
                })

                context('when the dispute was ruled', () => {
                  const itRulesTheActionProperly = (ruling, expectedChallengeState) => {
                    context('when the sender is the arbitrator', () => {
                      it('updates the challenge state only', async () => {
                        const previousChallengeState = await disputable.getChallenge(challengeId)

                        await disputable.executeRuling({ actionId, ruling })

                        const currentChallengeState = await disputable.getChallenge(challengeId)
                        assertBn(currentChallengeState.state, expectedChallengeState, 'challenge state does not match')

                        assert.equal(currentChallengeState.context, previousChallengeState.context, 'challenge context does not match')
                        assert.equal(currentChallengeState.challenger, previousChallengeState.challenger, 'challenger does not match')
                        assertBn(currentChallengeState.endDate, previousChallengeState.endDate, 'challenge end date does not match')
                        assertBn(currentChallengeState.settlementOffer, previousChallengeState.settlementOffer, 'challenge settlement offer does not match')
                        assertBn(currentChallengeState.arbitratorFeeAmount, previousChallengeState.arbitratorFeeAmount, 'arbitrator amount does not match')
                        assert.equal(currentChallengeState.arbitratorFeeToken, previousChallengeState.arbitratorFeeToken, 'arbitrator token does not match')
                        assertBn(currentChallengeState.disputeId, previousChallengeState.disputeId, 'challenge dispute ID does not match')
                      })

                      it('rules the dispute', async () => {
                        await disputable.executeRuling({ actionId, ruling })

                        const { ruling: actualRuling, submitterFinishedEvidence, challengerFinishedEvidence } = await disputable.getChallenge(challengeId)
                        assertBn(actualRuling, ruling, 'ruling does not match')
                        assert.isFalse(submitterFinishedEvidence, 'submitter finished evidence')
                        assert.isFalse(challengerFinishedEvidence, 'challenger finished evidence')
                      })

                      it('emits a ruled event', async () => {
                        const { disputeId } = await disputable.getChallenge(challengeId)
                        const receipt = await disputable.executeRuling({ actionId, ruling })

                        const IArbitrable = artifacts.require('IArbitrable')
                        const logs = decodeEventsOfType(receipt, IArbitrable.abi, 'Ruled')

                        assertAmountOfEvents({ logs }, 'Ruled', 1)
                        assertEvent({ logs }, 'Ruled', { arbitrator: disputable.arbitrator.address, disputeId, ruling })
                      })

                      if (expectedChallengeState === CHALLENGES_STATE.ACCEPTED) {
                        it('marks the action as closed', async () => {
                          const previousActionState = await disputable.getAction(actionId)

                          await disputable.executeRuling({ actionId, ruling })

                          const currentActionState = await disputable.getAction(actionId)
                          assert.isTrue(currentActionState.closed, 'action is not closed')

                          assert.equal(currentActionState.disputable, previousActionState.disputable, 'disputable does not match')
                          assert.equal(currentActionState.submitter, previousActionState.submitter, 'submitter does not match')
                          assert.equal(currentActionState.context, previousActionState.context, 'action context does not match')
                          assertBn(currentActionState.settingId, previousActionState.settingId, 'setting ID does not match')
                          assertBn(currentActionState.currentChallengeId, previousActionState.currentChallengeId, 'challenge ID does not match')
                          assertBn(currentActionState.disputableActionId, previousActionState.disputableActionId, 'disputable action ID does not match')
                          assertBn(currentActionState.collateralRequirementId, previousActionState.collateralRequirementId, 'collateral requirement ID does not match')
                        })

                        it('slashes the submitter locked balance', async () => {
                          const { available: previousAvailableBalance, locked: previousLockedBalance } = await disputable.getBalance(submitter)

                          await disputable.executeRuling({ actionId, ruling })

                          const { available: currentAvailableBalance, locked: currentLockedBalance } = await disputable.getBalance(submitter)

                          assertBn(currentAvailableBalance, previousAvailableBalance, 'available balance does not match')
                          assertBn(currentLockedBalance, previousLockedBalance.sub(disputable.actionCollateral), 'locked balance does not match')
                        })

                        it('there are no more paths allowed', async () => {
                          await disputable.executeRuling({ actionId, ruling })

                          const { canClose, canChallenge, canSettle, canDispute, canClaimSettlement, canRuleDispute } = await disputable.getAllowedPaths(actionId)
                          assert.isFalse(canClose, 'action can be closed')
                          assert.isFalse(canChallenge, 'action can be challenged')
                          assert.isFalse(canSettle, 'action can be settled')
                          assert.isFalse(canDispute, 'action can be disputed')
                          assert.isFalse(canClaimSettlement, 'action settlement can be claimed')
                          assert.isFalse(canRuleDispute, 'action dispute can be ruled')
                        })
                      } else {
                        it('does not mark the action as closed', async () => {
                          const previousActionState = await disputable.getAction(actionId)

                          await disputable.executeRuling({ actionId, ruling })

                          const currentActionState = await disputable.getAction(actionId)
                          assert.isFalse(currentActionState.closed, 'action is not closed')

                          assert.equal(currentActionState.disputable, previousActionState.disputable, 'disputable does not match')
                          assert.equal(currentActionState.submitter, previousActionState.submitter, 'submitter does not match')
                          assert.equal(currentActionState.context, previousActionState.context, 'action context does not match')
                          assertBn(currentActionState.settingId, previousActionState.settingId, 'setting ID does not match')
                          assertBn(currentActionState.currentChallengeId, previousActionState.currentChallengeId, 'challenge ID does not match')
                          assertBn(currentActionState.disputableActionId, previousActionState.disputableActionId, 'disputable action ID does not match')
                          assertBn(currentActionState.collateralRequirementId, previousActionState.collateralRequirementId, 'collateral requirement ID does not match')
                        })

                        it('does not unlock the submitter locked balance', async () => {
                          const { available: previousAvailableBalance, locked: previousLockedBalance } = await disputable.getBalance(submitter)

                          await disputable.executeRuling({ actionId, ruling })

                          const { available: currentAvailableBalance, locked: currentLockedBalance } = await disputable.getBalance(submitter)

                          assertBn(currentAvailableBalance, previousAvailableBalance, 'available balance does not match')
                          assertBn(currentLockedBalance, previousLockedBalance, 'locked balance does not match')
                        })

                        it('can be closed or challenged', async () => {
                          await disputable.executeRuling({ actionId, ruling })

                          const { canClose, canChallenge, canSettle, canDispute, canClaimSettlement, canRuleDispute } = await disputable.getAllowedPaths(actionId)
                          assert.isTrue(canClose, 'action cannot be closed')
                          assert.isTrue(canChallenge, 'action cannot be challenged')

                          assert.isFalse(canSettle, 'action can be settled')
                          assert.isFalse(canDispute, 'action can be disputed')
                          assert.isFalse(canClaimSettlement, 'action settlement can be claimed')
                          assert.isFalse(canRuleDispute, 'action dispute can be ruled')
                        })
                      }
                    })

                    context('when the sender is not the arbitrator', () => {
                      it('reverts', async () => {
                        const { disputeId } = await disputable.getChallenge(challengeId)
                        await assertRevert(disputable.agreement.rule(disputeId, ruling), AGREEMENT_ERRORS.ERROR_SENDER_NOT_ALLOWED)
                      })
                    })
                  }

                  context('when the dispute was ruled in favor the submitter', () => {
                    const ruling = RULINGS.IN_FAVOR_OF_SUBMITTER
                    const expectedChallengeState = CHALLENGES_STATE.REJECTED

                    itRulesTheActionProperly(ruling, expectedChallengeState)

                    it('transfers the challenge collateral to the submitter', async () => {
                      const { collateralToken, challengeCollateral } = disputable
                      const previousSubmitterBalance = await collateralToken.balanceOf(submitter)
                      const previousChallengerBalance = await collateralToken.balanceOf(challenger)
                      const previousAgreementBalance = await collateralToken.balanceOf(disputable.address)

                      await disputable.executeRuling({ actionId, ruling })

                      const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
                      assertBn(currentSubmitterBalance, previousSubmitterBalance.add(challengeCollateral), 'submitter balance does not match')

                      const currentChallengerBalance = await collateralToken.balanceOf(challenger)
                      assertBn(currentChallengerBalance, previousChallengerBalance, 'challenger balance does not match')

                      const currentAgreementBalance = await collateralToken.balanceOf(disputable.address)
                      assertBn(currentAgreementBalance, previousAgreementBalance.sub(challengeCollateral), 'agreement balance does not match')
                    })

                    it('emits an event', async () => {
                      const { currentChallengeId } = await disputable.getAction(actionId)
                      const receipt = await disputable.executeRuling({ actionId, ruling })
                      const logs = decodeEventsOfType(receipt, disputable.abi, AGREEMENT_EVENTS.ACTION_ACCEPTED)

                      assertAmountOfEvents({ logs }, AGREEMENT_EVENTS.ACTION_ACCEPTED, 1)
                      assertEvent({ logs }, AGREEMENT_EVENTS.ACTION_ACCEPTED, { actionId, challengeId: currentChallengeId })
                    })
                  })

                  context('when the dispute was ruled in favor the challenger', () => {
                    const ruling = RULINGS.IN_FAVOR_OF_CHALLENGER
                    const expectedChallengeState = CHALLENGES_STATE.ACCEPTED

                    itRulesTheActionProperly(ruling, expectedChallengeState)

                    it('transfers the challenge collateral and the collateral amount to the challenger', async () => {
                      const stakingAddress = await disputable.getStakingAddress()
                      const { collateralToken, actionCollateral, challengeCollateral } = disputable

                      const previousSubmitterBalance = await collateralToken.balanceOf(submitter)
                      const previousChallengerBalance = await collateralToken.balanceOf(challenger)
                      const previousChallengerTotalBalance = await disputable.getTotalAvailableBalance(challenger)
                      const previousAgreementBalance = await collateralToken.balanceOf(disputable.address)
                      const previousStakingBalance = await collateralToken.balanceOf(stakingAddress)

                      await disputable.executeRuling({ actionId, ruling })

                      const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
                      assertBn(currentSubmitterBalance, previousSubmitterBalance, 'submitter balance does not match')

                      const currentChallengerBalance = await collateralToken.balanceOf(challenger)
                      const currentChallengerTotalBalance = await disputable.getTotalAvailableBalance(challenger)
                      assertBn(currentChallengerBalance, previousChallengerBalance.add(actionCollateral).add(challengeCollateral), 'challenger balance does not match')
                      assertBn(currentChallengerTotalBalance, previousChallengerTotalBalance.add(actionCollateral).add(challengeCollateral), 'challenger total balance does not match')

                      const currentAgreementBalance = await collateralToken.balanceOf(disputable.address)
                      assertBn(currentAgreementBalance, previousAgreementBalance.sub(challengeCollateral), 'agreement balance does not match')

                      const currentStakingBalance = await collateralToken.balanceOf(stakingAddress)
                      assertBn(currentStakingBalance, previousStakingBalance.sub(actionCollateral), 'staking balance does not match')
                    })

                    it('emits an event', async () => {
                      const { currentChallengeId } = await disputable.getAction(actionId)
                      const receipt = await disputable.executeRuling({ actionId, ruling })
                      const logs = decodeEventsOfType(receipt, disputable.abi, AGREEMENT_EVENTS.ACTION_REJECTED)

                      assertAmountOfEvents({ logs }, AGREEMENT_EVENTS.ACTION_REJECTED, 1)
                      assertEvent({ logs }, AGREEMENT_EVENTS.ACTION_REJECTED, { actionId, challengeId: currentChallengeId })
                    })
                  })

                  context('when the dispute was refused', () => {
                    const ruling = RULINGS.REFUSED
                    const expectedChallengeState = CHALLENGES_STATE.VOIDED

                    itRulesTheActionProperly(ruling, expectedChallengeState)

                    it('transfers the challenge collateral to the challenger', async () => {
                      const { collateralToken, challengeCollateral } = disputable
                      const previousSubmitterBalance = await collateralToken.balanceOf(submitter)
                      const previousChallengerBalance = await collateralToken.balanceOf(challenger)
                      const previousAgreementBalance = await collateralToken.balanceOf(disputable.address)

                      await disputable.executeRuling({ actionId, ruling })

                      const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
                      assertBn(currentSubmitterBalance, previousSubmitterBalance, 'submitter balance does not match')

                      const currentChallengerBalance = await collateralToken.balanceOf(challenger)
                      assertBn(currentChallengerBalance, previousChallengerBalance.add(challengeCollateral), 'challenger balance does not match')

                      const currentAgreementBalance = await collateralToken.balanceOf(disputable.address)
                      assertBn(currentAgreementBalance, previousAgreementBalance.sub(challengeCollateral), 'agreement balance does not match')
                    })

                    it('emits an event', async () => {
                      const { currentChallengeId } = await disputable.getAction(actionId)
                      const receipt = await disputable.executeRuling({ actionId, ruling })
                      const logs = decodeEventsOfType(receipt, disputable.abi, AGREEMENT_EVENTS.ACTION_VOIDED)

                      assertAmountOfEvents({ logs }, AGREEMENT_EVENTS.ACTION_VOIDED, 1)
                      assertEvent({ logs }, AGREEMENT_EVENTS.ACTION_VOIDED, { actionId, challengeId: currentChallengeId })
                    })
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

          itCannotRuleNonExistingDispute()
        })
      }

      context('when the app was activated', () => {
        itCanRuleActions()
      })

      context('when the app was unregistered', () => {
        beforeEach('mark app as unregistered', async () => {
          await disputable.deactivate()
        })

        itCanRuleActions()
      })
    })

    context('when the given action does not exist', () => {
      it('reverts', async () => {
        await assertRevert(disputable.executeRuling({ actionId: 0, ruling: RULINGS.REFUSED }), AGREEMENT_ERRORS.ERROR_DISPUTE_DOES_NOT_EXIST)
      })
    })
  })
})
