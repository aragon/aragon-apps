const deployer = require('../helpers/deployer')(web3, artifacts)
const { VOTER_STATE, createVote, getVoteState } = require('../helpers/voting')

const { NOW, ONE_DAY, pct16, bigExp } = require('@aragon/contract-helpers-test')
const { assertBn, assertEvent, assertAmountOfEvents } = require('@aragon/contract-helpers-test/src/asserts')

contract('Voting', ([_, owner, holder10, holder20, holder30, holder40, holder50]) => {
  let voting, token

  const VOTE_DURATION = 5 * ONE_DAY
  const QUIET_ENDING_PERIOD = 2 * ONE_DAY
  const QUIET_ENDING_EXTENSION = ONE_DAY
  const REQUIRED_SUPPORT = pct16(50)
  const MINIMUM_ACCEPTANCE_QUORUM = pct16(5)

  before('deploy and mint tokens', async () => {
    token = await deployer.deployToken({})
    await token.generateTokens(holder50, bigExp(50, 18))
    await token.generateTokens(holder40, bigExp(40, 18))
    await token.generateTokens(holder30, bigExp(30, 18))
    await token.generateTokens(holder20, bigExp(20, 18))
    await token.generateTokens(holder10, bigExp(10, 18))
  })

  beforeEach('deploy voting', async () => {
    voting = await deployer.deployAndInitialize({ owner, currentTimestamp: NOW, minimumAcceptanceQuorum: MINIMUM_ACCEPTANCE_QUORUM, requiredSupport: REQUIRED_SUPPORT, voteDuration: VOTE_DURATION, quietEndingPeriod: QUIET_ENDING_PERIOD, quietEndingExtension: QUIET_ENDING_EXTENSION })
  })

  describe('quiet ending', () => {
    let voteId

    beforeEach('create vote', async () => {
      ({ voteId } = await createVote({ voting, from: holder40 }))
    })

    const itDoesNotStoreTheSnapshot = () => {
      it('does not store the quiet ending snapshot support', async () => {
        const { quietEndingSnapshotSupport } = await getVoteState(voting, voteId)
        assertBn(quietEndingSnapshotSupport, VOTER_STATE.ABSENT, 'quiet ending snapshot does not match')
      })
    }

    const itStoresTheSnapshot = support => {
      it('stores the quiet ending snapshot support', async () => {
        const { quietEndingSnapshotSupport } = await getVoteState(voting, voteId)
        assertBn(quietEndingSnapshotSupport, support ? VOTER_STATE.YEA : VOTER_STATE.NAY, 'quiet ending snapshot does not match')
      })
    }

    const itDoesNotExtendTheVoteDuration = () => {
      beforeEach('move to the original end date of the vote', async () => {
        await voting.mockIncreaseTime(QUIET_ENDING_PERIOD / 2)
      })

      it('does not store a vote extension', async () => {
        const { quietEndingExtendedSeconds } = await getVoteState(voting, voteId)
        assertBn(quietEndingExtendedSeconds, 0, 'vote extended seconds do not match')
      })

      it('the vote is no longer open', async () => {
        const { isOpen } = await getVoteState(voting, voteId)
        assert.isFalse(isOpen, 'vote is open')
      })

      it('new voter cannot vote', async () => {
        assert.isFalse(await voting.canVote(voteId, holder50), 'voter cannot vote')
      })
    }

    const itExtendsTheVoteDuration = currentSupport => {
      context('before the original end date of the vote', () => {
        itStoresTheSnapshot(!currentSupport)
      })

      context('after the original end date of the vote', () => {
        beforeEach('move to the original end date of the vote', async () => {
          await voting.mockIncreaseTime(QUIET_ENDING_PERIOD / 2)
        })

        it('the vote was flipped and remains open', async () => {
          const { isOpen } = await getVoteState(voting, voteId)
          assert.isTrue(isOpen, 'vote is not open')
        })

        it('new voter can vote', async () => {
          assert.isTrue(await voting.canVote(voteId, holder50), 'voter cannot vote')
        })

        it('extends the vote duration', async () => {
          const receipt = await voting.vote(voteId, true, { from: holder50 })
          assertAmountOfEvents(receipt, 'VoteQuietEndingExtension')
          assertEvent(receipt, 'VoteQuietEndingExtension', { expectedArgs: { voteId, passing: currentSupport } })
        })

        it('stores the vote extension', async () => {
          await voting.vote(voteId, true, { from: holder50 })

          const { quietEndingExtendedSeconds } = await getVoteState(voting, voteId)
          assertBn(quietEndingExtendedSeconds, QUIET_ENDING_EXTENSION, 'vote extended seconds do not match')
        })

        context('when the vote is flipped again', () => {
          const newSupport = !currentSupport

          it('extends the vote again', async () => {
            await voting.vote(voteId, newSupport, { from: holder50 })
            await voting.mockIncreaseTime(QUIET_ENDING_EXTENSION)

            const { isOpen } = await getVoteState(voting, voteId)
            assert.isTrue(isOpen, 'vote is not open')
          })
        })

        context('when the vote is not flipped again', () => {
          const newSupport = currentSupport

          it('does not extend the vote again', async () => {
            await voting.vote(voteId, newSupport, { from: holder50 })
            await voting.mockIncreaseTime(QUIET_ENDING_EXTENSION)

            const { isOpen } = await getVoteState(voting, voteId)
            assert.isFalse(isOpen, 'vote is open')
          })
        })
      })
    }

    context('when there were no votes cast before the quiet ending period', () => {
      context('when there were no votes during the quiet ending period', () => {
        beforeEach('move to the middle of the quiet ending period', async () => {
          await voting.mockIncreaseTime(VOTE_DURATION - QUIET_ENDING_PERIOD / 2)
        })

        itDoesNotStoreTheSnapshot()
        itDoesNotExtendTheVoteDuration()
      })

      context('when there was a vote during the quiet ending period', () => {
        const currentSupport = true

        beforeEach('cast a vote', async () => {
          await voting.mockIncreaseTime(VOTE_DURATION - QUIET_ENDING_PERIOD / 2)
          await voting.vote(voteId, currentSupport, { from: holder10 })
        })

        itExtendsTheVoteDuration(currentSupport)
      })

      context('when there were a few votes cast during the quiet ending period', () => {
        const currentSupport = true

        beforeEach('cast some votes', async () => {
          await voting.mockIncreaseTime(VOTE_DURATION - QUIET_ENDING_PERIOD / 2)
          await voting.vote(voteId, !currentSupport, { from: holder10 })
          await voting.vote(voteId, currentSupport, { from: holder20 })
        })

        itExtendsTheVoteDuration(currentSupport)
      })
    })

    context('when there was a vote cast before the quiet ending period', () => {
      const previousSupport = true

      beforeEach('cast a votes', async () => {
        await voting.vote(voteId, previousSupport, { from: holder10 })
      })

      context('when there were no votes during the quiet ending period', () => {
        beforeEach('move to the middle of the quiet ending period', async () => {
          await voting.mockIncreaseTime(VOTE_DURATION - QUIET_ENDING_PERIOD / 2)
        })

        itDoesNotStoreTheSnapshot()
        itDoesNotExtendTheVoteDuration()
      })

      context('when there was a vote during the quiet ending period', () => {
        beforeEach('move to the middle of the quiet ending period', async () => {
          await voting.mockIncreaseTime(VOTE_DURATION - QUIET_ENDING_PERIOD / 2)
        })

        context('when the vote was flipped', () => {
          const currentSupport = !previousSupport

          beforeEach('cast a vote', async () => {
            await voting.vote(voteId, currentSupport, { from: holder20 })
          })

          itExtendsTheVoteDuration(currentSupport)
        })

        context('when the vote was not flipped', () => {
          const currentSupport = previousSupport

          beforeEach('cast a vote', async () => {
            await voting.vote(voteId, currentSupport, { from: holder20 })
          })

          itStoresTheSnapshot(previousSupport)
          itDoesNotExtendTheVoteDuration()
        })
      })

      context('when there were a few votes cast during the quiet ending period', () => {
        beforeEach('move to the middle of the quiet ending period', async () => {
          await voting.mockIncreaseTime(VOTE_DURATION - QUIET_ENDING_PERIOD / 2)
        })

        context('when the vote was flipped', () => {
          const currentSupport = !previousSupport

          beforeEach('cast some votes', async () => {
            await voting.vote(voteId, currentSupport, { from: holder40 })
            await voting.vote(voteId, previousSupport, { from: holder20 })
          })

          itExtendsTheVoteDuration(currentSupport)
        })

        context('when the vote was not flipped', () => {
          const currentSupport = previousSupport

          beforeEach('cast some votes', async () => {
            await voting.vote(voteId, currentSupport, { from: holder40 })
            await voting.vote(voteId, previousSupport, { from: holder20 })
          })

          itStoresTheSnapshot(previousSupport)
          itDoesNotExtendTheVoteDuration()
        })
      })
    })

    context('when there were a few votes cast before the quiet ending period', () => {
      const previousSupport = false

      beforeEach('cast some votes', async () => {
        await voting.vote(voteId, previousSupport, { from: holder10 })
        await voting.vote(voteId, previousSupport, { from: holder20 })
      })

      context('when there were no votes during the quiet ending period', () => {
        beforeEach('move to the middle of the quiet ending period', async () => {
          await voting.mockIncreaseTime(VOTE_DURATION - QUIET_ENDING_PERIOD / 2)
        })

        itDoesNotStoreTheSnapshot()
        itDoesNotExtendTheVoteDuration()
      })

      context('when there was a vote during the quiet ending period', () => {
        beforeEach('move to the middle of the quiet ending period', async () => {
          await voting.mockIncreaseTime(VOTE_DURATION - QUIET_ENDING_PERIOD / 2)
        })

        context('when the vote was flipped', () => {
          const currentSupport = !previousSupport

          beforeEach('cast a vote', async () => {
            await voting.vote(voteId, currentSupport, { from: holder40 })
          })

          itExtendsTheVoteDuration(currentSupport)
        })

        context('when the vote was not flipped', () => {
          const currentSupport = previousSupport

          beforeEach('cast a vote', async () => {
            await voting.vote(voteId, currentSupport, { from: holder40 })
          })

          itStoresTheSnapshot(previousSupport)
          itDoesNotExtendTheVoteDuration()
        })
      })

      context('when there were a few votes casted during the quiet ending period', () => {
        beforeEach('move to the middle of the quiet ending period', async () => {
          await voting.mockIncreaseTime(VOTE_DURATION - QUIET_ENDING_PERIOD / 2)
        })

        context('when the vote was flipped', () => {
          const currentSupport = !previousSupport

          beforeEach('cast some votes', async () => {
            await voting.vote(voteId, currentSupport, { from: holder30 })
            await voting.vote(voteId, currentSupport, { from: holder40 })
          })

          itExtendsTheVoteDuration(currentSupport)
        })

        context('when the vote was not flipped', () => {
          const currentSupport = previousSupport

          beforeEach('cast some votes', async () => {
            await voting.vote(voteId, currentSupport, { from: holder30 })
            await voting.vote(voteId, currentSupport, { from: holder40 })
          })

          itStoresTheSnapshot(previousSupport)
          itDoesNotExtendTheVoteDuration()
        })
      })
    })
  })
})
