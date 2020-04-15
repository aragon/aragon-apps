const ERRORS = require('./helpers/utils/errors')
const EVENTS = require('./helpers/utils/events')
const { ACTIONS_STATE } = require('./helpers/utils/enums')
const { assertBn } = require('./helpers/lib/assertBn')
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { assertEvent, assertAmountOfEvents } = require('./helpers/lib/assertEvent')

const deployer = require('./helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, submitter, someone]) => {
  let agreement, actionId

  beforeEach('deploy agreement instance', async () => {
    agreement = await deployer.deployAndInitializeWrapper()
  })

  describe('cancel', () => {
    beforeEach('create action', async () => {
      ({ actionId } = await agreement.schedule({ submitter }))
    })

    context('when the action was not cancelled', () => {
      context('when the action was not challenged', () => {
        const itCancelsTheActionProperly = () => {
          context('when the sender is the submitter', () => {
            const from = submitter

            it('updates the action state only', async () => {
              const previousActionState = await agreement.getAction(actionId)

              await agreement.cancel({ actionId, from })

              const currentActionState = await agreement.getAction(actionId)
              assert.equal(currentActionState.state, ACTIONS_STATE.CANCELLED, 'action state does not match')

              assert.equal(currentActionState.script, previousActionState.script, 'action script does not match')
              assert.equal(currentActionState.context, previousActionState.context, 'action context does not match')
              assert.equal(currentActionState.submitter, previousActionState.submitter, 'submitter does not match')
              assertBn(currentActionState.createdAt, previousActionState.createdAt, 'created at does not match')
              assertBn(currentActionState.settingId, previousActionState.settingId, 'setting ID does not match')
            })

            it('does not affect token balances', async () => {
              const { collateralToken } = agreement
              const previousSubmitterBalance = await collateralToken.balanceOf(submitter)
              const previousAgreementBalance = await collateralToken.balanceOf(agreement.address)

              await agreement.cancel({ actionId, from })

              const currentSubmitterBalance = await collateralToken.balanceOf(submitter)
              assertBn(currentSubmitterBalance, previousSubmitterBalance, 'submitter balance does not match')

              const currentAgreementBalance = await collateralToken.balanceOf(agreement.address)
              assertBn(currentAgreementBalance, previousAgreementBalance, 'agreement balance does not match')
            })

            it('emits an event', async () => {
              const receipt = await agreement.cancel({ actionId, from })

              assertAmountOfEvents(receipt, EVENTS.ACTION_CANCELLED, 1)
              assertEvent(receipt, EVENTS.ACTION_CANCELLED, { actionId })
            })

            it('there are no more paths allowed', async () => {
              await agreement.cancel({ actionId, from })

              const { canCancel, canChallenge, canAnswerChallenge, canRuleDispute, canSubmitEvidence, canExecute } = await agreement.getAllowedPaths(actionId)
              assert.isFalse(canCancel, 'action can be cancelled')
              assert.isFalse(canChallenge, 'action can be challenged')
              assert.isFalse(canAnswerChallenge, 'action challenge can be answered')
              assert.isFalse(canRuleDispute, 'action dispute can be ruled')
              assert.isFalse(canSubmitEvidence, 'action evidence can be submitted')
              assert.isFalse(canExecute, 'action can be executed')
            })
          })

          context('when the sender is not the submitter', () => {
            const from = someone

            it('reverts', async () => {
              await assertRevert(agreement.cancel({ actionId, from }), ERRORS.ERROR_SENDER_NOT_ALLOWED)
            })
          })
        }

        context('at the beginning of the challenge period', () => {
          itCancelsTheActionProperly()
        })

        context('in the middle of the challenge period', () => {
          // TODO: implement
        })

        context('at the end of the challenge period', () => {
          // TODO: implement
        })

        context('after the challenge period', () => {
          context('when the action was not executed', () => {
            // TODO: implement
          })

          context('when the action was not executed', () => {
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
                context('when the action was not executed', () => {
                  // TODO: implement
                })

                context('when the action was not executed', () => {
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
