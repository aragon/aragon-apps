const ERRORS = require('./helpers/utils/errors')
const { RULINGS } = require('./helpers/utils/enums')
const { assertBn } = require('./helpers/lib/assertBn')
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { decodeEventsOfType } = require('./helpers/lib/decodeEvent')
const { assertEvent, assertAmountOfEvents } = require('./helpers/lib/assertEvent')

const deployer = require('./helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, someone, submitter, challenger]) => {
  let agreement, actionId

  beforeEach('deploy agreement instance', async () => {
    agreement = await deployer.deployAndInitializeWrapper()
  })

  describe('evidence', () => {
    context('when the given action exists', () => {
      beforeEach('create action', async () => {
        ({ actionId } = await agreement.schedule({ submitter }))
      })

      const itCannotSubmitEvidence = () => {
        it('reverts', async () => {
          await assertRevert(agreement.submitEvidence({ actionId, from: submitter }), ERRORS.ERROR_CANNOT_SUBMIT_EVIDENCE)
        })
      }

      const itCannotSubmitEvidenceForNonExistingDispute = () => {
        it('reverts', async () => {
          await assertRevert(agreement.submitEvidence({ actionId, from: submitter }), ERRORS.ERROR_DISPUTE_DOES_NOT_EXIST)
        })
      }

      context('when the action was not cancelled', () => {
        context('when the action was not challenged', () => {
          context('at the beginning of the challenge period', () => {
            itCannotSubmitEvidenceForNonExistingDispute()
          })

          context('in the middle of the challenge period', () => {
            beforeEach('move before challenge period end date', async () => {
              await agreement.moveBeforeEndOfChallengePeriod(actionId)
            })

            itCannotSubmitEvidenceForNonExistingDispute()
          })

          context('at the end of the challenge period', () => {
            beforeEach('move to the challenge period end date', async () => {
              await agreement.moveToEndOfChallengePeriod(actionId)
            })

            itCannotSubmitEvidenceForNonExistingDispute()
          })

          context('after the challenge period', () => {
            beforeEach('move after the challenge period end date', async () => {
              await agreement.moveAfterChallengePeriod(actionId)
            })

            context('when the action was not executed', () => {
              context('when the action was not cancelled', () => {
                itCannotSubmitEvidenceForNonExistingDispute()
              })

              context('when the action was cancelled', () => {
                beforeEach('cancel action', async () => {
                  await agreement.cancel({ actionId })
                })

                itCannotSubmitEvidenceForNonExistingDispute()
              })
            })

            context('when the action was executed', () => {
              beforeEach('execute action', async () => {
                await agreement.execute({ actionId })
              })

              itCannotSubmitEvidenceForNonExistingDispute()
            })
          })
        })

        context('when the action was challenged', () => {
          beforeEach('challenge action', async () => {
            await agreement.challenge({ actionId, challenger })
          })

          context('when the challenge was not answered', () => {
            context('at the beginning of the answer period', () => {
              itCannotSubmitEvidenceForNonExistingDispute()
            })

            context('in the middle of the answer period', () => {
              beforeEach('move before settlement period end date', async () => {
                await agreement.moveBeforeEndOfSettlementPeriod(actionId)
              })

              itCannotSubmitEvidenceForNonExistingDispute()
            })

            context('at the end of the answer period', () => {
              beforeEach('move to the settlement period end date', async () => {
                await agreement.moveToEndOfSettlementPeriod(actionId)
              })

              itCannotSubmitEvidenceForNonExistingDispute()
            })

            context('after the answer period', () => {
              beforeEach('move after the settlement period end date', async () => {
                await agreement.moveAfterSettlementPeriod(actionId)
              })

              itCannotSubmitEvidenceForNonExistingDispute()
            })
          })

          context('when the challenge was answered', () => {
            context('when the challenge was settled', () => {
              beforeEach('settle challenge', async () => {
                await agreement.settle({ actionId })
              })

              itCannotSubmitEvidenceForNonExistingDispute()
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
                    beforeEach('finish submitting evidence', async () => {
                      await agreement.finishEvidence({ actionId, from })
                    })

                    it('reverts', async () => {
                      await assertRevert(agreement.submitEvidence({ actionId, from }), ERRORS.ERROR_SUBMITTER_FINISHED_EVIDENCE)
                    })
                  })
                })

                context('when the sender is the challenger', () => {
                  const from = challenger

                  context('when the sender has not finished submitting evidence', () => {
                    itSubmitsEvidenceProperly(from)
                  })

                  context('when the sender has finished submitting evidence', () => {
                    beforeEach('finish submitting evidence', async () => {
                      await agreement.finishEvidence({ actionId, from })
                    })

                    it('reverts', async () => {
                      await assertRevert(agreement.submitEvidence({ actionId, from }), ERRORS.ERROR_SUBMITTER_FINISHED_EVIDENCE)
                    })
                  })
                })

                context('when the sender is someone else', () => {
                  const from = someone

                  it('reverts', async () => {
                    await assertRevert(agreement.submitEvidence({ actionId, from }), ERRORS.ERROR_SENDER_NOT_ALLOWED)
                  })
                })
              })

              context('when the dispute was ruled', () => {
                context('when the dispute was ruled in favor the submitter', () => {
                  beforeEach('rule action', async () => {
                    await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER })
                  })

                  context('when the action was not executed', () => {
                    context('when the action was not cancelled', () => {
                      itCannotSubmitEvidence()
                    })

                    context('when the action was cancelled', () => {
                      beforeEach('cancel action', async () => {
                        await agreement.cancel({ actionId })
                      })

                      itCannotSubmitEvidence()
                    })
                  })

                  context('when the action was executed', () => {
                    beforeEach('execute action', async () => {
                      await agreement.execute({ actionId })
                    })

                    itCannotSubmitEvidence()
                  })
                })

                context('when the dispute was ruled in favor the challenger', () => {
                  beforeEach('rule action', async () => {
                    await agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER })
                  })

                  itCannotSubmitEvidence()
                })

                context('when the dispute was refused', () => {
                  beforeEach('rule action', async () => {
                    await agreement.executeRuling({ actionId, ruling: RULINGS.REFUSED })
                  })

                  itCannotSubmitEvidence()
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

        itCannotSubmitEvidenceForNonExistingDispute()
      })
    })
  })

  context('when the given action does not exist', () => {
    it('reverts', async () => {
      await assertRevert(agreement.submitEvidence({ actionId: 0, from: submitter }), ERRORS.ERROR_ACTION_DOES_NOT_EXIST)
    })
  })
})
