const { DAY } = require('@aragon/apps-agreement/test/helpers/lib/time')
const { bigExp } = require('@aragon/apps-agreement/test/helpers/lib/numbers')
const { assertBn } = require('@aragon/apps-agreement/test/helpers/assert/assertBn')
const { assertRevert } = require('@aragon/apps-agreement/test/helpers/assert/assertThrow')
const { pct, voteScript, createVote } = require('../helpers/voting')(web3, artifacts)
const { VOTING_ERRORS, ARAGON_OS_ERRORS } = require('../helpers/errors')

const deployer = require('../helpers/deployer')(web3, artifacts)

contract('Voting', ([_, owner, holder20, holder29, holder51]) => {
  let voting

  const VOTE_DURATION = 5 * DAY
  const OVERRULE_WINDOW = DAY
  const REQUIRED_SUPPORT = pct(50)
  const MINIMUM_ACCEPTANCE_QUORUM = pct(20)

  before('deploy and mint tokens', async () => {
    const token = await deployer.deployToken({})
    await token.generateTokens(holder51, bigExp(51, 18))
    await token.generateTokens(holder29, bigExp(29, 18))
    await token.generateTokens(holder20, bigExp(20, 18))
  })

  beforeEach('deploy voting', async () => {
    voting = await deployer.deployAndInitialize({ owner, supportRequired: REQUIRED_SUPPORT, minimumAcceptanceQuorum: MINIMUM_ACCEPTANCE_QUORUM, voteDuration: VOTE_DURATION, overruleWindow: OVERRULE_WINDOW })
  })

  describe('execute', () => {
    let voteId, executionTarget, script
    const from = holder51

    context('with an empty script', () => {
      beforeEach('create script', async () => {
        ({ script } = await voteScript(0))
      })

      it('cannot be executed', async () => {
        ({ voteId } = await createVote({ voting, script, from }))

        await assertRevert(voting.executeVote(voteId), VOTING_ERRORS.VOTING_CANNOT_EXECUTE)
      })
    })

    context('with an executable script', () => {
      const itCanBeExecuted = expectedExecutions => {
        beforeEach('create script', async () => {
          ({ executionTarget, script } = await voteScript(expectedExecutions))
        })

        beforeEach('create vote', async () => {
          ({ voteId } = await createVote({ voting, script, from }))
        })

        it('is not automatically executed', async () => {
          assertBn(await executionTarget.counter(), 0, 'should not have received execution call')
        })

        it('cannot be executed immediately executed', async () => {
          await assertRevert(voting.executeVote(voteId), VOTING_ERRORS.VOTING_CANNOT_EXECUTE)
        })

        it('cannot execute vote if the minimum acceptance quorum is not met', async () => {
          await voting.vote(voteId, true, { from: holder20 })
          await voting.mockIncreaseTime(VOTE_DURATION)

          await assertRevert(voting.executeVote(voteId), VOTING_ERRORS.VOTING_CANNOT_EXECUTE)
        })

        it('cannot execute vote if the required support is not met', async () => {
          await voting.vote(voteId, false, { from: holder29 })
          await voting.vote(voteId, false, { from: holder20 })
          await voting.mockIncreaseTime(VOTE_DURATION)

          await assertRevert(voting.executeVote(voteId), VOTING_ERRORS.VOTING_CANNOT_EXECUTE)
        })

        it('can be executed if quorum and support are met', async () => {
          await voting.vote(voteId, true, { from: holder51 })
          await voting.mockIncreaseTime(VOTE_DURATION)
          await voting.executeVote(voteId)

          assertBn(await executionTarget.counter(), expectedExecutions, 'execution times do not match')
        })

        it('cannot be executed twice', async () => {
          await voting.vote(voteId, true, { from: holder51 })
          await voting.mockIncreaseTime(VOTE_DURATION)
          await voting.executeVote(voteId)

          await assertRevert(voting.executeVote(voteId), VOTING_ERRORS.VOTING_CANNOT_EXECUTE)
        })
      }

      context('with a single action script', () => {
        itCanBeExecuted(1)
      })

      context('with a multiple action script', () => {
        itCanBeExecuted(3)
      })
    })

    context('with a failing script', async () => {
      beforeEach('create script', async () => {
        ({ script } = await voteScript(1))
        script = script.slice(0, -2) // remove one byte from calldata for it to fail
      })

      it('reverts', async () => {
        ({ voteId } = await createVote({ voting, script, from }))

        await voting.vote(voteId, true, { from: holder51 })
        await voting.mockIncreaseTime(VOTE_DURATION)

        await assertRevert(voting.executeVote(voteId), ARAGON_OS_ERRORS.EVMCALLS_INVALID_LENGTH)
      })
    })
  })
})
