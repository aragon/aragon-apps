const deployer = require('../helpers/deployer')(web3, artifacts)
const { createVote, getVoteSetting } = require('../helpers/voting')
const { ARAGON_OS_ERRORS, VOTING_ERRORS } = require('../helpers/errors')

const { ONE_DAY, bn, bigExp, pct16 } = require('@aragon/contract-helpers-test')
const { assertBn, assertRevert, assertEvent, assertAmountOfEvents } = require('@aragon/contract-helpers-test/src/asserts')

contract('Voting settings', ([_, owner, anyone, holder51, holder20, holder29]) => {
  let voting

  const VOTE_DURATION = 5 * ONE_DAY
  const DELEGATED_VOTING_PERIOD = ONE_DAY * 4
  const EXECUTION_DELAY = 0
  const QUIET_ENDING_PERIOD = ONE_DAY
  const QUIET_ENDING_EXTENSION = ONE_DAY / 2
  const REQUIRED_SUPPORT = pct16(50)
  const MINIMUM_ACCEPTANCE_QUORUM = pct16(20)

  before('deploy and mint tokens', async () => {
    const token = await deployer.deployToken({})
    await token.generateTokens(holder51, bigExp(51, 18))
    await token.generateTokens(holder20, bigExp(20, 18))
    await token.generateTokens(holder29, bigExp(29, 18))
  })

  beforeEach('deploy voting', async () => {
    voting = await deployer.deployAndInitialize({ owner, supportRequired: REQUIRED_SUPPORT, minimumAcceptanceQuorum: MINIMUM_ACCEPTANCE_QUORUM, voteDuration: VOTE_DURATION, delegatedVotingPeriod: DELEGATED_VOTING_PERIOD, quietEndingPeriod: QUIET_ENDING_PERIOD, quietEndingExtension: QUIET_ENDING_EXTENSION, executionDelay: EXECUTION_DELAY })
  })

  describe('changeVoteTime', () => {
    context('when the sender is allowed', () => {
      const from = owner

      context('when the new value is zero', () => {
        const newVoteTime = 0

        it('fails changing required support lower than minimum acceptance quorum', async () => {
          await assertRevert(voting.changeVoteTime(newVoteTime, { from }), VOTING_ERRORS.VOTING_VOTE_TIME_ZERO)
        })
      })

      context('when the new value is greater than zero', () => {
        const newVoteTime = ONE_DAY

        it('changes the vote time', async () => {
          await voting.changeVoteTime(newVoteTime, { from })

          const currentSettingId = await voting.getCurrentSettingId()
          const { voteTime } = await voting.getSetting(currentSettingId)
          assertBn(voteTime, newVoteTime, 'should have changed vote time')
        })

        it('emits an event', async () => {
          const receipt = await voting.changeVoteTime(newVoteTime, { from })

          assertAmountOfEvents(receipt, 'NewSetting')
          assertAmountOfEvents(receipt, 'ChangeVoteTime')
          assertEvent(receipt, 'ChangeVoteTime', { expectedArgs: { voteTime: newVoteTime } })
        })

        it('does not affect vote times in old votes', async () => {
          const { voteId, script } = await createVote({ voting, from: holder51 })
          await voting.changeVoteTime(newVoteTime, { from })

          await voting.mockIncreaseTime(newVoteTime * 2)
          await voting.vote(voteId, true, { from: holder51 })
          await voting.vote(voteId, false, { from: holder20 })
          await voting.vote(voteId, false, { from: holder29 })

          const { voteTime } = await getVoteSetting(voting, voteId)
          assertBn(voteTime, VOTE_DURATION, 'vote time should stay equal')

          await voting.mockIncreaseTime(VOTE_DURATION)
          await voting.executeVote(voteId, script) // exec doesn't fail
        })
      })
    })

    context('when the sender is not allowed', () => {
      const from = anyone

      it('reverts', async () => {
        await assertRevert(voting.changeVoteTime(ONE_DAY, { from }), ARAGON_OS_ERRORS.APP_AUTH_FAILED)
      })
    })
  })

  describe('changeSupportRequiredPct', () => {
    context('when the sender is allowed', () => {
      const from = owner

      context('when the new value is below the minimum quorum', () => {
        const newSupport = MINIMUM_ACCEPTANCE_QUORUM.sub(bn(1))

        it('fails changing required support lower than minimum acceptance quorum', async () => {
          await assertRevert(voting.changeSupportRequiredPct(newSupport, { from }), VOTING_ERRORS.VOTING_CHANGE_SUPPORT_TOO_SMALL)
        })
      })

      context('when the new value is between the minimum quorum and 100%', () => {
        const newSupport = MINIMUM_ACCEPTANCE_QUORUM.add(bn(1))

        it('changes the required support', async () => {
          await voting.changeSupportRequiredPct(newSupport, { from })

          const currentSettingId = await voting.getCurrentSettingId()
          const { supportRequiredPct } = await voting.getSetting(currentSettingId)
          assertBn(supportRequiredPct, newSupport, 'should have changed required support')
        })

        it('emits an event', async () => {
          const receipt = await voting.changeSupportRequiredPct(newSupport, { from })

          assertAmountOfEvents(receipt, 'NewSetting')
          assertAmountOfEvents(receipt, 'ChangeSupportRequired')
          assertEvent(receipt, 'ChangeSupportRequired', { expectedArgs: { supportRequiredPct: newSupport } })
        })

        it('does not affect vote required support', async () => {
          const { voteId, script } = await createVote({ voting, from: holder51 })
          await voting.changeSupportRequiredPct(pct16(70), { from })

          // With previous required support at 50%, vote should be approved
          // with new required support at 70% it shouldn't have,
          // but since min quorum is snapshotted it will succeed

          await voting.vote(voteId, true, { from: holder51 })
          await voting.vote(voteId, false, { from: holder20 })
          await voting.vote(voteId, false, { from: holder29 })
          await voting.mockIncreaseTime(VOTE_DURATION)

          const { supportRequiredPct } = await getVoteSetting(voting, voteId)
          assertBn(supportRequiredPct, REQUIRED_SUPPORT, 'required support in vote should stay equal')
          await voting.executeVote(voteId, script) // exec doesn't fail
        })
      })

      context('when the new value is 100%', () => {
        const newSupport = pct16(100)

        it('reverts', async () => {
          await assertRevert(voting.changeSupportRequiredPct(newSupport, { from }), VOTING_ERRORS.VOTING_CHANGE_SUPPORT_TOO_BIG)
        })
      })

      context('when the new value is above 100%', () => {
        const newSupport = pct16(101)

        it('reverts', async () => {
          await assertRevert(voting.changeSupportRequiredPct(newSupport, { from }), VOTING_ERRORS.VOTING_CHANGE_SUPPORT_TOO_BIG)
        })
      })
    })

    context('when the sender is not allowed', () => {
      const from = anyone

      it('reverts', async () => {
        await assertRevert(voting.changeSupportRequiredPct(pct16(90), { from }), ARAGON_OS_ERRORS.APP_AUTH_FAILED)
      })
    })
  })

  describe('changeMinAcceptQuorumPct', () => {
    context('when the sender is allowed', () => {
      const from = owner

      const itChangesTheAcceptanceQuorum = newQuorum => {
        it('changes the minimum acceptance quorum', async () => {
          await voting.changeMinAcceptQuorumPct(newQuorum, { from })

          const currentSettingId = await voting.getCurrentSettingId()
          const { minAcceptQuorumPct } = await voting.getSetting(currentSettingId)
          assertBn(minAcceptQuorumPct, newQuorum, 'should have changed min acceptance quorum')
        })

        it('emits an event', async () => {
          const receipt = await voting.changeMinAcceptQuorumPct(newQuorum, { from })

          assertAmountOfEvents(receipt, 'NewSetting')
          assertAmountOfEvents(receipt, 'ChangeMinQuorum')
          assertEvent(receipt, 'ChangeMinQuorum', { expectedArgs: { minAcceptQuorumPct: newQuorum } })
        })

        it('does not affect the vote min quorum', async () => {
          const { voteId, script } = await createVote({ voting, from: holder51 })
          await voting.changeMinAcceptQuorumPct(pct16(50), { from })

          // With previous min acceptance quorum at 20%, vote should be approved
          // with new minimum acceptance quorum at 50% it shouldn't have,
          // but since min quorum is snapshotted it will succeed

          await voting.vote(voteId, true, { from: holder29 })
          await voting.mockIncreaseTime(VOTE_DURATION)

          const { minAcceptQuorumPct } = await getVoteSetting(voting, voteId)
          assertBn(minAcceptQuorumPct, MINIMUM_ACCEPTANCE_QUORUM, 'acceptance quorum in vote should stay equal')
          await voting.executeVote(voteId, script) // exec doesn't fail
        })
      }

      context('when the new value is lower than the required support', () => {
        const newQuorum = REQUIRED_SUPPORT.sub(bn(1))

        itChangesTheAcceptanceQuorum(newQuorum)
      })

      context('when the new value is equal to the required support', () => {
        const newQuorum = REQUIRED_SUPPORT

        itChangesTheAcceptanceQuorum(newQuorum)
      })

      context('when the new value is greater than the required support', () => {
        const newQuorum = REQUIRED_SUPPORT.add(bn(1))

        it('reverts', async () => {
          await assertRevert(voting.changeMinAcceptQuorumPct(newQuorum, { from }), VOTING_ERRORS.VOTING_CHANGE_QUORUM_TOO_BIG)
        })
      })
    })

    context('when the sender is not allowed', () => {
      const from = anyone

      it('reverts', async () => {
        await assertRevert(voting.changeMinAcceptQuorumPct(pct16(90), { from }), ARAGON_OS_ERRORS.APP_AUTH_FAILED)
      })
    })
  })

  describe('changeDelegatedVotingPeriod', () => {
    context('when the sender is allowed', () => {
      const from = owner

      const itChangesTheDelegatedVotingPeriod = newDelegatedVotingPeriod => {
        it('changes the delegated voting period', async () => {
          await voting.changeDelegatedVotingPeriod(newDelegatedVotingPeriod, { from })

          const currentSettingId = await voting.getCurrentSettingId()
          const { delegatedVotingPeriod } = await voting.getSetting(currentSettingId)
          assertBn(delegatedVotingPeriod, newDelegatedVotingPeriod, 'delegated voting period does not match')
        })

        it('emits an event', async () => {
          const receipt = await voting.changeDelegatedVotingPeriod(newDelegatedVotingPeriod, { from })

          assertAmountOfEvents(receipt, 'NewSetting')
          assertAmountOfEvents(receipt, 'ChangeDelegatedVotingPeriod')
          assertEvent(receipt, 'ChangeDelegatedVotingPeriod', { expectedArgs: { delegatedVotingPeriod: newDelegatedVotingPeriod } })
        })

        it('does not affect previous created votes', async () => {
          const { voteId } = await createVote({ voting, from: holder51 })

          await voting.changeDelegatedVotingPeriod(newDelegatedVotingPeriod, { from })

          const { delegatedVotingPeriod } = await getVoteSetting(voting, voteId)
          assertBn(delegatedVotingPeriod, DELEGATED_VOTING_PERIOD, 'delegated voting period does not match')
        })
      }

      context('when the new window is lower than the vote duration', () => {
        const newDelegatedVotingPeriod = VOTE_DURATION - 1

        itChangesTheDelegatedVotingPeriod(newDelegatedVotingPeriod)
      })

      context('when the new window is equal to the vote duration', () => {
        const newDelegatedVotingPeriod = VOTE_DURATION

        itChangesTheDelegatedVotingPeriod(newDelegatedVotingPeriod)
      })

      context('when the new window is greater than the vote duration', () => {
        const newDelegatedVotingPeriod = VOTE_DURATION + 1

        it('reverts', async () => {
          await assertRevert(voting.changeDelegatedVotingPeriod(newDelegatedVotingPeriod, { from }), VOTING_ERRORS.VOTING_INVALID_DLGT_VOTE_PERIOD)
        })
      })
    })

    context('when the sender is not allowed', () => {
      const from = anyone
      const newDelegatedVotingPeriod = ONE_DAY * 2

      it('reverts', async () => {
        await assertRevert(voting.changeDelegatedVotingPeriod(newDelegatedVotingPeriod, { from }), ARAGON_OS_ERRORS.APP_AUTH_FAILED)
      })
    })
  })

  describe('changeQuietEndingConfiguration', () => {
    const newQuietEndingExtension = VOTE_DURATION + 1

    context('when the sender is allowed', () => {
      const from = owner

      const itChangesTheQuietEndingConfiguration = (newPeriod, newExtension) => {
        it('changes the delegated voting period', async () => {
          await voting.changeQuietEndingConfiguration(newPeriod, newExtension, { from })

          const currentSettingId = await voting.getCurrentSettingId()
          const { quietEndingPeriod, quietEndingExtension } = await voting.getSetting(currentSettingId)
          assertBn(quietEndingPeriod, newPeriod, 'quiet ending period does not match')
          assertBn(quietEndingExtension, newExtension, 'quiet ending extension does not match')
        })

        it('emits an event', async () => {
          const receipt = await voting.changeQuietEndingConfiguration(newPeriod, newExtension, { from })

          assertAmountOfEvents(receipt, 'NewSetting')
          assertAmountOfEvents(receipt, 'ChangeQuietEndingConfiguration')
          assertEvent(receipt, 'ChangeQuietEndingConfiguration', { expectedArgs: { quietEndingPeriod: newPeriod, quietEndingExtension: newExtension } })
        })

        it('does not affect previous created votes', async () => {
          const { voteId } = await createVote({ voting, from: holder51 })

          await voting.changeQuietEndingConfiguration(newPeriod, newExtension, { from })

          const { quietEndingPeriod, quietEndingExtension } = await getVoteSetting(voting, voteId)
          assertBn(quietEndingPeriod, QUIET_ENDING_PERIOD, 'quiet ending period does not match')
          assertBn(quietEndingExtension, QUIET_ENDING_EXTENSION, 'quiet ending extension does not match')
        })
      }

      const itReverts = (newPeriod, newExtension, errorMessage) => {
        it('reverts', async () => {
          await assertRevert(voting.changeQuietEndingConfiguration(newPeriod, newExtension, { from }), errorMessage)
        })
      }

      context('when the new period is lower than the vote duration', () => {
        const newQuietEndingPeriod = VOTE_DURATION - 1

        itChangesTheQuietEndingConfiguration(newQuietEndingPeriod, newQuietEndingExtension)
      })

      context('when the new period is equal to the vote duration', () => {
        const newQuietEndingPeriod = VOTE_DURATION

        itChangesTheQuietEndingConfiguration(newQuietEndingPeriod, newQuietEndingExtension)
      })

      context('when the new period is greater than the vote duration', () => {
        const newQuietEndingPeriod = VOTE_DURATION + 1

        itReverts(newQuietEndingPeriod, newQuietEndingExtension, VOTING_ERRORS.VOTING_INVALID_QUIET_END_PERIOD)
      })
    })

    context('when the sender is not allowed', () => {
      const from = anyone

      it('reverts', async () => {
        await assertRevert(voting.changeQuietEndingConfiguration(QUIET_ENDING_PERIOD, newQuietEndingExtension, { from }), ARAGON_OS_ERRORS.APP_AUTH_FAILED)
      })
    })
  })

  describe('changeExecutionDelay', () => {
    const newDelay = ONE_DAY * 2

    context('when the sender is allowed', () => {
      const from = owner

      it('changes the delegated voting period', async () => {
        await voting.changeExecutionDelay(newDelay, { from })

        const currentSettingId = await voting.getCurrentSettingId()
        const { executionDelay } = await voting.getSetting(currentSettingId)
        assertBn(executionDelay, newDelay, 'execution delay does not match')
      })

      it('emits an event', async () => {
        const receipt = await voting.changeExecutionDelay(newDelay, { from })

        assertAmountOfEvents(receipt, 'NewSetting')
        assertAmountOfEvents(receipt, 'ChangeExecutionDelay')
        assertEvent(receipt, 'ChangeExecutionDelay', { expectedArgs: { executionDelay: newDelay } })
      })

      it('does not affect previous created votes', async () => {
        const { voteId } = await createVote({ voting, from: holder51 })

        await voting.changeExecutionDelay(newDelay, { from })

        const { executionDelay } = await getVoteSetting(voting, voteId)
        assertBn(executionDelay, EXECUTION_DELAY, 'execution delay does not match')
      })
    })

    context('when the sender is not allowed', () => {
      const from = anyone

      it('reverts', async () => {
        await assertRevert(voting.changeExecutionDelay(newDelay, { from }), ARAGON_OS_ERRORS.APP_AUTH_FAILED)
      })
    })
  })
})
