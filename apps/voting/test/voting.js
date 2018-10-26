const sha3 = require('solidity-sha3').default

const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const getBlockNumber = require('@aragon/test-helpers/blockNumber')(web3)
const timeTravel = require('@aragon/test-helpers/timeTravel')(web3)
const { encodeCallScript, EMPTY_SCRIPT } = require('@aragon/test-helpers/evmScript')
const ExecutionTarget = artifacts.require('ExecutionTarget')

const DAOFactory = artifacts.require('@aragon/os/contracts/factory/DAOFactory')
const EVMScriptRegistryFactory = artifacts.require('@aragon/os/contracts/factory/EVMScriptRegistryFactory')
const ACL = artifacts.require('@aragon/os/contracts/acl/ACL')
const Kernel = artifacts.require('@aragon/os/contracts/kernel/Kernel')

const MiniMeToken = artifacts.require('@aragon/apps-shared-minime/contracts/MiniMeToken')

const Voting = artifacts.require('VotingMock')

const getContract = name => artifacts.require(name)
const bigExp = (x, y) => new web3.BigNumber(x).times(new web3.BigNumber(10).toPower(y))
const pct16 = x => bigExp(x, 16)
const startVoteEvent = receipt => receipt.logs.filter(x => x.event == 'StartVote')[0].args
const createdVoteId = receipt => startVoteEvent(receipt).voteId

const ANY_ADDR = '0xffffffffffffffffffffffffffffffffffffffff'
const NULL_ADDRESS = '0x00'

const VOTER_STATE = ['ABSENT', 'YEA', 'NAY'].reduce((state, key, index) => {
    state[key] = index;
    return state;
}, {})


contract('Voting App', accounts => {
    let votingBase, daoFact, voting, token, executionTarget

    let APP_MANAGER_ROLE
    let CREATE_VOTES_ROLE, MODIFY_SUPPORT_ROLE, MODIFY_QUORUM_ROLE

    const votingTime = 1000
    const root = accounts[0]

    before(async () => {
        const kernelBase = await getContract('Kernel').new(true) // petrify immediately
        const aclBase = await getContract('ACL').new()
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
        const dao = Kernel.at(r.logs.filter(l => l.event == 'DeployDAO')[0].args.dao)
        const acl = ACL.at(await dao.acl())

        await acl.createPermission(root, dao.address, APP_MANAGER_ROLE, root, { from: root })

        const receipt = await dao.newAppInstance('0x1234', votingBase.address, '0x', false, { from: root })
        voting = Voting.at(receipt.logs.filter(l => l.event == 'NewAppProxy')[0].args.proxy)

        await acl.createPermission(ANY_ADDR, voting.address, CREATE_VOTES_ROLE, root, { from: root })
        await acl.createPermission(ANY_ADDR, voting.address, MODIFY_SUPPORT_ROLE, root, { from: root })
        await acl.createPermission(ANY_ADDR, voting.address, MODIFY_QUORUM_ROLE, root, { from: root })
    })

    context('normal token supply, common tests', () => {
        const holder20 = accounts[0]
        const holder29 = accounts[1]
        const holder51 = accounts[2]
        const nonHolder = accounts[4]

        const neededSupport = pct16(50)
        const minimumAcceptanceQuorum = pct16(20)

        beforeEach(async () => {
            token = await MiniMeToken.new(NULL_ADDRESS, NULL_ADDRESS, 0, 'n', 0, 'n', true) // empty parameters minime

            await voting.initialize(token.address, neededSupport, minimumAcceptanceQuorum, votingTime)

            executionTarget = await ExecutionTarget.new()
        })

        it('fails on reinitialization', async () => {
            return assertRevert(async () => {
                await voting.initialize(token.address, neededSupport, minimumAcceptanceQuorum, votingTime)
            })
        })

        it('cannot initialize base app', async () => {
            const newVoting = await Voting.new()
            assert.isTrue(await newVoting.isPetrified())
            return assertRevert(async () => {
                await newVoting.initialize(token.address, neededSupport, minimumAcceptanceQuorum, votingTime)
            })
        })

        it('checks it is forwarder', async () => {
            assert.isTrue(await voting.isForwarder())
        })

        it('can change required support', async () => {
            const receipt = await voting.changeSupportRequiredPct(neededSupport.add(1))
            const events = receipt.logs.filter(x => x.event == 'ChangeSupportRequired')

            assert.equal(events.length, 1, 'should have emitted ChangeSupportRequired event')
            assert.equal((await voting.supportRequiredPct()).toString(), neededSupport.add(1).toString(), 'should have changed required support')
        })

        it('fails changing required support lower than minimum acceptance quorum', async () => {
            return assertRevert(async () => {
                await voting.changeSupportRequiredPct(minimumAcceptanceQuorum.minus(1))
            })
        })

        it('fails changing required support to 100% or more', async () => {
            await assertRevert(async () => {
                await voting.changeSupportRequiredPct(pct16(101))
            })
            return assertRevert(async () => {
                await voting.changeSupportRequiredPct(pct16(100))
            })
        })

        it('can change minimum acceptance quorum', async () => {
            const receipt = await voting.changeMinAcceptQuorumPct(1)
            const events = receipt.logs.filter(x => x.event == 'ChangeMinQuorum')

            assert.equal(events.length, 1, 'should have emitted ChangeMinQuorum event')
            assert.equal(await voting.minAcceptQuorumPct(), 1, 'should have changed acceptance quorum')
        })

        it('fails changing minimum acceptance quorum to greater than min support', async () => {
            return assertRevert(async () => {
                await voting.changeMinAcceptQuorumPct(neededSupport.plus(1))
            })
        })

    })

    for (const decimals of [0, 2, 18, 26]) {
        context(`normal token supply, ${decimals} decimals`, () => {
            const holder20 = accounts[0]
            const holder29 = accounts[1]
            const holder51 = accounts[2]
            const nonHolder = accounts[4]

            const neededSupport = pct16(50)
            const minimumAcceptanceQuorum = pct16(20)

            beforeEach(async () => {
                token = await MiniMeToken.new(NULL_ADDRESS, NULL_ADDRESS, 0, 'n', decimals, 'n', true) // empty parameters minime

                await token.generateTokens(holder20, bigExp(20, decimals))
                await token.generateTokens(holder29, bigExp(29, decimals))
                await token.generateTokens(holder51, bigExp(51, decimals))

                await voting.initialize(token.address, neededSupport, minimumAcceptanceQuorum, votingTime)

                executionTarget = await ExecutionTarget.new()
            })

            it('deciding voting is automatically executed', async () => {
                const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
                const script = encodeCallScript([action])
                await voting.newVote(script, '', { from: holder51 })
                assert.equal(await executionTarget.counter(), 1, 'should have received execution call')
            })

            it('deciding voting is automatically executed (long version)', async () => {
                const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
                const script = encodeCallScript([action])
                await voting.newVoteExt(script, '', true, true, { from: holder51 })
                assert.equal(await executionTarget.counter(), 1, 'should have received execution call')
            })

            it('execution scripts can execute multiple actions', async () => {
                const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
                const script = encodeCallScript([action, action, action])
                await voting.newVote(script, '', { from: holder51 })
                assert.equal(await executionTarget.counter(), 3, 'should have executed multiple times')
            })

            it('execution script can be empty', async () => {
                await voting.newVote(encodeCallScript([]), '', { from: holder51 })
            })

            it('execution throws if any action on script throws', async () => {
                const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
                let script = encodeCallScript([action])
                script = script.slice(0, -2) // remove one byte from calldata for it to fail
                return assertRevert(async () => {
                    await voting.newVote(script, '', { from: holder51 })
                })
            })

            it('forwarding creates vote', async () => {
                const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
                const script = encodeCallScript([action])
                const voteId = createdVoteId(await voting.forward(script, { from: holder51 }))
                assert.equal(voteId, 0, 'voting should have been created')
            })

            context('creating vote', () => {
                let script, voteId, creator, metadata

                beforeEach(async () => {
                    const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
                    script = encodeCallScript([action, action])
                    const startVote = startVoteEvent(await voting.newVoteExt(script, 'metadata', false, false, { from: holder51 }))
                    voteId = startVote.voteId
                    creator = startVote.creator
                    metadata = startVote.metadata
                })

                it('has correct state', async () => {
                    const [isOpen, isExecuted, startDate, snapshotBlock, supportRequired, minQuorum, y, n, votingPower, execScript] = await voting.getVote(voteId)

                    assert.isTrue(isOpen, 'vote should be open')
                    assert.isFalse(isExecuted, 'vote should not be executed')
                    assert.equal(creator, holder51, 'creator should be correct')
                    assert.equal(snapshotBlock, await getBlockNumber() - 1, 'snapshot block should be correct')
                    assert.equal(supportRequired.toNumber(), neededSupport.toNumber(), 'required support should be app required support')
                    assert.equal(minQuorum.toNumber(), minimumAcceptanceQuorum.toNumber(), 'min quorum should be app min quorum')
                    assert.equal(y, 0, 'initial yea should be 0')
                    assert.equal(n, 0, 'initial nay should be 0')
                    assert.equal(votingPower.toString(), bigExp(100, decimals).toString(), 'total voters should be 100')
                    assert.equal(execScript, script, 'script should be correct')
                    assert.equal(metadata, 'metadata', 'should have returned correct metadata')
                    assert.equal(await voting.getVoterState(voteId, nonHolder), VOTER_STATE.ABSENT, 'nonHolder should not have voted')
                })

                it('fails getting a vote out of bounds', async () => {
                    return assertRevert(async () => {
                        await voting.getVote(voteId + 1)
                    })
                })

                it('changing required support does not affect vote required support', async () => {
                    await voting.changeSupportRequiredPct(pct16(70))

                    // With previous required support at 50%, vote should be approved
                    // with new quorum at 70% it shouldn't have, but since min quorum is snapshotted
                    // it will succeed

                    await voting.vote(voteId, true, false, { from: holder51 })
                    await voting.vote(voteId, true, false, { from: holder20 })
                    await voting.vote(voteId, false, false, { from: holder29 })
                    await timeTravel(votingTime + 1)

                    const state = await voting.getVote(voteId)
                    assert.equal(state[4].toNumber(), neededSupport.toNumber(), 'required support in vote should stay equal')
                    await voting.executeVote(voteId) // exec doesn't fail
                })

                it('changing min quorum doesnt affect vote min quorum', async () => {
                    await voting.changeMinAcceptQuorumPct(pct16(50))

                    // With previous min acceptance quorum at 20%, vote should be approved
                    // with new quorum at 50% it shouldn't have, but since min quorum is snapshotted
                    // it will succeed

                    await voting.vote(voteId, true, true, { from: holder29 })
                    await timeTravel(votingTime + 1)

                    const state = await voting.getVote(voteId)
                    assert.equal(state[5].toNumber(), minimumAcceptanceQuorum.toNumber(), 'acceptance quorum in vote should stay equal')
                    await voting.executeVote(voteId) // exec doesn't fail
                })

                it('holder can vote', async () => {
                    await voting.vote(voteId, false, true, { from: holder29 })
                    const state = await voting.getVote(voteId)
                    const voterState = await voting.getVoterState(voteId, holder29)

                    assert.equal(state[7].toString(), bigExp(29, decimals).toString(), 'nay vote should have been counted')
                    assert.equal(voterState, VOTER_STATE.NAY, 'holder29 should have nay voter status')
                })

                it('holder can modify vote', async () => {
                    await voting.vote(voteId, true, true, { from: holder29 })
                    await voting.vote(voteId, false, true, { from: holder29 })
                    await voting.vote(voteId, true, true, { from: holder29 })
                    const state = await voting.getVote(voteId)

                    assert.equal(state[6].toString(), bigExp(29, decimals).toString(), 'yea vote should have been counted')
                    assert.equal(state[7], 0, 'nay vote should have been removed')
                })

                it('token transfers dont affect voting', async () => {
                    await token.transfer(nonHolder, bigExp(29, decimals), { from: holder29 })

                    await voting.vote(voteId, true, true, { from: holder29 })
                    const state = await voting.getVote(voteId)

                    assert.equal(state[6].toString(), bigExp(29, decimals).toString(), 'yea vote should have been counted')
                    assert.equal(await token.balanceOf(holder29), 0, 'balance should be 0 at current block')
                })

                it('throws when non-holder votes', async () => {
                    return assertRevert(async () => {
                        await voting.vote(voteId, true, true, { from: nonHolder })
                    })
                })

                it('throws when voting after voting closes', async () => {
                    await timeTravel(votingTime + 1)
                    return assertRevert(async () => {
                        await voting.vote(voteId, true, true, { from: holder29 })
                    })
                })

                it('can execute if vote is approved with support and quorum', async () => {
                    await voting.vote(voteId, true, true, { from: holder29 })
                    await voting.vote(voteId, false, true, { from: holder20 })
                    await timeTravel(votingTime + 1)
                    await voting.executeVote(voteId)
                    assert.equal(await executionTarget.counter(), 2, 'should have executed result')
                })

                it('cannot execute vote if not enough quorum met', async () => {
                    await voting.vote(voteId, true, true, { from: holder20 })
                    await timeTravel(votingTime + 1)
                    return assertRevert(async () => {
                        await voting.executeVote(voteId)
                    })
                })

                it('cannot execute vote if not support met', async () => {
                    await voting.vote(voteId, false, true, { from: holder29 })
                    await voting.vote(voteId, false, true, { from: holder20 })
                    await timeTravel(votingTime + 1)
                    return assertRevert(async () => {
                        await voting.executeVote(voteId)
                    })
                })

                it('vote can be executed automatically if decided', async () => {
                    await voting.vote(voteId, true, true, { from: holder51 }) // causes execution
                    assert.equal(await executionTarget.counter(), 2, 'should have executed result')
                })

                it('vote can be not executed automatically if decided', async () => {
                    await voting.vote(voteId, true, false, { from: holder51 }) // doesnt cause execution
                    await voting.executeVote(voteId)
                    assert.equal(await executionTarget.counter(), 2, 'should have executed result')
                })

                it('cannot re-execute vote', async () => {
                    await voting.vote(voteId, true, true, { from: holder51 }) // causes execution
                    return assertRevert(async () => {
                        await voting.executeVote(voteId)
                    })
                })

                it('cannot vote on executed vote', async () => {
                    await voting.vote(voteId, true, true, { from: holder51 }) // causes execution
                    return assertRevert(async () => {
                        await voting.vote(voteId, true, true, { from: holder20 })
                    })
                })
            })
        })
    }

    context('wrong initializations', () => {
        beforeEach(async() => {
            token = await MiniMeToken.new(NULL_ADDRESS, NULL_ADDRESS, 0, 'n', 0, 'n', true) // empty parameters minime
        })

        it('fails if min acceptance quorum is greater than min support', () => {
            const neededSupport = pct16(20)
            const minimumAcceptanceQuorum = pct16(50)
            return assertRevert(async() => {
                await voting.initialize(token.address, neededSupport, minimumAcceptanceQuorum, votingTime)
            })
        })

        it('fails if min support is 100% or more', async() => {
            const minimumAcceptanceQuorum = pct16(20)
            await assertRevert(async() => {
                await voting.initialize(token.address, pct16(101), minimumAcceptanceQuorum, votingTime)
            })
            return assertRevert(async() => {
                await voting.initialize(token.address, pct16(100), minimumAcceptanceQuorum, votingTime)
            })
        })
    })

    context('empty token', () => {
        const neededSupport = pct16(50)
        const minimumAcceptanceQuorum = pct16(20)

        beforeEach(async() => {
            token = await MiniMeToken.new(NULL_ADDRESS, NULL_ADDRESS, 0, 'n', 0, 'n', true) // empty parameters minime

            await voting.initialize(token.address, neededSupport, minimumAcceptanceQuorum, votingTime)
        })

        it('fails creating a survey if token has no holder', async () => {
            return assertRevert(async () => {
              await voting.newVote(EMPTY_SCRIPT, 'metadata')
            })
        })
    })

    context('token supply = 1', () => {
        const holder = accounts[1]

        const neededSupport = pct16(50)
        const minimumAcceptanceQuorum = pct16(20)

        beforeEach(async () => {
            token = await MiniMeToken.new(NULL_ADDRESS, NULL_ADDRESS, 0, 'n', 0, 'n', true) // empty parameters minime

            await token.generateTokens(holder, 1)

            await voting.initialize(token.address, neededSupport, minimumAcceptanceQuorum, votingTime)
        })

        it('new vote cannot be executed before voting', async () => {
            // Account creating vote does not have any tokens and therefore doesn't vote
            const voteId = createdVoteId(await voting.newVote(EMPTY_SCRIPT, 'metadata'))

            assert.isFalse(await voting.canExecute(voteId), 'vote cannot be executed')

            await voting.vote(voteId, true, true, { from: holder })

            const [isOpen, isExecuted] = await voting.getVote(voteId)

            assert.isFalse(isOpen, 'vote should be closed')
            assert.isTrue(isExecuted, 'vote should have been executed')

        })

        context('new vote parameters', () => {
            it('creating vote as holder executes vote (if _canExecute param says so)', async () => {
                const voteId = createdVoteId(await voting.newVoteExt(EMPTY_SCRIPT, 'metadata', true, true, { from: holder }))
                const [isOpen, isExecuted] = await voting.getVote(voteId)

                assert.isFalse(isOpen, 'vote should be closed')
                assert.isTrue(isExecuted, 'vote should have been executed')
            })

            it("creating vote as holder doesn't execute vote if _canExecute param doesn't says so", async () => {
                const voteId = createdVoteId(await voting.newVoteExt(EMPTY_SCRIPT, 'metadata', true, false, { from: holder }))
                const [isOpen, isExecuted] = await voting.getVote(voteId)

                assert.isTrue(isOpen, 'vote should be open')
                assert.isFalse(isExecuted, 'vote should not have been executed')
            })
        })
    })

    context('token supply = 3', () => {
        const holder1 = accounts[1]
        const holder2 = accounts[2]

        const neededSupport = pct16(34)
        const minimumAcceptanceQuorum = pct16(20)

        beforeEach(async () => {
            token = await MiniMeToken.new(NULL_ADDRESS, NULL_ADDRESS, 0, 'n', 0, 'n', true) // empty parameters minime

            await token.generateTokens(holder1, 1)
            await token.generateTokens(holder2, 2)

            await voting.initialize(token.address, neededSupport, minimumAcceptanceQuorum, votingTime)
        })

        it('new vote cannot be executed before holder2 voting', async () => {
            const voteId = createdVoteId(await voting.newVote(EMPTY_SCRIPT, 'metadata'))

            assert.isFalse(await voting.canExecute(voteId), 'vote cannot be executed')

            await voting.vote(voteId, true, true, { from: holder1 })
            await voting.vote(voteId, true, true, { from: holder2 })

            const [isOpen, isExecuted] = await voting.getVote(voteId)

            assert.isFalse(isOpen, 'vote should be closed')
            assert.isTrue(isExecuted, 'vote should have been executed')
        })

        it('creating vote as holder2 executes vote', async () => {
            const voteId = createdVoteId(await voting.newVote(EMPTY_SCRIPT, 'metadata', { from: holder2 }))
            const [isOpen, isExecuted] = await voting.getVote(voteId)

            assert.isFalse(isOpen, 'vote should be closed')
            assert.isTrue(isExecuted, 'vote should have been executed')
        })
    })

    context('before init', () => {
        it('fails creating a vote before initialization', async () => {
            return assertRevert(async () => {
                await voting.newVote(encodeCallScript([]), '')
            })
        })
    })

    context('isValuePct unit test', async () => {
        it('tests total = 0', async () => {
            const result1 = await voting.isValuePct(0, 0, pct16(50))
            assert.equal(result1, false, "total 0 should always return false")
            const result2 = await voting.isValuePct(1, 0, pct16(50))
            assert.equal(result2, false, "total 0 should always return false")
        })

        it('tests value = 0', async () => {
            const result1 = await voting.isValuePct(0, 10, pct16(50))
            assert.equal(result1, false, "value 0 should false if pct is non-zero")
            const result2 = await voting.isValuePct(0, 10, 0)
            assert.equal(result2, false, "value 0 should return false if pct is zero")
        })

        it('tests pct ~= 100', async () => {
            const result1 = await voting.isValuePct(10, 10, pct16(100).minus(1))
            assert.equal(result1, true, "value 10 over 10 should pass")
        })

        it('tests strict inequality', async () => {
            const result1 = await voting.isValuePct(10, 20, pct16(50))
            assert.equal(result1, false, "value 10 over 20 should not pass for 50%")

            const result2 = await voting.isValuePct(pct16(50).minus(1), pct16(100), pct16(50))
            assert.equal(result2, false, "off-by-one down should not pass")

            const result3 = await voting.isValuePct(pct16(50).plus(1), pct16(100), pct16(50))
            assert.equal(result3, true, "off-by-one up should pass")
        })
    })
})
