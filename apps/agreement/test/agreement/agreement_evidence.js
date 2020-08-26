const deployer = require('../helpers/utils/deployer')(web3, artifacts)
const { RULINGS } = require('../helpers/utils/enums')
const { AGREEMENT_ERRORS } = require('../helpers/utils/errors')

const { injectWeb3, injectArtifacts } = require('@aragon/contract-helpers-test')
const { assertBn, assertRevert, assertEvent, assertAmountOfEvents } = require('@aragon/contract-helpers-test/src/asserts')

injectWeb3(web3)
injectArtifacts(artifacts)

contract('Agreement', ([_, someone, submitter, challenger]) => {
  let disputable, actionId

  beforeEach('deploy agreement instance', async () => {
    disputable = await deployer.deployAndInitializeDisputableWrapper()
  })

  describe('evidence', () => {
    context('when the given action exists', () => {
      beforeEach('create action', async () => {
        ({ actionId } = await disputable.newAction({ submitter }))
      })

      const itCanSubmitEvidence = () => {
        const itCannotSubmitEvidence = () => {
          it('reverts', async () => {
            await assertRevert(disputable.submitEvidence({ actionId, from: submitter }), AGREEMENT_ERRORS.ERROR_CANNOT_SUBMIT_EVIDENCE)
          })
        }

        const itCannotSubmitEvidenceForNonExistingDispute = () => {
          it('reverts', async () => {
            await assertRevert(disputable.submitEvidence({ actionId, from: submitter }), AGREEMENT_ERRORS.ERROR_CHALLENGE_DOES_NOT_EXIST)
          })
        }

        context('when the action was not closed', () => {
          context('when the action was not challenged', () => {
            itCannotSubmitEvidenceForNonExistingDispute()
          })

          context('when the action was challenged', () => {
            let challengeId

            beforeEach('challenge action', async () => {
              ({ challengeId } = await disputable.challenge({ actionId, challenger }))
            })

            context('when the challenge was not answered', () => {
              context('at the beginning of the answer period', () => {
                itCannotSubmitEvidenceForNonExistingDispute()
              })

              context('in the middle of the answer period', () => {
                beforeEach('move before the challenge end date', async () => {
                  await disputable.moveBeforeChallengeEndDate(challengeId)
                })

                itCannotSubmitEvidenceForNonExistingDispute()
              })

              context('at the end of the answer period', () => {
                beforeEach('move to the challenge end date', async () => {
                  await disputable.moveToChallengeEndDate(challengeId)
                })

                itCannotSubmitEvidenceForNonExistingDispute()
              })

              context('after the answer period', () => {
                beforeEach('move after the challenge end date', async () => {
                  await disputable.moveAfterChallengeEndDate(challengeId)
                })

                itCannotSubmitEvidenceForNonExistingDispute()
              })
            })

            context('when the challenge was answered', () => {
              context('when the challenge was settled', () => {
                beforeEach('settle challenge', async () => {
                  await disputable.settle({ actionId })
                })

                itCannotSubmitEvidenceForNonExistingDispute()
              })

              context('when the challenge was disputed', () => {
                beforeEach('dispute action', async () => {
                  await disputable.dispute({ actionId })
                })

                context('when the dispute was not ruled', () => {
                  const itSubmitsEvidenceProperly = (from, hadFinishedSubmittingEvidence) => {
                    const itRegistersEvidenceProperly = currentlyFinished => {
                      const evidence = '0x123123'
                      const hasFinished = hadFinishedSubmittingEvidence || currentlyFinished

                      it(`${hasFinished ? 'updates' : 'does not update'} the dispute`, async () => {
                        await disputable.submitEvidence({ actionId, evidence, from, finished: currentlyFinished })

                        const { ruling, submitterFinishedEvidence, challengerFinishedEvidence } = await disputable.getChallenge(challengeId)

                        assertBn(ruling, RULINGS.MISSING, 'ruling does not match')
                        assert.equal(submitterFinishedEvidence, from === submitter ? hasFinished : false, 'submitter finished does not match')
                        assert.equal(challengerFinishedEvidence, from === challenger ? hasFinished : false, 'challenger finished does not match')
                      })

                      it('submits the given evidence', async () => {
                        const { disputeId } = await disputable.getChallenge(challengeId)
                        const receipt = await disputable.submitEvidence({ actionId, evidence, from, finished: currentlyFinished })

                        assertAmountOfEvents(receipt, 'EvidenceSubmitted')
                        assertEvent(receipt, 'EvidenceSubmitted', { expectedArgs: { disputeId, submitter: from, evidence, finished: hasFinished } })
                      })

                      it('can be ruled', async () => {
                        await disputable.submitEvidence({ actionId, evidence, from, finished: currentlyFinished })

                        const { canClose, canChallenge, canSettle, canDispute, canClaimSettlement, canRuleDispute } = await disputable.getAllowedPaths(actionId)
                        assert.isTrue(canRuleDispute, 'action dispute cannot be ruled')

                        assert.isFalse(canClose, 'action can be closed')
                        assert.isFalse(canChallenge, 'action can be challenged')
                        assert.isFalse(canSettle, 'action can be settled')
                        assert.isFalse(canDispute, 'action can be disputed')
                        assert.isFalse(canClaimSettlement, 'action settlement can be claimed')
                      })

                      it('cannot close the evidence submission period manually', async () => {
                        await assertRevert(disputable.closeEvidencePeriod(actionId), AGREEMENT_ERRORS.ERROR_CANNOT_CLOSE_EVIDENCE_PERIOD)
                      })

                      context('when the other party has not closed the evidence submission period yet', () => {
                        it('does not close the evidence submission period', async () => {
                          const receipt = await disputable.submitEvidence({ actionId, evidence, from, finished: currentlyFinished })

                          assertAmountOfEvents(receipt, 'EvidencePeriodClosed', { decodeForAbi: disputable.arbitrator.abi, expectedAmount: 0 })
                        })
                      })

                      context('when the other party has closed the evidence submission period', () => {
                        beforeEach('close evidence submission period for other party', async () => {
                          const sender = from === submitter ? challenger : submitter
                          await disputable.submitEvidence({ actionId, evidence: '0x1234', from: sender, finished: true })
                        })

                        it('does not close the evidence submission period', async () => {
                          const receipt = await disputable.submitEvidence({ actionId, evidence, from, finished: currentlyFinished })
                          assertAmountOfEvents(receipt, 'EvidencePeriodClosed', { decodeForAbi: disputable.arbitrator.abi, expectedAmount: 0 })
                        })

                        if (hasFinished) {
                          it('can close the evidence submission period manually', async () => {
                            await disputable.submitEvidence({ actionId, evidence, from, finished: currentlyFinished })

                            const receipt = await disputable.closeEvidencePeriod(actionId)
                            assertAmountOfEvents(receipt, 'EvidencePeriodClosed', { decodeForAbi: disputable.arbitrator.abi })
                          })
                        } else {
                          it('cannot close the evidence submission period manually', async () => {
                            await disputable.submitEvidence({ actionId, evidence, from, finished: currentlyFinished })

                            await assertRevert(disputable.closeEvidencePeriod(actionId), AGREEMENT_ERRORS.ERROR_CANNOT_CLOSE_EVIDENCE_PERIOD)
                          })
                        }
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

                    context('when the sender had not finished submitting evidence', () => {
                      const hadFinishedSubmittingEvidence = false

                      itSubmitsEvidenceProperly(from, hadFinishedSubmittingEvidence)
                    })

                    context('when the sender had finished submitting evidence', () => {
                      const hadFinishedSubmittingEvidence = true

                      beforeEach('finish submitting evidence', async () => {
                        await disputable.finishEvidence({ actionId, from })
                      })

                      itSubmitsEvidenceProperly(from, hadFinishedSubmittingEvidence)
                    })
                  })

                  context('when the sender is the challenger', () => {
                    const from = challenger

                    context('when the sender had not finished submitting evidence', () => {
                      const hadFinishedSubmittingEvidence = false

                      itSubmitsEvidenceProperly(from, hadFinishedSubmittingEvidence)
                    })

                    context('when the sender had finished submitting evidence', () => {
                      const hadFinishedSubmittingEvidence = true

                      beforeEach('finish submitting evidence', async () => {
                        await disputable.finishEvidence({ actionId, from })
                      })

                      itSubmitsEvidenceProperly(from, hadFinishedSubmittingEvidence)
                    })
                  })

                  context('when the sender is someone else', () => {
                    const from = someone

                    it('reverts', async () => {
                      await assertRevert(disputable.submitEvidence({ actionId, from }), AGREEMENT_ERRORS.ERROR_SENDER_NOT_ALLOWED)
                    })
                  })
                })

                context('when the dispute was ruled', () => {
                  context('when the dispute was refused', () => {
                    beforeEach('rule action', async () => {
                      await disputable.executeRuling({ actionId, ruling: RULINGS.REFUSED })
                    })

                    context('when the action was not closed', () => {
                      itCannotSubmitEvidence()
                    })

                    context('when the action was closed', () => {
                      beforeEach('close action', async () => {
                        await disputable.close(actionId)
                      })

                      itCannotSubmitEvidence()
                    })
                  })

                  context('when the dispute was ruled in favor the submitter', () => {
                    beforeEach('rule action', async () => {
                      await disputable.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER })
                    })

                    context('when the action was not closed', () => {
                      itCannotSubmitEvidence()
                    })

                    context('when the action was closed', () => {
                      beforeEach('close action', async () => {
                        await disputable.close(actionId)
                      })

                      itCannotSubmitEvidence()
                    })
                  })

                  context('when the dispute was ruled in favor the challenger', () => {
                    beforeEach('rule action', async () => {
                      await disputable.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER })
                    })

                    itCannotSubmitEvidence()
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

          itCannotSubmitEvidenceForNonExistingDispute()
        })
      }

      context('when the app was activated', () => {
        itCanSubmitEvidence()
      })

      context('when the app was deactivated', () => {
        beforeEach('mark app as unregistered', async () => {
          await disputable.deactivate()
        })

        itCanSubmitEvidence()
      })
    })

    context('when the given action does not exist', () => {
      it('reverts', async () => {
        await assertRevert(disputable.submitEvidence({ actionId: 0, from: submitter }), AGREEMENT_ERRORS.ERROR_ACTION_DOES_NOT_EXIST)
      })
    })
  })
})
