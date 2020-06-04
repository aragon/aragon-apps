const VOTER_STATE = require('../helpers/state')
const getBlockNumber = require('@aragon/contract-test-helpers/blockNumber')(web3)
const { bn, bigExp } = require('@aragon/apps-agreement/test/helpers/lib/numbers')
const { assertBn } = require('@aragon/apps-agreement/test/helpers/assert/assertBn')
const { assertRevert } = require('@aragon/apps-agreement/test/helpers/assert/assertThrow')
const { pct, getVoteState } = require('../helpers/voting')
const { assertAmountOfEvents } = require('@aragon/apps-agreement/test/helpers/assert/assertEvent')
const { encodeCallScript } = require('@aragon/contract-test-helpers/evmScript')
const { makeErrorMappingProxy } = require('@aragon/contract-test-helpers/utils')
const { getEventArgument, getNewProxyAddress } = require('@aragon/contract-test-helpers/events')

const Voting = artifacts.require('DisputableVotingWithoutAgreementMock')

const ACL = artifacts.require('ACL')
const Kernel = artifacts.require('Kernel')
const DAOFactory = artifacts.require('DAOFactory')
const MiniMeToken = artifacts.require('MiniMeToken')
const ExecutionTarget = artifacts.require('ExecutionTarget')
const EVMScriptRegistryFactory = artifacts.require('EVMScriptRegistryFactory')

const createdVoteId = receipt => getEventArgument(receipt, 'StartVote', 'voteId')

const EMPTY_SCRIPT = '0x00000001'
const ANY_ADDR = '0xffffffffffffffffffffffffffffffffffffffff'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

contract('Voting App', ([root, holder1, holder2, holder20, holder29, holder51, nonHolder]) => {
    let votingBase, daoFact, voting, token, executionTarget

    let APP_MANAGER_ROLE
    let CREATE_VOTES_ROLE, MODIFY_SUPPORT_ROLE, MODIFY_QUORUM_ROLE

    const NOW = 1553703809  // random fixed timestamp in seconds
    const ONE_DAY = 60 * 60 * 24
    const VOTING_DURATION = ONE_DAY * 5

    // Error strings
    const ERRORS = makeErrorMappingProxy({
        // aragonOS errors
        APP_AUTH_FAILED: 'APP_AUTH_FAILED',
        INIT_ALREADY_INITIALIZED: 'INIT_ALREADY_INITIALIZED',
        INIT_NOT_INITIALIZED: 'INIT_NOT_INITIALIZED',
        RECOVER_DISALLOWED: 'RECOVER_DISALLOWED',

        // Voting errors
        VOTING_NO_VOTE: 'VOTING_NO_VOTE',
        VOTING_INIT_PCTS: 'VOTING_INIT_PCTS',
        VOTING_CHANGE_SUPPORT_PCTS: 'VOTING_CHANGE_SUPPORT_PCTS',
        VOTING_CHANGE_QUORUM_PCTS: 'VOTING_CHANGE_QUORUM_PCTS',
        VOTING_INIT_SUPPORT_TOO_BIG: 'VOTING_INIT_SUPPORT_TOO_BIG',
        VOTING_CHANGE_SUPP_TOO_BIG: 'VOTING_CHANGE_SUPP_TOO_BIG',
        VOTING_CANNOT_VOTE: 'VOTING_CANNOT_VOTE',
        VOTING_CANNOT_EXECUTE: 'VOTING_CANNOT_EXECUTE',
        VOTING_CANNOT_FORWARD: 'VOTING_CANNOT_FORWARD',
        VOTING_NO_VOTING_POWER: 'VOTING_NO_VOTING_POWER',
    })

    before(async () => {
        const kernelBase = await Kernel.new(true) // petrify immediately
        const aclBase = await ACL.new()
        const regFact = await EVMScriptRegistryFactory.new()
        daoFact = await DAOFactory.new(kernelBase.address, aclBase.address, regFact.address)
        votingBase = await Voting.new()

        // Setup constants
        APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()
        CREATE_VOTES_ROLE = await votingBase.CREATE_VOTES_ROLE()
        MODIFY_SUPPORT_ROLE = await votingBase.MODIFY_SUPPORT_ROLE()
        MODIFY_QUORUM_ROLE = await votingBase.MODIFY_QUORUM_ROLE()
    })

    beforeEach(async () => {
        const r = await daoFact.newDAO(root)
        const dao = await Kernel.at(getEventArgument(r, 'DeployDAO', 'dao'))
        const acl = await ACL.at(await dao.acl())

        await acl.createPermission(root, dao.address, APP_MANAGER_ROLE, root, { from: root })

        const receipt = await dao.newAppInstance('0x1234', votingBase.address, '0x', false, { from: root })
        voting = await Voting.at(getNewProxyAddress(receipt))
        await voting.mockSetTimestamp(NOW)

        await acl.createPermission(ANY_ADDR, voting.address, CREATE_VOTES_ROLE, root, { from: root })
        await acl.createPermission(ANY_ADDR, voting.address, MODIFY_SUPPORT_ROLE, root, { from: root })
        await acl.createPermission(ANY_ADDR, voting.address, MODIFY_QUORUM_ROLE, root, { from: root })
    })

    context('normal token supply, common tests', () => {
        const neededSupport = pct(50)
        const minimumAcceptanceQuorum = pct(20)

        beforeEach(async () => {
            token = await MiniMeToken.new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'n', 0, 'n', true) // empty parameters minime

            await voting.initialize(token.address, neededSupport, minimumAcceptanceQuorum, VOTING_DURATION)

            executionTarget = await ExecutionTarget.new()
        })

        it('fails on reinitialization', async () => {
            await assertRevert(voting.initialize(token.address, neededSupport, minimumAcceptanceQuorum, VOTING_DURATION), ERRORS.INIT_ALREADY_INITIALIZED)
        })

        it('cannot initialize base app', async () => {
            const newVoting = await Voting.new()
            assert.isTrue(await newVoting.isPetrified())
            await assertRevert(newVoting.initialize(token.address, neededSupport, minimumAcceptanceQuorum, VOTING_DURATION), ERRORS.INIT_ALREADY_INITIALIZED)
        })

        it('checks it is forwarder', async () => {
            assert.isTrue(await voting.isForwarder())
        })

        it('can change required support', async () => {
            const receipt = await voting.changeSupportRequiredPct(neededSupport.add(bn(1)))
            assertAmountOfEvents(receipt, 'ChangeSupportRequired')

            assertBn(await voting.supportRequiredPct(), neededSupport.add(bn(1)), 'should have changed required support')
        })

        it('fails changing required support lower than minimum acceptance quorum', async () => {
            await assertRevert(voting.changeSupportRequiredPct(minimumAcceptanceQuorum.sub(bn(1))), ERRORS.VOTING_CHANGE_SUPPORT_PCTS)
        })

        it('fails changing required support to 100% or more', async () => {
            await assertRevert(voting.changeSupportRequiredPct(pct(101)), ERRORS.VOTING_CHANGE_SUPP_TOO_BIG)
            await assertRevert(voting.changeSupportRequiredPct(pct(100)), ERRORS.VOTING_CHANGE_SUPP_TOO_BIG)
        })

        it('can change minimum acceptance quorum', async () => {
            const receipt = await voting.changeMinAcceptQuorumPct(1)
            assertAmountOfEvents(receipt, 'ChangeMinQuorum')

            assert.equal(await voting.minAcceptQuorumPct(), 1, 'should have changed acceptance quorum')
        })

        it('fails changing minimum acceptance quorum to greater than min support', async () => {
            await assertRevert(voting.changeMinAcceptQuorumPct(neededSupport.add(bn(1))), ERRORS.VOTING_CHANGE_QUORUM_PCTS)
        })

        it('does not have an overrule window by default', async () => {
            assertBn(await voting.overruleWindow(), 0, 'overrule window does not match')
        })
    })

    for (const decimals of [0, 2, 18, 26]) {
        context(`normal token supply, ${decimals} decimals`, () => {
            const neededSupport = pct(50)
            const minimumAcceptanceQuorum = pct(20)

            beforeEach(async () => {
                token = await MiniMeToken.new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'n', decimals, 'n', true) // empty parameters minime

                await token.generateTokens(holder20, bigExp(20, decimals))
                await token.generateTokens(holder29, bigExp(29, decimals))
                await token.generateTokens(holder51, bigExp(51, decimals))

                await voting.initialize(token.address, neededSupport, minimumAcceptanceQuorum, VOTING_DURATION)

                executionTarget = await ExecutionTarget.new()
            })

            it('deciding voting is not automatically executed', async () => {
                const script = encodeCallScript([{ to: executionTarget.address, calldata: executionTarget.contract.methods.execute().encodeABI() }])
                await voting.newVote(script, '', { from: holder51 })
                assertBn(await executionTarget.counter(), 0, 'should have received execution call')
            })

            it('execution scripts can execute multiple actions', async () => {
                const action = { to: executionTarget.address, calldata: executionTarget.contract.methods.execute().encodeABI() }
                const script = encodeCallScript([action, action, action])

                const receipt = await voting.newVote(script, '', { from: holder51 })
                const voteId = getEventArgument(receipt, 'StartVote', 'voteId')

                await voting.vote(voteId, true, { from: holder51 })
                await voting.mockIncreaseTime(VOTING_DURATION)
                await voting.executeVote(voteId)
                assertBn(await executionTarget.counter(), 3, 'should have executed multiple times')
            })

            it('execution script can be empty', async () => {
                await voting.newVote(encodeCallScript([]), '', { from: holder51 })
            })

            it('execution throws if any action on script throws', async () => {
                let script = encodeCallScript([{ to: executionTarget.address, calldata: executionTarget.contract.methods.execute().encodeABI() }])
                script = script.slice(0, -2) // remove one byte from calldata for it to fail

                const receipt = await voting.newVote(script, '', { from: holder51 })
                const voteId = getEventArgument(receipt, 'StartVote', 'voteId')

                await voting.mockIncreaseTime(VOTING_DURATION)
                await assertRevert(voting.executeVote(voteId))
            })

            it('forwarding creates vote', async () => {
                const script = encodeCallScript([{ to: executionTarget.address, calldata: executionTarget.contract.methods.execute().encodeABI() }])
                const voteId = createdVoteId(await voting.forward(script, { from: holder51 }))
                assertBn(voteId, 0, 'voting should have been created')
            })

            context('creating vote', () => {
                let script, voteId, creator, metadata

                beforeEach(async () => {
                    const action = { to: executionTarget.address, calldata: executionTarget.contract.methods.execute().encodeABI() }
                    script = encodeCallScript([action, action])

                    const receipt = await voting.newVote(script, 'metadata', { from: holder51 })
                    voteId = getEventArgument(receipt, 'StartVote', 'voteId')
                    creator = getEventArgument(receipt, 'StartVote', 'creator')
                    metadata = getEventArgument(receipt, 'StartVote', 'metadata')
                })

                it('has correct state', async () => {
                    const { isOpen, isExecuted, snapshotBlock, support, quorum, overruleWindow, yeas, nays, votingPower, script: execScript } = await getVoteState(voting, voteId)

                    assert.isTrue(isOpen, 'vote should be open')
                    assert.isFalse(isExecuted, 'vote should not be executed')
                    assert.equal(creator, holder51, 'creator should be correct')
                    assertBn(snapshotBlock, await getBlockNumber() - 1, 'snapshot block should be correct')
                    assertBn(support, neededSupport, 'required support should be app required support')
                    assertBn(quorum, minimumAcceptanceQuorum, 'min quorum should be app min quorum')
                    assertBn(overruleWindow, 0, 'default overrule window should be zero')
                    assertBn(yeas, 0, 'initial yea should be 0')
                    assertBn(nays, 0, 'initial nay should be 0')
                    assertBn(votingPower, bigExp(100, decimals), 'voting power should be 100')
                    assert.equal(execScript, script, 'script should be correct')
                    assert.equal(metadata, 'metadata', 'should have returned correct metadata')
                    assertBn(await voting.getVoterState(voteId, nonHolder), VOTER_STATE.ABSENT, 'nonHolder should not have voted')
                })

                it('fails getting a vote out of bounds', async () => {
                    await assertRevert(voting.getVote(voteId + 1), ERRORS.VOTING_NO_VOTE)
                })

                it('changing required support does not affect vote required support', async () => {
                    await voting.changeSupportRequiredPct(pct(70))

                    // With previous required support at 50%, vote should be approved
                    // with new quorum at 70% it shouldn't have, but since min quorum is snapshotted
                    // it will succeed

                    await voting.vote(voteId, true, { from: holder51 })
                    await voting.vote(voteId, true, { from: holder20 })
                    await voting.vote(voteId, false, { from: holder29 })
                    await voting.mockIncreaseTime(VOTING_DURATION + 1)

                    const { support } = await getVoteState(voting, voteId)
                    assertBn(support, neededSupport, 'required support in vote should stay equal')
                    await voting.executeVote(voteId) // exec doesn't fail
                })

                it('changing min quorum doesnt affect vote min quorum', async () => {
                    await voting.changeMinAcceptQuorumPct(pct(50))

                    // With previous min acceptance quorum at 20%, vote should be approved
                    // with new quorum at 50% it shouldn't have, but since min quorum is snapshotted
                    // it will succeed

                    await voting.vote(voteId, true, { from: holder29 })
                    await voting.mockIncreaseTime(VOTING_DURATION + 1)

                    const { quorum } = await getVoteState(voting, voteId)
                    assertBn(quorum, minimumAcceptanceQuorum, 'acceptance quorum in vote should stay equal')
                    await voting.executeVote(voteId) // exec doesn't fail
                })

                it('holder can vote', async () => {
                    await voting.vote(voteId, false, { from: holder29 })
                    const { nays } = await getVoteState(voting, voteId)
                    const voterState = await voting.getVoterState(voteId, holder29)

                    assertBn(nays, bigExp(29, decimals), 'nay vote should have been counted')
                    assert.equal(voterState, VOTER_STATE.NAY, 'holder29 should have nay voter status')
                })

                it('holder can modify vote', async () => {
                    await voting.vote(voteId, true, { from: holder29 })
                    await voting.vote(voteId, false, { from: holder29 })
                    await voting.vote(voteId, true, { from: holder29 })
                    const { yeas, nays } = await getVoteState(voting, voteId)

                    assertBn(nays, 0, 'nay vote should have been removed')
                    assertBn(yeas, bigExp(29, decimals), 'yea vote should have been counted')
                })

                it('token transfers dont affect voting', async () => {
                    await token.transfer(nonHolder, bigExp(29, decimals), { from: holder29 })

                    await voting.vote(voteId, true, { from: holder29 })
                    const { yeas } = await getVoteState(voting, voteId)

                    assertBn(yeas, bigExp(29, decimals), 'yea vote should have been counted')
                    assert.equal(await token.balanceOf(holder29), 0, 'balance should be 0 at current block')
                })

                it('throws when non-holder votes', async () => {
                    await assertRevert(voting.vote(voteId, true, { from: nonHolder }), ERRORS.VOTING_CANNOT_VOTE)
                })

                it('throws when voting after voting closes', async () => {
                    await voting.mockIncreaseTime(VOTING_DURATION + 1)
                    await assertRevert(voting.vote(voteId, true, { from: holder29 }), ERRORS.VOTING_CANNOT_VOTE)
                })

                it('can execute if vote is approved with support and quorum', async () => {
                    await voting.vote(voteId, true, { from: holder29 })
                    await voting.vote(voteId, false, { from: holder20 })
                    await voting.mockIncreaseTime(VOTING_DURATION + 1)
                    await voting.executeVote(voteId)
                    assertBn(await executionTarget.counter(), 2, 'should have executed result')
                })

                it('cannot execute vote if not enough quorum met', async () => {
                    await voting.vote(voteId, true, { from: holder20 })
                    await voting.mockIncreaseTime(VOTING_DURATION + 1)
                    await assertRevert(voting.executeVote(voteId), ERRORS.VOTING_CANNOT_EXECUTE)
                })

                it('cannot execute vote if not support met', async () => {
                    await voting.vote(voteId, false, { from: holder29 })
                    await voting.vote(voteId, false, { from: holder20 })
                    await voting.mockIncreaseTime(VOTING_DURATION + 1)
                    await assertRevert(voting.executeVote(voteId), ERRORS.VOTING_CANNOT_EXECUTE)
                })

                it('vote cannot be executed automatically if decided', async () => {
                    await voting.vote(voteId, true, { from: holder51 })
                    assertBn(await executionTarget.counter(), 0, 'should not have executed result')

                    await voting.mockIncreaseTime(VOTING_DURATION + 1)
                    await voting.executeVote(voteId)
                    assertBn(await executionTarget.counter(), 2, 'should have executed result')
                })

                it('cannot re-execute vote', async () => {
                    await voting.vote(voteId, true, { from: holder51 })
                    await voting.mockIncreaseTime(VOTING_DURATION)
                    await voting.executeVote(voteId)

                    await assertRevert(voting.executeVote(voteId), ERRORS.VOTING_CANNOT_EXECUTE)
                })

                it('cannot vote on executed vote', async () => {
                    await voting.vote(voteId, true, { from: holder51 })
                    await voting.mockIncreaseTime(VOTING_DURATION)
                    await voting.executeVote(voteId)

                    await assertRevert(voting.vote(voteId, true, { from: holder20 }), ERRORS.VOTING_CANNOT_VOTE)
                })
            })
        })
    }

    context('wrong initializations', () => {
        beforeEach(async() => {
            token = await MiniMeToken.new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'n', 0, 'n', true) // empty parameters minime
        })

        it('fails if min acceptance quorum is greater than min support', async () => {
            const neededSupport = pct(20)
            const minimumAcceptanceQuorum = pct(50)
            await assertRevert(voting.initialize(token.address, neededSupport, minimumAcceptanceQuorum, VOTING_DURATION), ERRORS.VOTING_INIT_PCTS)
        })

        it('fails if min support is 100% or more', async () => {
            const minimumAcceptanceQuorum = pct(20)
            await assertRevert(voting.initialize(token.address, pct(101), minimumAcceptanceQuorum, VOTING_DURATION), ERRORS.VOTING_INIT_SUPPORT_TOO_BIG)
            await assertRevert(voting.initialize(token.address, pct(100), minimumAcceptanceQuorum, VOTING_DURATION), ERRORS.VOTING_INIT_SUPPORT_TOO_BIG)
        })
    })

    context('empty token', () => {
        const neededSupport = pct(50)
        const minimumAcceptanceQuorum = pct(20)

        beforeEach(async() => {
            token = await MiniMeToken.new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'n', 0, 'n', true) // empty parameters minime

            await voting.initialize(token.address, neededSupport, minimumAcceptanceQuorum, VOTING_DURATION)
        })

        it('fails creating a vote if token has no holder', async () => {
            await assertRevert(voting.newVote(EMPTY_SCRIPT, 'metadata'), ERRORS.VOTING_NO_VOTING_POWER)
        })
    })

    context('token supply = 1', () => {
        const neededSupport = pct(50)
        const minimumAcceptanceQuorum = pct(20)

        beforeEach(async () => {
            token = await MiniMeToken.new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'n', 0, 'n', true) // empty parameters minime

            await token.generateTokens(holder1, 1)

            await voting.initialize(token.address, neededSupport, minimumAcceptanceQuorum, VOTING_DURATION)
        })

        it('new vote cannot be executed before voting', async () => {
            // Account creating vote does not have any tokens and therefore doesn't vote
            const voteId = createdVoteId(await voting.newVote(EMPTY_SCRIPT, 'metadata'))

            assert.isFalse(await voting.canExecute(voteId), 'vote cannot be executed')

            await voting.vote(voteId, true, { from: holder1 })
            await voting.mockIncreaseTime(VOTING_DURATION)
            await voting.executeVote(voteId)

            const { isOpen, isExecuted } = await getVoteState(voting, voteId)

            assert.isFalse(isOpen, 'vote should be closed')
            assert.isTrue(isExecuted, 'vote should have been executed')

        })

        context('new vote parameters', () => {
            it('creates a vote without executing', async () => {
                const voteId = createdVoteId(await voting.newVote(EMPTY_SCRIPT, 'metadata', { from: holder1 }))
                const { isOpen, isExecuted } = await getVoteState(voting, voteId)

                assert.isTrue(isOpen, 'vote should be open')
                assert.isFalse(isExecuted, 'vote should not have been executed')
            })
        })
    })

    context('token supply = 3', () => {
        const neededSupport = pct(34)
        const minimumAcceptanceQuorum = pct(20)

        beforeEach(async () => {
            token = await MiniMeToken.new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'n', 0, 'n', true) // empty parameters minime

            await token.generateTokens(holder1, 1)
            await token.generateTokens(holder2, 2)

            await voting.initialize(token.address, neededSupport, minimumAcceptanceQuorum, VOTING_DURATION)
        })

        it('new vote cannot be executed even after holder2 voting', async () => {
            const voteId = createdVoteId(await voting.newVote(EMPTY_SCRIPT, 'metadata'))

            await voting.vote(voteId, true, { from: holder1 })
            await voting.vote(voteId, true, { from: holder2 })

            const { isOpen, isExecuted } = await getVoteState(voting, voteId)

            assert.isTrue(isOpen, 'vote should still be open')
            assert.isFalse(isExecuted, 'vote should have not been executed')
            assert.isFalse(await voting.canExecute(voteId), 'vote cannot be executed')
        })

        it('creating vote as holder2 does not execute vote', async () => {
            const voteId = createdVoteId(await voting.newVote(EMPTY_SCRIPT, 'metadata', { from: holder2 }))
            const { isOpen, isExecuted } = await getVoteState(voting, voteId)

            assert.isTrue(isOpen, 'vote should still be open')
            assert.isFalse(isExecuted, 'vote should have not been executed')
            assert.isFalse(await voting.canExecute(voteId), 'vote cannot be executed')
        })
    })

    context('changing token supply', () => {
        const neededSupport = pct(50)
        const minimumAcceptanceQuorum = pct(20)

        beforeEach(async () => {
            token = await MiniMeToken.new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'n', 0, 'n', true) // empty parameters minime

            await token.generateTokens(holder1, 1)
            await token.generateTokens(holder2, 1)

            await voting.initialize(token.address, neededSupport, minimumAcceptanceQuorum, VOTING_DURATION)
        })

        it('uses the correct snapshot value if tokens are minted afterwards', async () => {
            // Create vote and afterwards generate some tokens
            const voteId = createdVoteId(await voting.newVote(EMPTY_SCRIPT, 'metadata'))
            await token.generateTokens(holder2, 1)

            const { snapshotBlock, votingPower } = await getVoteState(voting, voteId)

            // Generating tokens advanced the block by one
            assertBn(snapshotBlock, await getBlockNumber() - 2, 'snapshot block should be correct')
            assertBn(votingPower, await token.totalSupplyAt(snapshotBlock), 'voting power should match snapshot supply')
            assertBn(votingPower, 2, 'voting power should be correct')
        })

        it('uses the correct snapshot value if tokens are minted in the same block', async () => {
            // Create vote and generate some tokens in the same transaction
            // Requires the voting mock to be the token's owner
            await token.changeController(voting.address)
            const voteId = createdVoteId(await voting.newTokenAndVote(holder2, 1, 'metadata'))

            const { snapshotBlock, votingPower } = await getVoteState(voting, voteId)

            assertBn(snapshotBlock, await getBlockNumber() - 1, 'snapshot block should be correct')
            assertBn(votingPower, await token.totalSupplyAt(snapshotBlock), 'voting power should match snapshot supply')
            assertBn(votingPower, 2, 'voting power should be correct')
        })
    })

    context('before init', () => {
        it('fails creating a vote before initialization', async () => {
            await assertRevert(voting.newVote(encodeCallScript([]), ''), ERRORS.APP_AUTH_FAILED)
        })

        it('fails to forward actions before initialization', async () => {
            const script = encodeCallScript([{ to: executionTarget.address, calldata: executionTarget.contract.methods.execute().encodeABI() }])
            await assertRevert(voting.forward(script, { from: holder51 }), ERRORS.VOTING_CANNOT_FORWARD)
        })
    })

    context('isValuePct unit test', async () => {
        it('tests total = 0', async () => {
            const result1 = await voting.isValuePct(0, 0, pct(50))
            assert.equal(result1, false, "total 0 should always return false")
            const result2 = await voting.isValuePct(1, 0, pct(50))
            assert.equal(result2, false, "total 0 should always return false")
        })

        it('tests value = 0', async () => {
            const result1 = await voting.isValuePct(0, 10, pct(50))
            assert.equal(result1, false, "value 0 should false if pct is non-zero")
            const result2 = await voting.isValuePct(0, 10, 0)
            assert.equal(result2, false, "value 0 should return false if pct is zero")
        })

        it('tests pct ~= 100', async () => {
            const result1 = await voting.isValuePct(10, 10, pct(100).sub(bn(1)))
            assert.equal(result1, true, "value 10 over 10 should pass")
        })

        it('tests strict inequality', async () => {
            const result1 = await voting.isValuePct(10, 20, pct(50))
            assert.equal(result1, false, "value 10 over 20 should not pass for 50%")

            const result2 = await voting.isValuePct(pct(50).sub(bn(1)), pct(100), pct(50))
            assert.equal(result2, false, "off-by-one down should not pass")

            const result3 = await voting.isValuePct(pct(50).add(bn(1)), pct(100), pct(50))
            assert.equal(result3, true, "off-by-one up should pass")
        })
    })
})
