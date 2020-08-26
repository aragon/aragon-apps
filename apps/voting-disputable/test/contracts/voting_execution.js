const deployer = require('../helpers/deployer')(web3, artifacts)
const { voteScript, createVote } = require('../helpers/voting')
const { VOTING_ERRORS, ARAGON_OS_ERRORS } = require('../helpers/errors')

const { ONE_DAY, bigExp, pct16 } = require('@aragon/contract-helpers-test')
const { assertBn, assertRevert } = require('@aragon/contract-helpers-test/src/asserts')

contract('Voting', ([_, owner, holder20, holder29, holder51]) => {
  let voting, voteId, executionTarget, script

  const VOTE_DURATION = 5 * ONE_DAY
  const DELEGATED_VOTING_PERIOD = ONE_DAY * 4
  const REQUIRED_SUPPORT = pct16(50)
  const MINIMUM_ACCEPTANCE_QUORUM = pct16(20)

  before('deploy and mint tokens', async () => {
    const token = await deployer.deployToken({})
    await token.generateTokens(holder51, bigExp(51, 18))
    await token.generateTokens(holder29, bigExp(29, 18))
    await token.generateTokens(holder20, bigExp(20, 18))
  })

  const itCanBeExecuted = (expectedExecutions, testSuccessfulExecution) => {
    beforeEach('create script', async () => {
      ({ executionTarget, script } = await voteScript(expectedExecutions))
    })

    beforeEach('create vote', async () => {
      ({ voteId } = await createVote({ voting, script, from: holder51 }))
    })

    context('when support and quorum are not met', async () => {
      it('is not automatically executed', async () => {
        assertBn(await executionTarget.counter(), 0, 'should not have received execution call')
      })

      it('cannot be immediately executed', async () => {
        await assertRevert(voting.executeVote(voteId, script), VOTING_ERRORS.VOTING_CANNOT_EXECUTE)
      })

      it('cannot execute vote if the minimum acceptance quorum is not met', async () => {
        await voting.vote(voteId, true, { from: holder20 })
        await voting.mockIncreaseTime(VOTE_DURATION)

        await assertRevert(voting.executeVote(voteId, script), VOTING_ERRORS.VOTING_CANNOT_EXECUTE)
      })

      it('cannot execute vote if the required support is not met', async () => {
        await voting.vote(voteId, false, { from: holder29 })
        await voting.vote(voteId, false, { from: holder20 })
        await voting.mockIncreaseTime(VOTE_DURATION)

        await assertRevert(voting.executeVote(voteId, script), VOTING_ERRORS.VOTING_CANNOT_EXECUTE)
      })
    })

    context('when support and quorum are met', async () => {
      testSuccessfulExecution(expectedExecutions)
    })
  }

  describe('execute', () => {
    context('without delayed execution', () => {
      const DELAYED_EXECUTION = 0

      beforeEach('deploy voting', async () => {
        voting = await deployer.deployAndInitialize({ owner, supportRequired: REQUIRED_SUPPORT, minimumAcceptanceQuorum: MINIMUM_ACCEPTANCE_QUORUM, voteDuration: VOTE_DURATION, delegatedVotingPeriod: DELEGATED_VOTING_PERIOD, executionDelay: DELAYED_EXECUTION })
      })

      context('with an executable script', () => {
        const testSuccessfulExecution = expectedExecutions => {
          it('can be executed if quorum and support are met', async () => {
            await voting.vote(voteId, true, { from: holder51 })
            await voting.mockIncreaseTime(VOTE_DURATION)

            await voting.executeVote(voteId, script)

            assertBn(await executionTarget.counter(), expectedExecutions, 'execution times do not match')
          })

          it('cannot be executed twice', async () => {
            await voting.vote(voteId, true, { from: holder51 })
            await voting.mockIncreaseTime(VOTE_DURATION)

            await voting.executeVote(voteId, script)

            await assertRevert(voting.executeVote(voteId, script), VOTING_ERRORS.VOTING_CANNOT_EXECUTE)
          })

          it('cannot be executed with a wrong script', async () => {
            await voting.vote(voteId, true, { from: holder51 })
            await voting.mockIncreaseTime(VOTE_DURATION)

            await assertRevert(voting.executeVote(voteId, `${script}ab`), VOTING_ERRORS.VOTING_INVALID_EXECUTION_SCRIPT)
          })
        }

        context('with a single action script', () => {
          itCanBeExecuted(1, testSuccessfulExecution)
        })

        context('with a multiple action script', () => {
          itCanBeExecuted(3, testSuccessfulExecution)
        })
      })

      context('with an empty script', () => {
        beforeEach('create script', async () => {
          ({ script } = await voteScript(0))
        })

        it('cannot be executed', async () => {
          ({ voteId } = await createVote({ voting, script, from: holder51 }))

          await assertRevert(voting.executeVote(voteId, script), VOTING_ERRORS.VOTING_CANNOT_EXECUTE)
        })
      })

      context('with a failing script', async () => {
        beforeEach('create script', async () => {
          ({ script } = await voteScript())
          script = script.slice(0, -2) // remove one byte from calldata for it to fail
        })

        it('reverts', async () => {
          ({ voteId } = await createVote({ voting, script, from: holder51 }))

          await voting.vote(voteId, true, { from: holder51 })
          await voting.mockIncreaseTime(VOTE_DURATION)

          await assertRevert(voting.executeVote(voteId, script), ARAGON_OS_ERRORS.EVMCALLS_INVALID_LENGTH)
        })
      })
    })

    context('with delayed execution', () => {
      const EXECUTION_DELAY = ONE_DAY

      beforeEach('deploy voting', async () => {
        voting = await deployer.deployAndInitialize({ owner, supportRequired: REQUIRED_SUPPORT, minimumAcceptanceQuorum: MINIMUM_ACCEPTANCE_QUORUM, voteDuration: VOTE_DURATION, delegatedVotingPeriod: DELEGATED_VOTING_PERIOD, executionDelay: EXECUTION_DELAY })
      })

      context('with an executable script', () => {
        const testSuccessfulExecution = expectedExecutions => {
          it('cannot be executed if quorum and support are met before the delayed execution', async () => {
            await voting.vote(voteId, true, { from: holder51 })
            await voting.mockIncreaseTime(VOTE_DURATION)

            await assertRevert(voting.executeVote(voteId, script), VOTING_ERRORS.VOTING_CANNOT_EXECUTE)
          })

          it('can be executed if quorum and support are met after the delayed execution', async () => {
            await voting.vote(voteId, true, { from: holder51 })
            await voting.mockIncreaseTime(VOTE_DURATION + EXECUTION_DELAY)

            await voting.executeVote(voteId, script)

            assertBn(await executionTarget.counter(), expectedExecutions, 'execution times do not match')
          })

          it('cannot be executed twice', async () => {
            await voting.vote(voteId, true, { from: holder51 })
            await voting.mockIncreaseTime(VOTE_DURATION + EXECUTION_DELAY)

            await voting.executeVote(voteId, script)

            await assertRevert(voting.executeVote(voteId, script), VOTING_ERRORS.VOTING_CANNOT_EXECUTE)
          })

          it('cannot be executed with a wrong script', async () => {
            await voting.vote(voteId, true, { from: holder51 })
            await voting.mockIncreaseTime(VOTE_DURATION + EXECUTION_DELAY)

            await assertRevert(voting.executeVote(voteId, `${script}ab`), VOTING_ERRORS.VOTING_INVALID_EXECUTION_SCRIPT)
          })
        }

        context('with a single action script', () => {
          itCanBeExecuted(1, testSuccessfulExecution)
        })

        context('with a multiple action script', () => {
          itCanBeExecuted(3, testSuccessfulExecution)
        })
      })
    })
  })
})
