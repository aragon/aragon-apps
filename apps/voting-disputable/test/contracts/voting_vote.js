const VOTER_STATE = require('../helpers/state')
const { ARAGON_OS_ERRORS, VOTING_ERRORS } = require('../helpers/errors')
const { createVote, voteScript, getVoteState } = require('../helpers/voting')
const { ONE_DAY, pct16, bn, bigExp, getEventArgument } = require('@aragon/contract-helpers-test')
const { assertBn, assertRevert, assertEvent, assertAmountOfEvents } = require('@aragon/contract-helpers-test/src/asserts')

const deployer = require('../helpers/deployer')(web3, artifacts)

contract('Voting', ([_, owner, holder1, holder2, holder20, holder29, holder51, nonHolder]) => {
  let voting, token

  const CONTEXT = '0xabcdef'
  const VOTE_DURATION = 5 * ONE_DAY
  const OVERRULE_WINDOW = ONE_DAY
  const EXECUTION_DELAY = 0
  const REQUIRED_SUPPORT = pct16(50)
  const MINIMUM_ACCEPTANCE_QUORUM = pct16(20)

  beforeEach('deploy voting', async () => {
    voting = await deployer.deploy({ owner })
  })

  describe('newVote', () => {
    it('it is a forwarder', async () => {
      assert.isTrue(await voting.isForwarder())
    })

    context('when the app was not initialized', async () => {
      it('fails creating a vote', async () => {
        await assertRevert(createVote({ voting, script: false }), ARAGON_OS_ERRORS.APP_AUTH_FAILED)
      })

      it('fails to forward actions', async () => {
        const { script } = await voteScript()
        await assertRevert(voting.forward(script, { from: holder51 }), VOTING_ERRORS.VOTING_CANNOT_FORWARD)
      })
    })

    context('when the app was initialized', () => {
      beforeEach('initialize voting', async () => {
        token = await deployer.deployToken({})
        voting.initialize(token.address, REQUIRED_SUPPORT, MINIMUM_ACCEPTANCE_QUORUM, VOTE_DURATION, OVERRULE_WINDOW, EXECUTION_DELAY)
      })

      context('when there is some supply', () => {
        let voteId

        context('with normal token supply', () => {
          let script, executionTarget

          beforeEach('mint tokens', async () => {
            await deployer.token.generateTokens(holder51, bigExp(51, 18))
            await deployer.token.generateTokens(holder29, bigExp(29, 18))
            await deployer.token.generateTokens(holder20, bigExp(20, 18))
          })

          beforeEach('build script', async () => {
            ({ script, executionTarget } = await voteScript())
          })

          beforeEach('create vote', async () => {
            ({ voteId, receipt } = await createVote({ voting, script, voteContext: CONTEXT, from: holder51 }))
          })

          it('can be forwarded', async () => {
            const receipt = await voting.forward(script, { from: holder51 })
            voteId = getEventArgument(receipt, 'StartVote', 'voteId')

            assertBn(voteId, 1, 'voting should have been created')
          })

          it('emits an event', async () => {
            assertAmountOfEvents(receipt, 'StartVote')
            assertEvent(receipt, 'StartVote', { expectedArgs: { voteId, creator: holder51, context: CONTEXT } })
          })

          it('has correct state', async () => {
            const { isOpen, isExecuted, snapshotBlock, support, quorum, overruleWindow, yeas, nays, votingPower, script: execScript } = await getVoteState(voting, voteId)

            assert.isTrue(isOpen, 'vote should be open')
            assert.isFalse(isExecuted, 'vote should not be executed')
            assertBn(snapshotBlock, await web3.eth.getBlockNumber() - 1, 'snapshot block should be correct')
            assertBn(support, REQUIRED_SUPPORT, 'required support should be app required support')
            assertBn(quorum, MINIMUM_ACCEPTANCE_QUORUM, 'min quorum should be app min quorum')
            assertBn(overruleWindow, OVERRULE_WINDOW, 'default overrule window should be correct')
            assertBn(yeas, 0, 'initial yea should be 0')
            assertBn(nays, 0, 'initial nay should be 0')
            assertBn(votingPower, bigExp(100, 18), 'voting power should be 100')
            assert.equal(execScript, script, 'script should be correct')
            assertBn(await voting.getVoterState(voteId, nonHolder), VOTER_STATE.ABSENT, 'nonHolder should not have voted')
          })

          it('fails getting a vote out of bounds', async () => {
            await assertRevert(voting.getVote(voteId + 1), VOTING_ERRORS.VOTING_NO_VOTE)
          })

          it('holder can vote', async () => {
            await voting.vote(voteId, false, { from: holder29 })
            const { nays } = await getVoteState(voting, voteId)
            const voterState = await voting.getVoterState(voteId, holder29)

            assertBn(nays, bigExp(29, 18), 'nay vote should have been counted')
            assert.equal(voterState, VOTER_STATE.NAY, 'holder29 should have nay voter status')
          })

          it('holder can modify vote', async () => {
            await voting.vote(voteId, true, { from: holder29 })
            const firstTime = await getVoteState(voting, voteId)
            assertBn(firstTime.nays, 0, 'nay vote should have been removed')
            assertBn(firstTime.yeas, bigExp(29, 18), 'yea vote should have been counted')

            await voting.vote(voteId, false, { from: holder29 })
            const secondTime = await getVoteState(voting, voteId)
            assertBn(secondTime.nays, bigExp(29, 18), 'nay vote should have been removed')
            assertBn(secondTime.yeas, 0, 'yea vote should have been counted')

            await voting.vote(voteId, true, { from: holder29 })
            const thirdTime = await getVoteState(voting, voteId)
            assertBn(thirdTime.nays, 0, 'nay vote should have been removed')
            assertBn(thirdTime.yeas, bigExp(29, 18), 'yea vote should have been counted')
          })

          it('token transfers dont affect voting', async () => {
            await token.transfer(nonHolder, bigExp(29, 18), { from: holder29 })

            await voting.vote(voteId, true, { from: holder29 })
            const { yeas } = await getVoteState(voting, voteId)

            assertBn(yeas, bigExp(29, 18), 'yea vote should have been counted')
            assert.equal(await token.balanceOf(holder29), 0, 'balance should be 0 at current block')
          })

          it('throws when non-holder votes', async () => {
            await assertRevert(voting.vote(voteId, true, { from: nonHolder }), VOTING_ERRORS.VOTING_CANNOT_VOTE)
          })

          it('throws when voting after voting closes', async () => {
            await voting.mockIncreaseTime(VOTE_DURATION)
            await assertRevert(voting.vote(voteId, true, { from: holder29 }), VOTING_ERRORS.VOTING_CANNOT_VOTE)
          })

          it('cannot vote on executed vote', async () => {
            await voting.vote(voteId, true, { from: holder51 })
            await voting.mockIncreaseTime(VOTE_DURATION)
            await voting.executeVote(voteId)

            await assertRevert(voting.vote(voteId, true, { from: holder20 }), VOTING_ERRORS.VOTING_CANNOT_VOTE)
          })
        })

        context('token supply = 1', () => {
          beforeEach('mint tokens', async () => {
            await token.generateTokens(holder1, 1)
          })

          it('new vote cannot be executed before voting', async () => {
            // Account creating vote does not have any tokens and therefore doesn't vote
            ({ voteId } = await createVote({ voting, script: false }))

            assert.isFalse(await voting.canExecute(voteId), 'vote cannot be executed')

            await voting.vote(voteId, true, { from: holder1 })
            await voting.mockIncreaseTime(VOTE_DURATION)
            await voting.executeVote(voteId)

            const { isOpen, isExecuted } = await getVoteState(voting, voteId)

            assert.isFalse(isOpen, 'vote should be closed')
            assert.isTrue(isExecuted, 'vote should have been executed')
          })

          it('creates a vote without executing', async () => {
            ({ voteId } = await createVote({ voting, script: false, from: holder1 }))

            const { isOpen, isExecuted } = await getVoteState(voting, voteId)
            assert.isTrue(isOpen, 'vote should be open')
            assert.isFalse(isExecuted, 'vote should not have been executed')
          })
        })

        context('token supply = 3', () => {
          beforeEach('mint tokens', async () => {
            await token.generateTokens(holder1, 1)
            await token.generateTokens(holder2, 2)
          })

          it('new vote cannot be executed even after holder2 voting', async () => {
            ({ voteId } = await createVote({ voting, script: false }))

            await voting.vote(voteId, true, { from: holder1 })
            await voting.vote(voteId, true, { from: holder2 })

            const { isOpen, isExecuted } = await getVoteState(voting, voteId)
            assert.isTrue(isOpen, 'vote should still be open')
            assert.isFalse(isExecuted, 'vote should have not been executed')
            assert.isFalse(await voting.canExecute(voteId), 'vote cannot be executed')
          })

          it('creating vote as holder2 does not execute vote', async () => {
            ({ voteId } = await createVote({ voting, script: false, from: holder2 }))

            const { isOpen, isExecuted } = await getVoteState(voting, voteId)
            assert.isTrue(isOpen, 'vote should still be open')
            assert.isFalse(isExecuted, 'vote should have not been executed')
            assert.isFalse(await voting.canExecute(voteId), 'vote cannot be executed')
          })
        })

        context('with changing token supply', () => {
          beforeEach('mint tokens', async () => {
            await token.generateTokens(holder1, 1)
            await token.generateTokens(holder2, 1)
          })

          it('uses the correct snapshot value if tokens are minted afterwards', async () => {
            // Create vote and afterwards generate some tokens
            ({ voteId } = await createVote({ voting, script: false }))
            await token.generateTokens(holder2, 1)

            const { snapshotBlock, votingPower } = await getVoteState(voting, voteId)

            // Generating tokens advanced the block by one
            assertBn(snapshotBlock, await web3.eth.getBlockNumber() - 2, 'snapshot block should be correct')
            assertBn(votingPower, await token.totalSupplyAt(snapshotBlock), 'voting power should match snapshot supply')
            assertBn(votingPower, 2, 'voting power should be correct')
          })

          it('uses the correct snapshot value if tokens are minted in the same block', async () => {
            // Create vote and generate some tokens in the same transaction
            // Requires the voting mock to be the token's owner
            await token.changeController(voting.address)
            const receipt = await voting.newTokenAndVote(holder2, 1, CONTEXT)
            voteId = getEventArgument(receipt, 'StartVote', 'voteId')

            const { snapshotBlock, votingPower } = await getVoteState(voting, voteId)

            assertBn(snapshotBlock, await web3.eth.getBlockNumber() - 1, 'snapshot block should be correct')
            assertBn(votingPower, await token.totalSupplyAt(snapshotBlock), 'voting power should match snapshot supply')
            assertBn(votingPower, 2, 'voting power should be correct')
          })
        })
      })

      context('when there is no supply', () => {
        it('reverts', async () => {
          await assertRevert(createVote({ voting, script: false }), VOTING_ERRORS.VOTING_NO_VOTING_POWER)
        })
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
