const deployer = require('../helpers/deployer')(web3, artifacts)
const { VOTING_ERRORS } = require('../helpers/errors')
const { VOTER_STATE, createVote, getVoteState } = require('../helpers/voting')

const { ONE_DAY, pct16, bn, bigExp } = require('@aragon/contract-helpers-test')
const { assertBn, assertRevert, assertEvent, assertAmountOfEvents } = require('@aragon/contract-helpers-test/src/asserts')

contract('Voting', ([_, owner, holder20, holder29, holder51, nonHolder, representative]) => {
  let voting, token

  const CONTEXT = '0xabcdef'
  const VOTE_DURATION = 5 * ONE_DAY
  const DELEGATED_VOTING_PERIOD = ONE_DAY * 4
  const EXECUTION_DELAY = 0
  const QUIET_ENDING_PERIOD = 2 * ONE_DAY
  const QUIET_ENDING_EXTENSION = ONE_DAY
  const REQUIRED_SUPPORT = pct16(10)
  const MINIMUM_ACCEPTANCE_QUORUM = pct16(5)

  beforeEach('deploy and mint tokens', async () => {
    token = await deployer.deployToken({})
    await token.generateTokens(holder51, bigExp(51, 18))
    await token.generateTokens(holder29, bigExp(29, 18))
    await token.generateTokens(holder20, bigExp(20, 18))
  })

  beforeEach('deploy voting', async () => {
    voting = await deployer.deployAndInitialize({ owner, minimumAcceptanceQuorum: MINIMUM_ACCEPTANCE_QUORUM, requiredSupport: REQUIRED_SUPPORT, voteDuration: VOTE_DURATION, delegatedVotingPeriod: DELEGATED_VOTING_PERIOD, quietEndingPeriod: QUIET_ENDING_PERIOD, quietEndingExtension: QUIET_ENDING_EXTENSION, executionDelay: EXECUTION_DELAY })
  })

  describe('vote', () => {
    let voteId, script

    beforeEach('create vote', async () => {
      ({ voteId, script } = await createVote({ voting, voteContext: CONTEXT, from: holder51 }))
    })

    context('when the sender has some balance', () => {
      const from = holder29
      const expectedBalance = bigExp(29, 18)

      context('when the vote is open', () => {
        context('when no one voted before', () => {
          it('can vote', async () => {
            await voting.vote(voteId, false, { from })
            const { nays } = await getVoteState(voting, voteId)
            const { state } = await voting.getCastVote(voteId, from)

            assertBn(nays, expectedBalance, 'nay vote should have been counted')
            assertBn(state, VOTER_STATE.NAY, 'should have nay voter status')
          })

          it('emits an event', async () => {
            const receipt = await voting.vote(voteId, true, { from })

            assertAmountOfEvents(receipt, 'CastVote')
            assertEvent(receipt, 'CastVote', { expectedArgs: { voteId, voter: from, caster: from, supports: true } })
          })

          it('cannot modify vote', async () => {
            await voting.vote(voteId, true, { from })
            const firstTime = await getVoteState(voting, voteId)
            assertBn(firstTime.nays, 0, 'nay vote should have been removed')
            assertBn(firstTime.yeas, expectedBalance, 'yea vote should have been counted')

            await assertRevert(voting.vote(voteId, false, { from }), VOTING_ERRORS.VOTING_CANNOT_VOTE)
          })

          it('token transfers dont affect voting', async () => {
            await token.transfer(nonHolder, expectedBalance, { from })

            await voting.vote(voteId, true, { from })
            const { yeas } = await getVoteState(voting, voteId)

            assertBn(yeas, expectedBalance, 'yea vote should have been counted')
            assert.equal(await token.balanceOf(from), 0, 'balance should be 0 at current block')

            await assertRevert(voting.vote(voteId, false, { from: nonHolder }), VOTING_ERRORS.VOTING_CANNOT_VOTE)
          })

          context('when cast before the quiet ending period', () => {
            it('does not extend the vote duration', async () => {
              const receipt = await voting.vote(voteId, true, { from })
              assertAmountOfEvents(receipt, 'QuietEndingExtendVote', { expectedAmount: 0 })
            })

            it('does not store the quiet ending snapshot support', async () => {
              await voting.vote(voteId, true, { from })

              const { quietEndingSnapshotSupport } = await getVoteState(voting, voteId)
              assertBn(quietEndingSnapshotSupport, VOTER_STATE.ABSENT, 'quiet ending snapshot does not match')
            })
          })

          context('when cast during the quiet ending period', () => {
            beforeEach('move to the middle of the quiet ending period', async () => {
              await voting.mockIncreaseTime(VOTE_DURATION - QUIET_ENDING_PERIOD / 2)
            })

            beforeEach('vote and move to vote end date', async () => {
              await voting.vote(voteId, true, { from })
              await voting.mockIncreaseTime(QUIET_ENDING_PERIOD / 2)
            })

            it('stores the quiet ending snapshot support', async () => {
              const { quietEndingSnapshotSupport } = await getVoteState(voting, voteId)
              assertBn(quietEndingSnapshotSupport, VOTER_STATE.NAY, 'quiet ending snapshot does not match')
            })

            it('extends the vote duration', async () => {
              assert.isTrue(await voting.canVote(voteId, holder51), 'voter cannot vote')

              const receipt = await voting.vote(voteId, true, { from: holder51 })
              assertAmountOfEvents(receipt, 'QuietEndingExtendVote')
              assertEvent(receipt, 'QuietEndingExtendVote', { expectedArgs: { voteId, passing: true } })
            })

            it('stores the vote extension in the following vote', async () => {
              const { quietEndingExtensionDuration: previousExtendedSeconds } = await getVoteState(voting, voteId)

              await voting.vote(voteId, true, { from: holder51 })

              const { quietEndingExtensionDuration: currentExtendedSeconds } = await getVoteState(voting, voteId)
              assertBn(currentExtendedSeconds, previousExtendedSeconds.add(bn(QUIET_ENDING_EXTENSION)), 'vote extended seconds do not match')
            })
          })
        })

        context('when someone voted before', () => {
          const previousSupport = false
          const previousNays = bigExp(20, 18)

          const itHandlesQuietEndingProperly = () => {
            const itHandlesVoteDurationProperly = (extendsWhenFlipped, secondsUntilInitialEndTime) => {
              const itCanVote = support => {
                it('can vote', async () => {
                  await voting.vote(voteId, support, { from })
                  const { yeas, nays } = await getVoteState(voting, voteId)
                  const { state } = await voting.getCastVote(voteId, from)

                  if (support) {
                    assertBn(yeas, expectedBalance, 'yea vote should have been counted')
                    assertBn(state, VOTER_STATE.YEA, 'should have yea voter status')
                  } else {
                    assertBn(nays, previousNays.add(expectedBalance), 'nay vote should have been counted')
                    assertBn(state, VOTER_STATE.NAY, 'should have nay voter status')
                  }
                })
              }

              const itDoesNotExtendTheVoteDuration = support => {
                it('does not extend the vote duration', async () => {
                  const receipt = await voting.vote(voteId, support, { from })
                  assertAmountOfEvents(receipt, 'QuietEndingExtendVote', { expectedAmount: 0 })
                })
              }

              context('when the outcome is not flipped', () => {
                const support = previousSupport

                itCanVote(support)

                itDoesNotExtendTheVoteDuration(support)
              })

              context('when the outcome is flipped', () => {
                const support = !previousSupport

                itCanVote(support)

                if (extendsWhenFlipped) {
                  it('extends the vote duration', async () => {
                    // vote and move after the vote's end date
                    await voting.vote(voteId, support, { from })
                    await voting.mockIncreaseTime(secondsUntilInitialEndTime + 1)

                    assert.isTrue(await voting.canVote(voteId, holder51), 'voter cannot vote')

                    const receipt = await voting.vote(voteId, true, { from: holder51 })
                    assertAmountOfEvents(receipt, 'QuietEndingExtendVote')
                    assertEvent(receipt, 'QuietEndingExtendVote', { expectedArgs: { voteId, passing: support } })
                  })

                  it('stores the vote extension in the following vote', async () => {
                    // vote and move after the vote's end date
                    await voting.vote(voteId, support, { from })
                    await voting.mockIncreaseTime(secondsUntilInitialEndTime + 1)
                    const { quietEndingExtensionDuration: previousExtendedSeconds } = await getVoteState(voting, voteId)

                    await voting.vote(voteId, true, { from: holder51 })

                    const { quietEndingExtensionDuration: currentExtendedSeconds } = await getVoteState(voting, voteId)
                    assertBn(currentExtendedSeconds, previousExtendedSeconds.add(bn(QUIET_ENDING_EXTENSION)), 'vote extended seconds do not match')
                  })
                } else {
                  itDoesNotExtendTheVoteDuration(support)
                }
              })
            }

            const itReverts = () => {
              it('reverts', async () => {
                await assertRevert(voting.vote(voteId, true, { from }), VOTING_ERRORS.VOTING_CANNOT_VOTE)
              })
            }

            context('when the vote is cast before the quiet ending period', () => {
              const extendsWhenFlipped = false
              const secondsUntilInitialEndTime = QUIET_ENDING_PERIOD - 1

              beforeEach('move before the quiet ending period', async () => {
                await voting.mockIncreaseTime(VOTE_DURATION - secondsUntilInitialEndTime)
              })

              itHandlesVoteDurationProperly(extendsWhenFlipped, secondsUntilInitialEndTime)
            })

            context('when the vote is cast at the beginning of the quiet ending period', () => {
              const extendsWhenFlipped = true
              const secondsUntilInitialEndTime = QUIET_ENDING_PERIOD

              beforeEach('move at the beginning of the quiet ending period', async () => {
                await voting.mockIncreaseTime(VOTE_DURATION - secondsUntilInitialEndTime)
              })

              itHandlesVoteDurationProperly(extendsWhenFlipped, secondsUntilInitialEndTime)
            })

            context('when the vote is cast during the quiet ending period', () => {
              const extendsWhenFlipped = true
              const secondsUntilInitialEndTime = QUIET_ENDING_PERIOD / 2

              beforeEach('move to the middle of the quiet ending period', async () => {
                await voting.mockIncreaseTime(VOTE_DURATION - secondsUntilInitialEndTime)
              })

              itHandlesVoteDurationProperly(extendsWhenFlipped, secondsUntilInitialEndTime)
            })

            context('when the vote is cast at the end of the quiet ending period', () => {
              beforeEach('move at the end of the quiet ending period', async () => {
                await voting.mockIncreaseTime(VOTE_DURATION)
              })

              itReverts()
            })

            context('when the vote is cast after the quiet ending period', () => {
              beforeEach('move after the quiet ending period', async () => {
                await voting.mockIncreaseTime(VOTE_DURATION + 1)
              })

              itReverts()
            })
          }

          context('when casting a normal vote', () => {
            beforeEach('vote', async () => {
              await voting.vote(voteId, previousSupport, { from: holder20 })
            })

            itHandlesQuietEndingProperly()
          })

          context('when overruling a previous vote', () => {
            beforeEach('delegate vote', async () => {
              await voting.vote(voteId, previousSupport, { from: holder20 })
              await voting.setRepresentative(representative, { from })
              await voting.voteOnBehalfOf(voteId, previousSupport, [from], { from: representative })
            })

            itHandlesQuietEndingProperly()
          })
        })
      })

      context('when the vote is closed', () => {
        beforeEach('close vote', async () => {
          await voting.vote(voteId, true, { from: holder51 })
          await voting.mockIncreaseTime(VOTE_DURATION)
        })

        context('when the vote was not executed', () => {
          it('reverts', async () => {
            await assertRevert(voting.vote(voteId, true, { from }), VOTING_ERRORS.VOTING_CANNOT_VOTE)
          })
        })

        context('when the vote was executed', () => {
          beforeEach('execute vote', async () => {
            await voting.executeVote(voteId, script)
          })

          it('reverts', async () => {
            await assertRevert(voting.vote(voteId, true, { from }), VOTING_ERRORS.VOTING_CANNOT_VOTE)
          })
        })
      })
    })

    context('when the sender does not have balance', () => {
      const from = nonHolder

      it('reverts', async () => {
        await assertRevert(voting.vote(voteId, true, { from }), VOTING_ERRORS.VOTING_CANNOT_VOTE)
      })
    })
  })

  describe('isValuePct', () => {
    it('tests total = 0', async () => {
      const result1 = await voting.isValuePct(0, 0, pct16(50))
      assert.equal(result1, false, 'total 0 should always return false')

      const result2 = await voting.isValuePct(1, 0, pct16(50))
      assert.equal(result2, false, 'total 0 should always return false')
    })

    it('tests value = 0', async () => {
      const result1 = await voting.isValuePct(0, 10, pct16(50))
      assert.equal(result1, false, 'value 0 should return false if pct16 is non-zero')

      const result2 = await voting.isValuePct(0, 10, 0)
      assert.equal(result2, false, 'value 0 should return false if pct16 is zero')
    })

    it('tests pct16 ~= 100', async () => {
      const result1 = await voting.isValuePct(10, 10, pct16(100).sub(bn(1)))
      assert.equal(result1, true, 'value 10 over 10 should pass')
    })

    it('tests strict inequality', async () => {
      const result1 = await voting.isValuePct(10, 20, pct16(50))
      assert.equal(result1, false, 'value 10 over 20 should not pass for 50%')

      const result2 = await voting.isValuePct(pct16(50).sub(bn(1)), pct16(100), pct16(50))
      assert.equal(result2, false, 'off-by-one down should not pass')

      const result3 = await voting.isValuePct(pct16(50).add(bn(1)), pct16(100), pct16(50))
      assert.equal(result3, true, 'off-by-one up should pass')
    })
  })
})
