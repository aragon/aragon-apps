const { assertRevert, assertInvalidOpcode } = require('@aragon/test-helpers/assertThrow')
const { encodeScript } = require('@aragon/test-helpers/evmScript')

const ExecutionTarget = artifacts.require('ExecutionTarget')
const Group = artifacts.require('Group')

contract('Group app', accounts => {
    let app = {}

    const member = accounts[1]
    const member2 = accounts[2]
    const member3 = accounts[3]
    const groupName = 'Test Group'
    const required_confirmations = 1;

    beforeEach(async () => {
        app = await Group.new()
        assert.ok(await app.initialize(groupName, required_confirmations))
    })

    it('fails on reinitialization', async () => {
        return assertRevert(async () => {
            await app.initialize(groupName)
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
            assert.equal(await app.members.length, 1, 'group should only have one member')
        })

        it('fails if adding again', async () => {
            return assertRevert(async () => {
                await app.addMember(member)
            })
        })

        it('set required signatures', async() => {
            await app.changeRequirement(1)

            assert.equal(app.required, 1, 'should only have one required signature')
        })

        it('fails if requiring more signatures than members', async() => {
            return assertRevert(async() => {
                await app.changeRequirement(2)
            })
        })

        it('can forward', async () => {
            const executionTarget = await ExecutionTarget.new()
            const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
            const script = encodeScript([action])

            assert.isTrue(await app.canForward(member, script), 'member should be able to forward')
        })

        it('can be removed', async () => {
            await app.removeMember(member)
            assert.isFalse(await app.isGroupMember(member), 'member should have been removed')
            assert.equal(app.members.length, 0, 'there should be no members in the group')
        })

        it('forwards transactions', async () => {
            const executionTarget = await ExecutionTarget.new()
            const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
            const script = encodeScript([action])

            await app.forward(script, { from: member })
            assert.equal(await executionTarget.counter(), 1, 'should have received execution call')
        })
    })

    context('multisig group actions', async() => {
        beforeEach('add multiple members', async() => {
            await app.addMember(member)
            await app.addMember(member2)
            await app.addMember(member3)
        })

        it('check that members have been added', async() => {
            assert.equal(app.members.length, 3, 'group should have 3 members')
        })

        it('required confirmations change when member is removed', async() => {
            await app.changeRequirement(3)
            assert.equal(app.required, 3, 'group should require 3 confirmations')

            await app.removeMember(member2)
            assert.equal(app.required, 2, 'group should now only require 2 confirmations')
        })

        it('require m out of n confirmations', async() => {
            await app.changeRequirement(2)
            assert.equal(app.required, 2, 'group should only require 2 confirmations')

            await app.confirm({from: member})
            await app.confirm({from: member2})

            assert.equal(await app.isConfirmed(), true, 'should have enough confirmations')

            const executionTarget = await ExecutionTarget.new()
            const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
            const script = encodeScript([action])

            await app.forward(script, { from: member })
            assert.equal(await executionTarget.counter(), 1, 'should have received execution call')
        })

        it('fail if not enough confirmations', async() => {
            await app.changeRequirement(3)
            assert.equal(app.required, 3, 'group should require 3 confirmations')

            await app.confirm({from: member})
            await app.confirm({from: member2})

            assert.equal(await app.isConfirmed(), false, 'should not have enough confirmations')

            const executionTarget = await ExecutionTarget.new()
            const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
            const script = encodeScript([action])

            assertRevert(await app.forward(script, { from: member }))
        })

        it('require n of n confirmations', async() => {
            await app.changeRequirement(3)
            assert.equal(app.required, 3, 'group should require 3 confirmations')

            await app.confirm({from: member})
            await app.confirm({from: member2})
            await app.confirm({from: member3})

            assert.equal(await app.isConfirmed(), true, 'should not have enough confirmations')

            const executionTarget = await ExecutionTarget.new()
            const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
            const script = encodeScript([action])

            await app.forward(script, { from: member })
            assert.equal(await executionTarget.counter(), 1, 'should have received execution call')
        })
    })
})
