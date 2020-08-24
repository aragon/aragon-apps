const deployer = require('../helpers/utils/deployer')(web3, artifacts)
const { AGREEMENT_ERRORS } = require('../helpers/utils/errors')
const { CHALLENGES_STATE, RULINGS } = require('../helpers/utils/enums')
const { AGREEMENT_EVENTS, DISPUTABLE_EVENTS } = require('../helpers/utils/events')

const { bn, bigExp, injectWeb3, injectArtifacts } = require('@aragon/contract-helpers-test')
const { assertBn, assertRevert, assertEvent, assertAmountOfEvents } = require('@aragon/contract-helpers-test/src/asserts')

injectWeb3(web3)
injectArtifacts(artifacts)

contract('Agreement', ([_, submitter, challenger, someone]) => {
  let disputable, actionId

  const challengeContext = '0x123456'
  const collateralAmount = bigExp(100, 18)
  const settlementOffer = collateralAmount.div(bn(2))

  beforeEach('deploy disputable instance', async () => {
    disputable = await deployer.deployAndInitializeDisputableWrapper({ collateralAmount, challengers: [challenger] })
  })

  describe('challenge', () => {
    context('when the given action exists', () => {
      beforeEach('create action', async () => {
        ({ actionId } = await disputable.newAction({ submitter }))
      })

      const itCanChallengeActions = () => {
        context('when the challenger has permissions', () => {
          const stake = false // do not stake challenge collateral before creating challenge
          const arbitratorFees = false // do not approve arbitrator fees before creating challenge

          const itCannotBeChallenged = () => {
            it('reverts', async () => {
              await assertRevert(disputable.challenge({ actionId, challenger }), AGREEMENT_ERRORS.ERROR_CANNOT_CHALLENGE_ACTION)
            })
          }

          const itChallengesTheActionProperly = () => {
            context('when the challenger has staked enough collateral', () => {
              beforeEach('stake challenge collateral', async () => {
                const amount = disputable.challengeCollateral
                await disputable.approve({ amount, from: challenger })
              })

              context('when the challenger has approved the arbitrator fees', () => {
                beforeEach('approve arbitrator fees', async () => {
                  const amount = await disputable.arbitratorFees()
                  await disputable.approveArbitratorFees({ amount, from: challenger })
                })

                context('when the disputable allows the action to be challenged', () => {
                  beforeEach('mock can challenge', async () => {
                    await disputable.mockDisputable({ canChallenge: true })
                  })

                  it('creates a challenge', async () => {
                    const { feeToken, feeAmount } = await disputable.arbitrator.getDisputeFees()

                    const currentTimestamp = await disputable.currentTimestamp()
                    const { challengeId } = await disputable.challenge({ actionId, challenger, settlementOffer, challengeContext, arbitratorFees, stake })

                    const challenge = await disputable.getChallengeWithArbitratorFees(challengeId)
                    assert.equal(challenge.context, challengeContext, 'challenge context does not match')
                    assert.equal(challenge.challenger, challenger, 'challenger does not match')
                    assertBn(challenge.settlementOffer, settlementOffer, 'settlement offer does not match')
                    assertBn(challenge.endDate, currentTimestamp.add(disputable.challengeDuration), 'challenge end date does not match')
                    assertBn(challenge.challengerArbitratorFeesAmount, feeAmount, 'arbitrator amount does not match')
                    assert.equal(challenge.challengerArbitratorFeesToken, feeToken, 'arbitrator token does not match')
                    assertBn(challenge.state, CHALLENGES_STATE.WAITING, 'challenge state does not match')
                    assertBn(challenge.disputeId, 0, 'challenge dispute ID does not match')
                  })

                  it('updates the action state only', async () => {
                    const previousActionState = await disputable.getAction(actionId)

                    const { challengeId } = await disputable.challenge({ actionId, challenger, settlementOffer, challengeContext, arbitratorFees, stake })

                    const currentActionState = await disputable.getAction(actionId)
                    assertBn(currentActionState.lastChallengeId, challengeId, 'action challenge ID does not match')
                    assert.isTrue(currentActionState.lastChallengeActive, 'action challenge should be active')

                    assert.equal(currentActionState.closed, previousActionState.closed, 'action closed state does not match')
                    assert.equal(currentActionState.disputable, previousActionState.disputable, 'disputable does not match')
                    assert.equal(currentActionState.submitter, previousActionState.submitter, 'submitter does not match')
                    assert.equal(currentActionState.context, previousActionState.context, 'action context does not match')
                    assertBn(currentActionState.settingId, previousActionState.settingId, 'setting ID does not match')
                    assertBn(currentActionState.disputableActionId, previousActionState.disputableActionId, 'disputable action ID does not match')
                    assertBn(currentActionState.collateralRequirementId, previousActionState.collateralRequirementId, 'collateral requirement ID does not match')
                  })

                  it('does not affect the submitter balance', async () => {
                    const { available: previousAvailableBalance, locked: previousLockedBalance } = await disputable.getBalance(submitter)

                    await disputable.challenge({ actionId, challenger, settlementOffer, challengeContext, arbitratorFees, stake })

                    const { available: currentAvailableBalance, locked: currentLockedBalance } = await disputable.getBalance(submitter)
                    assertBn(currentAvailableBalance, previousAvailableBalance, 'available balance does not match')
                    assertBn(currentLockedBalance, previousLockedBalance, 'locked balance does not match')
                  })

                  it('transfers the challenge collateral to the contract', async () => {
                    const { collateralToken, challengeCollateral } = disputable
                    const previousAgreementBalance = await collateralToken.balanceOf(disputable.address)
                    const previousChallengerBalance = await collateralToken.balanceOf(challenger)

                    await disputable.challenge({ actionId, challenger, settlementOffer, challengeContext, arbitratorFees, stake })

                    const currentAgreementBalance = await collateralToken.balanceOf(disputable.address)
                    assertBn(currentAgreementBalance, previousAgreementBalance.add(challengeCollateral), 'agreement balance does not match')

                    const currentChallengerBalance = await collateralToken.balanceOf(challenger)
                    assertBn(currentChallengerBalance, previousChallengerBalance.sub(challengeCollateral), 'challenger balance does not match')
                  })

                  it('transfers the arbitrator fees to the contract', async () => {
                    const arbitratorToken = await disputable.arbitratorToken()

                    const previousAgreementBalance = await arbitratorToken.balanceOf(disputable.address)
                    const previousChallengerBalance = await arbitratorToken.balanceOf(challenger)

                    await disputable.challenge({ actionId, challenger, settlementOffer, challengeContext, arbitratorFees, stake })

                    const currentAgreementBalance = await arbitratorToken.balanceOf(disputable.address)
                    const challengeArbitratorFees = await disputable.arbitratorFees()
                    assertBn(currentAgreementBalance, previousAgreementBalance.add(challengeArbitratorFees), 'agreement balance does not match')

                    const currentChallengerBalance = await arbitratorToken.balanceOf(challenger)
                    assertBn(currentChallengerBalance, previousChallengerBalance.sub(challengeArbitratorFees), 'challenger balance does not match')
                  })

                  it('emits an event', async () => {
                    const { receipt } = await disputable.challenge({ actionId, challenger, settlementOffer, challengeContext, arbitratorFees, stake })
                    const { lastChallengeId } = await disputable.getAction(actionId)

                    assertAmountOfEvents(receipt, AGREEMENT_EVENTS.ACTION_CHALLENGED)
                    assertEvent(receipt, AGREEMENT_EVENTS.ACTION_CHALLENGED, { expectedArgs: { actionId, challengeId: lastChallengeId } })
                  })

                  it('it can be answered only', async () => {
                    await disputable.challenge({ actionId, challenger, settlementOffer, challengeContext, arbitratorFees, stake })

                    const { canClose, canChallenge, canSettle, canDispute, canClaimSettlement, canRuleDispute } = await disputable.getAllowedPaths(actionId)
                    assert.isTrue(canSettle, 'action cannot be settled')
                    assert.isTrue(canDispute, 'action cannot be disputed')

                    assert.isFalse(canClose, 'action can be closed')
                    assert.isFalse(canChallenge, 'action can be challenged')
                    assert.isFalse(canClaimSettlement, 'action settlement can be claimed')
                    assert.isFalse(canRuleDispute, 'action dispute can be ruled')
                  })
                })

                context('when the disputable does not allow the action to be challenged', () => {
                  beforeEach('mock can challenge', async () => {
                    await disputable.mockDisputable({ canChallenge: false })
                  })

                  itCannotBeChallenged()
                })
              })

              context('when the challenger approved less than the arbitrator fees', () => {
                beforeEach('approve less than arbitrator fees', async () => {
                  const amount = await disputable.arbitratorFees()
                  await disputable.approveArbitratorFees({ amount: amount.div(bn(2)), from: challenger, accumulate: false })
                })

                it('reverts', async () => {
                  await assertRevert(disputable.challenge({ actionId, challenger, arbitratorFees }), AGREEMENT_ERRORS.ERROR_TOKEN_DEPOSIT_FAILED)
                })
              })

              context('when the challenger did not approve any arbitrator fees', () => {
                beforeEach('remove arbitrator fees approval', async () => {
                  await disputable.approveArbitratorFees({ amount: 0, from: challenger, accumulate: false })
                })

                it('reverts', async () => {
                  await assertRevert(disputable.challenge({ actionId, challenger, arbitratorFees }), AGREEMENT_ERRORS.ERROR_TOKEN_DEPOSIT_FAILED)
                })
              })
            })

            context('when the challenger did not stake enough collateral', () => {
              beforeEach('remove collateral approval', async () => {
                await disputable.approve({ amount: 0, from: challenger, accumulate: false })
              })

              it('reverts', async () => {
                await assertRevert(disputable.challenge({ actionId, challenger, stake, arbitratorFees }), AGREEMENT_ERRORS.ERROR_TOKEN_DEPOSIT_FAILED)
              })
            })
          }

          context('when the action was not closed', () => {
            context('when the action was not challenged', () => {
              itChallengesTheActionProperly()
            })

            context('when the action was challenged', () => {
              let challengeId

              beforeEach('challenge action', async () => {
                ({ challengeId } = await disputable.challenge({ actionId, challenger }))
              })

              context('when the challenge was not answered', () => {
                context('at the beginning of the answer period', () => {
                  itCannotBeChallenged()
                })

                context('in the middle of the answer period', () => {
                  beforeEach('move before the challenge end date', async () => {
                    await disputable.moveBeforeChallengeEndDate(challengeId)
                  })

                  itCannotBeChallenged()
                })

                context('at the end of the answer period', () => {
                  beforeEach('move to the challenge end date', async () => {
                    await disputable.moveToChallengeEndDate(challengeId)
                  })

                  itCannotBeChallenged()
                })

                context('after the answer period', () => {
                  beforeEach('move after the challenge end date', async () => {
                    await disputable.moveAfterChallengeEndDate(challengeId)
                  })

                  itCannotBeChallenged()
                })
              })

              context('when the challenge was answered', () => {
                context('when the challenge was settled', () => {
                  beforeEach('settle challenge', async () => {
                    await disputable.settle({ actionId })
                  })

                  itCannotBeChallenged()
                })

                context('when the challenge was disputed', () => {
                  beforeEach('dispute action', async () => {
                    await disputable.dispute({ actionId })
                  })

                  context('when the dispute was not ruled', () => {
                    itCannotBeChallenged()
                  })

                  context('when the dispute was ruled', () => {
                    context('when the dispute was refused', () => {
                      beforeEach('rule action', async () => {
                        await disputable.executeRuling({ actionId, ruling: RULINGS.REFUSED })
                      })

                      context('when the action was not closed', () => {
                        itChallengesTheActionProperly()
                      })

                      context('when the action was closed', () => {
                        beforeEach('close action', async () => {
                          await disputable.close(actionId)
                        })

                        itCannotBeChallenged()
                      })
                    })

                    context('when the dispute was ruled in favor the submitter', () => {
                      beforeEach('rule action', async () => {
                        await disputable.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER })
                      })

                      context('when the action was not closed', () => {
                        itChallengesTheActionProperly()
                      })

                      context('when the action was closed', () => {
                        beforeEach('close action', async () => {
                          await disputable.close(actionId)
                        })

                        itCannotBeChallenged()
                      })
                    })

                    context('when the dispute was ruled in favor the challenger', () => {
                      beforeEach('rule action', async () => {
                        await disputable.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER })
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
              await disputable.close(actionId)
            })

            itCannotBeChallenged()
          })
        })

        context('when the challenger does not have permissions', () => {
          const challenger = someone

          it('reverts', async () => {
            await assertRevert(disputable.challenge({ actionId, challenger }), AGREEMENT_ERRORS.ERROR_SENDER_CANNOT_CHALLENGE_ACTION)
          })
        })
      }

      context('when the app was activated', () => {
        itCanChallengeActions()
      })

      context('when the app was deactivated', () => {
        beforeEach('mark app as unregistered', async () => {
          await disputable.deactivate()
        })

        itCanChallengeActions()
      })
    })

    context('when the given action does not exist', () => {
      it('reverts', async () => {
        await assertRevert(disputable.challenge({ actionId: 0, challenger }), AGREEMENT_ERRORS.ERROR_ACTION_DOES_NOT_EXIST)
      })
    })
  })
})
