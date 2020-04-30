const ERRORS = require('./helpers/utils/errors')
const EVENTS = require('./helpers/utils/events')
const { assertBn } = require('./helpers/assert/assertBn')
const { bn, bigExp } = require('./helpers/lib/numbers')
const { assertRevert } = require('./helpers/assert/assertThrow')
const { getEventArgument } = require('@aragon/contract-test-helpers/events')
const { decodeEventsOfType } = require('./helpers/lib/decodeEvent')
const { RULINGS, CHALLENGES_STATE } = require('./helpers/utils/enums')
const { assertEvent, assertAmountOfEvents } = require('./helpers/assert/assertEvent')

const deployer = require('./helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, someone, submitter, challenger]) => {
  let agreement, actionId

  beforeEach('deploy agreement instance', async () => {
    agreement = await deployer.deployAndInitializeWrapper()
  })

  describe('dispute', () => {
    context('when the given action exists', () => {
      const actionContext = '0xab'
      const arbitrationFees = false // do not approve arbitration fees before disputing challenge

      beforeEach('create action', async () => {
        ({ actionId } = await agreement.schedule({ submitter, actionContext }))
      })

      const itCannotBeDisputed = () => {
        it('reverts', async () => {
          await assertRevert(agreement.dispute({ actionId }), ERRORS.ERROR_CANNOT_DISPUTE_ACTION)
        })
      }

      context('when the action was not cancelled', () => {
        context('when the action was not challenged', () => {
          context('at the beginning of the challenge period', () => {
            itCannotBeDisputed()
          })

          context('in the middle of the challenge period', () => {
            beforeEach('move before challenge period end date', async () => {
              await agreement.moveBeforeEndOfChallengePeriod(actionId)
            })

            itCannotBeDisputed()
          })

          context('at the end of the challenge period', () => {
            beforeEach('move to the challenge period end date', async () => {
              await agreement.moveToEndOfChallengePeriod(actionId)
            })

            itCannotBeDisputed()
          })

          context('after the challenge period', () => {
            beforeEach('move after the challenge period end date', async () => {
              await agreement.moveAfterChallengePeriod(actionId)
            })

            context('when the action was not executed', () => {
              context('when the action was not cancelled', () => {
                itCannotBeDisputed()
              })

              context('when the action was cancelled', () => {
                beforeEach('cancel action', async () => {
                  await agreement.cancel({ actionId })
                })

                itCannotBeDisputed()
              })
            })

            context('when the action was executed', () => {
              beforeEach('execute action', async () => {
                await agreement.execute({ actionId })
              })

              itCannotBeDisputed()
            })
          })
        })

        context('when the action was challenged', () => {
          const challengeContext = '0x123456'

          beforeEach('challenge action', async () => {
            await agreement.challenge({ actionId, challenger, challengeContext })
          })

          context('when the challenge was not answered', () => {
            const itDisputesTheChallengeProperly = (extraTestCases = () => {}) => {
              context('when the submitter has approved the missing arbitration fees', () => {
                beforeEach('approve half arbitration fees', async () => {
                  const amount = await agreement.missingArbitrationFees(actionId)
                  await agreement.approveArbitrationFees({ amount, from: submitter })
                })

                context('when the sender is the action submitter', () => {
                  const from = submitter

                  it('updates the challenge state only and its associated dispute', async () => {
                    const previousChallengeState = await agreement.getChallenge(actionId)

                    const receipt = await agreement.dispute({ actionId, from, arbitrationFees })

                    const IArbitrator = artifacts.require('ArbitratorMock')
                    const logs = decodeEventsOfType(receipt, IArbitrator.abi, 'NewDispute')
                    const disputeId = getEventArgument({ logs }, 'NewDispute', 'disputeId');

                    const currentChallengeState = await agreement.getChallenge(actionId)
                    assertBn(currentChallengeState.disputeId, disputeId, 'challenge dispute ID does not match')
                    assertBn(currentChallengeState.state, CHALLENGES_STATE.DISPUTED, 'challenge state does not match')

                    assert.equal(currentChallengeState.context, previousChallengeState.context, 'challenge context does not match')
                    assert.equal(currentChallengeState.challenger, previousChallengeState.challenger, 'challenger does not match')
                    assertBn(currentChallengeState.settlementOffer, previousChallengeState.settlementOffer, 'challenge settlement offer does not match')
                    assertBn(currentChallengeState.settlementEndDate, previousChallengeState.settlementEndDate, 'settlement end date does not match')
                    assertBn(currentChallengeState.arbitratorFeeAmount, previousChallengeState.arbitratorFeeAmount, 'arbitrator amount does not match')
                    assert.equal(currentChallengeState.arbitratorFeeToken, previousChallengeState.arbitratorFeeToken, 'arbitrator token does not match')
                  })

                  it('does not alter the action', async () => {
                    const previousActionState = await agreement.getAction(actionId)

                    await agreement.dispute({ actionId, from, arbitrationFees })

                    const currentActionState = await agreement.getAction(actionId)
                    assert.equal(currentActionState.script, previousActionState.script, 'action script does not match')
                    assert.equal(currentActionState.context, previousActionState.context, 'action context does not match')
                    assert.equal(currentActionState.submitter, previousActionState.submitter, 'submitter does not match')
                    assertBn(currentActionState.state, previousActionState.state, 'action state does not match')
                    assertBn(currentActionState.challengeEndDate, previousActionState.challengeEndDate, 'challenge end date does not match')
                    assertBn(currentActionState.settingId, previousActionState.settingId, 'action setting ID does not match')
                  })

                  it('creates a dispute', async () => {
                    const receipt = await agreement.dispute({ actionId, from, arbitrationFees })

                    const IArbitrator = artifacts.require('ArbitratorMock')
                    const logs = decodeEventsOfType(receipt, IArbitrator.abi, 'NewDispute')
                    const { disputeId } = await agreement.getChallenge(actionId)

                    assertAmountOfEvents({ logs }, 'NewDispute', 1)
                    assertEvent({ logs }, 'NewDispute', { disputeId, possibleRulings: 2, metadata: agreement.content })

                    const { ruling, submitterFinishedEvidence, challengerFinishedEvidence } = await agreement.getDispute(actionId)
                    assertBn(ruling, RULINGS.MISSING, 'ruling does not match')
                    assert.isFalse(submitterFinishedEvidence, 'submitter finished evidence')
                    assert.isFalse(challengerFinishedEvidence, 'challenger finished evidence')
                  })

                  it('submits both parties context as evidence', async () => {
                    const receipt = await agreement.dispute({ actionId, from, arbitrationFees })

                    const IArbitrable = artifacts.require('IArbitrable')
                    const logs = decodeEventsOfType(receipt, IArbitrable.abi, 'EvidenceSubmitted')
                    const { disputeId } = await agreement.getChallenge(actionId)

                    assertAmountOfEvents({ logs }, 'EvidenceSubmitted', 2)
                    assertEvent({ logs }, 'EvidenceSubmitted', { disputeId, submitter: submitter, evidence: actionContext, finished: false }, 0)
                    assertEvent({ logs }, 'EvidenceSubmitted', { disputeId, submitter: challenger, evidence: challengeContext, finished: false }, 1)
                  })

                  it('does not affect the submitter staked balances', async () => {
                    const previousBalance = await agreement.getSigner(submitter)

                    await agreement.dispute({ actionId, from, arbitrationFees })

                    const currentBalance = await agreement.getSigner(submitter)
                    assertBn(currentBalance.available, previousBalance.available, 'available balance does not match')
                    assertBn(currentBalance.locked, previousBalance.locked, 'locked balance does not match')
                    assertBn(currentBalance.challenged, previousBalance.challenged, 'challenged balance does not match')
                  })

                  it('does not affect token balances', async () => {
                    const { collateralToken } = agreement
                    const previousSubmitterBalance = await collateralToken.balanceOf(submitter)
                    const previousChallengerBalance = await collateralToken.balanceOf(challenger)
                    const previousAgreementBalance = await collateralToken.balanceOf(agreement.address)

                    await agreement.dispute({ actionId, from, arbitrationFees })

                    const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
                    assertBn(currentSubmitterBalance, previousSubmitterBalance, 'submitter balance does not match')

                    const currentChallengerBalance = await collateralToken.balanceOf(challenger)
                    assertBn(currentChallengerBalance, previousChallengerBalance, 'challenger balance does not match')

                    const currentAgreementBalance = await collateralToken.balanceOf(agreement.address)
                    assertBn(currentAgreementBalance, previousAgreementBalance, 'agreement balance does not match')
                  })

                  it('emits an event', async () => {
                    const receipt = await agreement.dispute({ actionId, from, arbitrationFees })

                    assertAmountOfEvents(receipt, EVENTS.ACTION_DISPUTED, 1)
                    assertEvent(receipt, EVENTS.ACTION_DISPUTED, { actionId })
                  })

                  it('can only be ruled or submit evidence', async () => {
                    await agreement.dispute({ actionId, from, arbitrationFees })

                    const { canCancel, canChallenge, canSettle, canDispute, canClaimSettlement, canRuleDispute, canExecute } = await agreement.getAllowedPaths(actionId)
                    assert.isTrue(canRuleDispute, 'action dispute cannot be ruled')
                    assert.isFalse(canCancel, 'action can be cancelled')
                    assert.isFalse(canChallenge, 'action can be challenged')
                    assert.isFalse(canSettle, 'action can be settled')
                    assert.isFalse(canDispute, 'action can be disputed')
                    assert.isFalse(canClaimSettlement, 'action settlement can be claimed')
                    assert.isFalse(canExecute, 'action can be executed')
                  })

                  extraTestCases()
                })

                context('when the sender is the challenger', () => {
                  const from = challenger

                  it('reverts', async () => {
                    await assertRevert(agreement.dispute({ actionId, from, arbitrationFees }), ERRORS.ERROR_SENDER_NOT_ALLOWED)
                  })
                })

                context('when the sender is not the action submitter', () => {
                  const from = someone

                  it('reverts', async () => {
                    await assertRevert(agreement.dispute({ actionId, from, arbitrationFees }), ERRORS.ERROR_SENDER_NOT_ALLOWED)
                  })
                })
              })

              context('when the submitter approved less than the missing arbitration fees', () => {
                beforeEach('approve less than the missing arbitration fees', async () => {
                  const amount = await agreement.missingArbitrationFees(actionId)
                  await agreement.approveArbitrationFees({ amount: amount.div(bn(2)), from: submitter, accumulate: false })
                })

                it('reverts', async () => {
                  await assertRevert(agreement.dispute({ actionId, arbitrationFees }), ERRORS.ERROR_ARBITRATOR_FEE_DEPOSIT_FAILED)
                })
              })

              context('when the submitter did not approve any arbitration fees', () => {
                beforeEach('remove arbitration fees approval', async () => {
                  await agreement.approveArbitrationFees({ amount: 0, from: submitter, accumulate: false })
                })

                it('reverts', async () => {
                  await assertRevert(agreement.dispute({ actionId, arbitrationFees }), ERRORS.ERROR_ARBITRATOR_FEE_DEPOSIT_FAILED)
                })
              })
            }

            const itDisputesTheChallengeProperlyDespiteArbitrationFees = () => {
              context('when the arbitration fees did not change', () => {
                itDisputesTheChallengeProperly(() => {
                  it('transfers the arbitration fees to the arbitrator', async () => {
                    const { feeToken, feeAmount } = await agreement.arbitratorFees()
                    const missingArbitrationFees = await agreement.missingArbitrationFees(actionId)

                    const previousSubmitterBalance = await feeToken.balanceOf(submitter)
                    const previousAgreementBalance = await feeToken.balanceOf(agreement.address)
                    const previousArbitratorBalance = await feeToken.balanceOf(agreement.arbitrator.address)

                    await agreement.dispute({ actionId, from: submitter, arbitrationFees })

                    const currentSubmitterBalance = await feeToken.balanceOf(submitter)
                    assertBn(currentSubmitterBalance, previousSubmitterBalance.sub(missingArbitrationFees), 'submitter balance does not match')

                    const currentAgreementBalance = await feeToken.balanceOf(agreement.address)
                    assertBn(currentAgreementBalance, previousAgreementBalance.sub(feeAmount.sub(missingArbitrationFees)), 'agreement balance does not match')

                    const currentArbitratorBalance = await feeToken.balanceOf(agreement.arbitrator.address)
                    assertBn(currentArbitratorBalance, previousArbitratorBalance.add(feeAmount), 'arbitrator balance does not match')
                  })
                })
              })

              context('when the arbitration fees changed', () => {
                let previousFeeToken, previousHalfFeeAmount, newArbitrationFeeToken, newArbitrationFeeAmount = bigExp(191919, 18)

                beforeEach('change arbitration fees', async () => {
                  previousFeeToken = await agreement.arbitratorToken()
                  previousHalfFeeAmount = await agreement.halfArbitrationFees()
                  newArbitrationFeeToken = await deployer.deployToken({ name: 'New Arbitration Token', symbol: 'NAT', decimals: 18 })
                  await agreement.arbitrator.setFees(newArbitrationFeeToken.address, newArbitrationFeeAmount)
                })

                itDisputesTheChallengeProperly(() => {
                  it('transfers the arbitration fees to the arbitrator', async () => {
                    const previousSubmitterBalance = await newArbitrationFeeToken.balanceOf(submitter)
                    const previousAgreementBalance = await newArbitrationFeeToken.balanceOf(agreement.address)
                    const previousArbitratorBalance = await newArbitrationFeeToken.balanceOf(agreement.arbitrator.address)

                    await agreement.dispute({ actionId, from: submitter, arbitrationFees })

                    const currentSubmitterBalance = await newArbitrationFeeToken.balanceOf(submitter)
                    assertBn(currentSubmitterBalance, previousSubmitterBalance.sub(newArbitrationFeeAmount), 'submitter balance does not match')

                    const currentAgreementBalance = await newArbitrationFeeToken.balanceOf(agreement.address)
                    assertBn(currentAgreementBalance, previousAgreementBalance, 'agreement balance does not match')

                    const currentArbitratorBalance = await newArbitrationFeeToken.balanceOf(agreement.arbitrator.address)
                    assertBn(currentArbitratorBalance, previousArbitratorBalance.add(newArbitrationFeeAmount), 'arbitrator balance does not match')
                  })

                  it('returns the previous arbitration fees to the challenger', async () => {
                    const previousAgreementBalance = await previousFeeToken.balanceOf(agreement.address)
                    const previousChallengerBalance = await previousFeeToken.balanceOf(challenger)

                    await agreement.dispute({ actionId, from: submitter, arbitrationFees })

                    const currentAgreementBalance = await previousFeeToken.balanceOf(agreement.address)
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
              beforeEach('move before settlement period end date', async () => {
                await agreement.moveBeforeEndOfSettlementPeriod(actionId)
              })

              itDisputesTheChallengeProperlyDespiteArbitrationFees()
            })

            context('at the end of the answer period', () => {
              beforeEach('move to the settlement period end date', async () => {
                await agreement.moveToEndOfSettlementPeriod(actionId)
              })

              itDisputesTheChallengeProperlyDespiteArbitrationFees()
            })

            context('after the answer period', () => {
              beforeEach('move after the settlement period end date', async () => {
                await agreement.moveAfterSettlementPeriod(actionId)
              })

              itCannotBeDisputed()
            })
          })

          context('when the challenge was answered', () => {
            context('when the challenge was settled', () => {
              beforeEach('settle challenge', async () => {
                await agreement.settle({ actionId })
              })

              itCannotBeDisputed()
            })

            context('when the challenge was disputed', () => {
              beforeEach('dispute action', async () => {
                await agreement.dispute({ actionId })
              })

              context('when the dispute was not ruled', () => {
                itCannotBeDisputed()
              })

              context('when the dispute was ruled', () => {
                context('when the dispute was ruled in favor the submitter', () => {
                  beforeEach('rule action', async () => {
                    await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER })
                  })

                  context('when the action was not executed', () => {
                    context('when the action was not cancelled', () => {
                      itCannotBeDisputed()
                    })

                    context('when the action was cancelled', () => {
                      beforeEach('cancel action', async () => {
                        await agreement.cancel({ actionId })
                      })

                      itCannotBeDisputed()
                    })
                  })

                  context('when the action was executed', () => {
                    beforeEach('execute action', async () => {
                      await agreement.execute({ actionId })
                    })

                    itCannotBeDisputed()
                  })
                })

                context('when the dispute was ruled in favor the challenger', () => {
                  beforeEach('rule action', async () => {
                    await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER })
                  })

                  itCannotBeDisputed()
                })

                context('when the dispute was refused', () => {
                  beforeEach('rule action', async () => {
                    await agreement.executeRuling({ actionId, ruling: RULINGS.REFUSED })
                  })

                  itCannotBeDisputed()
                })
              })
            })
          })
        })
      })

      context('when the action was cancelled', () => {
        beforeEach('cancel action', async () => {
          await agreement.cancel({ actionId })
        })

        itCannotBeDisputed()
      })
    })

    context('when the given action does not exist', () => {
      it('reverts', async () => {
        await assertRevert(agreement.dispute({ actionId: 0 }), ERRORS.ERROR_ACTION_DOES_NOT_EXIST)
      })
    })
  })
})
