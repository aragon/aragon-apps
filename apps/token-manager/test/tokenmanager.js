const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const timetravel = require('@aragon/test-helpers/timeTravel')(web3)
const getBlock = require('@aragon/test-helpers/block')(web3)
const getBlockNumber = require('@aragon/test-helpers/blockNumber')(web3)

const { encodeScript } = require('@aragon/test-helpers/evmScript')
const ExecutionTarget = artifacts.require('ExecutionTarget')

const TokenManager = artifacts.require('TokenManager')
const MiniMeToken = artifacts.require('MiniMeToken')

const n = '0x00'

contract('Token Manager', accounts => {
    let tokenManager, token = {}

    const holder = accounts[1]

    beforeEach(async () => {
        token = await MiniMeToken.new(n, n, 0, 'n', 0, 'n', true)
        tokenManager = await TokenManager.new()
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

        it('can transfer to token manager', async () => {
            await tokenManager.mint(holder, 2000)
            await token.transfer(tokenManager.address, 10, { from: holder })

            assert.equal(await token.balanceOf(tokenManager.address), 10, 'should have tokens')
        })

        it('token manager can transfer', async () => {
            await tokenManager.issue(100)
            await tokenManager.assign(holder, 10)

            assert.equal(await token.balanceOf(holder), 10, 'should have tokens')
        })

        it('forwards actions to holder', async () => {
            const executionTarget = await ExecutionTarget.new()
            await tokenManager.mint(holder, 100)

            const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
            const script = encodeScript([action])

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
            assert.equal(holders.length, 1, 'should be 1 holder')
            assert.deepEqual(holders, [tokenManager.address], 'holder list should be correct')
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

        it('cannot assing more than limit', async () => {
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
            const script = encodeScript([action])

            await tokenManager.forward(script, { from: holder })
            assert.equal(await executionTarget.counter(), 1, 'should have received execution call')

            return assertRevert(async () => {
                await tokenManager.forward(script, { from: accounts[8] })
            })
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

            const start = 1000
            const cliff = 2000
            const vesting = 5000

            const totalTokens = 40

            beforeEach(async () => {
                await tokenManager.issue(totalTokens)
                const block = await getBlock(await getBlockNumber())
                now = block.timestamp

                await tokenManager.assignVested(holder, totalTokens, now + start, now + cliff, now + vesting, true)
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
})
