const { utf8ToHex, padLeft } = require('web3-utils')
const { bn } = require('../helpers/lib/numbers')
const { assertBn } = require('../helpers/assert/assertBn')
const { assertRevert } = require('../helpers/assert/assertThrow')
const { getEventArgument } = require('@aragon/contract-helpers-test/events')
const { decodeEventsOfType } = require('../helpers/lib/decodeEvent')
const { assertEvent, assertAmountOfEvents } = require('../helpers/assert/assertEvent')
const { AGREEMENT_ERRORS } = require('../helpers/utils/errors')
const { AGREEMENT_EVENTS } = require('../helpers/utils/events')
const { RULINGS, CHALLENGES_STATE } = require('../helpers/utils/enums')

const deployer = require('../helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, someone, submitter, challenger]) => {
  let disputable, actionId

  beforeEach('deploy agreement instance', async () => {
    disputable = await deployer.deployAndInitializeWrapperWithDisputable()
  })

  describe('dispute', () => {
    context('when the given action exists', () => {
      const actionContext = '0xab'
      const arbitrationFees = false // do not approve arbitration fees before disputing challenge

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
              ({ challengeId } = await disputable.challenge({ actionId, challenger, challengeContext }))
            })

            context('when the challenge was not answered', () => {
              const itDisputesTheChallengeProperly = (extraTestCases = () => {}) => {
                context('when the submitter has approved the missing arbitration fees', () => {
                  beforeEach('approve half arbitration fees', async () => {
                    const amount = await disputable.missingArbitrationFees(actionId)
                    await disputable.approveArbitrationFees({ amount, from: submitter })
                  })

                  context('when the sender is the action submitter', () => {
                    const from = submitter

                    it('updates the challenge state only and its associated dispute', async () => {
                      const previousChallengeState = await disputable.getChallenge(challengeId)

                      const receipt = await disputable.dispute({ actionId, from, arbitrationFees })

                      const IArbitrator = artifacts.require('ArbitratorMock')
                      const logs = decodeEventsOfType(receipt, IArbitrator.abi, 'NewDispute')
                      const disputeId = getEventArgument({ logs }, 'NewDispute', 'disputeId');

                      const currentChallengeState = await disputable.getChallenge(challengeId)
                      assertBn(currentChallengeState.disputeId, disputeId, 'challenge dispute ID does not match')
                      assertBn(currentChallengeState.state, CHALLENGES_STATE.DISPUTED, 'challenge state does not match')

                      assert.equal(currentChallengeState.context, previousChallengeState.context, 'challenge context does not match')
                      assert.equal(currentChallengeState.challenger, previousChallengeState.challenger, 'challenger does not match')
                      assertBn(currentChallengeState.endDate, previousChallengeState.endDate, 'challenge end date does not match')
                      assertBn(currentChallengeState.settlementOffer, previousChallengeState.settlementOffer, 'challenge settlement offer does not match')
                      assertBn(currentChallengeState.arbitratorFeeAmount, previousChallengeState.arbitratorFeeAmount, 'arbitrator amount does not match')
                      assert.equal(currentChallengeState.arbitratorFeeToken, previousChallengeState.arbitratorFeeToken, 'arbitrator token does not match')
                    })

                    it('does not alter the action', async () => {
                      const previousActionState = await disputable.getAction(actionId)

                      await disputable.dispute({ actionId, from, arbitrationFees })

                      const currentActionState = await disputable.getAction(actionId)
                      assert.equal(currentActionState.closed, previousActionState.closed, 'action closed state does not match')
                      assert.equal(currentActionState.disputable, previousActionState.disputable, 'disputable does not match')
                      assert.equal(currentActionState.submitter, previousActionState.submitter, 'submitter does not match')
                      assert.equal(currentActionState.context, previousActionState.context, 'action context does not match')
                      assertBn(currentActionState.settingId, previousActionState.settingId, 'setting ID does not match')
                      assertBn(currentActionState.currentChallengeId, previousActionState.currentChallengeId, 'challenge ID does not match')
                      assertBn(currentActionState.disputableActionId, previousActionState.disputableActionId, 'disputable action ID does not match')
                      assertBn(currentActionState.collateralRequirementId, previousActionState.collateralRequirementId, 'collateral ID does not match')
                    })

                    it('creates a dispute', async () => {
                      const receipt = await disputable.dispute({ actionId, from, arbitrationFees })
                      const { disputeId, ruling, submitterFinishedEvidence, challengerFinishedEvidence } = await disputable.getChallenge(challengeId)

                      assertBn(ruling, RULINGS.MISSING, 'ruling does not match')
                      assert.isFalse(submitterFinishedEvidence, 'submitter finished evidence')
                      assert.isFalse(challengerFinishedEvidence, 'challenger finished evidence')

                      const appId = '0xcafe1234cafe1234cafe1234cafe1234cafe1234cafe1234cafe1234cafe1234'
                      const colonChar = utf8ToHex(':').slice(2)
                      const paddedActionId = padLeft(actionId, 64)
                      const expectedMetadata = `${appId}${colonChar}${paddedActionId}`

                      const IArbitrator = artifacts.require('ArbitratorMock')
                      const logs = decodeEventsOfType(receipt, IArbitrator.abi, 'NewDispute')
                      assertAmountOfEvents({ logs }, 'NewDispute', 1)

                      assertEvent({ logs }, 'NewDispute', { disputeId, possibleRulings: 2, metadata: expectedMetadata })
                    })

                    it('submits both parties context as evidence', async () => {
                      const receipt = await disputable.dispute({ actionId, from, arbitrationFees })
                      const { disputeId } = await disputable.getChallenge(challengeId)

                      const logs = decodeEventsOfType(receipt, disputable.abi, 'EvidenceSubmitted')
                      assertAmountOfEvents({ logs }, 'EvidenceSubmitted', 2)
                      assertEvent({ logs }, 'EvidenceSubmitted', { arbitrator: disputable.arbitrator, disputeId, submitter: submitter, evidence: actionContext, finished: false }, 0)
                      assertEvent({ logs }, 'EvidenceSubmitted', { arbitrator: disputable.arbitrator, disputeId, submitter: challenger, evidence: challengeContext, finished: false }, 1)
                    })

                    it('does not affect the submitter staked balances', async () => {
                      const { locked: previousLockedBalance, available: previousAvailableBalance } = await disputable.getBalance(submitter)

                      await disputable.dispute({ actionId, from, arbitrationFees })

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

                      await disputable.dispute({ actionId, from, arbitrationFees })

                      const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
                      assertBn(currentSubmitterBalance, previousSubmitterBalance, 'submitter balance does not match')

                      const currentChallengerBalance = await collateralToken.balanceOf(challenger)
                      assertBn(currentChallengerBalance, previousChallengerBalance, 'challenger balance does not match')

                      const currentStakingBalance = await collateralToken.balanceOf(stakingAddress)
                      assertBn(currentStakingBalance, previousStakingBalance, 'staking balance does not match')
                    })

                    it('emits an event', async () => {
                      const { currentChallengeId } = await disputable.getAction(actionId)
                      const receipt = await disputable.dispute({ actionId, from, arbitrationFees })

                      assertAmountOfEvents(receipt, AGREEMENT_EVENTS.ACTION_DISPUTED, 1)
                      assertEvent(receipt, AGREEMENT_EVENTS.ACTION_DISPUTED, { actionId, challengeId: currentChallengeId })
                    })

                    it('can be ruled', async () => {
                      await disputable.dispute({ actionId, from, arbitrationFees })

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
                      await assertRevert(disputable.dispute({ actionId, from, arbitrationFees }), AGREEMENT_ERRORS.ERROR_SENDER_NOT_ALLOWED)
                    })
                  })

                  context('when the sender is not the action submitter', () => {
                    const from = someone

                    it('reverts', async () => {
                      await assertRevert(disputable.dispute({ actionId, from, arbitrationFees }), AGREEMENT_ERRORS.ERROR_SENDER_NOT_ALLOWED)
                    })
                  })
                })

                context('when the submitter approved less than the missing arbitration fees', () => {
                  beforeEach('approve less than the missing arbitration fees', async () => {
                    const amount = await disputable.missingArbitrationFees(actionId)
                    await disputable.approveArbitrationFees({ amount: amount.div(bn(2)), from: submitter, accumulate: false })
                  })

                  it('reverts', async () => {
                    await assertRevert(disputable.dispute({ actionId, arbitrationFees }), AGREEMENT_ERRORS.ERROR_TOKEN_DEPOSIT_FAILED)
                  })
                })

                context('when the submitter did not approve any arbitration fees', () => {
                  beforeEach('remove arbitration fees approval', async () => {
                    await disputable.approveArbitrationFees({ amount: 0, from: submitter, accumulate: false })
                  })

                  it('reverts', async () => {
                    await assertRevert(disputable.dispute({ actionId, arbitrationFees }), AGREEMENT_ERRORS.ERROR_TOKEN_DEPOSIT_FAILED)
                  })
                })
              }

              const itDisputesTheChallengeProperlyDespiteArbitrationFees = () => {
                context('when the arbitration fees did not change', () => {
                  itDisputesTheChallengeProperly(() => {
                    it('transfers the arbitration fees to the arbitrator', async () => {
                      const { feeToken, feeAmount } = await disputable.arbitratorFees()
                      const missingArbitrationFees = await disputable.missingArbitrationFees(actionId)

                      const previousSubmitterBalance = await feeToken.balanceOf(submitter)
                      const previousAgreementBalance = await feeToken.balanceOf(disputable.address)
                      const previousArbitratorBalance = await feeToken.balanceOf(disputable.arbitrator.address)

                      await disputable.dispute({ actionId, from: submitter, arbitrationFees })

                      const currentSubmitterBalance = await feeToken.balanceOf(submitter)
                      assertBn(currentSubmitterBalance, previousSubmitterBalance.sub(missingArbitrationFees), 'submitter balance does not match')

                      const currentAgreementBalance = await feeToken.balanceOf(disputable.address)
                      assertBn(currentAgreementBalance, previousAgreementBalance.sub(feeAmount.sub(missingArbitrationFees)), 'agreement balance does not match')

                      const currentArbitratorBalance = await feeToken.balanceOf(disputable.arbitrator.address)
                      assertBn(currentArbitratorBalance, previousArbitratorBalance.add(feeAmount), 'arbitrator balance does not match')
                    })
                  })
                })

                context('when the arbitration fees increased', () => {
                  let previousFeeToken, previousHalfFeeAmount, newArbitrationFeeToken, newArbitrationFeeAmount

                  beforeEach('increase arbitration fees', async () => {
                    previousFeeToken = await disputable.arbitratorToken()
                    previousHalfFeeAmount = await disputable.halfArbitrationFees()
                    newArbitrationFeeToken = await deployer.deployToken({ name: 'New Arbitration Token', symbol: 'NAT', decimals: 18 })
                    newArbitrationFeeAmount = previousHalfFeeAmount.mul(bn(3))
                    await disputable.arbitrator.setFees(newArbitrationFeeToken.address, newArbitrationFeeAmount)
                  })

                  itDisputesTheChallengeProperly(() => {
                    it('transfers the arbitration fees to the arbitrator', async () => {
                      const previousSubmitterBalance = await newArbitrationFeeToken.balanceOf(submitter)
                      const previousAgreementBalance = await newArbitrationFeeToken.balanceOf(disputable.address)
                      const previousArbitratorBalance = await newArbitrationFeeToken.balanceOf(disputable.arbitrator.address)

                      await disputable.dispute({ actionId, from: submitter, arbitrationFees })

                      const currentSubmitterBalance = await newArbitrationFeeToken.balanceOf(submitter)
                      assertBn(currentSubmitterBalance, previousSubmitterBalance.sub(newArbitrationFeeAmount), 'submitter balance does not match')

                      const currentAgreementBalance = await newArbitrationFeeToken.balanceOf(disputable.address)
                      assertBn(currentAgreementBalance, previousAgreementBalance, 'agreement balance does not match')

                      const currentArbitratorBalance = await newArbitrationFeeToken.balanceOf(disputable.arbitrator.address)
                      assertBn(currentArbitratorBalance, previousArbitratorBalance.add(newArbitrationFeeAmount), 'arbitrator balance does not match')
                    })

                    it('returns the previous arbitration fees to the challenger', async () => {
                      const previousAgreementBalance = await previousFeeToken.balanceOf(disputable.address)
                      const previousChallengerBalance = await previousFeeToken.balanceOf(challenger)

                      await disputable.dispute({ actionId, from: submitter, arbitrationFees })

                      const currentAgreementBalance = await previousFeeToken.balanceOf(disputable.address)
                      assertBn(currentAgreementBalance, previousAgreementBalance.sub(previousHalfFeeAmount), 'agreement balance does not match')

                      const currentChallengerBalance = await previousFeeToken.balanceOf(challenger)
                      assertBn(currentChallengerBalance, previousChallengerBalance.add(previousHalfFeeAmount), 'challenger balance does not match')
                    })
                  })
                })

                context('when the arbitration fees decreased', () => {
                  let previousFeeToken, previousHalfFeeAmount, newArbitrationFeeToken, newArbitrationFeeAmount

                  beforeEach('decrease arbitration fees', async () => {
                    previousFeeToken = await disputable.arbitratorToken()
                    previousHalfFeeAmount = await disputable.halfArbitrationFees()
                    newArbitrationFeeToken = await deployer.deployToken({ name: 'New Arbitration Token', symbol: 'NAT', decimals: 18 })
                    newArbitrationFeeAmount = previousHalfFeeAmount.sub(bn(1))
                    await disputable.arbitrator.setFees(newArbitrationFeeToken.address, newArbitrationFeeAmount)
                  })

                  itDisputesTheChallengeProperly(() => {
                    it('transfers the arbitration fees to the arbitrator', async () => {
                      const previousSubmitterBalance = await newArbitrationFeeToken.balanceOf(submitter)
                      const previousAgreementBalance = await newArbitrationFeeToken.balanceOf(disputable.address)
                      const previousArbitratorBalance = await newArbitrationFeeToken.balanceOf(disputable.arbitrator.address)

                      await disputable.dispute({ actionId, from: submitter, arbitrationFees })

                      const currentSubmitterBalance = await newArbitrationFeeToken.balanceOf(submitter)
                      assertBn(currentSubmitterBalance, previousSubmitterBalance.sub(newArbitrationFeeAmount), 'submitter balance does not match')

                      const currentAgreementBalance = await newArbitrationFeeToken.balanceOf(disputable.address)
                      assertBn(currentAgreementBalance, previousAgreementBalance, 'agreement balance does not match')

                      const currentArbitratorBalance = await newArbitrationFeeToken.balanceOf(disputable.arbitrator.address)
                      assertBn(currentArbitratorBalance, previousArbitratorBalance.add(newArbitrationFeeAmount), 'arbitrator balance does not match')
                    })

                    it('returns the previous arbitration fees to the challenger', async () => {
                      const previousAgreementBalance = await previousFeeToken.balanceOf(disputable.address)
                      const previousChallengerBalance = await previousFeeToken.balanceOf(challenger)

                      await disputable.dispute({ actionId, from: submitter, arbitrationFees })

                      const currentAgreementBalance = await previousFeeToken.balanceOf(disputable.address)
                      assertBn(currentAgreementBalance, previousAgreementBalance.sub(previousHalfFeeAmount), 'agreement balance does not match')

                      const currentChallengerBalance = await previousFeeToken.balanceOf(challenger)
                      assertBn(currentChallengerBalance, previousChallengerBalance.add(previousHalfFeeAmount), 'challenger balance does not match')
                    })
                  })
                })
              }

              context('at the beginning of the answer period', () => {
                itDisputesTheChallengeProperlyDespiteArbitrationFees()
              })

              context('in the middle of the answer period', () => {
                beforeEach('move before the challenge end date', async () => {
                  await disputable.moveBeforeChallengeEndDate(challengeId)
                })

                itDisputesTheChallengeProperlyDespiteArbitrationFees()
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

      context('when the app was unregistered', () => {
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
