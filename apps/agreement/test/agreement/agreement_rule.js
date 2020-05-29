const { assertBn } = require('../helpers/assert/assertBn')
const { assertRevert } = require('../helpers/assert/assertThrow')
const { decodeEventsOfType } = require('../helpers/lib/decodeEvent')
const { assertEvent, assertAmountOfEvents } = require('../helpers/assert/assertEvent')
const { AGREEMENT_EVENTS } = require('../helpers/utils/events')
const { AGREEMENT_ERRORS } = require('../helpers/utils/errors')
const { RULINGS, ACTIONS_STATE, CHALLENGES_STATE } = require('../helpers/utils/enums')

const deployer = require('../helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, submitter, challenger]) => {
  let agreement, actionId

  beforeEach('deploy agreement instance', async () => {
    agreement = await deployer.deployAndInitializeWrapperWithDisputable()
  })

  describe('executeRuling', () => {
    context('when the given action exists', () => {
      beforeEach('create action', async () => {
        await agreement.newAction({ submitter })
        const result = await agreement.newAction({ submitter })
        actionId = result.actionId
      })

      const itCanRuleActions = () => {
        const itCannotRuleAction = () => {
          it('reverts', async () => {
            await assertRevert(agreement.executeRuling({ actionId, ruling: RULINGS.REFUSED, mockRuling: false }), AGREEMENT_ERRORS.ERROR_DISPUTE_DOES_NOT_EXIST)
          })
        }

        context('when the action was not closed', () => {
          context('when the action was not challenged', () => {
            itCannotRuleAction()
          })

          context('when the action was challenged', () => {
            let challengeId

            beforeEach('challenge action', async () => {
              ({ challengeId } = await agreement.challenge({ actionId, challenger }))
            })

            context('when the challenge was not answered', () => {
              context('at the beginning of the answer period', () => {
                itCannotRuleAction()
              })

              context('in the middle of the answer period', () => {
                beforeEach('move before settlement period end date', async () => {
                  await agreement.moveBeforeChallengeEndDate(challengeId)
                })

                itCannotRuleAction()
              })

              context('at the end of the answer period', () => {
                beforeEach('move to the settlement period end date', async () => {
                  await agreement.moveToChallengeEndDate(challengeId)
                })

                itCannotRuleAction()
              })

              context('after the answer period', () => {
                beforeEach('move after the settlement period end date', async () => {
                  await agreement.moveAfterChallengeEndDate(challengeId)
                })

                itCannotRuleAction()
              })
            })

            context('when the challenge was answered', () => {
              context('when the challenge was settled', () => {
                beforeEach('settle challenge', async () => {
                  await agreement.settle({ actionId })
                })

                itCannotRuleAction()
              })

              context('when the challenge was disputed', () => {
                beforeEach('dispute action', async () => {
                  await agreement.dispute({ actionId })
                })

                context('when the dispute was not ruled', () => {
                  it('reverts', async () => {
                    await assertRevert(agreement.executeRuling({ actionId, ruling: RULINGS.REFUSED, mockRuling: false }), 'ARBITRATOR_DISPUTE_NOT_RULED_YET')
                  })
                })

                context('when the dispute was ruled', () => {
                  const itRulesTheActionProperly = (ruling, expectedChallengeState) => {
                    context('when the sender is the arbitrator', () => {
                      it('updates the challenge state only', async () => {
                        const previousChallengeState = await agreement.getChallenge(challengeId)

                        await agreement.executeRuling({ actionId, ruling })

                        const currentChallengeState = await agreement.getChallenge(challengeId)
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
                        await agreement.executeRuling({ actionId, ruling })

                        const { ruling: actualRuling, submitterFinishedEvidence, challengerFinishedEvidence } = await agreement.getChallenge(challengeId)
                        assertBn(actualRuling, ruling, 'ruling does not match')
                        assert.isFalse(submitterFinishedEvidence, 'submitter finished evidence')
                        assert.isFalse(challengerFinishedEvidence, 'challenger finished evidence')
                      })

                      it('emits a ruled event', async () => {
                        const { disputeId } = await agreement.getChallenge(challengeId)
                        const receipt = await agreement.executeRuling({ actionId, ruling })

                        const IArbitrable = artifacts.require('IArbitrable')
                        const logs = decodeEventsOfType(receipt, IArbitrable.abi, 'Ruled')

                        assertAmountOfEvents({ logs }, 'Ruled', 1)
                        assertEvent({ logs }, 'Ruled', { arbitrator: agreement.arbitrator.address, disputeId, ruling })
                      })
                    })

                    context('when the sender is not the arbitrator', () => {
                      it('reverts', async () => {
                        const { disputeId } = await agreement.getChallenge(challengeId)
                        await assertRevert(agreement.agreement.rule(disputeId, ruling), AGREEMENT_ERRORS.ERROR_SENDER_NOT_ALLOWED)
                      })
                    })
                  }

                  context('when the dispute was ruled in favor the submitter', () => {
                    const ruling = RULINGS.IN_FAVOR_OF_SUBMITTER
                    const expectedChallengeState = CHALLENGES_STATE.REJECTED

                    itRulesTheActionProperly(ruling, expectedChallengeState)

                    it('updates the action state back to submitted', async () => {
                      const previousActionState = await agreement.getAction(actionId)

                      await agreement.executeRuling({ actionId, ruling })

                      const currentActionState = await agreement.getAction(actionId)
                      assertBn(currentActionState.state, ACTIONS_STATE.SUBMITTED, 'action state does not match')

                      assertBn(currentActionState.disputableId, previousActionState.disputableId, 'disputable ID does not match')
                      assert.equal(currentActionState.disputable, previousActionState.disputable, 'disputable does not match')
                      assert.equal(currentActionState.submitter, previousActionState.submitter, 'submitter does not match')
                      assert.equal(currentActionState.context, previousActionState.context, 'action context does not match')
                      assertBn(currentActionState.collateralId, previousActionState.collateralId, 'collateral ID does not match')
                    })

                    it('unblocks the submitter locked balance', async () => {
                      const { available: previousAvailableBalance, locked: previousLockedBalance } = await agreement.getBalance(submitter)

                      await agreement.executeRuling({ actionId, ruling })

                      const { available: currentAvailableBalance, locked: currentLockedBalance } = await agreement.getBalance(submitter)

                      assertBn(currentAvailableBalance, previousAvailableBalance.add(agreement.actionCollateral), 'available balance does not match')
                      assertBn(currentLockedBalance, previousLockedBalance.sub(agreement.actionCollateral), 'locked balance does not match')
                    })

                    it('transfers the challenge collateral to the submitter', async () => {
                      const { collateralToken, challengeCollateral } = agreement
                      const previousSubmitterBalance = await collateralToken.balanceOf(submitter)
                      const previousChallengerBalance = await collateralToken.balanceOf(challenger)
                      const previousAgreementBalance = await collateralToken.balanceOf(agreement.address)

                      await agreement.executeRuling({ actionId, ruling })

                      const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
                      assertBn(currentSubmitterBalance, previousSubmitterBalance.add(challengeCollateral), 'submitter balance does not match')

                      const currentChallengerBalance = await collateralToken.balanceOf(challenger)
                      assertBn(currentChallengerBalance, previousChallengerBalance, 'challenger balance does not match')

                      const currentAgreementBalance = await collateralToken.balanceOf(agreement.address)
                      assertBn(currentAgreementBalance, previousAgreementBalance.sub(challengeCollateral), 'agreement balance does not match')
                    })

                    it('emits an event', async () => {
                      const { currentChallengeId } = await agreement.getAction(actionId)
                      const receipt = await agreement.executeRuling({ actionId, ruling })
                      const logs = decodeEventsOfType(receipt, agreement.abi, AGREEMENT_EVENTS.ACTION_ACCEPTED)

                      assertAmountOfEvents({ logs }, AGREEMENT_EVENTS.ACTION_ACCEPTED, 1)
                      assertEvent({ logs }, AGREEMENT_EVENTS.ACTION_ACCEPTED, { actionId, challengeId: currentChallengeId })
                    })

                    it('can proceed or be challenged', async () => {
                      await agreement.executeRuling({ actionId, ruling })

                      const { canProceed, canChallenge, canSettle, canDispute, canClaimSettlement, canRuleDispute } = await agreement.getAllowedPaths(actionId)
                      assert.isTrue(canProceed, 'action cannot proceed')
                      assert.isTrue(canChallenge, 'action cannot be challenged')
                      assert.isFalse(canSettle, 'action can be settled')
                      assert.isFalse(canDispute, 'action can be disputed')
                      assert.isFalse(canClaimSettlement, 'action settlement can be claimed')
                      assert.isFalse(canRuleDispute, 'action dispute can be ruled')
                    })
                  })

                  context('when the dispute was ruled in favor the challenger', () => {
                    const ruling = RULINGS.IN_FAVOR_OF_CHALLENGER
                    const expectedChallengeState = CHALLENGES_STATE.ACCEPTED

                    itRulesTheActionProperly(ruling, expectedChallengeState)

                    it('does not alter the action', async () => {
                      const previousActionState = await agreement.getAction(actionId)

                      await agreement.executeRuling({ actionId, ruling })

                      const currentActionState = await agreement.getAction(actionId)
                      assertBn(currentActionState.state, previousActionState.state, 'action state does not match')
                      assertBn(currentActionState.disputableId, previousActionState.disputableId, 'disputable ID does not match')
                      assert.equal(currentActionState.disputable, previousActionState.disputable, 'disputable does not match')
                      assert.equal(currentActionState.submitter, previousActionState.submitter, 'submitter does not match')
                      assert.equal(currentActionState.context, previousActionState.context, 'action context does not match')
                      assertBn(currentActionState.collateralId, previousActionState.collateralId, 'collateral ID does not match')
                    })

                    it('slashes the submitter locked balance', async () => {
                      const { available: previousAvailableBalance, locked: previousLockedBalance } = await agreement.getBalance(submitter)

                      await agreement.executeRuling({ actionId, ruling })

                      const { available: currentAvailableBalance, locked: currentLockedBalance } = await agreement.getBalance(submitter)

                      assertBn(currentAvailableBalance, previousAvailableBalance, 'available balance does not match')
                      assertBn(currentLockedBalance, previousLockedBalance.sub(agreement.actionCollateral), 'locked balance does not match')
                    })

                    it('transfers the challenge collateral and the collateral amount to the challenger', async () => {
                      const stakingAddress = await agreement.getStakingAddress()
                      const { collateralToken, actionCollateral, challengeCollateral } = agreement

                      const previousSubmitterBalance = await collateralToken.balanceOf(submitter)
                      const previousChallengerBalance = await collateralToken.balanceOf(challenger)
                      const previousAgreementBalance = await collateralToken.balanceOf(agreement.address)
                      const previousStakingBalance = await collateralToken.balanceOf(stakingAddress)

                      await agreement.executeRuling({ actionId, ruling })

                      const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
                      assertBn(currentSubmitterBalance, previousSubmitterBalance, 'submitter balance does not match')

                      const currentChallengerBalance = await collateralToken.balanceOf(challenger)
                      assertBn(currentChallengerBalance, previousChallengerBalance.add(actionCollateral).add(challengeCollateral), 'challenger balance does not match')

                      const currentAgreementBalance = await collateralToken.balanceOf(agreement.address)
                      assertBn(currentAgreementBalance, previousAgreementBalance.sub(challengeCollateral), 'agreement balance does not match')

                      const currentStakingBalance = await collateralToken.balanceOf(stakingAddress)
                      assertBn(currentStakingBalance, previousStakingBalance.sub(actionCollateral), 'staking balance does not match')
                    })

                    it('emits an event', async () => {
                      const { currentChallengeId } = await agreement.getAction(actionId)
                      const receipt = await agreement.executeRuling({ actionId, ruling })
                      const logs = decodeEventsOfType(receipt, agreement.abi, AGREEMENT_EVENTS.ACTION_REJECTED)

                      assertAmountOfEvents({ logs }, AGREEMENT_EVENTS.ACTION_REJECTED, 1)
                      assertEvent({ logs }, AGREEMENT_EVENTS.ACTION_REJECTED, { actionId, challengeId: currentChallengeId })
                    })

                    it('there are no more paths allowed', async () => {
                      await agreement.executeRuling({ actionId, ruling })

                      const { canProceed, canChallenge, canSettle, canDispute, canClaimSettlement, canRuleDispute } = await agreement.getAllowedPaths(actionId)
                      assert.isFalse(canProceed, 'action can proceed')
                      assert.isFalse(canChallenge, 'action can be challenged')
                      assert.isFalse(canSettle, 'action can be settled')
                      assert.isFalse(canDispute, 'action can be disputed')
                      assert.isFalse(canClaimSettlement, 'action settlement can be claimed')
                      assert.isFalse(canRuleDispute, 'action dispute can be ruled')
                    })
                  })

                  context('when the dispute was refused', () => {
                    const ruling = RULINGS.REFUSED
                    const expectedChallengeState = CHALLENGES_STATE.VOIDED

                    itRulesTheActionProperly(ruling, expectedChallengeState)

                    it('updates the action state back to submitted', async () => {
                      const previousActionState = await agreement.getAction(actionId)

                      await agreement.executeRuling({ actionId, ruling })

                      const currentActionState = await agreement.getAction(actionId)
                      assertBn(currentActionState.state, ACTIONS_STATE.SUBMITTED, 'action state does not match')

                      assertBn(currentActionState.disputableId, previousActionState.disputableId, 'disputable ID does not match')
                      assert.equal(currentActionState.disputable, previousActionState.disputable, 'disputable does not match')
                      assert.equal(currentActionState.submitter, previousActionState.submitter, 'submitter does not match')
                      assert.equal(currentActionState.context, previousActionState.context, 'action context does not match')
                      assertBn(currentActionState.collateralId, previousActionState.collateralId, 'collateral ID does not match')
                    })

                    it('unblocks the submitter locked balance', async () => {
                      const { available: previousAvailableBalance, locked: previousLockedBalance } = await agreement.getBalance(submitter)

                      await agreement.executeRuling({ actionId, ruling })

                      const { available: currentAvailableBalance, locked: currentLockedBalance } = await agreement.getBalance(submitter)

                      assertBn(currentAvailableBalance, previousAvailableBalance.add(agreement.actionCollateral), 'available balance does not match')
                      assertBn(currentLockedBalance, previousLockedBalance.sub(agreement.actionCollateral), 'locked balance does not match')
                    })

                    it('transfers the challenge collateral to the challenger', async () => {
                      const { collateralToken, challengeCollateral } = agreement
                      const previousSubmitterBalance = await collateralToken.balanceOf(submitter)
                      const previousChallengerBalance = await collateralToken.balanceOf(challenger)
                      const previousAgreementBalance = await collateralToken.balanceOf(agreement.address)

                      await agreement.executeRuling({ actionId, ruling })

                      const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
                      assertBn(currentSubmitterBalance, previousSubmitterBalance, 'submitter balance does not match')

                      const currentChallengerBalance = await collateralToken.balanceOf(challenger)
                      assertBn(currentChallengerBalance, previousChallengerBalance.add(challengeCollateral), 'challenger balance does not match')

                      const currentAgreementBalance = await collateralToken.balanceOf(agreement.address)
                      assertBn(currentAgreementBalance, previousAgreementBalance.sub(challengeCollateral), 'agreement balance does not match')
                    })

                    it('emits an event', async () => {
                      const { currentChallengeId } = await agreement.getAction(actionId)
                      const receipt = await agreement.executeRuling({ actionId, ruling })
                      const logs = decodeEventsOfType(receipt, agreement.abi, AGREEMENT_EVENTS.ACTION_VOIDED)

                      assertAmountOfEvents({ logs }, AGREEMENT_EVENTS.ACTION_VOIDED, 1)
                      assertEvent({ logs }, AGREEMENT_EVENTS.ACTION_VOIDED, { actionId, challengeId: currentChallengeId })
                    })

                    it('can proceed or be challenged', async () => {
                      await agreement.executeRuling({ actionId, ruling })

                      const { canProceed, canChallenge, canSettle, canDispute, canClaimSettlement, canRuleDispute } = await agreement.getAllowedPaths(actionId)
                      assert.isTrue(canProceed, 'action cannot proceed')
                      assert.isTrue(canChallenge, 'action cannot be challenged')
                      assert.isFalse(canSettle, 'action can be settled')
                      assert.isFalse(canDispute, 'action can be disputed')
                      assert.isFalse(canClaimSettlement, 'action settlement can be claimed')
                      assert.isFalse(canRuleDispute, 'action dispute can be ruled')
                    })
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

          itCannotRuleAction()
        })
      }

      context('when the app was registered', () => {
        itCanRuleActions()
      })

      context('when the app was unregistered', () => {
        beforeEach('mark app as unregistered', async () => {
          await agreement.unregister()
        })

        itCanRuleActions()
      })
    })

    context('when the given action does not exist', () => {
      it('reverts', async () => {
        await assertRevert(agreement.executeRuling({ actionId: 0, ruling: RULINGS.REFUSED }), AGREEMENT_ERRORS.ERROR_ACTION_DOES_NOT_EXIST)
      })
    })
  })
})
