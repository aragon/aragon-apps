const EVENTS = require('./helpers/utils/events')
const { NOW } = require('./helpers/lib/time')
const { bigExp } = require('./helpers/lib/numbers')
const { assertBn } = require('./helpers/lib/assertBn')
const { CHALLENGES_STATE, ACTIONS_STATE } = require('./helpers/utils/enums')
const { assertEvent, assertAmountOfEvents } = require('./helpers/lib/assertEvent')

const deployer = require('./helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, submitter, challenger]) => {
  let agreement, actionId

  const collateralAmount = bigExp(100, 18)
  const settlementOffer = collateralAmount.div(2)
  const challengeContext = '0x123456'

  beforeEach('deploy agreement instance', async () => {
    agreement = await deployer.deployAndInitializeWrapper({ collateralAmount })
  })

  describe('challenge', () => {
    const stake = false // do not stake challenge collateral before creating challenge
    const arbitrationFees = false // do not approve arbitration fees before creating challenge

    beforeEach('create action', async () => {
      ({ actionId } = await agreement.schedule({ submitter }))
    })

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

                await agreement.challenge({ actionId, challenger, settlementOffer, challengeContext, arbitrationFees, stake })

                const challenge = await agreement.getChallenge(actionId)
                assert.equal(challenge.context, challengeContext, 'challenge context does not match')
                assert.equal(challenge.challenger, challenger, 'challenger does not match')
                assertBn(challenge.settlementOffer, settlementOffer, 'settlement offer does not match')
                assertBn(challenge.createdAt, NOW, 'created at does not match')
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

                const { canCancel, canChallenge, canAnswerChallenge, canRuleDispute, canSubmitEvidence, canExecute } = await agreement.getAllowedPaths(actionId)
                assert.isTrue(canAnswerChallenge, 'action challenge cannot be answered')
                assert.isFalse(canCancel, 'action can be cancelled')
                assert.isFalse(canChallenge, 'action can be challenged')
                assert.isFalse(canRuleDispute, 'action dispute can be ruled')
                assert.isFalse(canSubmitEvidence, 'action evidence can be submitted')
                assert.isFalse(canExecute, 'action can be executed')
              })
            })

            context('when the challenger approved less than half of the arbitration fees', () => {
              // TODO: implement
            })

            context('when the challenger did not approve any arbitration fees', () => {
              // TODO: implement
            })
          })

          context('when the challenger did not stake enough collateral', () => {
            // TODO: implement
          })
        }

        context('at the beginning of the challenge period', () => {
          itChallengesTheActionProperly()
        })

        context('in the middle of the challenge period', () => {
          // TODO: implement
        })

        context('at the end of the challenge period', () => {
          // TODO: implement
        })

        context('after the challenge period', () => {
          context('when the action was not executed', () => {
            context('when the action was not cancelled', () => {
              // TODO: implement
            })

            context('when the action was cancelled', () => {
              // TODO: implement
            })
          })

          context('when the action was executed', () => {
            // TODO: implement
          })
        })
      })

      context('when the action was challenged', () => {
        context('when the challenge was not answered', () => {
          context('at the beginning of the answer period', () => {
            // TODO: implement
          })

          context('in the middle of the answer period', () => {
            // TODO: implement
          })

          context('at the end of the answer period', () => {
            // TODO: implement
          })

          context('after the answer period', () => {
            // TODO: implement
          })
        })

        context('when the challenge was answered', () => {
          context('when the challenge was settled', () => {
            // TODO: implement
          })

          context('when the challenge was disputed', () => {
            context('when the dispute was not ruled', () => {
              // TODO: implement
            })

            context('when the dispute was ruled', () => {
              context('when the dispute was ruled in favor the submitter', () => {
                context('when the dispute was not executed', () => {
                  // TODO: implement
                })

                context('when the dispute was executed', () => {
                  // TODO: implement
                })
              })

              context('when the dispute was ruled in favor the challenger', () => {
                // TODO: implement
              })

              context('when the dispute was refused', () => {
                // TODO: implement
              })
            })
          })
        })
      })
    })

    context('when the action was cancelled', () => {
      // TODO: implement
    })
  })
})
