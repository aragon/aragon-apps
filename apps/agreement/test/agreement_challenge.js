const ERRORS = require('./helpers/utils/errors')
const EVENTS = require('./helpers/utils/events')
const { bigExp } = require('./helpers/lib/numbers')
const { assertBn } = require('./helpers/lib/assertBn')
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { assertEvent, assertAmountOfEvents } = require('./helpers/lib/assertEvent')
const { CHALLENGES_STATE, ACTIONS_STATE, RULINGS } = require('./helpers/utils/enums')

const deployer = require('./helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, submitter, challenger, someone]) => {
  let agreement, actionId

  const collateralAmount = bigExp(100, 18)
  const settlementOffer = collateralAmount.div(2)
  const challengeContext = '0x123456'

  beforeEach('deploy agreement instance', async () => {
    agreement = await deployer.deployAndInitializeWrapper({ collateralAmount, challengers: [challenger] })
  })

  describe('challenge', () => {
    context('when the challenger has permissions', () => {
      context('when the given action exists', () => {
        const stake = false // do not stake challenge collateral before creating challenge
        const arbitrationFees = false // do not approve arbitration fees before creating challenge

        beforeEach('create action', async () => {
          ({ actionId } = await agreement.schedule({ submitter }))
        })

        const itCannotBeChallenged = () => {
          it('reverts', async () => {
            await assertRevert(agreement.challenge({ actionId, challenger }), ERRORS.ERROR_CANNOT_CHALLENGE_ACTION)
          })
        }

        context('when the action was not cancelled', () => {
          context('when the action was not challenged', () => {
            const itChallengesTheActionProperly = () => {
              context('when the challenger has staked enough collateral', () => {
                beforeEach('stake challenge collateral', async () => {
                  const amount = agreement.challengeStake
                  await agreement.approve({ amount, from: challenger })
                })

                context('when the challenger has approved half of the arbitration fees', () => {
                  beforeEach('approve half arbitration fees', async () => {
                    const amount = await agreement.halfArbitrationFees()
                    await agreement.approveArbitrationFees({ amount, from: challenger })
                  })

                  it('creates a challenge', async () => {
                    const [, feeToken, feeAmount] = await agreement.arbitrator.getDisputeFees()

                    const currentTimestamp = await agreement.currentTimestamp()
                    await agreement.challenge({ actionId, challenger, settlementOffer, challengeContext, arbitrationFees, stake })

                    const challenge = await agreement.getChallenge(actionId)
                    assert.equal(challenge.context, challengeContext, 'challenge context does not match')
                    assert.equal(challenge.challenger, challenger, 'challenger does not match')
                    assertBn(challenge.settlementOffer, settlementOffer, 'settlement offer does not match')
                    assertBn(challenge.createdAt, currentTimestamp, 'created at does not match')
                    assertBn(challenge.arbitratorFeeAmount, feeAmount.div(2), 'arbitrator amount does not match')
                    assert.equal(challenge.arbitratorFeeToken, feeToken, 'arbitrator token does not match')
                    assertBn(challenge.state, CHALLENGES_STATE.WAITING, 'challenge state does not match')
                    assertBn(challenge.disputeId, 0, 'challenge dispute ID does not match')
                  })

                  it('updates the action state only', async () => {
                    const previousActionState = await agreement.getAction(actionId)

                    await agreement.challenge({ actionId, challenger, settlementOffer, challengeContext, arbitrationFees, stake })

                    const currentActionState = await agreement.getAction(actionId)
                    assert.equal(currentActionState.state, ACTIONS_STATE.CHALLENGED, 'action state does not match')

                    assert.equal(currentActionState.script, previousActionState.script, 'action script does not match')
                    assert.equal(currentActionState.context, previousActionState.context, 'action context does not match')
                    assert.equal(currentActionState.submitter, previousActionState.submitter, 'submitter does not match')
                    assertBn(currentActionState.createdAt, previousActionState.createdAt, 'created at does not match')
                    assertBn(currentActionState.settingId, previousActionState.settingId, 'setting ID does not match')
                  })

                  it('marks the submitter locked balance as challenged', async () => {
                    const { locked: previousLockedBalance, challenged: previousChallengedBalance } = await agreement.getBalance(submitter)

                    await agreement.challenge({ actionId, challenger, settlementOffer, challengeContext, arbitrationFees, stake })

                    const { locked: currentLockedBalance, challenged: currentChallengedBalance } = await agreement.getBalance(submitter)
                    assertBn(currentLockedBalance, previousLockedBalance.sub(collateralAmount), 'locked balance does not match')
                    assertBn(currentChallengedBalance, previousChallengedBalance.add(collateralAmount), 'challenged balance does not match')
                  })

                  it('does not affect the submitter available balance', async () => {
                    const { available: previousAvailableBalance } = await agreement.getBalance(submitter)

                    await agreement.challenge({ actionId, challenger, settlementOffer, challengeContext, arbitrationFees, stake })

                    const { available: currentAvailableBalance } = await agreement.getBalance(submitter)
                    assertBn(currentAvailableBalance, previousAvailableBalance, 'available balance does not match')
                  })

                  it('transfers the challenge collateral to the contract', async () => {
                    const { collateralToken, challengeStake } = agreement
                    const previousAgreementBalance = await collateralToken.balanceOf(agreement.address)
                    const previousChallengerBalance = await collateralToken.balanceOf(challenger)

                    await agreement.challenge({ actionId, challenger, settlementOffer, challengeContext, arbitrationFees, stake })

                    const currentAgreementBalance = await collateralToken.balanceOf(agreement.address)
                    assertBn(currentAgreementBalance, previousAgreementBalance.add(challengeStake), 'agreement balance does not match')

                    const currentChallengerBalance = await collateralToken.balanceOf(challenger)
                    assertBn(currentChallengerBalance, previousChallengerBalance.sub(challengeStake), 'challenger balance does not match')
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

                    assertAmountOfEvents(receipt, EVENTS.ACTION_CHALLENGED, 1)
                    assertEvent(receipt, EVENTS.ACTION_CHALLENGED, { actionId })
                  })

                  it('it can be answered only', async () => {
                    await agreement.challenge({ actionId, challenger, settlementOffer, challengeContext, arbitrationFees, stake })

                    const { canCancel, canChallenge, canSettle, canDispute, canClaimSettlement, canRuleDispute, canSubmitEvidence, canExecute } = await agreement.getAllowedPaths(actionId)
                    assert.isTrue(canSettle, 'action cannot be settled')
                    assert.isTrue(canDispute, 'action cannot be disputed')
                    assert.isFalse(canCancel, 'action can be cancelled')
                    assert.isFalse(canChallenge, 'action can be challenged')
                    assert.isFalse(canClaimSettlement, 'action settlement can be claimed')
                    assert.isFalse(canRuleDispute, 'action dispute can be ruled')
                    assert.isFalse(canExecute, 'action can be executed')
                  })
                })

                context('when the challenger approved less than half of the arbitration fees', () => {
                  beforeEach('approve less than half arbitration fees', async () => {
                    const amount = await agreement.halfArbitrationFees()
                    await agreement.approveArbitrationFees({ amount: amount.div(2), from: challenger, accumulate: false })
                  })

                  it('reverts', async () => {
                    await assertRevert(agreement.challenge({ actionId, challenger, arbitrationFees }), ERRORS.ERROR_ARBITRATOR_FEE_TRANSFER_FAILED)
                  })
                })

                context('when the challenger did not approve any arbitration fees', () => {
                  beforeEach('remove arbitration fees approval', async () => {
                    await agreement.approveArbitrationFees({ amount: 0, from: challenger, accumulate: false })
                  })

                  it('reverts', async () => {
                    await assertRevert(agreement.challenge({ actionId, challenger, arbitrationFees }), ERRORS.ERROR_ARBITRATOR_FEE_TRANSFER_FAILED)
                  })
                })
              })

              context('when the challenger did not stake enough collateral', () => {
                beforeEach('remove collateral approval', async () => {
                  await agreement.approve({ amount: 0, from: challenger, accumulate: false })
                })

                it('reverts', async () => {
                  await assertRevert(agreement.challenge({ actionId, challenger, stake, arbitrationFees }), ERRORS.ERROR_COLLATERAL_TOKEN_TRANSFER_FAILED)
                })
              })
            }

            context('at the beginning of the challenge period', () => {
              itChallengesTheActionProperly()
            })

            context('in the middle of the challenge period', () => {
              beforeEach('move before challenge period end date', async () => {
                await agreement.moveBeforeEndOfChallengePeriod(actionId)
              })

              itChallengesTheActionProperly()
            })

            context('at the end of the challenge period', () => {
              beforeEach('move to the challenge period end date', async () => {
                await agreement.moveToEndOfChallengePeriod(actionId)
              })

              itChallengesTheActionProperly()
            })

            context('after the challenge period', () => {
              beforeEach('move after the challenge period end date', async () => {
                await agreement.moveAfterChallengePeriod(actionId)
              })

              context('when the action was not executed', () => {
                context('when the action was not cancelled', () => {
                  itCannotBeChallenged()
                })

                context('when the action was cancelled', () => {
                  beforeEach('cancel action', async () => {
                    await agreement.cancel({ actionId })
                  })

                  itCannotBeChallenged()
                })
              })

              context('when the action was executed', () => {
                beforeEach('execute action', async () => {
                  await agreement.execute({ actionId })
                })

                itCannotBeChallenged()
              })
            })
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
                  await agreement.moveBeforeEndOfSettlementPeriod(actionId)
                })

                itCannotBeChallenged()
              })

              context('at the end of the answer period', () => {
                beforeEach('move to the settlement period end date', async () => {
                  await agreement.moveToEndOfSettlementPeriod(actionId)
                })

                itCannotBeChallenged()
              })

              context('after the answer period', () => {
                beforeEach('move after the settlement period end date', async () => {
                  await agreement.moveAfterSettlementPeriod(actionId)
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

                    context('when the action was not executed', () => {
                      context('when the action was not cancelled', () => {
                        itCannotBeChallenged()
                      })

                      context('when the action was cancelled', () => {
                        beforeEach('cancel action', async () => {
                          await agreement.cancel({ actionId })
                        })

                        itCannotBeChallenged()
                      })
                    })

                    context('when the action was executed', () => {
                      beforeEach('execute action', async () => {
                        await agreement.execute({ actionId })
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

        context('when the action was cancelled', () => {
          beforeEach('cancel action', async () => {
            await agreement.cancel({ actionId })
          })

          itCannotBeChallenged()
        })
      })

      context('when the given action does not exist', () => {
        it('reverts', async () => {
          await assertRevert(agreement.challenge({ actionId: 0, challenger }), ERRORS.ERROR_ACTION_DOES_NOT_EXIST)
        })
      })
    })
  })

  context('when the challenger does not have permissions', () => {
    const challenger = someone

    it('reverts', async () => {
      await assertRevert(agreement.challenge({ actionId: 0, challenger }), ERRORS.ERROR_AUTH_FAILED)
    })
  })
})
