const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { getEventArgument, getNewProxyAddress } = require('@aragon/test-helpers/events')
const getBalance = require('@aragon/test-helpers/balance')(web3)
const { makeErrorMappingProxy } = require('@aragon/test-helpers/utils')

const { encodeCallScript } = require('@aragon/test-helpers/evmScript')
const ExecutionTarget = artifacts.require('ExecutionTarget')

const TokenManager = artifacts.require('TokenManagerMock')
const MiniMeToken = artifacts.require('MiniMeToken')
const ACL = artifacts.require('ACL')
const Kernel = artifacts.require('Kernel')
const DAOFactory = artifacts.require('DAOFactory')
const EVMScriptRegistryFactory = artifacts.require('EVMScriptRegistryFactory')
const EtherTokenConstantMock = artifacts.require('EtherTokenConstantMock')

const n = '0x00'
const ANY_ADDR = '0xffffffffffffffffffffffffffffffffffffffff'

contract('Token Manager', ([root, holder, holder2, anyone]) => {
    let tokenManagerBase, daoFact, tokenManager, token

    let APP_MANAGER_ROLE
    let MINT_ROLE, ISSUE_ROLE, ASSIGN_ROLE, REVOKE_VESTINGS_ROLE, BURN_ROLE
    let ETH

    // Error strings
    const errors = makeErrorMappingProxy({
        // aragonOS errors
        APP_AUTH_FAILED: 'APP_AUTH_FAILED',
        INIT_ALREADY_INITIALIZED: 'INIT_ALREADY_INITIALIZED',
        INIT_NOT_INITIALIZED: 'INIT_NOT_INITIALIZED',
        RECOVER_DISALLOWED: 'RECOVER_DISALLOWED',

        // Token Manager errors
        TM_CALLER_NOT_TOKEN: "TM_CALLER_NOT_TOKEN",
        TM_NO_VESTING: "TM_NO_VESTING",
        TM_TOKEN_CONTROLLER: "TM_TOKEN_CONTROLLER",
        TM_MINT_RECEIVER_IS_TM: "TM_MINT_RECEIVER_IS_TM",
        TM_VESTING_TO_TM: "TM_VESTING_TO_TM",
        TM_TOO_MANY_VESTINGS: "TM_TOO_MANY_VESTINGS",
        TM_WRONG_CLIFF_DATE: "TM_WRONG_CLIFF_DATE",
        TM_VESTING_NOT_REVOKABLE: "TM_VESTING_NOT_REVOKABLE",
        TM_REVOKE_TRANSFER_FROM_REVERTED: "TM_REVOKE_TRANSFER_FROM_REVERTED",
        TM_CAN_NOT_FORWARD: "TM_CAN_NOT_FORWARD",
        TM_BALANCE_INC_NOT_ALLOWED: "TM_BALANCE_INC_NOT_ALLOWED",
        TM_ASSIGN_TRANSFER_FROM_REVERTED: "TM_ASSIGN_TRANSFER_FROM_REVERTED"
    })

    const NOW = 1

    before(async () => {
        const kernelBase = await Kernel.new(true) // petrify immediately
        const aclBase = await ACL.new()
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

        const ethConstant = await EtherTokenConstantMock.new()
        ETH = await ethConstant.getETHConstant()
    })

    beforeEach(async () => {
        const r = await daoFact.newDAO(root)
        const dao = Kernel.at(getEventArgument(r, 'DeployDAO', 'dao'))
        const acl = ACL.at(await dao.acl())

        await acl.createPermission(root, dao.address, APP_MANAGER_ROLE, root, { from: root })

        const receipt = await dao.newAppInstance('0x1234', tokenManagerBase.address, '0x', false, { from: root })
        tokenManager = TokenManager.at(getNewProxyAddress(receipt))
        tokenManager.mockSetTimestamp(NOW)

        await acl.createPermission(ANY_ADDR, tokenManager.address, MINT_ROLE, root, { from: root })
        await acl.createPermission(ANY_ADDR, tokenManager.address, ISSUE_ROLE, root, { from: root })
        await acl.createPermission(ANY_ADDR, tokenManager.address, ASSIGN_ROLE, root, { from: root })
        await acl.createPermission(ANY_ADDR, tokenManager.address, REVOKE_VESTINGS_ROLE, root, { from: root })
        await acl.createPermission(ANY_ADDR, tokenManager.address, BURN_ROLE, root, { from: root })

        token = await MiniMeToken.new(n, n, 0, 'n', 0, 'n', true)
    })

    it('checks it is forwarder', async () => {
        assert.isTrue(await tokenManager.isForwarder())
    })

    it('initializating as transferable sets the token as transferable', async () => {
        const transferable = true
        await token.enableTransfers(!transferable)

        await token.changeController(tokenManager.address)
        await tokenManager.initialize(token.address, transferable, 0)
        assert.equal(transferable, await token.transfersEnabled())
    })

    it('initializating as non-transferable sets the token as non-transferable', async () => {
        const transferable = false
        await token.enableTransfers(!transferable)

        await token.changeController(tokenManager.address)
        await tokenManager.initialize(token.address, transferable, 0)
        assert.equal(transferable, await token.transfersEnabled())
    })

    it('fails when initializing without setting controller', async () => {
        await assertRevert(tokenManager.initialize(token.address, true, 0), errors.TM_TOKEN_CONTROLLER)
    })

    it('fails when sending ether to token', async () => {
        await assertRevert(token.send(1)) // transfer 1 wei to token contract
    })

    context('maximum tokens per address limit', async () => {
        const limit = 100

        beforeEach(async () => {
            await token.changeController(tokenManager.address)
            await tokenManager.initialize(token.address, true, limit)
        })

        it('can mint up to than limit', async () => {
            await tokenManager.mint(holder, limit)

            assert.equal(await token.balanceOf(holder), limit, 'should have tokens')
        })

        it('fails to mint more than limit', async () => {
            await assertRevert(tokenManager.mint(holder, limit + 1), errors.TM_BALANCE_INC_NOT_ALLOWED)
        })

        it('can issue unlimited tokens to itself', async () => {
            await tokenManager.issue(limit + 100000)

            assert.equal(await token.balanceOf(tokenManager.address), limit + 100000, 'should have more tokens than limit')
        })

        it('can assign unlimited tokens to itself', async () => {
            // First issue some tokens to the Token Manager
            await tokenManager.issue(limit + 100000)

            // Then assign these tokens to the Token Manager (should not actually move any tokens)
            await tokenManager.assign(tokenManager.address, limit + 100000)

            assert.equal(await token.balanceOf(tokenManager.address), limit + 100000, 'should have more tokens than limit')
        })

        it('can assign up to limit', async () => {
            await tokenManager.issue(limit)
            await tokenManager.assign(holder, limit)

            assert.equal(await token.balanceOf(holder), limit, 'should have tokens')
        })

        it('cannot assign more than limit', async () => {
            await tokenManager.issue(limit + 2)

            await assertRevert(tokenManager.assign(holder, limit + 1), errors.TM_BALANCE_INC_NOT_ALLOWED)
        })

        it('can transfer tokens to token manager without regard to token limit', async () => {
            await tokenManager.issue(limit + 100000)
            await tokenManager.assign(holder, 5)

            await token.transfer(tokenManager.address, 5, { from: holder })

            assert.equal(await token.balanceOf(tokenManager.address), limit + 100000, 'should have more tokens than limit')
        })

        it('cannot transfer tokens to an address if it would go over the limit', async () => {
            await tokenManager.issue(limit * 2)
            await tokenManager.assign(holder, limit - 1)
            await tokenManager.assign(holder2, limit - 1)

            await assertRevert(token.transfer(holder2, 5, { from: holder }))
        })
    })

    for (const tokenTransferable of [true, false]) {
        context(`for ${tokenTransferable ? 'transferable' : 'non-transferable'} tokens`, () => {
            beforeEach(async () => {
                await token.changeController(tokenManager.address)
                await tokenManager.initialize(token.address, tokenTransferable, 0)
            })

            it('fails on reinitialization', async () => {
                await assertRevert(tokenManager.initialize(token.address, true, 0), errors.INIT_ALREADY_INITIALIZED)
            })

            it('cannot initialize base app', async () => {
                const newTokenManager = await TokenManager.new()
                assert.isTrue(await newTokenManager.isPetrified())
                await assertRevert(newTokenManager.initialize(token.address, true, 0), errors.INIT_ALREADY_INITIALIZED)
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

            it('can assign issued tokens to itself', async () => {
                await tokenManager.issue(50)
                await tokenManager.assign(tokenManager.address, 50)

                assert.equal(await token.balanceOf(tokenManager.address), 50, 'token manager should not have changed token balance')
            })

            it('can burn assigned tokens', async () => {
                const mintAmount = 2000
                const burnAmount = 10
                await tokenManager.mint(holder, mintAmount)
                await tokenManager.burn(holder, burnAmount)

                assert.equal(await token.balanceOf(holder), mintAmount - burnAmount, 'should have burned tokens')
            })

            it('cannot mint tokens to itself', async () => {
                await assertRevert(tokenManager.mint(tokenManager.address, 100), errors.TM_MINT_RECEIVER_IS_TM)
            })

            it('cannot assign more tokens than owned', async () => {
                await tokenManager.issue(50)

                await assertRevert(tokenManager.assign(holder, 51), errors.TM_ASSIGN_TRANSFER_FROM_REVERTED)
            })

            it('allows token holders to forwards actions', async () => {
                const executionTarget = await ExecutionTarget.new()
                await tokenManager.mint(holder, 100)

                const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
                const script = encodeCallScript([action])

                await tokenManager.forward(script, { from: holder })
                assert.equal(await executionTarget.counter(), 1, 'should have received execution call')
            })

            it('disallows non-token holders from forwarding actions', async () => {
                const executionTarget = await ExecutionTarget.new()
                const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
                const script = encodeCallScript([action])

                await assertRevert(tokenManager.forward(script, { from: anyone }), errors.TM_CAN_NOT_FORWARD)
            })

            it("cannot call onTransfer() from outside of the token's context", async () => {
                const amount = 10
                await tokenManager.mint(holder, amount)

                // Make sure this callback fails when called out-of-context
                await assertRevert(tokenManager.onTransfer(holder, holder2, 10), errors.TM_CALLER_NOT_TOKEN)

                if (tokenTransferable) {
                  // Make sure the same transfer through the token's context doesn't revert
                  await token.transfer(holder2, amount, { from: holder })
                }
            })

            it("cannot call onApprove() from outside of the token's context", async () => {
                const amount = 10
                await tokenManager.mint(holder, amount)

                // Make sure this callback fails when called out-of-context
                await assertRevert(tokenManager.onApprove(holder, holder2, 10), errors.TM_CALLER_NOT_TOKEN)

                // Make sure no allowance was registered
                assert.equal(await token.allowance(holder, holder2), 0, 'token approval should be 0')
            })

            it("cannot call proxyPayment() from outside of the token's context", async () => {
                const value = 10
                const prevTokenManagerBalance = (await getBalance(tokenManager.address)).toNumber()

                // Make sure this callback fails when called out-of-context
                await assertRevert(tokenManager.proxyPayment(root, { value }), errors.TM_CALLER_NOT_TOKEN)

                // Make sure no ETH was transferred
                assert.equal((await getBalance(tokenManager.address)).toNumber(), prevTokenManagerBalance, 'token manager ETH balance should be the same')
            })

            it('fails when assigning invalid vesting schedule', async () => {
                const tokens = 10
                // vesting < cliff
                await assertRevert(tokenManager.assignVested(holder, tokens, 10, 20, 10, true), errors.TM_WRONG_CLIFF_DATE)
            })

            it('allows to recover external tokens', async () => {
                assert.isTrue(await tokenManager.allowRecoverability(ETH))
                assert.isTrue(await tokenManager.allowRecoverability('0x1234'))
            })

            it('does not allow to recover own tokens', async () => {
                assert.isFalse(await tokenManager.allowRecoverability(token.address))
            })

            if (!tokenTransferable) {
                it('holders cannot transfer non-transferable tokens', async () => {
                    await tokenManager.mint(holder, 2000)

                    await assertRevert(token.transfer(holder2, 10, { from: holder }))
                })
            }

            if (tokenTransferable) {
                context('assigning vested tokens', () => {
                    const CLIFF_DURATION = 2000
                    const VESTING_DURATION = 5000

                    const startDate = NOW + 1000
                    const cliffDate = NOW + CLIFF_DURATION
                    const vestingDate = NOW + VESTING_DURATION

                    const totalTokens = 40
                    const revokable = true

                    beforeEach(async () => {
                        await tokenManager.issue(totalTokens)
                        await tokenManager.assignVested(holder, totalTokens, startDate, cliffDate, vestingDate, revokable)
                    })

                    it('fails trying to get vesting out of bounds', async () => {
                        await assertRevert(tokenManager.getVesting(holder, 1), errors.TM_NO_VESTING)
                    })

                    it('can get vesting details before being revoked', async () => {
                        const [vAmount, vStartDate, vCliffDate, vVestingDate, vRevokable] = await tokenManager.getVesting(holder, 0)
                        assert.equal(vAmount, totalTokens)
                        assert.equal(vStartDate, startDate)
                        assert.equal(vCliffDate, cliffDate)
                        assert.equal(vVestingDate, vestingDate)
                        assert.equal(vRevokable, revokable)
                    })

                    it('can start transferring on cliff', async () => {
                        await tokenManager.mockIncreaseTime(CLIFF_DURATION)

                        await token.transfer(holder2, 10, { from: holder })
                        assert.equal((await token.balanceOf(holder2)).toString(), 10, 'should have received tokens')
                        assert.equal((await tokenManager.spendableBalanceOf(holder)).toString(), 0, 'should not be able to spend more tokens')
                    })

                    it('can transfer all tokens after vesting', async () => {
                        await tokenManager.mockIncreaseTime(VESTING_DURATION)

                        await token.transfer(holder2, totalTokens, { from: holder })
                        assert.equal(await token.balanceOf(holder2), totalTokens, 'should have received tokens')
                    })

                    it('can transfer half mid vesting', async () => {
                        await tokenManager.mockSetTimestamp(startDate)
                        await tokenManager.mockIncreaseTime((vestingDate - startDate) / 2)

                        await token.transfer(holder2, 20, { from: holder })

                        assert.equal((await tokenManager.spendableBalanceOf(holder)).toString(), 0, 'should not be able to spend more tokens')
                    })

                    it('cannot transfer non-vested tokens', async () => {
                        await assertRevert(token.transfer(holder2, 10, { from: holder }))
                    })

                    it('can approve non-vested tokens but transferFrom fails', async () => {
                        await token.approve(holder2, 10, { from: holder })

                        await assertRevert(token.transferFrom(holder, holder2, 10, { from: holder2 }))
                    })

                    it('cannot transfer all tokens right before vesting', async () => {
                        await tokenManager.mockIncreaseTime(VESTING_DURATION - 10)

                        await assertRevert(token.transfer(holder2, totalTokens, { from: holder }))
                    })

                    it('can be revoked and not vested tokens are transfered to token manager', async () => {
                        await tokenManager.mockIncreaseTime(CLIFF_DURATION)
                        await tokenManager.revokeVesting(holder, 0)

                        await token.transfer(holder2, 5, { from: holder })

                        assert.equal((await token.balanceOf(holder)).toString(), 5, 'should have kept vested tokens')
                        assert.equal((await token.balanceOf(holder2)).toString(), 5, 'should have kept vested tokens')
                        assert.equal((await token.balanceOf(tokenManager.address)).toString(), totalTokens - 10, 'should have received unvested')
                    })

                    it('cannot assign a vesting to itself', async () => {
                        await assertRevert(tokenManager.assignVested(tokenManager.address, 5, startDate, cliffDate, vestingDate, revokable), errors.TM_VESTING_TO_TM)
                    })

                    it('cannot revoke non-revokable vestings', async () => {
                        await tokenManager.issue(1)
                        await tokenManager.assignVested(holder, 1, startDate, cliffDate, vestingDate, false)

                        await assertRevert(tokenManager.revokeVesting(holder, 1), errors.TM_VESTING_NOT_REVOKABLE)
                    })

                    it('cannot have more than 50 vestings', async () => {
                        await tokenManager.issue(50)

                        // Only create 49 new vestings as we've already created one in beforeEach()
                        for (ii = 0; ii < 49; ++ii) {
                            await tokenManager.assignVested(holder, 1, startDate, cliffDate, vestingDate, false)
                        }

                        await assertRevert(tokenManager.assignVested(holder, 1, startDate, cliffDate, vestingDate, false), errors.TM_TOO_MANY_VESTINGS)

                        // Can't create a new vesting even after other vestings have finished
                        await tokenManager.mockIncreaseTime(VESTING_DURATION)
                        await assertRevert(tokenManager.assignVested(holder, 1, startDate, cliffDate, vestingDate, false), errors.TM_TOO_MANY_VESTINGS)

                        // But can now transfer
                        await token.transfer(holder2, 1, { from: holder })
                    })
                })
            }
        })
    }

    context('app not initialized', async () => {
        it('fails to mint tokens', async() => {
            await assertRevert(tokenManager.mint(holder, 1), errors.APP_AUTH_FAILED)
        })

        it('fails to assign tokens', async() => {
            await assertRevert(tokenManager.assign(holder, 1), errors.APP_AUTH_FAILED)
        })

        it('fails to issue tokens', async() => {
            await assertRevert(tokenManager.issue(1), errors.APP_AUTH_FAILED)
        })

        it('fails to burn tokens', async() => {
            await assertRevert(tokenManager.burn(holder, 1), errors.APP_AUTH_FAILED)
        })

        it('disallows forwarding actions', async () => {
            const executionTarget = await ExecutionTarget.new()
            const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
            const script = encodeCallScript([action])

            await assertRevert(tokenManager.forward(script, { from: anyone }), errors.TM_CAN_NOT_FORWARD)
        })
    })
})
