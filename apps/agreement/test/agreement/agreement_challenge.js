const { assertBn } = require('../helpers/assert/assertBn')
const { bn, bigExp } = require('../helpers/lib/numbers')
const { assertRevert } = require('../helpers/assert/assertThrow')
const { assertEvent, assertAmountOfEvents } = require('../helpers/assert/assertEvent')
const { AGREEMENT_EVENTS } = require('../helpers/utils/events')
const { CHALLENGES_STATE, ACTIONS_STATE, RULINGS } = require('../helpers/utils/enums')
const { DISPUTABLE_ERRORS, AGREEMENT_ERRORS } = require('../helpers/utils/errors')

const deployer = require('../helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, submitter, challenger, someone]) => {
  let agreement, actionId

  const challengeContext = '0x123456'
  const collateralAmount = bigExp(100, 18)
  const settlementOffer = collateralAmount.div(bn(2))

  beforeEach('deploy agreement instance', async () => {
    agreement = await deployer.deployAndInitializeWrapperWithDisputable({ collateralAmount, challengers: [challenger] })
  })

  describe('challenge', () => {
    context('when the given action exists', () => {
      beforeEach('create action', async () => {
        ({ actionId } = await agreement.newAction({ submitter }))
      })

      context('when the challenger has permissions', () => {
        const stake = false // do not stake challenge collateral before creating challenge
        const arbitrationFees = false // do not approve arbitration fees before creating challenge

        const itCannotBeChallenged = () => {
          it('reverts', async () => {
            await assertRevert(agreement.challenge({ actionId, challenger }), AGREEMENT_ERRORS.ERROR_CANNOT_CHALLENGE_ACTION)
          })
        }

        context('when the action was not closed', () => {
          context('when the action was not challenged', () => {
            const itChallengesTheActionProperly = () => {
              context('when the challenger has staked enough collateral', () => {
                beforeEach('stake challenge collateral', async () => {
                  const amount = agreement.challengeCollateral
                  await agreement.approve({ amount, from: challenger })
                })

                context('when the challenger has approved half of the arbitration fees', () => {
                  beforeEach('approve half arbitration fees', async () => {
                    const amount = await agreement.halfArbitrationFees()
                    await agreement.approveArbitrationFees({ amount, from: challenger })
                  })

                  it('creates a challenge', async () => {
                    const { feeToken, feeAmount } = await agreement.arbitrator.getDisputeFees()

                    const currentTimestamp = await agreement.currentTimestamp()
                    await agreement.challenge({ actionId, challenger, settlementOffer, challengeContext, arbitrationFees, stake })

                    const challenge = await agreement.getChallenge(actionId)
                    assert.equal(challenge.context, challengeContext, 'challenge context does not match')
                    assert.equal(challenge.challenger, challenger, 'challenger does not match')
                    assertBn(challenge.settlementOffer, settlementOffer, 'settlement offer does not match')
                    assertBn(challenge.endDate, currentTimestamp.add(agreement.challengeDuration), 'challenge end date does not match')
                    assertBn(challenge.arbitratorFeeAmount, feeAmount.div(bn(2)), 'arbitrator amount does not match')
                    assert.equal(challenge.arbitratorFeeToken, feeToken, 'arbitrator token does not match')
                    assertBn(challenge.state, CHALLENGES_STATE.WAITING, 'challenge state does not match')
                    assertBn(challenge.disputeId, 0, 'challenge dispute ID does not match')
                  })

                  it('updates the action state only', async () => {
                    const previousActionState = await agreement.getAction(actionId)

                    await agreement.challenge({ actionId, challenger, settlementOffer, challengeContext, arbitrationFees, stake })

                    const currentActionState = await agreement.getAction(actionId)
                    assertBn(currentActionState.state, ACTIONS_STATE.CHALLENGED, 'action state does not match')

                    assertBn(currentActionState.disputableId, previousActionState.disputableId, 'disputable ID does not match')
                    assert.equal(currentActionState.disputable, previousActionState.disputable, 'disputable does not match')
                    assert.equal(currentActionState.submitter, previousActionState.submitter, 'submitter does not match')
                    assert.equal(currentActionState.context, previousActionState.context, 'action context does not match')
                    assertBn(currentActionState.collateralId, previousActionState.collateralId, 'collateral ID does not match')
                  })

                  it('does not affect the submitter balance', async () => {
                    const { available: previousAvailableBalance, locked: previousLockedBalance } = await agreement.getBalance(submitter)

                    await agreement.challenge({ actionId, challenger, settlementOffer, challengeContext, arbitrationFees, stake })

                    const { available: currentAvailableBalance, locked: currentLockedBalance } = await agreement.getBalance(submitter)
                    assertBn(currentAvailableBalance, previousAvailableBalance, 'available balance does not match')
                    assertBn(currentLockedBalance, previousLockedBalance, 'locked balance does not match')
                  })

                  it('transfers the challenge collateral to the contract', async () => {
                    const { collateralToken, challengeCollateral } = agreement
                    const previousAgreementBalance = await collateralToken.balanceOf(agreement.address)
                    const previousChallengerBalance = await collateralToken.balanceOf(challenger)

                    await agreement.challenge({ actionId, challenger, settlementOffer, challengeContext, arbitrationFees, stake })

                    const currentAgreementBalance = await collateralToken.balanceOf(agreement.address)
                    assertBn(currentAgreementBalance, previousAgreementBalance.add(challengeCollateral), 'agreement balance does not match')

                    const currentChallengerBalance = await collateralToken.balanceOf(challenger)
                    assertBn(currentChallengerBalance, previousChallengerBalance.sub(challengeCollateral), 'challenger balance does not match')
                  })

                  it('transfers half of the arbitration fees to the contract', async () => {
                    const arbitratorToken = await agreement.arbitratorToken()
                    const halfArbitrationFees = await agreement.halfArbitrationFees()

                    const previousAgreementBalance = await arbitratorToken.balanceOf(agreement.address)
                    const previousChallengerBalance = await arbitratorToken.balanceOf(challenger)

                    await agreement.challenge({ actionId, challenger, settlementOffer, challengeContext, arbitrationFees, stake })

                    const currentAgreementBalance = await arbitratorToken.balanceOf(agreement.address)
                    assertBn(currentAgreementBalance, previousAgreementBalance.add(halfArbitrationFees), 'agreement balance does not match')

                    const currentChallengerBalance = await arbitratorToken.balanceOf(challenger)
                    assertBn(currentChallengerBalance, previousChallengerBalance.sub(halfArbitrationFees), 'challenger balance does not match')
                  })

                  it('emits an event', async () => {
                    const receipt = await agreement.challenge({ actionId, challenger, settlementOffer, challengeContext, arbitrationFees, stake })

                    assertAmountOfEvents(receipt, AGREEMENT_EVENTS.ACTION_CHALLENGED, 1)
                    assertEvent(receipt, AGREEMENT_EVENTS.ACTION_CHALLENGED, { actionId })
                  })

                  it('it can be answered only', async () => {
                    await agreement.challenge({ actionId, challenger, settlementOffer, challengeContext, arbitrationFees, stake })

                    const { canProceed, canChallenge, canSettle, canDispute, canClaimSettlement, canRuleDispute } = await agreement.getAllowedPaths(actionId)
                    assert.isTrue(canSettle, 'action cannot be settled')
                    assert.isTrue(canDispute, 'action cannot be disputed')
                    assert.isFalse(canProceed, 'action can proceed')
                    assert.isFalse(canChallenge, 'action can be challenged')
                    assert.isFalse(canClaimSettlement, 'action settlement can be claimed')
                    assert.isFalse(canRuleDispute, 'action dispute can be ruled')
                  })
                })

                context('when the challenger approved less than half of the arbitration fees', () => {
                  beforeEach('approve less than half arbitration fees', async () => {
                    const amount = await agreement.halfArbitrationFees()
                    await agreement.approveArbitrationFees({ amount: amount.div(bn(2)), from: challenger, accumulate: false })
                  })

                  it('reverts', async () => {
                    await assertRevert(agreement.challenge({ actionId, challenger, arbitrationFees }), AGREEMENT_ERRORS.ERROR_TOKEN_TRANSFER_FAILED)
                  })
                })

                context('when the challenger did not approve any arbitration fees', () => {
                  beforeEach('remove arbitration fees approval', async () => {
                    await agreement.approveArbitrationFees({ amount: 0, from: challenger, accumulate: false })
                  })

                  it('reverts', async () => {
                    await assertRevert(agreement.challenge({ actionId, challenger, arbitrationFees }), AGREEMENT_ERRORS.ERROR_TOKEN_TRANSFER_FAILED)
                  })
                })
              })

              context('when the challenger did not stake enough collateral', () => {
                beforeEach('remove collateral approval', async () => {
                  await agreement.approve({ amount: 0, from: challenger, accumulate: false })
                })

                it('reverts', async () => {
                  await assertRevert(agreement.challenge({ actionId, challenger, stake, arbitrationFees }), AGREEMENT_ERRORS.ERROR_TOKEN_DEPOSIT_FAILED)
                })
              })
            }

            itChallengesTheActionProperly()
          })

          context('when the action was challenged', () => {
            beforeEach('challenge action', async () => {
              await agreement.challenge({ actionId, challenger })
            })

            context('when the challenge was not answered', () => {
              context('at the beginning of the answer period', () => {
                itCannotBeChallenged()
              })

              context('in the middle of the answer period', () => {
                beforeEach('move before settlement period end date', async () => {
                  await agreement.moveBeforeChallengeEndDate(actionId)
                })

                itCannotBeChallenged()
              })

              context('at the end of the answer period', () => {
                beforeEach('move to the settlement period end date', async () => {
                  await agreement.moveToChallengeEndDate(actionId)
                })

                itCannotBeChallenged()
              })

              context('after the answer period', () => {
                beforeEach('move after the settlement period end date', async () => {
                  await agreement.moveAfterChallengeEndDate(actionId)
                })

                itCannotBeChallenged()
              })
            })

            context('when the challenge was answered', () => {
              context('when the challenge was settled', () => {
                beforeEach('settle challenge', async () => {
                  await agreement.settle({ actionId })
                })

                itCannotBeChallenged()
              })

              context('when the challenge was disputed', () => {
                beforeEach('dispute action', async () => {
                  await agreement.dispute({ actionId })
                })

                context('when the dispute was not ruled', () => {
                  itCannotBeChallenged()
                })

                context('when the dispute was ruled', () => {
                  context('when the dispute was ruled in favor the submitter', () => {
                    beforeEach('rule action', async () => {
                      await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER })
                    })

                    context('when the action was not closed', () => {
                      itCannotBeChallenged()
                    })

                    context('when the action was closed', () => {
                      beforeEach('close action', async () => {
                        await agreement.close({ actionId })
                      })

                      itCannotBeChallenged()
                    })
                  })

                  context('when the dispute was ruled in favor the challenger', () => {
                    beforeEach('rule action', async () => {
                      await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER })
                    })

                    itCannotBeChallenged()
                  })

                  context('when the dispute was refused', () => {
                    beforeEach('rule action', async () => {
                      await agreement.executeRuling({ actionId, ruling: RULINGS.REFUSED })
                    })

                    itCannotBeChallenged()
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

          itCannotBeChallenged()
        })
      })

      context('when the challenger does not have permissions', () => {
        const challenger = someone

        it('reverts', async () => {
          await assertRevert(agreement.challenge({ actionId, challenger }), DISPUTABLE_ERRORS.ERROR_CANNOT_CHALLENGE)
        })
      })
    })

    context('when the given action does not exist', () => {
      it('reverts', async () => {
        await assertRevert(agreement.challenge({ actionId: 0, challenger }), AGREEMENT_ERRORS.ERROR_ACTION_DOES_NOT_EXIST)
      })
    })
  })
})
