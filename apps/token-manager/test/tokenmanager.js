const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const timetravel = require('@aragon/test-helpers/timeTravel')(web3)
const getBlock = require('@aragon/test-helpers/block')(web3)
const getBlockNumber = require('@aragon/test-helpers/blockNumber')(web3)

const { encodeCallScript } = require('@aragon/test-helpers/evmScript')
const ExecutionTarget = artifacts.require('ExecutionTarget')

const TokenManager = artifacts.require('TokenManager')
const MiniMeToken = artifacts.require('MiniMeToken')
const DAOFactory = artifacts.require('@aragon/core/contracts/factory/DAOFactory')
const EVMScriptRegistryFactory = artifacts.require('@aragon/core/contracts/factory/EVMScriptRegistryFactory')
const ACL = artifacts.require('@aragon/core/contracts/acl/ACL')
const Kernel = artifacts.require('@aragon/core/contracts/kernel/Kernel')

const getContract = name => artifacts.require(name)

const n = '0x00'
const ANY_ADDR = '0xffffffffffffffffffffffffffffffffffffffff'

contract('Token Manager', accounts => {
    let tokenManagerBase, daoFact, tokenManager, token

    let APP_MANAGER_ROLE
    let MINT_ROLE, ISSUE_ROLE, ASSIGN_ROLE, REVOKE_VESTINGS_ROLE, BURN_ROLE

    const root = accounts[0]
    const holder = accounts[1]

    before(async () => {
        const kernelBase = await getContract('Kernel').new()
        const aclBase = await getContract('ACL').new()
        const regFact = await EVMScriptRegistryFactory.new()
        daoFact = await DAOFactory.new(kernelBase.address, aclBase.address, regFact.address)
        tokenManagerBase = await TokenManager.new()

        // Setup constants
        APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()
        MINT_ROLE = await tokenManagerBase.MINT_ROLE()
        ISSUE_ROLE = await tokenManagerBase.ISSUE_ROLE()
        ASSIGN_ROLE = await tokenManagerBase.ASSIGN_ROLE()
        REVOKE_VESTINGS_ROLE = await tokenManagerBase.REVOKE_VESTINGS_ROLE()
        BURN_ROLE = await tokenManagerBase.BURN_ROLE()
    })

    beforeEach(async () => {
        const r = await daoFact.newDAO(root)
        const dao = Kernel.at(r.logs.filter(l => l.event == 'DeployDAO')[0].args.dao)
        const acl = ACL.at(await dao.acl())

        await acl.createPermission(root, dao.address, APP_MANAGER_ROLE, root, { from: root })

        const receipt = await dao.newAppInstance('0x1234', tokenManagerBase.address, { from: root })
        tokenManager = TokenManager.at(receipt.logs.filter(l => l.event == 'NewAppProxy')[0].args.proxy)

        await acl.createPermission(ANY_ADDR, tokenManager.address, MINT_ROLE, root, { from: root })
        await acl.createPermission(ANY_ADDR, tokenManager.address, ISSUE_ROLE, root, { from: root })
        await acl.createPermission(ANY_ADDR, tokenManager.address, ASSIGN_ROLE, root, { from: root })
        await acl.createPermission(ANY_ADDR, tokenManager.address, REVOKE_VESTINGS_ROLE, root, { from: root })
        await acl.createPermission(ANY_ADDR, tokenManager.address, BURN_ROLE, root, { from: root })

        token = await MiniMeToken.new(n, n, 0, 'n', 0, 'n', true)
    })

    it('initializating as transferable sets the token as transferable', async () => {
        const transferable = true
        await token.enableTransfers(!transferable)

        await token.changeController(tokenManager.address)
        await tokenManager.initialize(token.address, transferable, 0, false)
        assert.equal(transferable, await token.transfersEnabled())
    })

    it('initializating as non-transferable sets the token as non-transferable', async () => {
        const transferable = false
        await token.enableTransfers(!transferable)

        await token.changeController(tokenManager.address)
        await tokenManager.initialize(token.address, transferable, 0, false)
        assert.equal(transferable, await token.transfersEnabled())
    })

    it('fails when initializing without setting controller', async () => {
        return assertRevert(async () => {
            await tokenManager.initialize(token.address, true, 0, false)
        })
    })

    it('fails when sending ether to token', async () => {
        return assertRevert(async () => {
            await token.send(1) // transfer 1 wei to token contract
        })
    })

    context('non-transferable token', async () => {
        beforeEach(async () => {
            await token.changeController(tokenManager.address)
            await tokenManager.initialize(token.address, false, 0, false)
        })

        it('holders cannot transfer non-transferable tokens', async () => {
            await tokenManager.mint(holder, 2000)

            return assertRevert(async () => {
                await token.transfer(accounts[2], 10, { from: holder })
            })
        })

        it('token manager can transfer', async () => {
            await tokenManager.issue(100)
            await tokenManager.assign(holder, 10)

            assert.equal(await token.balanceOf(holder), 10, 'should have tokens')
        })

        it('token manager can burn assigned tokens', async () => {
            const mintAmount = 2000
            const burnAmount = 10
            await tokenManager.mint(holder, mintAmount)
            await tokenManager.burn(holder, burnAmount)

            assert.equal(await token.balanceOf(holder), mintAmount - burnAmount, 'should have burned tokens')
        })

        it('forwards actions to holder', async () => {
            const executionTarget = await ExecutionTarget.new()
            await tokenManager.mint(holder, 100)

            const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
            const script = encodeCallScript([action])

            await tokenManager.forward(script, { from: holder })
            assert.equal(await executionTarget.counter(), 1, 'should have received execution call')

            return assertRevert(async () => {
                await tokenManager.forward(script, { from: accounts[8] })
            })
        })
    })

    context('holder logging', async () => {
        beforeEach(async () => {
            await token.changeController(tokenManager.address)
            await tokenManager.initialize(token.address, true, 0, true)
        })

        it('logs token manager on issue', async () => {
            await tokenManager.issue(10)

            const holders = await tokenManager.allHolders()
            assert.deepEqual(holders, [tokenManager.address], 'holder list should be correct')
            assert.equal(await tokenManager.holders(0), tokenManager.address, 'should be first holder')
        })

        it('logs on mints and transfers', async () => {
            await tokenManager.mint(holder, 10)
            await token.transfer(accounts[8], 5, { from: holder })
            await token.transfer(accounts[9], 5, { from: accounts[8] })

            const holders = await tokenManager.allHolders()
            assert.deepEqual(holders, [holder, accounts[8], accounts[9]], 'holder list should be correct')
        })
    })

    context('maximum tokens per address limit', async () => {
        const limit = 100

        beforeEach(async () => {
            await token.changeController(tokenManager.address)
            await tokenManager.initialize(token.address, true, limit, false)
        })

        it('can mint up to than limit', async () => {
            await tokenManager.mint(holder, limit)

            assert.equal(await token.balanceOf(holder), limit, 'should have tokens')
        })

        it('fails to mint more than limit', async () => {
            return assertRevert(async () => {
                await tokenManager.mint(holder, limit + 1)
            })
        })

        it('can issue unlimited tokens for manager', async () => {
            await tokenManager.issue(limit + 100000)

            assert.equal(await token.balanceOf(tokenManager.address), limit + 100000, 'should have tokens')
        })

        it('can assign up to limit', async () => {
            await tokenManager.issue(limit)
            await tokenManager.assign(holder, limit)

            assert.equal(await token.balanceOf(holder), limit, 'should have tokens')
        })

        it('cannot assign more than limit', async () => {
            await tokenManager.issue(limit + 2)

            return assertRevert(async () => {
                await tokenManager.assign(holder, limit + 1)
            })
        })
    })

    context('for normal native tokens', () => {
        beforeEach(async () => {
            await token.changeController(tokenManager.address)
            await tokenManager.initialize(token.address, true, 0, false)
        })

        it('fails on reinitialization', async () => {
            return assertRevert(async () => {
                await tokenManager.initialize(token.address, true, 0, false)
            })
        })

        it('can mint tokens', async () => {
            await tokenManager.mint(holder, 100)

            assert.equal(await token.balanceOf(holder), 100, 'should have minted tokens')
        })

        it('can issue tokens', async () => {
            await tokenManager.issue(50)

            assert.equal(await token.balanceOf(tokenManager.address), 50, 'token manager should have issued tokens')
        })

        it('can assign issued tokens', async () => {
            await tokenManager.issue(50)
            await tokenManager.assign(holder, 50)

            assert.equal(await token.balanceOf(holder), 50, 'holder should have assigned tokens')
            assert.equal(await token.balanceOf(tokenManager.address), 0, 'token manager should have 0 tokens')
        })

        it('cannot assign more tokens than owned', async () => {
            await tokenManager.issue(50)

            return assertRevert(async () => {
                await tokenManager.assign(holder, 51)
            })
        })

        it('forwards actions only to token holders', async () => {
            const executionTarget = await ExecutionTarget.new()
            await tokenManager.mint(holder, 100)

            const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
            const script = encodeCallScript([action])

            await tokenManager.forward(script, { from: holder })
            assert.equal(await executionTarget.counter(), 1, 'should have received execution call')

            return assertRevert(async () => {
                await tokenManager.forward(script, { from: accounts[8] })
            })
        })

        it("cannot call onTransfer() from outside of the token's context", async () => {
            const amount = 10
            await tokenManager.mint(holder, amount)

            // Make sure this callback fails when called out-of-context
            await assertRevert(() => tokenManager.onTransfer(holder, accounts[2], 10))

            // Make sure the same transfer through the token's context doesn't revert
            await token.transfer(accounts[2], amount, { from: holder })
        })

        it('fails when assigning invalid vesting schedule', async () => {
            return assertRevert(async () => {
                const tokens = 10
                // vesting < cliff
                await tokenManager.assignVested(holder, tokens, 10, 20, 10, true)
            })
        })

        context('assigning vested tokens', () => {
            let now = 0
            let startDate, cliffDate, vestingDate

            const start = 1000
            const cliff = 2000
            const vesting = 5000

            const totalTokens = 40
            const revokable = true

            beforeEach(async () => {
                await tokenManager.issue(totalTokens)
                const block = await getBlock(await getBlockNumber())
                now = block.timestamp
                startDate = now + start
                cliffDate = now + cliff
                vestingDate = now + vesting

                await tokenManager.assignVested(holder, totalTokens, startDate, cliffDate, vestingDate, revokable)
            })

            it('can get vesting details before being revoked', async () => {
                const [vAmount, vStartDate, vCliffDate, vVestingDate, vRevokable] = await tokenManager.getVesting(holder, 0)
                assert.equal(vAmount, totalTokens)
                assert.equal(vStartDate, startDate)
                assert.equal(vCliffDate, cliffDate)
                assert.equal(vVestingDate, vestingDate)
                assert.equal(vRevokable, revokable)
            })

            it('can start transfering on cliff', async () => {
                await timetravel(cliff)
                await token.transfer(accounts[2], 10, { from: holder })
                assert.equal(await token.balanceOf(accounts[2]), 10, 'should have received tokens')
                assert.equal(await tokenManager.spendableBalanceOf(holder), 0, 'should not be able to spend more tokens')
            })

            it('can transfer all tokens after vesting', async () => {
                await timetravel(vesting)
                await token.transfer(accounts[2], totalTokens, { from: holder })
                assert.equal(await token.balanceOf(accounts[2]), totalTokens, 'should have received tokens')
            })

            it('can transfer half mid vesting', async () => {
                await timetravel(start + (vesting - start) / 2)

                await token.transfer(accounts[2], 20, { from: holder })

                assert.equal(await tokenManager.spendableBalanceOf(holder), 0, 'should not be able to spend more tokens')
            })

            it('cannot transfer non-vested tokens', async () => {
                return assertRevert(async () => {
                    await token.transfer(accounts[2], 10, { from: holder })
                })
            })

            it('can approve non-vested tokens but transferFrom fails', async () => {
                await token.approve(accounts[2], 10, { from: holder })

                return assertRevert(async () => {
                    await token.transferFrom(holder, accounts[2], 10, { from: accounts[2] })
                })
            })

            it('cannot transfer all tokens right before vesting', async () => {
                await timetravel(vesting - 10)
                return assertRevert(async () => {
                    await token.transfer(accounts[2], totalTokens, { from: holder })
                })
            })

            it('can be revoked and not vested tokens are transfered to token manager', async () => {
                await timetravel(cliff)
                await tokenManager.revokeVesting(holder, 0)

                await token.transfer(accounts[2], 5, { from: holder })

                assert.equal(await token.balanceOf(holder), 5, 'should have kept vested tokens')
                assert.equal(await token.balanceOf(accounts[2]), 5, 'should have kept vested tokens')
                assert.equal(await token.balanceOf(tokenManager.address), totalTokens - 10, 'should have received unvested')
            })

            it('cannot revoke non-revokable vestings', async () => {
                await tokenManager.issue(1)
                await tokenManager.assignVested(holder, 1, now + start, now + cliff, now + vesting, false)

                return assertRevert(async () => {
                    await tokenManager.revokeVesting(holder, 1)
                })
            })

            it('cannot have more than 50 vestings', async () => {
                let i = 49 // already have 1
                await tokenManager.issue(50)
                while (i > 0) {
                    await tokenManager.assignVested(holder, 1, now + start, now + cliff, now + vesting, false)
                    i--
                }
                await timetravel(vesting)
                await token.transfer(accounts[3], 1) // can transfer
                return assertRevert(async () => {
                    await tokenManager.assignVested(holder, 1, now + start, now + cliff, now + vesting, false)
                })
            })
        })
    })

    context('app not initialized', async () => {
        it('fails to mint tokens', async() => {
            return assertRevert(async() => {
                await tokenManager.mint(accounts[1], 1)
            })
        })

        it('fails to assign tokens', async() => {
            return assertRevert(async() => {
                await tokenManager.assign(accounts[1], 1)
            })
        })

        it('fails to issue tokens', async() => {
            return assertRevert(async() => {
                await tokenManager.issue(1)
            })
        })

        it('fails to burn tokens', async() => {
            return assertRevert(async() => {
                await tokenManager.burn(accounts[0], 1)
            })
        })
    })
})
