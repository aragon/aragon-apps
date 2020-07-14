const VOTER_STATE = require('../helpers/state')
const { DAY } = require('@aragon/apps-agreement/test/helpers/lib/time')
const { bigExp } = require('@aragon/apps-agreement/test/helpers/lib/numbers')
const { assertBn } = require('@aragon/apps-agreement/test/helpers/assert/assertBn')
const { assertRevert } = require('@aragon/apps-agreement/test/helpers/assert/assertThrow')
const { skipCoverage } = require('@aragon/os/test/helpers/coverage')
const { VOTING_ERRORS } = require('../helpers/errors')
const { assertEvent, assertAmountOfEvents } = require('@aragon/apps-agreement/test/helpers/assert/assertEvent')
const { pct, createVote, getVoteState } = require('../helpers/voting')(web3, artifacts)

const deployer = require('../helpers/deployer')(web3, artifacts)

contract('Voting delegation', ([_, owner, voter, anotherVoter, thirdVoter, representative, anotherRepresentative, anyone]) => {
  let voting, token, voteId

  const MIN_QUORUM = pct(20)
  const MIN_SUPPORT = pct(70)
  const OVERRULE_WINDOW = DAY
  const VOTING_DURATION = DAY * 5
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

  before('mint tokens', async () => {
    token = await deployer.deployToken({})
    await token.generateTokens(voter, bigExp(51, 18))
    await token.generateTokens(anotherVoter, bigExp(49, 18))
    await token.generateTokens(thirdVoter, bigExp(1, 18))
  })

  beforeEach('deploy voting', async () => {
    voting = await deployer.deployAndInitialize({ owner, minimumAcceptanceQuorum: MIN_QUORUM, requiredSupport: MIN_SUPPORT, voteDuration: VOTING_DURATION, overruleWindow: OVERRULE_WINDOW })
  })

  const getVoterState = async (voter, id = voteId) => voting.getVoterState(id, voter)

  describe('setRepresentative', () => {
    it('is not allowed by default', async () => {
      assert.isFalse(await voting.isRepresentativeOf(voter, representative))
    })

    context('when the representative was not set yet', () => {
      it('sets the given representative', async () => {
        const receipt = await voting.setRepresentative(representative, { from: voter })

        assertAmountOfEvents(receipt, 'ChangeRepresentative')
        assertEvent(receipt, 'ChangeRepresentative', { voter, newRepresentative: representative })

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
        assertEvent(receipt, 'ChangeRepresentative', { voter, newRepresentative: ZERO_ADDRESS })

        assert.isFalse(await voting.isRepresentativeOf(voter, representative))
      })
    })
  })

  describe('canVoteOnBehalfOf', () => {
    context('when the vote exists', () => {
      beforeEach('create a vote', async () => {
        ({ voteId } = await createVote({ voting, from: voter }))
      })

      context('when the sender is a representative', () => {
        beforeEach('add representative', async () => {
          await voting.setRepresentative(representative, { from: voter })
        })

        context('when the voter can vote', () => {
          context('when not within the overrule window', () => {
            context('when the voter has not voted yet', () => {
              context('when the representative did not proxied a vote', () => {
                it('returns true', async () => {
                  assert.isTrue(await voting.canVoteOnBehalfOf(voteId, [voter], representative), 'should not be able to vote')
                })
              })

              context('when the representative already proxied a vote', () => {
                beforeEach('proxy representative\'s vote', async () => {
                  await voting.voteOnBehalfOf(voteId, true, [voter], { from: representative })
                })

                context('when the representative is still allowed', () => {
                  it('returns true', async () => {
                    assert.isTrue(await voting.canVoteOnBehalfOf(voteId, [voter], representative), 'should be able to vote')
                  })
                })

                context('when the representative was disallowed', () => {
                  beforeEach('change representative', async () => {
                    await voting.setRepresentative(anotherRepresentative, { from: voter })
                  })

                  it('returns false', async () => {
                    assert.isFalse(await voting.canVoteOnBehalfOf(voteId, [voter], representative), 'should not be able to vote')
                  })
                })
              })
            })

            context('when the voter has already voted', () => {
              beforeEach('voter votes', async () => {
                await voting.vote(voteId, true, { from: voter })
              })

              it('returns false', async () => {
                assert.isFalse(await voting.canVoteOnBehalfOf(voteId, [voter], representative), 'should not be able to vote')
              })
            })
          })

          context('when within the overrule window', () => {
            beforeEach('move within overrule window', async () => {
              await voting.mockIncreaseTime(VOTING_DURATION - OVERRULE_WINDOW)
            })

            it('returns false', async () => {
              assert.isFalse(await voting.canVoteOnBehalfOf(voteId, [voter], representative), 'should not be able to vote')
            })
          })
        })

        context('when the voter can not vote', () => {
          const invalidVoter = anyone

          beforeEach('add representative', async () => {
            await voting.setRepresentative(representative, { from: invalidVoter })
          })

          it('returns false', async () => {
            assert.isFalse(await voting.canVoteOnBehalfOf(voteId, [invalidVoter], representative), 'should not be able to vote')
          })
        })
      })

      context('when the sender is the voter', () => {
        it('returns false', async () => {
          assert.isFalse(await voting.canVoteOnBehalfOf(voteId, [voter], voter), 'should not be able to vote')
        })
      })

      context('when the sender is not a representative', () => {
        it('returns false', async () => {
          assert.isFalse(await voting.canVoteOnBehalfOf(voteId, [voter], anyone), 'should not be able to vote')
        })
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
          context('when not within the overrule window', () => {
            context('when the voter has not voted yet', () => {
              let receipt

              beforeEach('proxy representative\'s vote', async () => {
                receipt = await voting.voteOnBehalfOf(voteId, false, [voter], { from: representative })
              })

              it('casts the proxied vote', async () => {
                const { yeas, nays } = await getVoteState(voting, voteId)

                assertBn(yeas, 0, 'yeas should be 0')
                assertBn(nays, bigExp(51, 18).toString(), 'nays should be 51')
                assertBn(await getVoterState(voter), VOTER_STATE.NAY, 'voter should have voted')
                assertBn(await getVoterState(representative), VOTER_STATE.ABSENT, 'representative should not have voted')
                assert.equal(await voting.getVoteCaster(voteId, voter), representative, 'vote caster does not match')

                assertAmountOfEvents(receipt, 'CastVote', 1)
                assertEvent(receipt, 'CastVote', { voter, voteId, supports: false, stake: bigExp(51, 18) })
              })

              it('emits an event', async () => {
                assertAmountOfEvents(receipt, 'ProxyVoteSuccess', 1)
                assertEvent(receipt, 'ProxyVoteSuccess', { voter, representative, voteId, supports: false })
              })

              it('can be changed by the same representative', async () => {
                const receipt = await voting.voteOnBehalfOf(voteId, true, [voter], { from: representative })

                const { yeas, nays } = await getVoteState(voting, voteId)
                assertBn(nays, 0, 'nays should be 0')
                assertBn(yeas, bigExp(51, 18), 'yeas should be 51')
                assert.equal(await getVoterState(voter), VOTER_STATE.YEA, 'voter should have voted')
                assert.equal(await getVoterState(representative), VOTER_STATE.ABSENT, 'representative should not have voted')
                assert.equal(await voting.getVoteCaster(voteId, voter), representative, 'vote caster does not match')

                assertAmountOfEvents(receipt, 'CastVote', 1)
                assertEvent(receipt, 'CastVote', { voter, voteId, supports: true, stake: bigExp(51, 18) })

                assertAmountOfEvents(receipt, 'ProxyVoteSuccess', 1)
                assertEvent(receipt, 'ProxyVoteSuccess', { voter, representative, voteId, supports: true })
              })

              it('can be changed by another representative', async () => {
                await voting.setRepresentative(anotherRepresentative, { from: voter })
                const receipt = await voting.voteOnBehalfOf(voteId, true, [voter], { from: anotherRepresentative })

                const { yeas, nays } = await getVoteState(voting, voteId)
                assertBn(nays, 0, 'nays should be 0')
                assertBn(yeas, bigExp(51, 18), 'yeas should be 51')
                assert.equal(await getVoterState(voter), VOTER_STATE.YEA, 'voter should have voted')
                assert.equal(await getVoterState(representative), VOTER_STATE.ABSENT, 'representative should not have voted')
                assert.equal(await voting.getVoteCaster(voteId, voter), anotherRepresentative, 'vote caster does not match')

                assertAmountOfEvents(receipt, 'CastVote', 1)
                assertEvent(receipt, 'CastVote', { voter, voteId, supports: true, stake: bigExp(51, 18) })

                assertAmountOfEvents(receipt, 'ProxyVoteSuccess', 1)
                assertEvent(receipt, 'ProxyVoteSuccess', { voter, representative: anotherRepresentative, voteId, supports: true })
              })

              it('can be overruled by the voter', async () => {
                const receipt = await voting.vote(voteId, true, { from: voter })

                const { yeas, nays } = await getVoteState(voting, voteId)
                assertBn(nays, 0, 'nays should be 0')
                assertBn(yeas, bigExp(51, 18), 'yeas should be 51')
                assert.equal(await getVoterState(voter), VOTER_STATE.YEA, 'voter should have voted')
                assert.equal(await getVoterState(representative), VOTER_STATE.ABSENT, 'representative should not have voted')
                assert.equal(await voting.getVoteCaster(voteId, voter), voter, 'vote caster does not match')

                assertAmountOfEvents(receipt, 'CastVote', 1)
                assertEvent(receipt, 'CastVote', { voter, voteId, supports: true, stake: bigExp(51, 18) })
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

                assert.equal(await getVoterState(voter, voteId), VOTER_STATE.YEA, 'voter should not have voted')
                assert.equal(await voting.getVoteCaster(voteId, voter), voter, 'vote caster should not exist')
              })

              it('emits a proxy failed event', async () => {
                const receipt = await voting.voteOnBehalfOf(voteId, true, [voter], { from })

                assertAmountOfEvents(receipt, 'ProxyVoteFailure')
                assertEvent(receipt, 'ProxyVoteFailure', { voter, representative, voteId })
              })
            })
          })

          context('when within the overrule window', () => {
            beforeEach('move within overrule window', async () => {
              await voting.mockIncreaseTime(VOTING_DURATION - OVERRULE_WINDOW)
            })

            it('reverts', async () => {
              await assertRevert(voting.voteOnBehalfOf(voteId, true, [voter], { from }), VOTING_ERRORS.VOTING_WITHIN_OVERRULE_WINDOW)
            })
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

          assertAmountOfEvents(receipt, 'CastVote', 2)
          assertAmountOfEvents(receipt, 'ProxyVoteFailure', 1)
          assertAmountOfEvents(receipt, 'ProxyVoteSuccess', 2)
          assertEvent(receipt, 'ProxyVoteFailure', { voter: previousVoter, representative, voteId })
          assertEvent(receipt, 'ProxyVoteSuccess', { voter, representative, voteId, supports: false }, 0)
          assertEvent(receipt, 'ProxyVoteSuccess', { voter: anotherVoter, representative, voteId, supports: false }, 1)

          const { yeas, nays } = await getVoteState(voting, voteId)
          assertBn(yeas, bigExp(1, 18), 'yeas should be 1')
          assertBn(nays, bigExp(100, 18), 'nays should be 100')

          assert.equal(await getVoterState(voter, voteId), VOTER_STATE.NAY, 'voter should have voted')
          assert.equal(await getVoterState(anotherVoter, voteId), VOTER_STATE.NAY, 'another voter should have voted')
          assert.equal(await getVoterState(previousVoter, voteId), VOTER_STATE.YEA, 'previous voter should have voted')

          assert.equal(await voting.getVoteCaster(voteId, voter), representative, 'vote caster does not match')
          assert.equal(await voting.getVoteCaster(voteId, anotherVoter), representative, 'vote caster does not match')
          assert.equal(await voting.getVoteCaster(voteId, previousVoter), previousVoter, 'vote caster does not match')
        })
      })

      context('when the input is not valid', () => {
        const repeat = (x, y) => [...Array(x)].map(() => y)
        const voters = repeat(71, voter)

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

  describe('withinOverruleWindow', () => {
    beforeEach('create a vote', async () => {
      ({ voteId } = await createVote({ voting, from: voter }))
    })

    context('when previous to the overrule window', () => {
      beforeEach('increase time', async () => {
        await voting.mockIncreaseTime(DAY)
      })

      it('returns false', async () => {
        assert.isFalse(await voting.withinOverruleWindow(voteId))
      })
    })

    context('when right at the beginning of the overrule window', () => {
      beforeEach('increase time', async () => {
        await voting.mockIncreaseTime(VOTING_DURATION - OVERRULE_WINDOW)
      })

      it('returns true', async () => {
        assert.isTrue(await voting.withinOverruleWindow(voteId))
      })
    })

    context('when in the middle of the overrule window', () => {
      beforeEach('increase time', async () => {
        await voting.mockIncreaseTime(VOTING_DURATION - OVERRULE_WINDOW / 2)
      })

      it('returns true', async () => {
        assert.isTrue(await voting.withinOverruleWindow(voteId))
      })
    })

    context('when right at the end of the overrule window', () => {
      beforeEach('increase time', async () => {
        await voting.mockIncreaseTime(VOTING_DURATION)
      })

      it('returns false', async () => {
        assert.isFalse(await voting.withinOverruleWindow(voteId))
      })
    })

    context('when after the end of the overrule window', () => {
      beforeEach('increase time', async () => {
        await voting.mockIncreaseTime(VOTING_DURATION + 1)
      })

      it('returns false', async () => {
        assert.isFalse(await voting.withinOverruleWindow(voteId))
      })
    })
  })

  describe('gas costs', () => {
    const MAX_DELEGATES_PER_TX = 70
    const MAX_DELEGATE_GAS_OVERHEAD = 65e3

    it('adds 65k of gas per casted vote', skipCoverage(async () => {
      ({ voteId } = await createVote({ voting, from: voter }))
      await voting.setRepresentative(representative, { from: voter })
      await voting.setRepresentative(representative, { from: anotherVoter })

      const { receipt: { cumulativeGasUsed: oneVoteCumulativeGasUsed } } = await voting.voteOnBehalfOf(voteId, true, [voter], { from: representative })
      const { receipt: { cumulativeGasUsed: twoVotesCumulativeGasUsed } } = await voting.voteOnBehalfOf(voteId, true, [voter, anotherVoter], { from: representative })

      assert.isAtMost(twoVotesCumulativeGasUsed - oneVoteCumulativeGasUsed, MAX_DELEGATE_GAS_OVERHEAD)
    }))

    it(`can delegate up to ${MAX_DELEGATES_PER_TX} votes`, skipCoverage(async () => {
      const accounts = await web3.eth.getAccounts()
      const voters = accounts.slice(accounts.length - MAX_DELEGATES_PER_TX, accounts.length)

      for (let i = 0; i < voters.length; i++) {
        await token.generateTokens(voters[i], bigExp(2, 18))
        await voting.setRepresentative(representative, { from: voters[i] })
      }

      ({ voteId } = await createVote({ voting, from: voter }))
      const receipt = await voting.voteOnBehalfOf(voteId, true, voters, { from: representative })

      assertAmountOfEvents(receipt, 'CastVote', MAX_DELEGATES_PER_TX)
      assertAmountOfEvents(receipt, 'ProxyVoteSuccess', MAX_DELEGATES_PER_TX)
      assert.isAtMost(receipt.receipt.cumulativeGasUsed, 6.8e6)

      const { yeas, nays } = await getVoteState(voting, voteId)
      assertBn(nays, 0, 'nays should be zero')
      assertBn(yeas, bigExp(MAX_DELEGATES_PER_TX * 2, 18), 'yeas should be 200')

      for (let i = 0; i < voters.length; i++) {
        assert.equal(await getVoterState(voters[i], voteId), VOTER_STATE.YEA, 'voter should have voted')
      }
    }))
  })
})
