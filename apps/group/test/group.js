const { assertRevert, assertInvalidOpcode } = require('@aragon/test-helpers/assertThrow')
const { encodeScript } = require('@aragon/test-helpers/evmScript')

const ExecutionTarget = artifacts.require('ExecutionTarget')
const Group = artifacts.require('Group')

contract('Group app', accounts => {
    let app = {}
    let actionId = -1

    const member = accounts[1]
    const member2 = accounts[2]
    const member3 = accounts[3]
    const groupName = 'Test Group'
    const requiredConfirmations = 1

    beforeEach(async () => {
        app = await Group.new()
        assert.ok(await app.initialize(groupName, requiredConfirmations))
    })

    it('fails on reinitialization', async () => {
        return assertRevert(async () => {
            await app.initialize(groupName, requiredConfirmations)
        })
    })

    it('has correct name context', async () => {
        assert.equal(await app.getName(), groupName, 'should have correct group name')
    })

    it('fails when forwarding non-member', async () => {
        return assertRevert(async () => {
            await app.forward('0x00')
        })
    })

    it('fails when removing non-member', async () => {
        return assertRevert(async () => {
            await app.removeMember('0x00')
        })
    })

    context('single sig group actions', () => {
        beforeEach(async () => {
            await app.addMember(member)
        })

        it('has been added', async () => {
            assert.isTrue(await app.isGroupMember(member), 'member should have been added')
            assert.equal(await app.numMembers(), 1, 'group should only have one member')
        })

        it('fails if adding again', async () => {
            return assertRevert(async () => {
                await app.addMember(member)
            })
        })

        it('set required signatures', async() => {
            await app.changeRequirement(1, {from: member})

            assert.equal(await app.required.call(), 1, 'should only have one required signature')
        })

        it('fails if requiring more signatures than members', async() => {
            return assertRevert(async() => {
                await app.changeRequirement(2, {from: member})
            })
        })

        it('cannot forward until confirmed', async () => {
            const executionTarget = await ExecutionTarget.new()
            const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
            const script = encodeScript([action])

            actionId = await app.addAction(script, {from: member})

            id = await app.getActionId(script)
            assert.equal(actionId.toNumber(), id.toNumber(), 'actionId should be 0')

            assert.isFalse(await app.canForward(member, script), 'member should not be able to forward')
        })

        it('can forward', async () => {
            const executionTarget = await ExecutionTarget.new()
            const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
            const script = encodeScript([action])

            actionId = await app.addAction(script, {from: member})

            app.confirm(actionId.toNumber(), {from: member})
            assert.isTrue(await app.canForward(member, script), 'member should be able to forward')
        })
    })

    context('multisig group actions', async () => {
        beforeEach('add multiple members', async() => {
            await app.addMember(member)
            await app.addMember(member2)
            await app.addMember(member3)
        })

        it('check that members have been added', async () => {
            assert.equal(await app.numMembers(), 3, 'group should have 3 members')
        })

        it('required confirmations change when member is removed', async () => {
            await app.changeRequirement(3, {from: member})
            assert.equal(await app.required.call(), 3, 'group should require 3 confirmations')

            await app.removeMember(member2, {from: member})
            assert.equal(await app.required.call(), 2, 'group should now only require 2 confirmations')
        })

        it('un-authorized members cannot change requirements', async () => {
            await app.changeRequirement(3, {from: member})

            await app.changeRequirement(1, {from: member3})
        })

        it('members should be able to revoke confirmations', async () => {
            await app.changeRequirement(3, {from: member})

            const executionTarget = await ExecutionTarget.new()
            const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
            const script = encodeScript([action])

            actionId = await app.addAction(script, {from: member})

            await app.confirm(actionId.toNumber(), {from: member})
            await app.confirm(actionId.toNumber(), {from: member2})
            await app.confirm(actionId.toNumber(), {from: member3})

            assert.isTrue(await app.isConfirmed(actionId.toNumber()), 'Group has all needed confirmations')

            await(app.revoke(actionId.toNumber(), {from: member}))
            assert.isFalse(await app.isConfirmed(actionId.toNumber()), 'Group should no longer have all confirmations')
        })

        it('require M out of N confirmations', async () => {
            await app.changeRequirement(2, {from: member})
            assert.equal(await app.required.call(), 2, 'group should only require 2 confirmations')

            const executionTarget = await ExecutionTarget.new()
            const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
            const script = encodeScript([action])

            actionId = await app.addAction(script, {from: member})

            await app.confirm(actionId.toNumber(), {from: member})
            await app.confirm(actionId.toNumber(), {from: member2})

            assert.equal(await app.isConfirmed(actionId.toNumber()), true, 'should have enough confirmations')

            assert.equal(await executionTarget.counter(), 1, 'should have received execution call')
        })

        it('fail if not enough confirmations', async () => {
            await app.changeRequirement(3, {from: member})
            assert.equal(await app.required.call(), 3, 'group should require 3 confirmations')

            const executionTarget = await ExecutionTarget.new()
            const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
            const script = encodeScript([action])

            actionId = await app.addAction(script, {from: member})

            await app.confirm(actionId.toNumber(), {from: member})
            await app.confirm(actionId.toNumber(), {from: member2})

            assert.isFalse(await app.isConfirmed(actionId.toNumber()), 'should not have enough confirmations')

            return assertRevert(async() => {
                await app.forward(script, {from: member})
            })
        })

        it('require N of N confirmations', async () => {
            await app.changeRequirement(3, {from: member})
            assert.equal(await app.required.call(), 3, 'group should require 3 confirmations')

            const executionTarget = await ExecutionTarget.new()
            const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
            const script = encodeScript([action])

            actionId = await app.addAction(script, {from: member})

            await app.confirm(actionId.toNumber(), {from: member})
            await app.confirm(actionId.toNumber(), {from: member2})
            await app.confirm(actionId.toNumber(), {from: member3})

            assert.isTrue(await app.isConfirmed(actionId.toNumber()), 'should not have enough confirmations')

            assert.equal(await executionTarget.counter(), 1, 'should have received execution call')
        })
    })
})
