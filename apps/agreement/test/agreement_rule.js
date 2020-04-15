const EVENTS = require('./helpers/utils/events')
const { assertBn } = require('./helpers/lib/assertBn')
const { decodeEventsOfType } = require('./helpers/lib/decodeEvent')
const { RULINGS, CHALLENGES_STATE } = require('./helpers/utils/enums')
const { assertEvent, assertAmountOfEvents } = require('./helpers/lib/assertEvent')

const deployer = require('./helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, submitter, challenger]) => {
  let agreement, actionId

  beforeEach('deploy agreement instance', async () => {
    agreement = await deployer.deployAndInitializeWrapper()
  })

  describe('rule', () => {
    beforeEach('create action', async () => {
      ({ actionId } = await agreement.schedule({ submitter }))
    })

    context('when the action was not cancelled', () => {
      context('when the action was not challenged', () => {
        context('at the beginning of the challenge period', () => {
          // TODO: implement
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
        beforeEach('challenge action', async () => {
          await agreement.challenge({ actionId, challenger })
        })

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
            beforeEach('dispute action', async () => {
              await agreement.dispute({ actionId })
            })

            context('when the dispute was not ruled', () => {
              // TODO: implement
            })

            context('when the dispute was ruled', () => {
              const itRulesTheActionProperly = (ruling, expectedChallengeState) => {
                it('updates the challenge state only', async () => {
                  const previousChallengeState = await agreement.getChallenge(actionId)

                  await agreement.rule({ actionId, ruling })

                  const currentChallengeState = await agreement.getChallenge(actionId)
                  assertBn(currentChallengeState.state, expectedChallengeState, 'challenge state does not match')

                  assert.equal(currentChallengeState.context, previousChallengeState.context, 'challenge context does not match')
                  assert.equal(currentChallengeState.challenger, previousChallengeState.challenger, 'challenger does not match')
                  assertBn(currentChallengeState.settlementOffer, previousChallengeState.settlementOffer, 'challenge settlement offer does not match')
                  assertBn(currentChallengeState.createdAt, previousChallengeState.createdAt, 'challenge created at does not match')
                  assertBn(currentChallengeState.arbitratorFeeAmount, previousChallengeState.arbitratorFeeAmount, 'arbitrator amount does not match')
                  assertBn(currentChallengeState.disputeId, previousChallengeState.disputeId, 'challenge dispute ID does not match')
                  assert.equal(currentChallengeState.arbitratorFeeToken, previousChallengeState.arbitratorFeeToken, 'arbitrator token does not match')
                })

                it('does not alter the action', async () => {
                  const previousActionState = await agreement.getAction(actionId)

                  await agreement.rule({ actionId, ruling })

                  const currentActionState = await agreement.getAction(actionId)
                  assert.equal(currentActionState.script, previousActionState.script, 'action script does not match')
                  assert.equal(currentActionState.context, previousActionState.context, 'action context does not match')
                  assert.equal(currentActionState.submitter, previousActionState.submitter, 'submitter does not match')
                  assertBn(currentActionState.state, previousActionState.state, 'action state does not match')
                  assertBn(currentActionState.createdAt, previousActionState.createdAt, 'action created at does not match')
                  assertBn(currentActionState.settingId, previousActionState.settingId, 'action setting ID does not match')
                })

                it('rules the dispute', async () => {
                  await agreement.rule({ actionId, ruling })

                  const { ruling: actualRuling, submitterFinishedEvidence, challengerFinishedEvidence } = await agreement.getDispute(actionId)
                  assertBn(actualRuling, ruling, 'ruling does not match')
                  assert.isFalse(submitterFinishedEvidence, 'submitter finished evidence')
                  assert.isFalse(challengerFinishedEvidence, 'challenger finished evidence')
                })

                it('does not affect the locked balance of the submitter', async () => {
                  const { locked: previousLockedBalance } = await agreement.getBalance(submitter)

                  await agreement.rule({ actionId, ruling })

                  const { locked: currentLockedBalance } = await agreement.getBalance(submitter)
                  assertBn(currentLockedBalance, previousLockedBalance, 'locked balance does not match')
                })

                it('emits a ruled event', async () => {
                  const { disputeId } = await agreement.getChallenge(actionId)
                  const receipt = await agreement.rule({ actionId, ruling })

                  const IArbitrable = artifacts.require('IArbitrable')
                  const logs = decodeEventsOfType(receipt, IArbitrable.abi, 'Ruled')

                  assertAmountOfEvents({ logs }, 'Ruled', 1)
                  assertEvent({ logs }, 'Ruled', { arbitrator: agreement.arbitrator.address, disputeId, ruling })
                })
              }

              context('when the dispute was ruled in favor the submitter', () => {
                const ruling = RULINGS.IN_FAVOR_OF_SUBMITTER
                const expectedChallengeState = CHALLENGES_STATE.REJECTED

                itRulesTheActionProperly(ruling, expectedChallengeState)

                it('unblocks the submitter challenged balance', async () => {
                  const { available: previousAvailableBalance, challenged: previousChallengedBalance } = await agreement.getBalance(submitter)

                  await agreement.rule({ actionId, ruling })

                  const { available: currentAvailableBalance, challenged: currentChallengedBalance } = await agreement.getBalance(submitter)

                  assertBn(currentAvailableBalance, previousAvailableBalance.add(agreement.collateralAmount), 'available balance does not match')
                  assertBn(currentChallengedBalance, previousChallengedBalance.sub(agreement.collateralAmount), 'challenged balance does not match')
                })

                it('transfers the challenge stake to the submitter', async () => {
                  const { collateralToken, challengeStake } = agreement
                  const previousSubmitterBalance = await collateralToken.balanceOf(submitter)
                  const previousChallengerBalance = await collateralToken.balanceOf(challenger)
                  const previousAgreementBalance = await collateralToken.balanceOf(agreement.address)

                  await agreement.rule({ actionId, ruling })

                  const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
                  assertBn(currentSubmitterBalance, previousSubmitterBalance.add(challengeStake), 'submitter balance does not match')

                  const currentChallengerBalance = await collateralToken.balanceOf(challenger)
                  assertBn(currentChallengerBalance, previousChallengerBalance, 'challenger balance does not match')

                  const currentAgreementBalance = await collateralToken.balanceOf(agreement.address)
                  assertBn(currentAgreementBalance, previousAgreementBalance.sub(challengeStake), 'agreement balance does not match')
                })

                it('emits an event', async () => {
                  const receipt = await agreement.rule({ actionId, ruling })

                  assertAmountOfEvents(receipt, EVENTS.ACTION_ACCEPTED, 1)
                  assertEvent(receipt, EVENTS.ACTION_ACCEPTED, { actionId })
                })

                it('can only be cancelled or executed', async () => {
                  await agreement.rule({ actionId, ruling })

                  const { canCancel, canChallenge, canAnswerChallenge, canRuleDispute, canSubmitEvidence, canExecute } = await agreement.getAllowedPaths(actionId)
                  assert.isTrue(canCancel, 'action cannot be cancelled')
                  assert.isTrue(canExecute, 'action cannot be executed')
                  assert.isFalse(canChallenge, 'action can be challenged')
                  assert.isFalse(canAnswerChallenge, 'action challenge can be answered')
                  assert.isFalse(canRuleDispute, 'action dispute can be ruled')
                  assert.isFalse(canSubmitEvidence, 'action evidence can be submitted')
                })
              })

              context('when the dispute was ruled in favor the challenger', () => {
                const ruling = RULINGS.IN_FAVOR_OF_CHALLENGER
                const expectedChallengeState = CHALLENGES_STATE.ACCEPTED

                itRulesTheActionProperly(ruling, expectedChallengeState)

                it('slashes the submitter challenged balance', async () => {
                  const { available: previousAvailableBalance, challenged: previousChallengedBalance } = await agreement.getBalance(submitter)

                  await agreement.rule({ actionId, ruling })

                  const { available: currentAvailableBalance, challenged: currentChallengedBalance } = await agreement.getBalance(submitter)

                  assertBn(currentAvailableBalance, previousAvailableBalance, 'available balance does not match')
                  assertBn(currentChallengedBalance, previousChallengedBalance.sub(agreement.collateralAmount), 'challenged balance does not match')
                })

                it('transfers the challenge stake and the collateral amount to the challenger', async () => {
                  const { collateralToken, collateralAmount, challengeStake } = agreement
                  const previousSubmitterBalance = await collateralToken.balanceOf(submitter)
                  const previousChallengerBalance = await collateralToken.balanceOf(challenger)
                  const previousAgreementBalance = await collateralToken.balanceOf(agreement.address)

                  await agreement.rule({ actionId, ruling })

                  const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
                  assertBn(currentSubmitterBalance, previousSubmitterBalance, 'submitter balance does not match')

                  const expectedSlash = collateralAmount.add(challengeStake)
                  const currentChallengerBalance = await collateralToken.balanceOf(challenger)
                  assertBn(currentChallengerBalance, previousChallengerBalance.add(expectedSlash), 'challenger balance does not match')

                  const currentAgreementBalance = await collateralToken.balanceOf(agreement.address)
                  assertBn(currentAgreementBalance, previousAgreementBalance.sub(expectedSlash), 'agreement balance does not match')
                })

                it('emits an event', async () => {
                  const receipt = await agreement.rule({ actionId, ruling })

                  assertAmountOfEvents(receipt, EVENTS.ACTION_REJECTED, 1)
                  assertEvent(receipt, EVENTS.ACTION_REJECTED, { actionId })
                })

                it('there are no more paths allowed', async () => {
                  await agreement.rule({ actionId, ruling })

                  const { canCancel, canChallenge, canAnswerChallenge, canRuleDispute, canSubmitEvidence, canExecute } = await agreement.getAllowedPaths(actionId)
                  assert.isFalse(canCancel, 'action can be cancelled')
                  assert.isFalse(canChallenge, 'action can be challenged')
                  assert.isFalse(canAnswerChallenge, 'action challenge can be answered')
                  assert.isFalse(canRuleDispute, 'action dispute can be ruled')
                  assert.isFalse(canSubmitEvidence, 'action evidence can be submitted')
                  assert.isFalse(canExecute, 'action can be executed')
                })
              })

              context('when the dispute was refused', () => {
                const ruling = RULINGS.REFUSED
                const expectedChallengeState = CHALLENGES_STATE.VOIDED

                itRulesTheActionProperly(ruling, expectedChallengeState)

                it('unblocks the submitter challenged balance', async () => {
                  const { available: previousAvailableBalance, challenged: previousChallengedBalance } = await agreement.getBalance(submitter)

                  await agreement.rule({ actionId, ruling })

                  const { available: currentAvailableBalance, challenged: currentChallengedBalance } = await agreement.getBalance(submitter)

                  assertBn(currentAvailableBalance, previousAvailableBalance.add(agreement.collateralAmount), 'available balance does not match')
                  assertBn(currentChallengedBalance, previousChallengedBalance.sub(agreement.collateralAmount), 'challenged balance does not match')
                })

                it('transfers the challenge stake to the challenger', async () => {
                  const { collateralToken, challengeStake } = agreement
                  const previousSubmitterBalance = await collateralToken.balanceOf(submitter)
                  const previousChallengerBalance = await collateralToken.balanceOf(challenger)
                  const previousAgreementBalance = await collateralToken.balanceOf(agreement.address)

                  await agreement.rule({ actionId, ruling })

                  const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
                  assertBn(currentSubmitterBalance, previousSubmitterBalance, 'submitter balance does not match')

                  const currentChallengerBalance = await collateralToken.balanceOf(challenger)
                  assertBn(currentChallengerBalance, previousChallengerBalance.add(challengeStake), 'challenger balance does not match')

                  const currentAgreementBalance = await collateralToken.balanceOf(agreement.address)
                  assertBn(currentAgreementBalance, previousAgreementBalance.sub(challengeStake), 'agreement balance does not match')
                })

                it('emits an event', async () => {
                  const receipt = await agreement.rule({ actionId, ruling })

                  assertAmountOfEvents(receipt, EVENTS.ACTION_VOIDED, 1)
                  assertEvent(receipt, EVENTS.ACTION_VOIDED, { actionId })
                })

                it('there are no more paths allowed', async () => {
                  await agreement.rule({ actionId, ruling })

                  const { canCancel, canChallenge, canAnswerChallenge, canRuleDispute, canSubmitEvidence, canExecute } = await agreement.getAllowedPaths(actionId)
                  assert.isFalse(canCancel, 'action can be cancelled')
                  assert.isFalse(canChallenge, 'action can be challenged')
                  assert.isFalse(canAnswerChallenge, 'action challenge can be answered')
                  assert.isFalse(canRuleDispute, 'action dispute can be ruled')
                  assert.isFalse(canSubmitEvidence, 'action evidence can be submitted')
                  assert.isFalse(canExecute, 'action can be executed')
                })
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
