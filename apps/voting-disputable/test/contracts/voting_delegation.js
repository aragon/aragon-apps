const deployer = require('../helpers/deployer')(web3, artifacts)
const { VOTING_ERRORS } = require('../helpers/errors')
const { VOTER_STATE, createVote, getVoteState } = require('../helpers/voting')

const { ONE_DAY, pct16, bigExp, bn } = require('@aragon/contract-helpers-test')
const { assertBn, assertRevert, assertEvent, assertAmountOfEvents } = require('@aragon/contract-helpers-test/src/asserts')

contract('Voting delegation', ([_, owner, voter, anotherVoter, thirdVoter, representative, anotherRepresentative, anyone]) => {
  let voting, token, voteId

  const MIN_QUORUM = pct16(20)
  const MIN_SUPPORT = pct16(30)
  const DELEGATED_VOTING_PERIOD = ONE_DAY * 4
  const QUIET_ENDING_PERIOD = ONE_DAY * 4
  const QUIET_ENDING_EXTENSION = ONE_DAY * 5
  const VOTE_DURATION = ONE_DAY * 5
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

  before('mint tokens', async () => {
    token = await deployer.deployToken({})
    await token.generateTokens(voter, bigExp(51, 18))
    await token.generateTokens(anotherVoter, bigExp(49, 18))
    await token.generateTokens(thirdVoter, bigExp(1, 18))
  })

  beforeEach('deploy voting', async () => {
    voting = await deployer.deployAndInitialize({ owner, minimumAcceptanceQuorum: MIN_QUORUM, requiredSupport: MIN_SUPPORT, voteDuration: VOTE_DURATION, delegatedVotingPeriod: DELEGATED_VOTING_PERIOD, quietEndingPeriod: QUIET_ENDING_PERIOD, quietEndingExtension: QUIET_ENDING_EXTENSION })
  })

  const getCastVote = async (voter, id = voteId) => voting.getCastVote(id, voter)

  describe('setRepresentative', () => {
    it('is not allowed by default', async () => {
      assert.isFalse(await voting.isRepresentativeOf(voter, representative))
    })

    context('when the representative was not set yet', () => {
      it('sets the given representative', async () => {
        const receipt = await voting.setRepresentative(representative, { from: voter })

        assertAmountOfEvents(receipt, 'ChangeRepresentative')
        assertEvent(receipt, 'ChangeRepresentative', { expectedArgs: { voter, representative: representative } })

        assert.isTrue(await voting.isRepresentativeOf(voter, representative))
      })
    })

    context('when the representative was already set', () => {
      beforeEach('add representative', async () => {
        await voting.setRepresentative(representative, { from: voter })
      })

      it('updates the given representative', async () => {
        const receipt = await voting.setRepresentative(ZERO_ADDRESS, { from: voter })

        assertAmountOfEvents(receipt, 'ChangeRepresentative')
        assertEvent(receipt, 'ChangeRepresentative', { expectedArgs: { voter, representative: ZERO_ADDRESS } })

        assert.isFalse(await voting.isRepresentativeOf(voter, representative))
      })
    })
  })

  describe('canVoteOnBehalfOf', () => {
    context('when the vote exists', () => {
      beforeEach('create a vote', async () => {
        ({ voteId } = await createVote({ voting, from: voter }))
      })

      const itReturnsTrue = (voter, representative) => {
        it('returns true', async () => {
          assert.isTrue(await voting.canVoteOnBehalfOf(voteId, [voter], representative), 'should be able to vote')
        })
      }

      const itReturnsFalse = (voter, representative) => {
        it('returns false', async () => {
          assert.isFalse(await voting.canVoteOnBehalfOf(voteId, [voter], representative), 'should not be able to vote')
        })
      }

      context('when the sender is a representative', () => {
        beforeEach('add representative', async () => {
          await voting.setRepresentative(representative, { from: voter })
        })

        context('when the voter can vote', () => {
          context('when at the beginning of the delegated voting period', () => {
            context('when the voter has not voted yet', () => {
              context('when the representative did not proxy a vote', () => {
                context('when the number of requested voters is valid', () => {
                  itReturnsTrue(voter, representative)
                })

                context('when the number of requested voters is not valid', () => {
                  const voters = new Array(71).fill(voter)

                  it('reverts', async () => {
                    await assertRevert(voting.canVoteOnBehalfOf(voteId, voters, representative), VOTING_ERRORS.VOTING_DELEGATES_EXCEEDS_MAX_LEN)
                  })
                })
              })

              context('when the representative already proxied a vote', () => {
                beforeEach('proxy representative\'s vote', async () => {
                  await voting.voteOnBehalfOf(voteId, true, [voter], { from: representative })
                })

                context('when the representative is still allowed', () => {
                  itReturnsFalse(voter, representative)
                })

                context('when the representative was disallowed', () => {
                  beforeEach('change representative', async () => {
                    await voting.setRepresentative(anotherRepresentative, { from: voter })
                  })

                  itReturnsFalse(voter, representative)
                })
              })
            })

            context('when the voter has already voted', () => {
              beforeEach('voter votes', async () => {
                await voting.vote(voteId, true, { from: voter })
              })

              itReturnsFalse(voter, representative)
            })
          })

          context('when in the middle of the delegated voting period', () => {
            beforeEach('move to the middle of the delegated voting period', async () => {
              await voting.mockIncreaseTime(DELEGATED_VOTING_PERIOD / 2)
            })

            context('when the voter has not voted yet', () => {
              context('when the representative did not proxy a vote', () => {
                context('when the number of requested voters is valid', () => {
                  itReturnsTrue(voter, representative)
                })

                context('when the number of requested voters is not valid', () => {
                  const voters = new Array(71).fill(voter)

                  it('reverts', async () => {
                    await assertRevert(voting.canVoteOnBehalfOf(voteId, voters, representative), VOTING_ERRORS.VOTING_DELEGATES_EXCEEDS_MAX_LEN)
                  })
                })
              })

              context('when the representative already proxied a vote', () => {
                beforeEach('proxy representative\'s vote', async () => {
                  await voting.voteOnBehalfOf(voteId, true, [voter], { from: representative })
                })

                context('when the representative is still allowed', () => {
                  itReturnsFalse(voter, representative)
                })

                context('when the representative was disallowed', () => {
                  beforeEach('change representative', async () => {
                    await voting.setRepresentative(anotherRepresentative, { from: voter })
                  })

                  itReturnsFalse(voter, representative)
                })
              })
            })

            context('when the voter has already voted', () => {
              beforeEach('voter votes', async () => {
                await voting.vote(voteId, true, { from: voter })
              })

              itReturnsFalse(voter, representative)
            })
          })

          context('when before the end of the delegated voting period', () => {
            beforeEach('move before the end of the delegated voting period', async () => {
              await voting.mockIncreaseTime(DELEGATED_VOTING_PERIOD - 1)
            })

            context('when the voter has not voted yet', () => {
              context('when the representative did not proxy a vote', () => {
                context('when the number of requested voters is valid', () => {
                  itReturnsTrue(voter, representative)
                })

                context('when the number of requested voters is not valid', () => {
                  const voters = new Array(71).fill(voter)

                  it('reverts', async () => {
                    await assertRevert(voting.canVoteOnBehalfOf(voteId, voters, representative), VOTING_ERRORS.VOTING_DELEGATES_EXCEEDS_MAX_LEN)
                  })
                })
              })

              context('when the representative already proxied a vote', () => {
                beforeEach('proxy representative\'s vote', async () => {
                  await voting.voteOnBehalfOf(voteId, true, [voter], { from: representative })
                })

                context('when the representative is still allowed', () => {
                  itReturnsFalse(voter, representative)
                })

                context('when the representative was disallowed', () => {
                  beforeEach('change representative', async () => {
                    await voting.setRepresentative(anotherRepresentative, { from: voter })
                  })

                  itReturnsFalse(voter, representative)
                })
              })
            })

            context('when the voter has already voted', () => {
              beforeEach('voter votes', async () => {
                await voting.vote(voteId, true, { from: voter })
              })

              itReturnsFalse(voter, representative)
            })
          })

          context('when at the end of the delegated voting period', () => {
            beforeEach('move at the end of the delegated voting period', async () => {
              await voting.mockIncreaseTime(DELEGATED_VOTING_PERIOD)
            })

            itReturnsFalse(voter, representative)
          })

          context('when after the end of the delegated voting period', () => {
            beforeEach('move at the end of the delegated voting period', async () => {
              await voting.mockIncreaseTime(DELEGATED_VOTING_PERIOD + 1)
            })

            itReturnsFalse(voter, representative)
          })
        })

        context('when the voter can not vote', () => {
          const invalidVoter = anyone

          beforeEach('add representative', async () => {
            await voting.setRepresentative(representative, { from: invalidVoter })
          })

          itReturnsFalse(invalidVoter, representative)
        })
      })

      context('when the sender is the voter', () => {
        itReturnsFalse(voter, voter)
      })

      context('when the sender is not a representative', () => {
        itReturnsFalse(voter, anyone)
      })
    })

    context('when the vote does not exist', () => {
      beforeEach('add representative', async () => {
        await voting.setRepresentative(representative, { from: voter })
      })

      it('reverts', async () => {
        await assertRevert(voting.canVoteOnBehalfOf(voteId, [voter], representative, { from: representative }), VOTING_ERRORS.VOTING_NO_VOTE)
      })
    })
  })

  describe('voteOnBehalfOf', () => {
    context('when the vote exists', () => {
      beforeEach('create a vote', async () => {
        ({ voteId } = await createVote({ voting, from: voter }))
      })

      context('when the sender is a representative', () => {
        const from = representative

        beforeEach('add representative', async () => {
          await voting.setRepresentative(representative, { from: voter })
        })

        context('when the voter can vote', () => {
          const itReverts = () => {
            it('reverts', async () => {
              await assertRevert(voting.voteOnBehalfOf(voteId, true, [voter], { from }), VOTING_ERRORS.VOTING_PAST_REP_VOTING_WINDOW)
            })
          }

          context('when at the beginning of the delegated voting period', () => {
            context('when the voter has not voted yet', () => {
              it('casts the proxied vote', async () => {
                const receipt = await voting.voteOnBehalfOf(voteId, false, [voter], { from: representative })

                const { yeas, nays } = await getVoteState(voting, voteId)
                assertBn(yeas, 0, 'yeas should be 0')
                assertBn(nays, bigExp(51, 18).toString(), 'nays should be 51')

                const voterState = await getCastVote(voter)
                assertBn(voterState.state, VOTER_STATE.NAY, 'voter should have voted')
                assert.equal(voterState.caster, representative, 'vote caster does not match')

                const representativeState = await getCastVote(representative)
                assertBn(representativeState.state, VOTER_STATE.ABSENT, 'representative should not have voted')
                assertBn(representativeState.caster, ZERO_ADDRESS, 'representative should not have voted')

                assertAmountOfEvents(receipt, 'CastVote')
                assertEvent(receipt, 'CastVote', { expectedArgs: { voteId, voter, caster: representative, supports: false } })
              })

              it('emits an event', async () => {
                const receipt = await voting.voteOnBehalfOf(voteId, false, [voter], { from: representative })

                assertAmountOfEvents(receipt, 'CastVote')
                assertEvent(receipt, 'CastVote', { expectedArgs: { voter, caster: representative, voteId, supports: false } })
              })

              it('cannot be changed by the representative', async () => {
                await voting.voteOnBehalfOf(voteId, false, [voter], { from: representative })

                const receipt = await voting.voteOnBehalfOf(voteId, true, [voter], { from: representative })

                const { yeas, nays } = await getVoteState(voting, voteId)
                assertBn(nays, bigExp(51, 18), 'nays should be 51')
                assertBn(yeas, 0, 'yeas should be 0')

                const voterState = await getCastVote(voter)
                assertBn(voterState.state, VOTER_STATE.NAY, 'voter should have voted')
                assert.equal(voterState.caster, representative, 'vote caster does not match')

                const representativeState = await getCastVote(representative)
                assertBn(representativeState.state, VOTER_STATE.ABSENT, 'representative should not have voted')
                assertBn(representativeState.caster, ZERO_ADDRESS, 'representative should not have voted')

                assertAmountOfEvents(receipt, 'CastVote', { expectedAmount: 0 })
                assertAmountOfEvents(receipt, 'ProxyVoteFailure')
                assertEvent(receipt, 'ProxyVoteFailure', { expectedArgs: { voter, representative, voteId } })
              })

              it('can not be changed by another representative', async () => {
                await voting.voteOnBehalfOf(voteId, false, [voter], { from: representative })

                await voting.setRepresentative(anotherRepresentative, { from: voter })
                const receipt = await voting.voteOnBehalfOf(voteId, true, [voter], { from: anotherRepresentative })

                const { yeas, nays } = await getVoteState(voting, voteId)
                assertBn(nays, bigExp(51, 18), 'nays should be 51')
                assertBn(yeas, 0, 'yeas should be 0')

                const voterState = await getCastVote(voter)
                assertBn(voterState.state, VOTER_STATE.NAY, 'voter should have voted')
                assert.equal(voterState.caster, representative, 'vote caster does not match')

                const representativeState = await getCastVote(representative)
                assertBn(representativeState.state, VOTER_STATE.ABSENT, 'representative should not have voted')
                assertBn(representativeState.caster, ZERO_ADDRESS, 'representative should not have voted')

                assertAmountOfEvents(receipt, 'CastVote', { expectedAmount: 0 })
                assertAmountOfEvents(receipt, 'ProxyVoteFailure')
                assertEvent(receipt, 'ProxyVoteFailure', { expectedArgs: { voter, representative: anotherRepresentative, voteId } })
              })

              context('overruling', () => {
                beforeEach('proxy representative\'s vote', async () => {
                  await voting.voteOnBehalfOf(voteId, false, [voter], { from: representative })
                })

                it('can be overruled by the voter', async () => {
                  const receipt = await voting.vote(voteId, true, { from: voter })

                  const { yeas, nays } = await getVoteState(voting, voteId)
                  assertBn(nays, 0, 'nays should be 0')
                  assertBn(yeas, bigExp(51, 18), 'yeas should be 51')

                  const voterState = await getCastVote(voter)
                  assertBn(voterState.state, VOTER_STATE.YEA, 'voter should have voted')
                  assert.equal(voterState.caster, voter, 'vote caster does not match')

                  const representativeState = await getCastVote(representative)
                  assertBn(representativeState.state, VOTER_STATE.ABSENT, 'representative should not have voted')
                  assertBn(representativeState.caster, ZERO_ADDRESS, 'representative should not have voted')

                  assertAmountOfEvents(receipt, 'CastVote')
                  assertEvent(receipt, 'CastVote', { expectedArgs: { voteId, voter, caster: voter, supports: true } })
                })
              })

              context('quiet ending', () => {
                const itDoesNotExtendTheVoteDuration = support => {
                  it('does not extend the vote duration', async () => {
                    const receipt = await voting.voteOnBehalfOf(voteId, support, [voter], { from })
                    assertAmountOfEvents(receipt, 'QuietEndingExtendVote', { expectedAmount: 0 })
                  })
                }

                context('when no one voted before', () => {
                  context('when cast before the quiet ending period', () => {
                    itDoesNotExtendTheVoteDuration()
                  })

                  context('when cast during the quiet ending period', () => {
                    beforeEach('move to the middle of the quiet ending period', async () => {
                      const { startDate } = await getVoteState(voting, voteId)
                      await voting.mockSetTimestamp(startDate.add(bn(VOTE_DURATION - QUIET_ENDING_PERIOD / 2)))
                    })

                    itDoesNotExtendTheVoteDuration()
                  })
                })

                context('when someone voted before', () => {
                  const previousSupport = false

                  beforeEach('cast vote', async () => {
                    await voting.vote(voteId, previousSupport, { from: anotherVoter })
                  })

                  const itHandlesVoteDurationProperly = shouldExtendVote => {
                    context('when the outcome is not flipped', () => {
                      itDoesNotExtendTheVoteDuration(previousSupport)
                    })

                    context('when the outcome is flipped', () => {
                      const support = !previousSupport

                      if (shouldExtendVote) {
                        it('extends the vote duration', async () => {
                          // vote and move after the vote's end date
                          await voting.voteOnBehalfOf(voteId, support, [voter], { from })
                          await voting.mockIncreaseTime(QUIET_ENDING_PERIOD / 2)

                          assert.isTrue(await voting.canVote(voteId, thirdVoter), 'voter cannot vote')

                          const receipt = await voting.vote(voteId, true, { from: thirdVoter })
                          assertAmountOfEvents(receipt, 'QuietEndingExtendVote')
                          assertEvent(receipt, 'QuietEndingExtendVote', { expectedArgs: { voteId, passing: support } })
                        })

                        it('stores the vote extension in the following vote', async () => {
                          // vote and move after the vote's end date
                          await voting.voteOnBehalfOf(voteId, support, [voter], { from })
                          await voting.mockIncreaseTime(QUIET_ENDING_PERIOD / 2)

                          const { quietEndingExtensionDuration: previousExtendedSeconds } = await getVoteState(voting, voteId)

                          await voting.vote(voteId, true, { from: thirdVoter })

                          const { quietEndingExtensionDuration: currentExtendedSeconds } = await getVoteState(voting, voteId)
                          assertBn(currentExtendedSeconds, previousExtendedSeconds.add(bn(QUIET_ENDING_EXTENSION)), 'vote extended seconds do not match')
                        })
                      } else {
                        itDoesNotExtendTheVoteDuration(support)
                      }
                    })
                  }

                  context('when the vote is cast before the quiet ending period', () => {
                    const shouldExtendVote = false

                    itHandlesVoteDurationProperly(shouldExtendVote)
                  })

                  context('when the vote is cast during the quiet ending period', () => {
                    const shouldExtendVote = true

                    beforeEach('move to the middle of the quiet ending period', async () => {
                      const { startDate } = await getVoteState(voting, voteId)
                      await voting.mockSetTimestamp(startDate.add(bn(VOTE_DURATION - QUIET_ENDING_PERIOD / 2)))
                    })

                    itHandlesVoteDurationProperly(shouldExtendVote)
                  })
                })
              })
            })

            context('when the voter has already voted', () => {
              beforeEach('voter votes', async () => {
                await voting.vote(voteId, true, { from: voter })
              })

              it('does not cast a vote', async () => {
                await voting.voteOnBehalfOf(voteId, true, [voter], { from })

                const { yeas, nays } = await getVoteState(voting, voteId)
                assertBn(nays, 0, 'nays should be 0')
                assertBn(yeas, bigExp(51, 18), 'yeas should be 51%')

                const voterState = await getCastVote(voter)
                assertBn(voterState.state, VOTER_STATE.YEA, 'voter should have voted')
                assert.equal(voterState.caster, voter, 'vote caster does not match')
              })

              it('emits a proxy failed event', async () => {
                const receipt = await voting.voteOnBehalfOf(voteId, true, [voter], { from })

                assertAmountOfEvents(receipt, 'ProxyVoteFailure')
                assertEvent(receipt, 'ProxyVoteFailure', { expectedArgs: { voter, representative, voteId } })
              })
            })
          })

          context('when in the middle of the delegated voting period', () => {
            beforeEach('move to the middle of the delegated voting period', async () => {
              await voting.mockIncreaseTime(DELEGATED_VOTING_PERIOD / 2)
            })

            context('when the voter has not voted yet', () => {
              it('casts the proxied vote', async () => {
                const receipt = await voting.voteOnBehalfOf(voteId, false, [voter], { from: representative })

                const { yeas, nays } = await getVoteState(voting, voteId)
                assertBn(yeas, 0, 'yeas should be 0')
                assertBn(nays, bigExp(51, 18).toString(), 'nays should be 51')

                const voterState = await getCastVote(voter)
                assertBn(voterState.state, VOTER_STATE.NAY, 'voter should have voted')
                assert.equal(voterState.caster, representative, 'vote caster does not match')

                const representativeState = await getCastVote(representative)
                assertBn(representativeState.state, VOTER_STATE.ABSENT, 'representative should not have voted')
                assertBn(representativeState.caster, ZERO_ADDRESS, 'representative should not have voted')

                assertAmountOfEvents(receipt, 'CastVote')
                assertEvent(receipt, 'CastVote', { expectedArgs: { voteId, voter, caster: representative, supports: false } })
              })

              it('emits an event', async () => {
                const receipt = await voting.voteOnBehalfOf(voteId, false, [voter], { from: representative })

                assertAmountOfEvents(receipt, 'CastVote')
                assertEvent(receipt, 'CastVote', { expectedArgs: { voter, caster: representative, voteId, supports: false } })
              })

              it('cannot be changed by the representative', async () => {
                await voting.voteOnBehalfOf(voteId, false, [voter], { from: representative })

                const receipt = await voting.voteOnBehalfOf(voteId, true, [voter], { from: representative })

                const { yeas, nays } = await getVoteState(voting, voteId)
                assertBn(nays, bigExp(51, 18), 'nays should be 51')
                assertBn(yeas, 0, 'yeas should be 0')

                const voterState = await getCastVote(voter)
                assertBn(voterState.state, VOTER_STATE.NAY, 'voter should have voted')
                assert.equal(voterState.caster, representative, 'vote caster does not match')

                const representativeState = await getCastVote(representative)
                assertBn(representativeState.state, VOTER_STATE.ABSENT, 'representative should not have voted')
                assertBn(representativeState.caster, ZERO_ADDRESS, 'representative should not have voted')

                assertAmountOfEvents(receipt, 'CastVote', { expectedAmount: 0 })
                assertAmountOfEvents(receipt, 'ProxyVoteFailure')
                assertEvent(receipt, 'ProxyVoteFailure', { expectedArgs: { voter, representative, voteId } })
              })

              it('can not be changed by another representative', async () => {
                await voting.voteOnBehalfOf(voteId, false, [voter], { from: representative })

                await voting.setRepresentative(anotherRepresentative, { from: voter })
                const receipt = await voting.voteOnBehalfOf(voteId, true, [voter], { from: anotherRepresentative })

                const { yeas, nays } = await getVoteState(voting, voteId)
                assertBn(nays, bigExp(51, 18), 'nays should be 51')
                assertBn(yeas, 0, 'yeas should be 0')

                const voterState = await getCastVote(voter)
                assertBn(voterState.state, VOTER_STATE.NAY, 'voter should have voted')
                assert.equal(voterState.caster, representative, 'vote caster does not match')

                const representativeState = await getCastVote(representative)
                assertBn(representativeState.state, VOTER_STATE.ABSENT, 'representative should not have voted')
                assertBn(representativeState.caster, ZERO_ADDRESS, 'representative should not have voted')

                assertAmountOfEvents(receipt, 'CastVote', { expectedAmount: 0 })
                assertAmountOfEvents(receipt, 'ProxyVoteFailure')
                assertEvent(receipt, 'ProxyVoteFailure', { expectedArgs: { voter, representative: anotherRepresentative, voteId } })
              })

              context('overruling', () => {
                beforeEach('proxy representative\'s vote', async () => {
                  await voting.voteOnBehalfOf(voteId, false, [voter], { from: representative })
                })

                it('can be overruled by the voter', async () => {
                    const receipt = await voting.vote(voteId, true, { from: voter })

                    const { yeas, nays } = await getVoteState(voting, voteId)
                    assertBn(nays, 0, 'nays should be 0')
                    assertBn(yeas, bigExp(51, 18), 'yeas should be 51')

                    const voterState = await getCastVote(voter)
                    assertBn(voterState.state, VOTER_STATE.YEA, 'voter should have voted')
                    assert.equal(voterState.caster, voter, 'vote caster does not match')

                    const representativeState = await getCastVote(representative)
                    assertBn(representativeState.state, VOTER_STATE.ABSENT, 'representative should not have voted')
                    assertBn(representativeState.caster, ZERO_ADDRESS, 'representative should not have voted')

                    assertAmountOfEvents(receipt, 'CastVote')
                    assertEvent(receipt, 'CastVote', { expectedArgs: { voteId, voter, caster: voter, supports: true } })
                  })
              })

              context('quiet ending', () => {
                const itDoesNotExtendTheVoteDuration = support => {
                  it('does not extend the vote duration', async () => {
                    const receipt = await voting.voteOnBehalfOf(voteId, support, [voter], { from })
                    assertAmountOfEvents(receipt, 'QuietEndingExtendVote', { expectedAmount: 0 })
                  })
                }

                context('when no one voted before', () => {
                  context('when cast before the quiet ending period', () => {
                    itDoesNotExtendTheVoteDuration()
                  })

                  context('when cast during the quiet ending period', () => {
                    beforeEach('move to the middle of the quiet ending period', async () => {
                      const { startDate } = await getVoteState(voting, voteId)
                      await voting.mockSetTimestamp(startDate.add(bn(VOTE_DURATION - QUIET_ENDING_PERIOD / 2)))
                    })

                    itDoesNotExtendTheVoteDuration()
                  })
                })

                context('when someone voted before', () => {
                  const previousSupport = false

                  beforeEach('cast vote', async () => {
                    await voting.vote(voteId, previousSupport, { from: anotherVoter })
                  })

                  const itHandlesVoteDurationProperly = shouldExtendVote => {
                    context('when the outcome is not flipped', () => {
                      itDoesNotExtendTheVoteDuration(previousSupport)
                    })

                    context('when the outcome is flipped', () => {
                      const support = !previousSupport

                      if (shouldExtendVote) {
                        it('extends the vote duration', async () => {
                          // vote and move after the vote's end date
                          await voting.voteOnBehalfOf(voteId, support, [voter], { from })
                          await voting.mockIncreaseTime(QUIET_ENDING_PERIOD / 2)

                          assert.isTrue(await voting.canVote(voteId, thirdVoter), 'voter cannot vote')

                          const receipt = await voting.vote(voteId, true, { from: thirdVoter })
                          assertAmountOfEvents(receipt, 'QuietEndingExtendVote')
                          assertEvent(receipt, 'QuietEndingExtendVote', { expectedArgs: { voteId, passing: support } })
                        })

                        it('stores the vote extension in the following vote', async () => {
                          // vote and move after the vote's end date
                          await voting.voteOnBehalfOf(voteId, support, [voter], { from })
                          await voting.mockIncreaseTime(QUIET_ENDING_PERIOD / 2)

                          const { quietEndingExtensionDuration: previousExtendedSeconds } = await getVoteState(voting, voteId)

                          await voting.vote(voteId, true, { from: thirdVoter })

                          const { quietEndingExtensionDuration: currentExtendedSeconds } = await getVoteState(voting, voteId)
                          assertBn(currentExtendedSeconds, previousExtendedSeconds.add(bn(QUIET_ENDING_EXTENSION)), 'vote extended seconds do not match')
                        })
                      } else {
                        itDoesNotExtendTheVoteDuration(support)
                      }
                    })
                  }

                  context('when the vote is cast before the quiet ending period', () => {
                    const shouldExtendVote = false

                    itHandlesVoteDurationProperly(shouldExtendVote)
                  })

                  context('when the vote is cast during the quiet ending period', () => {
                    const shouldExtendVote = true

                    beforeEach('move to the middle of the quiet ending period', async () => {
                      const { startDate } = await getVoteState(voting, voteId)
                      await voting.mockSetTimestamp(startDate.add(bn(VOTE_DURATION - QUIET_ENDING_PERIOD / 2)))
                    })

                    itHandlesVoteDurationProperly(shouldExtendVote)
                  })
                })
              })
            })

            context('when the voter has already voted', () => {
              beforeEach('voter votes', async () => {
                await voting.vote(voteId, true, { from: voter })
              })

              it('does not cast a vote', async () => {
                await voting.voteOnBehalfOf(voteId, true, [voter], { from })

                const { yeas, nays } = await getVoteState(voting, voteId)
                assertBn(nays, 0, 'nays should be 0')
                assertBn(yeas, bigExp(51, 18), 'yeas should be 51%')

                const voterState = await getCastVote(voter)
                assertBn(voterState.state, VOTER_STATE.YEA, 'voter should have voted')
                assert.equal(voterState.caster, voter, 'vote caster does not match')
              })

              it('emits a proxy failed event', async () => {
                const receipt = await voting.voteOnBehalfOf(voteId, true, [voter], { from })

                assertAmountOfEvents(receipt, 'ProxyVoteFailure')
                assertEvent(receipt, 'ProxyVoteFailure', { expectedArgs: { voter, representative, voteId } })
              })
            })
          })

          context('when before the end of the delegated voting period', () => {
            beforeEach('move before the end of the delegated voting period', async () => {
              await voting.mockIncreaseTime(DELEGATED_VOTING_PERIOD - 1)
            })

            context('when the voter has not voted yet', () => {
              it('casts the proxied vote', async () => {
                const receipt = await voting.voteOnBehalfOf(voteId, false, [voter], { from: representative })

                const { yeas, nays } = await getVoteState(voting, voteId)
                assertBn(yeas, 0, 'yeas should be 0')
                assertBn(nays, bigExp(51, 18).toString(), 'nays should be 51')

                const voterState = await getCastVote(voter)
                assertBn(voterState.state, VOTER_STATE.NAY, 'voter should have voted')
                assert.equal(voterState.caster, representative, 'vote caster does not match')

                const representativeState = await getCastVote(representative)
                assertBn(representativeState.state, VOTER_STATE.ABSENT, 'representative should not have voted')
                assertBn(representativeState.caster, ZERO_ADDRESS, 'representative should not have voted')

                assertAmountOfEvents(receipt, 'CastVote')
                assertEvent(receipt, 'CastVote', { expectedArgs: { voteId, voter, caster: representative, supports: false } })
              })

              it('emits an event', async () => {
                const receipt = await voting.voteOnBehalfOf(voteId, false, [voter], { from: representative })

                assertAmountOfEvents(receipt, 'CastVote')
                assertEvent(receipt, 'CastVote', { expectedArgs: { voter, caster: representative, voteId, supports: false } })
              })

              it('cannot be changed by the representative', async () => {
                await voting.voteOnBehalfOf(voteId, false, [voter], { from: representative })

                const receipt = await voting.voteOnBehalfOf(voteId, true, [voter], { from: representative })

                const { yeas, nays } = await getVoteState(voting, voteId)
                assertBn(nays, bigExp(51, 18), 'nays should be 51')
                assertBn(yeas, 0, 'yeas should be 0')

                const voterState = await getCastVote(voter)
                assertBn(voterState.state, VOTER_STATE.NAY, 'voter should have voted')
                assert.equal(voterState.caster, representative, 'vote caster does not match')

                const representativeState = await getCastVote(representative)
                assertBn(representativeState.state, VOTER_STATE.ABSENT, 'representative should not have voted')
                assertBn(representativeState.caster, ZERO_ADDRESS, 'representative should not have voted')

                assertAmountOfEvents(receipt, 'CastVote', { expectedAmount: 0 })
                assertAmountOfEvents(receipt, 'ProxyVoteFailure')
                assertEvent(receipt, 'ProxyVoteFailure', { expectedArgs: { voter, representative, voteId } })
              })

              it('can not be changed by another representative', async () => {
                await voting.voteOnBehalfOf(voteId, false, [voter], { from: representative })

                await voting.setRepresentative(anotherRepresentative, { from: voter })
                const receipt = await voting.voteOnBehalfOf(voteId, true, [voter], { from: anotherRepresentative })

                const { yeas, nays } = await getVoteState(voting, voteId)
                assertBn(nays, bigExp(51, 18), 'nays should be 51')
                assertBn(yeas, 0, 'yeas should be 0')

                const voterState = await getCastVote(voter)
                assertBn(voterState.state, VOTER_STATE.NAY, 'voter should have voted')
                assert.equal(voterState.caster, representative, 'vote caster does not match')

                const representativeState = await getCastVote(representative)
                assertBn(representativeState.state, VOTER_STATE.ABSENT, 'representative should not have voted')
                assertBn(representativeState.caster, ZERO_ADDRESS, 'representative should not have voted')

                assertAmountOfEvents(receipt, 'CastVote', { expectedAmount: 0 })
                assertAmountOfEvents(receipt, 'ProxyVoteFailure')
                assertEvent(receipt, 'ProxyVoteFailure', { expectedArgs: { voter, representative: anotherRepresentative, voteId } })
              })

              context('overruling', () => {
                beforeEach('proxy representative\'s vote', async () => {
                  await voting.voteOnBehalfOf(voteId, false, [voter], { from: representative })
                })

                it('can be overruled by the voter', async () => {
                  const receipt = await voting.vote(voteId, true, { from: voter })

                  const { yeas, nays } = await getVoteState(voting, voteId)
                  assertBn(nays, 0, 'nays should be 0')
                  assertBn(yeas, bigExp(51, 18), 'yeas should be 51')

                  const voterState = await getCastVote(voter)
                  assertBn(voterState.state, VOTER_STATE.YEA, 'voter should have voted')
                  assert.equal(voterState.caster, voter, 'vote caster does not match')

                  const representativeState = await getCastVote(representative)
                  assertBn(representativeState.state, VOTER_STATE.ABSENT, 'representative should not have voted')
                  assertBn(representativeState.caster, ZERO_ADDRESS, 'representative should not have voted')

                  assertAmountOfEvents(receipt, 'CastVote')
                  assertEvent(receipt, 'CastVote', { expectedArgs: { voteId, voter, caster: voter, supports: true } })
                })
              })

              context('quiet ending', () => {
                const itDoesNotExtendTheVoteDuration = support => {
                  it('does not extend the vote duration', async () => {
                    const receipt = await voting.voteOnBehalfOf(voteId, support, [voter], { from })
                    assertAmountOfEvents(receipt, 'QuietEndingExtendVote', { expectedAmount: 0 })
                  })
                }

                context('when no one voted before', () => {
                  context('when cast before the quiet ending period', () => {
                    itDoesNotExtendTheVoteDuration()
                  })

                  context('when cast during the quiet ending period', () => {
                    beforeEach('move to the middle of the quiet ending period', async () => {
                      const { startDate } = await getVoteState(voting, voteId)
                      await voting.mockSetTimestamp(startDate.add(bn(VOTE_DURATION - QUIET_ENDING_PERIOD / 2)))
                    })

                    itDoesNotExtendTheVoteDuration()
                  })
                })

                context('when someone voted before', () => {
                  const previousSupport = false

                  beforeEach('cast vote', async () => {
                    await voting.vote(voteId, previousSupport, { from: anotherVoter })
                  })

                  const itHandlesVoteDurationProperly = shouldExtendVote => {
                    context('when the outcome is not flipped', () => {
                      itDoesNotExtendTheVoteDuration(previousSupport)
                    })

                    context('when the outcome is flipped', () => {
                      const support = !previousSupport

                      if (shouldExtendVote) {
                        it('extends the vote duration', async () => {
                          // vote and move after the vote's end date
                          await voting.voteOnBehalfOf(voteId, support, [voter], { from })
                          await voting.mockIncreaseTime(QUIET_ENDING_PERIOD / 2)

                          assert.isTrue(await voting.canVote(voteId, thirdVoter), 'voter cannot vote')

                          const receipt = await voting.vote(voteId, true, { from: thirdVoter })
                          assertAmountOfEvents(receipt, 'QuietEndingExtendVote')
                          assertEvent(receipt, 'QuietEndingExtendVote', { expectedArgs: { voteId, passing: support } })
                        })

                        it('stores the vote extension in the following vote', async () => {
                          // vote and move after the vote's end date
                          await voting.voteOnBehalfOf(voteId, support, [voter], { from })
                          await voting.mockIncreaseTime(QUIET_ENDING_PERIOD / 2)

                          const { quietEndingExtensionDuration: previousExtendedSeconds } = await getVoteState(voting, voteId)

                          await voting.vote(voteId, true, { from: thirdVoter })

                          const { quietEndingExtensionDuration: currentExtendedSeconds } = await getVoteState(voting, voteId)
                          assertBn(currentExtendedSeconds, previousExtendedSeconds.add(bn(QUIET_ENDING_EXTENSION)), 'vote extended seconds do not match')
                        })
                      } else {
                        itDoesNotExtendTheVoteDuration(support)
                      }
                    })
                  }

                  context('when the vote is cast before the quiet ending period', () => {
                    const shouldExtendVote = false

                    itHandlesVoteDurationProperly(shouldExtendVote)
                  })

                  context('when the vote is cast during the quiet ending period', () => {
                    const shouldExtendVote = true

                    beforeEach('move to the middle of the quiet ending period', async () => {
                      const { startDate } = await getVoteState(voting, voteId)
                      await voting.mockSetTimestamp(startDate.add(bn(VOTE_DURATION - QUIET_ENDING_PERIOD / 2)))
                    })

                    itHandlesVoteDurationProperly(shouldExtendVote)
                  })
                })
              })
            })

            context('when the voter has already voted', () => {
              beforeEach('voter votes', async () => {
                await voting.vote(voteId, true, { from: voter })
              })

              it('does not cast a vote', async () => {
                await voting.voteOnBehalfOf(voteId, true, [voter], { from })

                const { yeas, nays } = await getVoteState(voting, voteId)
                assertBn(nays, 0, 'nays should be 0')
                assertBn(yeas, bigExp(51, 18), 'yeas should be 51%')

                const voterState = await getCastVote(voter)
                assertBn(voterState.state, VOTER_STATE.YEA, 'voter should have voted')
                assert.equal(voterState.caster, voter, 'vote caster does not match')
              })

              it('emits a proxy failed event', async () => {
                const receipt = await voting.voteOnBehalfOf(voteId, true, [voter], { from })

                assertAmountOfEvents(receipt, 'ProxyVoteFailure')
                assertEvent(receipt, 'ProxyVoteFailure', { expectedArgs: { voter, representative, voteId } })
              })
            })
          })

          context('when right at the end of the delegated voting period', () => {
            beforeEach('move at the end of the delegated voting period', async () => {
              await voting.mockIncreaseTime(DELEGATED_VOTING_PERIOD)
            })

            itReverts()
          })

          context('when after the end of the delegated voting period', () => {
            beforeEach('move at the end of the delegated voting period', async () => {
              await voting.mockIncreaseTime(DELEGATED_VOTING_PERIOD + 1)
            })

            itReverts()
          })
        })

        context('when the voter can not vote', () => {
          const invalidVoter = anyone

          beforeEach('add representative', async () => {
            await voting.setRepresentative(representative, { from: invalidVoter })
          })

          it('reverts', async () => {
            await assertRevert(voting.voteOnBehalfOf(voteId, true, [invalidVoter], { from }), VOTING_ERRORS.VOTING_CANNOT_VOTE)
          })
        })
      })

      context('when the sender is the voter', () => {
        const from = voter

        it('reverts', async () => {
          await assertRevert(voting.voteOnBehalfOf(voteId, true, [voter], { from }), VOTING_ERRORS.VOTING_NOT_REPRESENTATIVE)
        })
      })

      context('when the sender is not a representative', () => {
        const from = anyone

        it('reverts', async () => {
          await assertRevert(voting.voteOnBehalfOf(voteId, true, [voter], { from }), VOTING_ERRORS.VOTING_NOT_REPRESENTATIVE)
        })
      })
    })

    context('when the vote does not exist', () => {
      it('reverts', async () => {
        await voting.setRepresentative(representative, { from: voter })
        await assertRevert(voting.voteOnBehalfOf(voteId, true, [voter], { from: representative }), VOTING_ERRORS.VOTING_NO_VOTE)
      })
    })
  })

  describe('voteOnBehalfOfMany', () => {
    beforeEach('add representative', async () => {
      await voting.setRepresentative(representative, { from: voter })
      await voting.setRepresentative(representative, { from: anotherVoter })
      await voting.setRepresentative(representative, { from: thirdVoter })
    })

    context('when the vote id exists', () => {
      beforeEach('create a vote', async () => {
        ({ voteId } = await createVote({ voting, from: voter }))
      })

      context('when the input is valid', () => {
        const previousVoter = thirdVoter
        const voters = [voter, anotherVoter, previousVoter]

        it('casts the successful votes', async () => {
          await voting.vote(voteId, true, { from: previousVoter })

          const receipt = await voting.voteOnBehalfOf(voteId, false, voters, { from: representative })

          assertAmountOfEvents(receipt, 'CastVote', { expectedAmount: 2 })

          assertAmountOfEvents(receipt, 'ProxyVoteFailure', { expectedAmount: 1 })
          assertEvent(receipt, 'ProxyVoteFailure', { expectedArgs: { voter: previousVoter, representative, voteId }, index: 0 })

          assertAmountOfEvents(receipt, 'CastVote', { expectedAmount: 2 })
          assertEvent(receipt, 'CastVote', { expectedArgs: { voter, caster: representative, voteId, supports: false }, index: 0 })
          assertEvent(receipt, 'CastVote', { expectedArgs: { voter: anotherVoter, caster: representative, voteId, supports: false }, index: 1 })

          const { yeas, nays } = await getVoteState(voting, voteId)
          assertBn(yeas, bigExp(1, 18), 'yeas should be 1')
          assertBn(nays, bigExp(100, 18), 'nays should be 100')

          const voterState = await getCastVote(voter)
          assertBn(voterState.state, VOTER_STATE.NAY, 'voter should have voted')
          assert.equal(voterState.caster, representative, 'caster of voter does not match')

          const anotherVoterState = await getCastVote(anotherVoter)
          assertBn(anotherVoterState.state, VOTER_STATE.NAY, 'another voter should have voted')
          assertBn(anotherVoterState.caster, representative, 'caster of another voter does not match')

          const previousVoterState = await getCastVote(previousVoter)
          assertBn(previousVoterState.state, VOTER_STATE.YEA, 'previous voter should have voted')
          assertBn(previousVoterState.caster, previousVoter, 'caster of previous voter does not match')
        })
      })

      context('when the input is not valid', () => {
        const voters = new Array(71).fill(voter)

        context('when the input length exceeds the max length allowed', () => {
          it('reverts', async () => {
            await assertRevert(voting.voteOnBehalfOf(voteId, true, voters), VOTING_ERRORS.VOTING_DELEGATES_EXCEEDS_MAX_LEN)
          })
        })
      })
    })

    context('when the vote id does not exist', () => {
      const voters = [voter, anotherVoter]

      it('reverts', async () => {
        await assertRevert(voting.voteOnBehalfOf(voteId, true, voters, { from: representative }), VOTING_ERRORS.VOTING_NO_VOTE)
      })
    })
  })

  describe('canRepresentativesVote', () => {
    beforeEach('create a vote', async () => {
      ({ voteId } = await createVote({ voting, from: voter }))
    })

    context('when right at the beginning of the delegated voting period', () => {
      it('returns true', async () => {
        assert.isTrue(await voting.canRepresentativesVote(voteId))
      })
    })

    context('when in the middle of the delegated voting period', () => {
      beforeEach('increase time', async () => {
        await voting.mockIncreaseTime(DELEGATED_VOTING_PERIOD / 2)
      })

      it('returns true', async () => {
        assert.isTrue(await voting.canRepresentativesVote(voteId))
      })
    })

    context('when right before the end of the delegated voting period', () => {
      beforeEach('increase time', async () => {
        await voting.mockIncreaseTime(DELEGATED_VOTING_PERIOD - 1)
      })

      it('returns true', async () => {
        assert.isTrue(await voting.canRepresentativesVote(voteId))
      })
    })

    context('when right at the end of the delegated voting period', () => {
      beforeEach('increase time', async () => {
        await voting.mockIncreaseTime(DELEGATED_VOTING_PERIOD)
      })

      it('returns false', async () => {
        assert.isFalse(await voting.canRepresentativesVote(voteId))
      })
    })

    context('when after the end of the delegated voting period ends', () => {
      beforeEach('increase time', async () => {
        await voting.mockIncreaseTime(DELEGATED_VOTING_PERIOD + 1)
      })

      it('returns false', async () => {
        assert.isFalse(await voting.canRepresentativesVote(voteId))
      })
    })
  })

  describe('gas costs [ @skip-on-coverage ]', () => {
    const MAX_DELEGATES_PER_TX = 10
    const MAX_DELEGATE_GAS_OVERHEAD = 65e3

    it('adds 65k of gas per cast vote', async () => {
      ({ voteId } = await createVote({ voting, from: voter }))
      await voting.setRepresentative(representative, { from: voter })
      await voting.setRepresentative(representative, { from: anotherVoter })

      const { receipt: { cumulativeGasUsed: oneVoteCumulativeGasUsed } } = await voting.voteOnBehalfOf(voteId, true, [voter], { from: representative })
      const { receipt: { cumulativeGasUsed: twoVotesCumulativeGasUsed } } = await voting.voteOnBehalfOf(voteId, true, [voter, anotherVoter], { from: representative })

      assert.isAtMost(twoVotesCumulativeGasUsed - oneVoteCumulativeGasUsed, MAX_DELEGATE_GAS_OVERHEAD)
    })

    it(`can delegate up to ${MAX_DELEGATES_PER_TX} votes`, async () => {
      const accounts = await web3.eth.getAccounts()
      const voters = accounts.slice(accounts.length - MAX_DELEGATES_PER_TX, accounts.length)

      for (let i = 0; i < voters.length; i++) {
        await token.generateTokens(voters[i], bigExp(2, 18))
        await voting.setRepresentative(representative, { from: voters[i] })
      }

      ({ voteId } = await createVote({ voting, from: voter }))
      const receipt = await voting.voteOnBehalfOf(voteId, true, voters, { from: representative })

      assertAmountOfEvents(receipt, 'CastVote', { expectedAmount: MAX_DELEGATES_PER_TX })
      assert.isAtMost(receipt.receipt.cumulativeGasUsed, 6.8e6)

      const { yeas, nays } = await getVoteState(voting, voteId)
      assertBn(nays, 0, 'nays should be zero')
      assertBn(yeas, bigExp(MAX_DELEGATES_PER_TX * 2, 18), 'yeas should be 200')

      for (let i = 0; i < voters.length; i++) {
        const voterState = await getCastVote(voters[i])
        assertBn(voterState.state, VOTER_STATE.YEA, 'voter should have voted')
        assert.equal(voterState.caster, representative, 'voter caster does not match')
      }
    })
  })
})
