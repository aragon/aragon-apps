const deployer = require('../helpers/utils/deployer')(web3, artifacts)
const { AGREEMENT_ERRORS } = require('../helpers/utils/errors')
const { AGREEMENT_EVENTS } = require('../helpers/utils/events')
const { RULINGS, CHALLENGES_STATE } = require('../helpers/utils/enums')

const { padLeft } = require('web3-utils')
const { bn, bigExp, getEventArgument, injectWeb3, injectArtifacts } = require('@aragon/contract-helpers-test')
const { assertBn, assertRevert, assertEvent, assertAmountOfEvents } = require('@aragon/contract-helpers-test/src/asserts')

injectWeb3(web3)
injectArtifacts(artifacts)

contract('Agreement', ([_, someone, submitter, challenger]) => {
  let disputable, actionId

  beforeEach('deploy disputable instance', async () => {
    disputable = await deployer.deployAndInitializeDisputableWrapper()
  })

  describe('dispute', () => {
    context('when the given action exists', () => {
      const actionContext = '0xab'
      const arbitratorFees = false // do not approve arbitration fees before disputing challenge

      beforeEach('create action', async () => {
        ({ actionId } = await disputable.newAction({ submitter, actionContext }))
      })

      const itCanDisputeActions = () => {
        const itCannotBeDisputed = () => {
          it('reverts', async () => {
            await assertRevert(disputable.dispute({ actionId }), AGREEMENT_ERRORS.ERROR_CANNOT_DISPUTE_ACTION)
          })
        }

        const itCannotDisputeNonExistingChallenge = () => {
          it('reverts', async () => {
            await assertRevert(disputable.dispute({ actionId }), AGREEMENT_ERRORS.ERROR_CHALLENGE_DOES_NOT_EXIST)
          })
        }

        context('when the action was not closed', () => {
          context('when the action was not challenged', () => {
            itCannotDisputeNonExistingChallenge()
          })

          context('when the action was challenged', () => {
            let challengeId
            const challengeContext = '0x123456'

            beforeEach('challenge action', async () => {
              ({ challengeId } = await disputable.challenge({ actionId, challenger, challengeContext, finishedSubmittingEvidence: true }))
            })

            context('when the challenge was not answered', () => {
              const itDisputesTheChallengeProperly = (extraTestCases = () => {}) => {
                context('when the submitter has approved the arbitration fees', () => {
                  beforeEach('approve arbitration fees', async () => {
                    const amount = await disputable.arbitratorFees()
                    await disputable.approveArbitratorFees({ amount, from: submitter })
                  })

                  context('when the sender is the action submitter', () => {
                    const from = submitter

                    it('updates the challenge state only and its associated dispute', async () => {
                      const previousChallengeState = await disputable.getChallengeWithArbitratorFees(challengeId)

                      const receipt = await disputable.dispute({ actionId, from, arbitratorFees })
                      const disputeId = getEventArgument(receipt, 'NewDispute', 'disputeId', { decodeForAbi: disputable.arbitrator.abi })

                      const currentChallengeState = await disputable.getChallengeWithArbitratorFees(challengeId)
                      assertBn(currentChallengeState.disputeId, disputeId, 'challenge dispute ID does not match')
                      assertBn(currentChallengeState.state, CHALLENGES_STATE.DISPUTED, 'challenge state does not match')

                      assert.equal(currentChallengeState.context, previousChallengeState.context, 'challenge context does not match')
                      assert.equal(currentChallengeState.challenger, previousChallengeState.challenger, 'challenger does not match')
                      assertBn(currentChallengeState.endDate, previousChallengeState.endDate, 'challenge end date does not match')
                      assertBn(currentChallengeState.settlementOffer, previousChallengeState.settlementOffer, 'challenge settlement offer does not match')
                      assertBn(currentChallengeState.challengerArbitratorFeesAmount, previousChallengeState.challengerArbitratorFeesAmount, 'challenger arbitrator amount does not match')
                      const feeAmount = await disputable.arbitratorFees()
                      assertBn(currentChallengeState.submitterArbitratorFeesAmount, feeAmount, 'current submitter arbitrator amount does not match')
                      assertBn(previousChallengeState.submitterArbitratorFeesAmount, bn(0), 'previous submitter arbitrator amount does not match')
                      assert.equal(currentChallengeState.arbitratorFeeToken, previousChallengeState.arbitratorFeeToken, 'arbitrator token does not match')
                    })

                    it('does not alter the action', async () => {
                      const previousActionState = await disputable.getAction(actionId)

                      await disputable.dispute({ actionId, from, arbitratorFees })

                      const currentActionState = await disputable.getAction(actionId)
                      assert.equal(currentActionState.closed, previousActionState.closed, 'action closed state does not match')
                      assert.equal(currentActionState.disputable, previousActionState.disputable, 'disputable does not match')
                      assert.equal(currentActionState.submitter, previousActionState.submitter, 'submitter does not match')
                      assert.equal(currentActionState.context, previousActionState.context, 'action context does not match')
                      assertBn(currentActionState.settingId, previousActionState.settingId, 'setting ID does not match')
                      assertBn(currentActionState.lastChallengeId, previousActionState.lastChallengeId, 'challenge ID does not match')
                      assertBn(currentActionState.disputableActionId, previousActionState.disputableActionId, 'disputable action ID does not match')
                      assertBn(currentActionState.collateralRequirementId, previousActionState.collateralRequirementId, 'collateral ID does not match')
                      assert.isTrue(currentActionState.lastChallengeActive, 'action challenge should still be active')
                    })

                    it('creates a dispute', async () => {
                      const receipt = await disputable.dispute({ actionId, from, arbitratorFees })
                      const { disputeId, ruling, submitterFinishedEvidence, challengerFinishedEvidence } = await disputable.getChallenge(challengeId)

                      assertBn(ruling, RULINGS.MISSING, 'ruling does not match')
                      assert.isFalse(submitterFinishedEvidence, 'submitter finished evidence')
                      assert.isTrue(challengerFinishedEvidence, 'challenger did not finish evidence')

                      const appId = '0xcafe1234cafe1234cafe1234cafe1234cafe1234cafe1234cafe1234cafe1234'
                      const paddedChallengeId = padLeft(challengeId, 64)
                      const expectedMetadata = `${appId}${paddedChallengeId}`

                      assertAmountOfEvents(receipt, 'NewDispute', { decodeForAbi: disputable.arbitrator.abi })
                      assertEvent(receipt, 'NewDispute', { expectedArgs: { disputeId, possibleRulings: 2, metadata: expectedMetadata }, decodeForAbi: disputable.arbitrator.abi })
                    })

                    it('submits both parties context as evidence', async () => {
                      const receipt = await disputable.dispute({ actionId, from, arbitratorFees })
                      const { disputeId } = await disputable.getChallenge(challengeId)

                      assertAmountOfEvents(receipt, 'EvidenceSubmitted', { expectedAmount: 2, decodeForAbi: disputable.abi })
                      assertEvent(receipt, 'EvidenceSubmitted', { index: 0, expectedArgs: { arbitrator: disputable.arbitrator, disputeId, submitter: submitter, evidence: actionContext, finished: false }, decodeForAbi: disputable.abi })
                      assertEvent(receipt, 'EvidenceSubmitted', { index: 1, expectedArgs: { arbitrator: disputable.arbitrator, disputeId, submitter: challenger, evidence: challengeContext, finished: true }, decodeForAbi: disputable.abi })
                    })

                    it('closes the evidence submission period automatically', async () => {
                      const receipt = await disputable.dispute({ actionId, from, arbitratorFees, finishedSubmittingEvidence: true })

                      assertAmountOfEvents(receipt, 'EvidencePeriodClosed', { decodeForAbi: disputable.arbitrator.abi })
                      await assertRevert(disputable.closeEvidencePeriod(actionId), 'ARBITRATOR_DISPUTE_EVIDENCE_PERIOD_ALREADY_CLOSED')
                    })

                    it('does not revert if it cannot close the evidence submission period automatically', async () => {
                      await disputable.arbitrator.setCloseEvidencePeriodFailure(true)

                      const receipt = await disputable.dispute({ actionId, from, arbitratorFees, finishedSubmittingEvidence: true })

                      assertAmountOfEvents(receipt, 'EvidencePeriodClosed', { expectedAmount: 0, decodeForAbi: disputable.arbitrator.abi })
                      await disputable.arbitrator.setCloseEvidencePeriodFailure(false)
                    })

                    it('does not affect the submitter staked balances', async () => {
                      const { locked: previousLockedBalance, available: previousAvailableBalance } = await disputable.getBalance(submitter)

                      await disputable.dispute({ actionId, from, arbitratorFees })

                      const { locked: currentLockedBalance, available: currentAvailableBalance } = await disputable.getBalance(submitter)
                      assertBn(currentLockedBalance, previousLockedBalance, 'locked balance does not match')
                      assertBn(currentAvailableBalance, previousAvailableBalance, 'available balance does not match')
                    })

                    it('does not affect token balances', async () => {
                      const stakingAddress = await disputable.getStakingAddress()
                      const { collateralToken } = disputable

                      const previousSubmitterBalance = await collateralToken.balanceOf(submitter)
                      const previousChallengerBalance = await collateralToken.balanceOf(challenger)
                      const previousStakingBalance = await collateralToken.balanceOf(stakingAddress)

                      await disputable.dispute({ actionId, from, arbitratorFees })

                      const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
                      assertBn(currentSubmitterBalance, previousSubmitterBalance, 'submitter balance does not match')

                      const currentChallengerBalance = await collateralToken.balanceOf(challenger)
                      assertBn(currentChallengerBalance, previousChallengerBalance, 'challenger balance does not match')

                      const currentStakingBalance = await collateralToken.balanceOf(stakingAddress)
                      assertBn(currentStakingBalance, previousStakingBalance, 'staking balance does not match')
                    })

                    it('emits an event', async () => {
                      const { lastChallengeId } = await disputable.getAction(actionId)
                      const receipt = await disputable.dispute({ actionId, from, arbitratorFees })

                      assertAmountOfEvents(receipt, AGREEMENT_EVENTS.ACTION_DISPUTED)
                      assertEvent(receipt, AGREEMENT_EVENTS.ACTION_DISPUTED, { expectedArgs: { actionId, challengeId: lastChallengeId } })
                    })

                    it('can be ruled', async () => {
                      await disputable.dispute({ actionId, from, arbitratorFees })

                      const { canClose, canChallenge, canSettle, canDispute, canClaimSettlement, canRuleDispute } = await disputable.getAllowedPaths(actionId)
                      assert.isTrue(canRuleDispute, 'action dispute cannot be ruled')

                      assert.isFalse(canClose, 'action can be closed')
                      assert.isFalse(canChallenge, 'action can be challenged')
                      assert.isFalse(canSettle, 'action can be settled')
                      assert.isFalse(canDispute, 'action can be disputed')
                      assert.isFalse(canClaimSettlement, 'action settlement can be claimed')
                    })

                    extraTestCases()
                  })

                  context('when the sender is the challenger', () => {
                    const from = challenger

                    it('reverts', async () => {
                      await assertRevert(disputable.dispute({ actionId, from, arbitratorFees }), AGREEMENT_ERRORS.ERROR_SENDER_NOT_ALLOWED)
                    })
                  })

                  context('when the sender is not the action submitter', () => {
                    const from = someone

                    it('reverts', async () => {
                      await assertRevert(disputable.dispute({ actionId, from, arbitratorFees }), AGREEMENT_ERRORS.ERROR_SENDER_NOT_ALLOWED)
                    })
                  })
                })

                context('when the submitter approved less than the arbitration fees', () => {
                  beforeEach('approve less than the arbitration fees', async () => {
                    const amount = await disputable.arbitratorFees()
                    await disputable.approveArbitratorFees({ amount: amount.div(bn(2)), from: submitter, accumulate: false })
                  })

                  it('reverts', async () => {
                    await assertRevert(disputable.dispute({ actionId, arbitratorFees }), AGREEMENT_ERRORS.ERROR_TOKEN_DEPOSIT_FAILED)
                  })
                })

                context('when the submitter did not approve any arbitration fees', () => {
                  beforeEach('remove arbitration fees approval', async () => {
                    await disputable.approveArbitratorFees({ amount: 0, from: submitter, accumulate: false })
                  })

                  it('reverts', async () => {
                    await assertRevert(disputable.dispute({ actionId, arbitratorFees }), AGREEMENT_ERRORS.ERROR_TOKEN_DEPOSIT_FAILED)
                  })
                })
              }

              const itDisputesTheChallengeProperlyDespiteArbitratorFees = () => {
                context('when the arbitration fees did not change', () => {
                  itDisputesTheChallengeProperly(() => {
                    it('transfers the arbitration fees to the arbitrator', async () => {
                      const { feeToken, feeAmount } = await disputable.getDisputeFees()

                      const previousSubmitterBalance = await feeToken.balanceOf(submitter)
                      const previousAgreementBalance = await feeToken.balanceOf(disputable.address)
                      const previousArbitratorBalance = await feeToken.balanceOf(disputable.arbitrator.address)

                      await disputable.dispute({ actionId, from: submitter, arbitratorFees })

                      const currentSubmitterBalance = await feeToken.balanceOf(submitter)
                      assertBn(currentSubmitterBalance, previousSubmitterBalance.sub(feeAmount), 'submitter balance does not match')

                      const currentAgreementBalance = await feeToken.balanceOf(disputable.address)
                      assertBn(currentAgreementBalance, previousAgreementBalance.sub(feeAmount.sub(feeAmount)), 'agreement balance does not match')

                      const currentArbitratorBalance = await feeToken.balanceOf(disputable.arbitrator.address)
                      assertBn(currentArbitratorBalance, previousArbitratorBalance.add(feeAmount), 'arbitrator balance does not match')
                    })
                  })
                })

                context('when the arbitration fees increased', () => {
                  let previousFeeToken, previousFeeAmount, newArbitratorFeesToken, newArbitratorFeesAmount

                  beforeEach('increase arbitration fees', async () => {
                    previousFeeToken = await disputable.arbitratorToken()
                    previousFeeAmount = await disputable.arbitratorFees()
                    newArbitratorFeesToken = await deployer.deployToken({ name: 'New Arbitration Token', symbol: 'NAT', decimals: 18 })
                    newArbitratorFeesAmount = previousFeeAmount.add(bigExp(3, 16))
                    await disputable.arbitrator.setFees(newArbitratorFeesToken.address, newArbitratorFeesAmount)
                  })

                  itDisputesTheChallengeProperly(() => {
                    it('transfers the arbitration fees to the arbitrator', async () => {
                      const previousSubmitterBalance = await newArbitratorFeesToken.balanceOf(submitter)
                      const previousAgreementBalance = await newArbitratorFeesToken.balanceOf(disputable.address)
                      const previousArbitratorBalance = await newArbitratorFeesToken.balanceOf(disputable.arbitrator.address)

                      await disputable.dispute({ actionId, from: submitter, arbitratorFees })

                      const currentSubmitterBalance = await newArbitratorFeesToken.balanceOf(submitter)
                      assertBn(currentSubmitterBalance, previousSubmitterBalance.sub(newArbitratorFeesAmount), 'submitter balance does not match')

                      const currentAgreementBalance = await newArbitratorFeesToken.balanceOf(disputable.address)
                      assertBn(currentAgreementBalance, previousAgreementBalance, 'agreement balance does not match')

                      const currentArbitratorBalance = await newArbitratorFeesToken.balanceOf(disputable.arbitrator.address)
                      assertBn(currentArbitratorBalance, previousArbitratorBalance.add(newArbitratorFeesAmount), 'arbitrator balance does not match')
                    })
                  })
                })

                context('when the arbitration fees decreased', () => {
                  let previousFeeToken, previousFeeAmount, newArbitratorFeesToken, newArbitratorFeesAmount

                  beforeEach('decrease arbitration fees', async () => {
                    previousFeeToken = await disputable.arbitratorToken()
                    previousFeeAmount = await disputable.arbitratorFees()
                    newArbitratorFeesToken = await deployer.deployToken({ name: 'New Arbitration Token', symbol: 'NAT', decimals: 18 })
                    newArbitratorFeesAmount = previousFeeAmount.sub(bn(1))
                    await disputable.arbitrator.setFees(newArbitratorFeesToken.address, newArbitratorFeesAmount)
                  })

                  itDisputesTheChallengeProperly(() => {
                    it('transfers the arbitration fees to the arbitrator', async () => {
                      const previousSubmitterBalance = await newArbitratorFeesToken.balanceOf(submitter)
                      const previousAgreementBalance = await newArbitratorFeesToken.balanceOf(disputable.address)
                      const previousArbitratorBalance = await newArbitratorFeesToken.balanceOf(disputable.arbitrator.address)

                      await disputable.dispute({ actionId, from: submitter, arbitratorFees })

                      const currentSubmitterBalance = await newArbitratorFeesToken.balanceOf(submitter)
                      assertBn(currentSubmitterBalance, previousSubmitterBalance.sub(newArbitratorFeesAmount), 'submitter balance does not match')

                      const currentAgreementBalance = await newArbitratorFeesToken.balanceOf(disputable.address)
                      assertBn(currentAgreementBalance, previousAgreementBalance, 'agreement balance does not match')

                      const currentArbitratorBalance = await newArbitratorFeesToken.balanceOf(disputable.arbitrator.address)
                      assertBn(currentArbitratorBalance, previousArbitratorBalance.add(newArbitratorFeesAmount), 'arbitrator balance does not match')
                    })
                  })
                })
              }

              context('at the beginning of the answer period', () => {
                itDisputesTheChallengeProperlyDespiteArbitratorFees()
              })

              context('in the middle of the answer period', () => {
                beforeEach('move before the challenge end date', async () => {
                  await disputable.moveBeforeChallengeEndDate(challengeId)
                })

                itDisputesTheChallengeProperlyDespiteArbitratorFees()
              })

              context('at the end of the answer period', () => {
                beforeEach('move to the challenge end date', async () => {
                  await disputable.moveToChallengeEndDate(challengeId)
                })

                itCannotBeDisputed()
              })

              context('after the answer period', () => {
                beforeEach('move after the challenge end date', async () => {
                  await disputable.moveAfterChallengeEndDate(challengeId)
                })

                itCannotBeDisputed()
              })
            })

            context('when the challenge was answered', () => {
              context('when the challenge was settled', () => {
                beforeEach('settle challenge', async () => {
                  await disputable.settle({ actionId })
                })

                itCannotBeDisputed()
              })

              context('when the challenge was disputed', () => {
                beforeEach('dispute action', async () => {
                  await disputable.dispute({ actionId })
                })

                context('when the dispute was not ruled', () => {
                  itCannotBeDisputed()
                })

                context('when the dispute was ruled', () => {
                  context('when the dispute was refused', () => {
                    beforeEach('rule action', async () => {
                      await disputable.executeRuling({ actionId, ruling: RULINGS.REFUSED })
                    })

                    context('when the action was not closed', () => {
                      itCannotBeDisputed()
                    })

                    context('when the action was closed', () => {
                      beforeEach('close action', async () => {
                        await disputable.close(actionId)
                      })

                      itCannotBeDisputed()
                    })
                  })

                  context('when the dispute was ruled in favor the submitter', () => {
                    beforeEach('rule action', async () => {
                      await disputable.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER })
                    })

                    context('when the action was not closed', () => {
                      itCannotBeDisputed()
                    })

                    context('when the action was closed', () => {
                      beforeEach('close action', async () => {
                        await disputable.close(actionId)
                      })

                      itCannotBeDisputed()
                    })
                  })

                  context('when the dispute was ruled in favor the challenger', () => {
                    beforeEach('rule action', async () => {
                      await disputable.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER })
                    })

                    itCannotBeDisputed()
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

          itCannotDisputeNonExistingChallenge()
        })
      }

      context('when the app was activated', () => {
        itCanDisputeActions()
      })

      context('when the app was deactivated', () => {
        beforeEach('mark app as unregistered', async () => {
          await disputable.deactivate()
        })

        itCanDisputeActions()
      })
    })

    context('when the given action does not exist', () => {
      it('reverts', async () => {
        await assertRevert(disputable.dispute({ actionId: 0 }), AGREEMENT_ERRORS.ERROR_ACTION_DOES_NOT_EXIST)
      })
    })
  })
})
