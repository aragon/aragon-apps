const deployer = require('../helpers/utils/deployer')(web3, artifacts)
const { AGREEMENT_ERRORS } = require('../helpers/utils/errors')
const { RULINGS, CHALLENGES_STATE } = require('../helpers/utils/enums')
const { AGREEMENT_EVENTS, DISPUTABLE_EVENTS } = require('../helpers/utils/events')

const { bn, injectWeb3, injectArtifacts } = require('@aragon/contract-helpers-test')
const { assertBn, assertRevert, assertEvent, assertAmountOfEvents } = require('@aragon/contract-helpers-test/src/asserts')

injectWeb3(web3)
injectArtifacts(artifacts)

contract('Agreement', ([_, submitter, challenger]) => {
  let disputable, actionId

  beforeEach('deploy agreement instance', async () => {
    disputable = await deployer.deployAndInitializeDisputableWrapper()
  })

  describe('rule', () => {
    context('when the given action exists', () => {
      beforeEach('create action', async () => {
        await disputable.newAction({ submitter })
        const result = await disputable.newAction({ submitter })
        actionId = result.actionId
      })

      const itCanRuleActions = () => {
        const itCannotRuleNonExistingDispute = () => {
          it('reverts', async () => {
            await assertRevert(disputable.executeRuling({ actionId, ruling: RULINGS.REFUSED, mockRuling: false }), AGREEMENT_ERRORS.ERROR_CHALLENGE_DOES_NOT_EXIST)
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
                itCannotRuleNonExistingDispute()
              })

              context('in the middle of the answer period', () => {
                beforeEach('move before the challenge end date', async () => {
                  await disputable.moveBeforeChallengeEndDate(challengeId)
                })

                itCannotRuleNonExistingDispute()
              })

              context('at the end of the answer period', () => {
                beforeEach('move to the challenge end date', async () => {
                  await disputable.moveToChallengeEndDate(challengeId)
                })

                itCannotRuleNonExistingDispute()
              })

              context('after the answer period', () => {
                beforeEach('move after the challenge end date', async () => {
                  await disputable.moveAfterChallengeEndDate(challengeId)
                })

                itCannotRuleNonExistingDispute()
              })
            })

            context('when the challenge was answered', () => {
              context('when the challenge was settled', () => {
                beforeEach('settle challenge', async () => {
                  await disputable.settle({ actionId })
                })

                itCannotRuleNonExistingDispute()
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
                        const previousChallengeState = await disputable.getChallengeWithArbitratorFees(challengeId)

                        await disputable.executeRuling({ actionId, ruling })

                        const currentChallengeState = await disputable.getChallengeWithArbitratorFees(challengeId)
                        assertBn(currentChallengeState.state, expectedChallengeState, 'challenge state does not match')

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

                        assertAmountOfEvents(receipt, 'Ruled', { decodeForAbi: disputable.abi })
                        assertEvent(receipt, 'Ruled', { expectedArgs: { arbitrator: disputable.arbitrator.address, disputeId, ruling }, decodeForAbi: disputable.abi })
                      })

                      if (expectedChallengeState === CHALLENGES_STATE.ACCEPTED) {
                        it('marks the action as closed', async () => {
                          const previousActionState = await disputable.getAction(actionId)

                          await disputable.executeRuling({ actionId, ruling })

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
                          assert.isFalse(currentActionState.lastChallengeActive, 'action challenge should not be active')

                          assert.equal(currentActionState.disputable, previousActionState.disputable, 'disputable does not match')
                          assert.equal(currentActionState.submitter, previousActionState.submitter, 'submitter does not match')
                          assert.equal(currentActionState.context, previousActionState.context, 'action context does not match')
                          assertBn(currentActionState.settingId, previousActionState.settingId, 'setting ID does not match')
                          assertBn(currentActionState.lastChallengeId, previousActionState.lastChallengeId, 'challenge ID does not match')
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

                    it('transfers the challenger arbitrator fees to the submitter', async () => {
                      const { challengerArbitratorFeesAmount, challengerArbitratorFeesToken } = await disputable.getChallengeArbitratorFees(challengeId)

                      const previousChallengerArbitratorTokenBalance = await challengerArbitratorFeesToken.balanceOf(challenger)
                      const previousSubmitterArbitratorTokenBalance = await challengerArbitratorFeesToken.balanceOf(submitter)

                      await disputable.executeRuling({ actionId, ruling })

                      const currentChallengerArbitratorTokenBalance = await challengerArbitratorFeesToken.balanceOf(challenger)
                      const currentSubmitterArbitratorTokenBalance = await challengerArbitratorFeesToken.balanceOf(submitter)
                      assertBn(currentChallengerArbitratorTokenBalance, previousChallengerArbitratorTokenBalance, 'challenger balance does not match')
                      assertBn(currentSubmitterArbitratorTokenBalance, previousSubmitterArbitratorTokenBalance.add(challengerArbitratorFeesAmount), 'submitter balance does not match')
                    })

                    it('emits an event', async () => {
                      const { lastChallengeId } = await disputable.getAction(actionId)
                      const receipt = await disputable.executeRuling({ actionId, ruling })

                      assertAmountOfEvents(receipt, AGREEMENT_EVENTS.ACTION_ACCEPTED, { decodeForAbi: disputable.abi })
                      assertEvent(receipt, AGREEMENT_EVENTS.ACTION_ACCEPTED, { expectedArgs: { actionId, challengeId: lastChallengeId }, decodeForAbi: disputable.abi })
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

                    it('transfers the challenger arbitrator fees to the challenger', async () => {
                      const { challengerArbitratorFeesAmount, challengerArbitratorFeesToken } = await disputable.getChallengeArbitratorFees(challengeId)

                      const previousChallengerArbitratorTokenBalance = await challengerArbitratorFeesToken.balanceOf(challenger)
                      const previousSubmitterArbitratorTokenBalance = await challengerArbitratorFeesToken.balanceOf(submitter)

                      await disputable.executeRuling({ actionId, ruling })

                      const currentChallengerArbitratorTokenBalance = await challengerArbitratorFeesToken.balanceOf(challenger)
                      const currentSubmitterArbitratorTokenBalance = await challengerArbitratorFeesToken.balanceOf(submitter)
                      assertBn(currentChallengerArbitratorTokenBalance, previousChallengerArbitratorTokenBalance.add(challengerArbitratorFeesAmount), 'challenger balance does not match')
                      assertBn(currentSubmitterArbitratorTokenBalance, previousSubmitterArbitratorTokenBalance, 'submitter balance does not match')
                    })

                    it('emits an event', async () => {
                      const { lastChallengeId } = await disputable.getAction(actionId)
                      const receipt = await disputable.executeRuling({ actionId, ruling })

                      assertAmountOfEvents(receipt, AGREEMENT_EVENTS.ACTION_REJECTED, { decodeForAbi: disputable.abi })
                      assertEvent(receipt, AGREEMENT_EVENTS.ACTION_REJECTED, { expectedArgs: { actionId, challengeId: lastChallengeId }, decodeForAbi: disputable.abi })
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
                      const { lastChallengeId } = await disputable.getAction(actionId)
                      const receipt = await disputable.executeRuling({ actionId, ruling })

                      assertAmountOfEvents(receipt, AGREEMENT_EVENTS.ACTION_VOIDED, { decodeForAbi: disputable.abi })
                      assertEvent(receipt, AGREEMENT_EVENTS.ACTION_VOIDED, { expectedArgs: { actionId, challengeId: lastChallengeId }, decodeForAbi: disputable.abi })
                    })

                    it('splits the challenger arbitrator fees between the challenger and the submitter', async () => {
                      const { challengerArbitratorFeesAmount, challengerArbitratorFeesToken } = await disputable.getChallengeArbitratorFees(challengeId)
                      const halfFees = challengerArbitratorFeesAmount.div(bn(2))

                      const previousChallengerArbitratorTokenBalance = await challengerArbitratorFeesToken.balanceOf(challenger)
                      const previousSubmitterArbitratorTokenBalance = await challengerArbitratorFeesToken.balanceOf(submitter)

                      await disputable.executeRuling({ actionId, ruling })

                      const currentChallengerArbitratorTokenBalance = await challengerArbitratorFeesToken.balanceOf(challenger)
                      const currentSubmitterArbitratorTokenBalance = await challengerArbitratorFeesToken.balanceOf(submitter)
                      assertBn(currentChallengerArbitratorTokenBalance, previousChallengerArbitratorTokenBalance.add(halfFees), 'challenger balance does not match')
                      assertBn(currentSubmitterArbitratorTokenBalance, previousSubmitterArbitratorTokenBalance.add(halfFees), 'submitter balance does not match')
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

      context('when the app was deactivated', () => {
        beforeEach('mark app as unregistered', async () => {
          await disputable.deactivate()
        })

        itCanRuleActions()
      })
    })

    context('when the given action does not exist', () => {
      it('reverts', async () => {
        await assertRevert(disputable.executeRuling({ actionId: 0, ruling: RULINGS.REFUSED }), AGREEMENT_ERRORS.ERROR_ACTION_DOES_NOT_EXIST)
      })
    })
  })
})
