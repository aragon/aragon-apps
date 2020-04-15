const { RULINGS } = require('./helpers/utils/enums')
const { assertBn } = require('./helpers/lib/assertBn')
const { decodeEventsOfType } = require('./helpers/lib/decodeEvent')
const { assertEvent, assertAmountOfEvents } = require('./helpers/lib/assertEvent')

const deployer = require('./helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, someone, submitter, challenger]) => {
  let agreement, actionId

  beforeEach('deploy agreement instance', async () => {
    agreement = await deployer.deployAndInitializeWrapper()
  })

  describe('evidence', () => {
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
              const itSubmitsEvidenceProperly = from => {
                const itRegistersEvidenceProperly = finished => {
                  const evidence = '0x123123'

                  it(`${finished ? 'updates' : 'does not update'} the dispute`, async () => {
                    await agreement.submitEvidence({ actionId, evidence, from, finished })

                    const { ruling, submitterFinishedEvidence, challengerFinishedEvidence } = await agreement.getDispute(actionId)

                    assertBn(ruling, RULINGS.MISSING, 'ruling does not match')
                    assert.equal(submitterFinishedEvidence, from === submitter ? finished : false, 'submitter finished does not match')
                    assert.equal(challengerFinishedEvidence, from === challenger ? finished : false, 'challenger finished does not match')
                  })

                  it('submits the given evidence', async () => {
                    const { disputeId } = await agreement.getChallenge(actionId)
                    const receipt = await agreement.submitEvidence({ actionId, evidence, from, finished })

                    const IArbitrable = artifacts.require('IArbitrable')
                    const logs = decodeEventsOfType(receipt, IArbitrable.abi, 'EvidenceSubmitted')

                    assertAmountOfEvents({ logs }, 'EvidenceSubmitted', 1)
                    assertEvent({ logs }, 'EvidenceSubmitted', { disputeId, submitter: from, evidence, finished })
                  })

                  it('can be ruled or submit evidence', async () => {
                    await agreement.submitEvidence({ actionId, evidence, from, finished })

                    const { canCancel, canChallenge, canAnswerChallenge, canRuleDispute, canSubmitEvidence, canExecute } = await agreement.getAllowedPaths(actionId)
                    assert.isTrue(canRuleDispute, 'action dispute cannot be ruled')
                    assert.isTrue(canSubmitEvidence, 'action evidence cannot be submitted')
                    assert.isFalse(canCancel, 'action can be cancelled')
                    assert.isFalse(canChallenge, 'action can be challenged')
                    assert.isFalse(canAnswerChallenge, 'action challenge can be answered')
                    assert.isFalse(canExecute, 'action can be executed')
                  })
                }

                context('when finished', () => {
                  itRegistersEvidenceProperly(true)
                })

                context('when not finished', () => {
                  itRegistersEvidenceProperly(false)
                })
              }

              context('when the sender is the submitter', () => {
                const from = submitter

                context('when the sender has not finished submitting evidence', () => {
                  itSubmitsEvidenceProperly(from)
                })

                context('when the sender has finished submitting evidence', () => {
                  // TODO: implement
                })
              })

              context('when the sender is the challenger', () => {
                const from = challenger

                context('when the sender has not finished submitting evidence', () => {
                  itSubmitsEvidenceProperly(from)
                })

                context('when the sender has finished submitting evidence', () => {
                  // TODO: implement
                })
              })

              context('when the sender is someone else', () => {
                const from = someone

                // TODO: implement
              })
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
