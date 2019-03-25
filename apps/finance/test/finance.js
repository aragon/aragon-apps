const assertEvent = require('@aragon/test-helpers/assertEvent')
const { assertRevert, assertInvalidOpcode } = require('@aragon/test-helpers/assertThrow')
const getBalance = require('@aragon/test-helpers/balance')(web3)

const Finance = artifacts.require('FinanceMock')
const Vault = artifacts.require('Vault')

// Mocks
const EtherTokenConstantMock = artifacts.require('EtherTokenConstantMock')
const TokenMock = artifacts.require('TokenMock')
const TokenReturnFalseMock = artifacts.require('TokenReturnFalseMock')
const TokenReturnMissingMock = artifacts.require('TokenReturnMissingMock')

const getContract = name => artifacts.require(name)

const getEventData = (receipt, event, arg) => receipt.logs.filter(log => log.event == event)[0].args[arg]


// Tests for different token interfaces
const tokenTestGroups = [
    {
        title: 'standards compliant, reverting token',
        tokenContract: TokenMock,
    },
    {
        title: 'standards compliant, non-reverting token',
        tokenContract: TokenReturnFalseMock,
    },
    {
        title: 'non-standards compliant, missing return token',
        tokenContract: TokenReturnMissingMock,
    },
]

contract('Finance App', accounts => {
    let daoFact, financeBase, finance, vaultBase, vault, token1, token2, executionTarget, etherToken = {}

    let ETH, MAX_UINT64, ANY_ENTITY, APP_MANAGER_ROLE
    let CREATE_PAYMENTS_ROLE, CHANGE_PERIOD_ROLE, CHANGE_BUDGETS_ROLE, EXECUTE_PAYMENTS_ROLE, MANAGE_PAYMENTS_ROLE
    let TRANSFER_ROLE

    const root = accounts[0]
    const n = '0x00'
    const START_TIME = 1
    const PERIOD_DURATION = 60 * 60 * 24 // One day in seconds
    const withdrawAddr = '0x0000000000000000000000000000000000001234'
    const VAULT_INITIAL_ETH_BALANCE = 400
    const VAULT_INITIAL_TOKEN1_BALANCE = 100
    const VAULT_INITIAL_TOKEN2_BALANCE = 200

    before(async () => {
        const kernelBase = await getContract('Kernel').new(true) // petrify immediately
        const aclBase = await getContract('ACL').new()
        const regFact = await getContract('EVMScriptRegistryFactory').new()
        daoFact = await getContract('DAOFactory').new(kernelBase.address, aclBase.address, regFact.address)
        vaultBase = await Vault.new()
        financeBase = await Finance.new()

        // Setup constants
        MAX_UINT64 = await financeBase.getMaxUint64()
        ANY_ENTITY = await aclBase.ANY_ENTITY()
        APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()

        CREATE_PAYMENTS_ROLE = await financeBase.CREATE_PAYMENTS_ROLE()
        CHANGE_PERIOD_ROLE = await financeBase.CHANGE_PERIOD_ROLE()
        CHANGE_BUDGETS_ROLE = await financeBase.CHANGE_BUDGETS_ROLE()
        EXECUTE_PAYMENTS_ROLE = await financeBase.EXECUTE_PAYMENTS_ROLE()
        MANAGE_PAYMENTS_ROLE = await financeBase.MANAGE_PAYMENTS_ROLE()
        TRANSFER_ROLE = await vaultBase.TRANSFER_ROLE()

        const ethConstant = await EtherTokenConstantMock.new()
        ETH = await ethConstant.getETHConstant()
    })

    const setupRecoveryVault = async (dao) => {
        const recoveryVaultAppId = '0x90ab'
        const vaultReceipt = await dao.newAppInstance(recoveryVaultAppId, vaultBase.address, '0x', false, { from: root })
        const recoveryVault = Vault.at(vaultReceipt.logs.filter(l => l.event == 'NewAppProxy')[0].args.proxy)
        await recoveryVault.initialize()
        await dao.setApp(await dao.APP_ADDR_NAMESPACE(), recoveryVaultAppId, recoveryVault.address)
        await dao.setRecoveryVaultAppId(recoveryVaultAppId, { from: root })

        return recoveryVault
    }

    const newProxyFinance = async () => {
        const r = await daoFact.newDAO(root)
        const dao = getContract('Kernel').at(r.logs.filter(l => l.event == 'DeployDAO')[0].args.dao)
        const acl = getContract('ACL').at(await dao.acl())

        await acl.createPermission(root, dao.address, APP_MANAGER_ROLE, root, { from: root })

        // finance
        const receipt2 = await dao.newAppInstance('0x5678', financeBase.address, '0x', false, { from: root })
        const financeApp = Finance.at(receipt2.logs.filter(l => l.event == 'NewAppProxy')[0].args.proxy)
        await financeApp.mock_setMaxPeriodTransitions(MAX_UINT64)

        await acl.createPermission(ANY_ENTITY, financeApp.address, CREATE_PAYMENTS_ROLE, root, { from: root })
        await acl.createPermission(ANY_ENTITY, financeApp.address, CHANGE_PERIOD_ROLE, root, { from: root })
        await acl.createPermission(ANY_ENTITY, financeApp.address, CHANGE_BUDGETS_ROLE, root, { from: root })
        await acl.createPermission(ANY_ENTITY, financeApp.address, EXECUTE_PAYMENTS_ROLE, root, { from: root })
        await acl.createPermission(ANY_ENTITY, financeApp.address, MANAGE_PAYMENTS_ROLE, root, { from: root })

        const recoveryVault = await setupRecoveryVault(dao)

        return { dao, financeApp, recoveryVault }
    }

    const forceSendETH = async (to, value) => {
        // Using this contract ETH will be send by selfdestruct which always succeeds
        const forceSend = await getContract('ForceSendETH').new()
        return forceSend.sendByDying(to, { value })
    }

    beforeEach(async () => {
        const { dao, financeApp } = await newProxyFinance()
        finance = financeApp

        // vault
        const receipt1 = await dao.newAppInstance('0x1234', vaultBase.address, '0x', false, { from: root })
        vault = getContract('Vault').at(receipt1.logs.filter(l => l.event == 'NewAppProxy')[0].args.proxy)
        const acl = getContract('ACL').at(await dao.acl())
        await acl.createPermission(finance.address, vault.address, TRANSFER_ROLE, root, { from: root })
        await vault.initialize()

        // Set up initial balances
        token1 = await TokenMock.new(accounts[0], 10000 + VAULT_INITIAL_TOKEN1_BALANCE)
        await token1.transfer(vault.address, VAULT_INITIAL_TOKEN1_BALANCE)
        token2 = await TokenMock.new(accounts[0], 10000 + VAULT_INITIAL_TOKEN2_BALANCE)
        await token2.transfer(vault.address, VAULT_INITIAL_TOKEN2_BALANCE)
        await vault.deposit(ETH, VAULT_INITIAL_ETH_BALANCE, { value: VAULT_INITIAL_ETH_BALANCE, from: accounts[0] });

        await finance.mock_setTimestamp(START_TIME)
        await finance.initialize(vault.address, PERIOD_DURATION)
    })

    it('initialized first accounting period and settings', async () => {
        assert.equal(PERIOD_DURATION, await finance.getPeriodDuration(), 'period duration should match')
        assert.equal(await finance.currentPeriodId(), 0, 'current period should be 0')
    })

    it('sets the end of time correctly', async () => {
        const { financeApp } = await newProxyFinance()
        await financeApp.mock_setTimestamp(100) // to make sure it overflows with MAX_UINT64 period length
        // initialize with MAX_UINT64 as period duration
        await financeApp.initialize(vault.address, MAX_UINT64)
        const [isCurrent, start, end, firstTx, lastTx] = await financeApp.getPeriod(await financeApp.currentPeriodId())

        assert.equal(end.valueOf(), MAX_UINT64.valueOf(), "should have set the period's end date to MAX_UINT64")
    })

    it('fails on reinitialization', async () => {
        return assertRevert(async () => {
            await finance.initialize(vault.address, PERIOD_DURATION)
        })
    })

    it('cannot initialize base app', async () => {
        const newFinance = await Finance.new()
        assert.isTrue(await newFinance.isPetrified())
        return assertRevert(async () => {
            await newFinance.initialize(vault.address, PERIOD_DURATION)
        })
    })

    it('fails on initializing with no vault', async () => {
        const { financeApp } = await newProxyFinance()

        await assertRevert(() => financeApp.initialize(0, PERIOD_DURATION))
        await assertRevert(() => financeApp.initialize(withdrawAddr, PERIOD_DURATION))
    })

    it('fails on initializing with less than one day period', async () => {
        const badPeriod = 60 * 60 * 24 - 1

        const { financeApp } = await newProxyFinance()
        await financeApp.mock_setTimestamp(START_TIME)

        return assertRevert(() => financeApp.initialize(vault.address, badPeriod))
    })

    it('adds new token to budget', async () => {
        await finance.setBudget(token1.address, 10)

        const [budget, hasBudget] = await finance.getBudget.call(token1.address)
        const remainingBudget = await finance.getRemainingBudget.call(token1.address)
        assert.equal(budget, 10, 'should have correct budget')
        assert.isTrue(hasBudget, 'has budget should be true')
        assert.equal(remainingBudget, 10, 'all budget is remaining')
    })

    it('before setting budget allows unlimited spending', async () => {
        const recipient = accounts[1]
        const time = 22
        const amount = 190

        await finance.mock_setTimestamp(time)

        await finance.newImmediatePayment(token2.address, recipient, amount, '')
        assert.equal((await token2.balanceOf(recipient)).valueOf(), amount, 'recipient should have received tokens')
    })

    it('can change period duration', async () => {
        const newDuration = 60 * 60 * 24 * 2 // two days
        await finance.setPeriodDuration(newDuration)
        await finance.mock_setTimestamp(newDuration * 2.5) // Force at least two transitions

        await finance.tryTransitionAccountingPeriod(3) // transition a maximum of 3 accounting periods

        assert.equal((await finance.currentPeriodId()).valueOf(), 2, 'should have transitioned 2 periods')
    })

    it('can transition periods', async () => {
        await finance.mock_setTimestamp(PERIOD_DURATION * 2.5) // Force at least two transitions

        await finance.tryTransitionAccountingPeriod(3) // transition a maximum of 3 accounting periods

        assert.equal(await finance.currentPeriodId(), 2, 'should have transitioned 2 periods')
    })

    it('only transitions as many periods as allowed', async () => {
        await finance.mock_setTimestamp(PERIOD_DURATION * 2.5) // Force at least two transitions

        const receipt = await finance.tryTransitionAccountingPeriod(1) // Fail if we only allow a single transition
        const newPeriodEvents = receipt.logs.filter(log => log.event == 'NewPeriod')
        assert.equal(newPeriodEvents.length, 1, 'should have only emitted one new period event')
        assert.equal(await finance.currentPeriodId(), 1, 'should have transitioned 1 periods')
    })

    for ({ title, tokenContract} of tokenTestGroups) {
        context(`ERC20 (${title}) deposits`, () => {
            const transferAmount = 5
            let tokenInstance

            beforeEach(async () => {
                // Set up a new token similar to token1's distribution
                tokenInstance = await tokenContract.new(accounts[0], 10000 + VAULT_INITIAL_TOKEN1_BALANCE)
                await tokenInstance.transfer(vault.address, VAULT_INITIAL_TOKEN1_BALANCE)
            })

            it('records deposits', async () => {
                await tokenInstance.approve(finance.address, transferAmount)
                const receipt = await finance.deposit(tokenInstance.address, transferAmount, 'ref')

                // vault has 100 tokens initially
                assert.equal((await tokenInstance.balanceOf(vault.address)).valueOf(), VAULT_INITIAL_TOKEN1_BALANCE + transferAmount, 'deposited tokens must be in vault')

                const [periodId, amount, paymentId, paymentRepeatNumber, token, entity, incoming, date] = await finance.getTransaction(1)
                assert.equal(periodId, 0, 'period id should be correct')
                assert.equal(amount, transferAmount, 'amount should be correct')
                assert.equal(paymentId, 0, 'payment id should be 0')
                assert.equal(paymentRepeatNumber, 0, 'payment repeat number should be 0')
                assert.equal(token, tokenInstance.address, 'token should be correct')
                assert.equal(entity, accounts[0], 'entity should be correct')
                assert.isTrue(incoming, 'tx should be incoming')
                assert.equal(date, 1, 'date should be correct')
                assert.equal(getEventData(receipt, 'NewTransaction', 'reference'), 'ref', 'ref should be correct')
            })

            it('fails on no value deposits', async () => {
                await assertRevert(() => {
                  return finance.deposit(tokenInstance.address, 0, 'ref')
                })
            })
        })
    }

    context('ETH deposits', () => {
        const sentWei = 10

        it('records deposits using deposit function', async () => {
            const reference = 'deposit reference'
            const receipt = await finance.deposit(ETH, sentWei, reference, { value: sentWei })

            const transactionId = receipt.logs.filter(log => log.event == 'NewTransaction')[0].args.transactionId

            const [periodId, amount, paymentId, paymentRepeatNumber, token, entity, incoming, date] = await finance.getTransaction(transactionId)

            assert.equal(await vault.balance(ETH), VAULT_INITIAL_ETH_BALANCE + sentWei, 'deposited ETH must be in vault')
            assert.equal(periodId, 0, 'period id should be correct')
            assert.equal(amount, sentWei, 'amount should be correct')
            assert.equal(paymentId, 0, 'payment id should be 0')
            assert.equal(paymentRepeatNumber, 0, 'payment repeat number should be 0')
            assert.equal(token, ETH, 'token should be ETH token')
            assert.equal(entity, accounts[0], 'entity should be correct')
            assert.isTrue(incoming, 'tx should be incoming')
            assert.equal(date, 1, 'date should be correct')
            assert.equal(getEventData(receipt, 'NewTransaction', 'reference'), reference, 'ref should be correct')
        })

        it('records ETH deposits using fallback', async () => {
            const receipt = await finance.send(sentWei)
            const transactionId = receipt.logs.filter(log => log.event == 'NewTransaction')[0].args.transactionId

            const [periodId, amount, paymentId, paymentRepeatNumber, token, entity, incoming, date] = await finance.getTransaction(transactionId)

            assert.equal(await vault.balance(ETH), VAULT_INITIAL_ETH_BALANCE + sentWei, 'deposited ETH must be in vault')
            assert.equal(periodId, 0, 'period id should be correct')
            assert.equal(amount, sentWei, 'amount should be correct')
            assert.equal(paymentId, 0, 'payment id should be 0')
            assert.equal(paymentRepeatNumber, 0, 'payment repeat number should be 0')
            assert.equal(token, ETH, 'token should be ETH token')
            assert.equal(entity, accounts[0], 'entity should be correct')
            assert.isTrue(incoming, 'tx should be incoming')
            assert.equal(date, 1, 'date should be correct')
            assert.equal(getEventData(receipt, 'NewTransaction', 'reference'), 'Ether transfer to Finance app', 'ref should be correct')
        })
    })

    for ({ title, tokenContract} of tokenTestGroups) {
        context(`locked ERC20 (${title})`, () => {
            const lockedTokenAmount = 5
            let tokenInstance

            beforeEach(async () => {
                // Set up a new token similar to token1's distribution
                tokenInstance = await tokenContract.new(accounts[0], 10000 + VAULT_INITIAL_TOKEN1_BALANCE + lockedTokenAmount)
                await tokenInstance.transfer(vault.address, VAULT_INITIAL_TOKEN1_BALANCE)

                // 'lock' tokens
                await tokenInstance.transfer(finance.address, lockedTokenAmount)
            })

            it('allow recoverability is disabled', async () => {
                assert.isFalse(await finance.allowRecoverability(tokenInstance.address))
            })

            it('are recovered using Finance#recoverToVault', async () => {
                const receipt = await finance.recoverToVault(tokenInstance.address)

                assert.equal((await tokenInstance.balanceOf(vault.address)).valueOf(), VAULT_INITIAL_TOKEN1_BALANCE + lockedTokenAmount, 'deposited tokens must be in vault')
                assert.equal(await tokenInstance.balanceOf(finance.address), 0, 'finance shouldn\'t have tokens')

                const [periodId, amount, paymentId, paymentRepeatNumber, token, entity, incoming, date] = await finance.getTransaction(1)
                assert.equal(periodId, 0, 'period id should be correct')
                assert.equal(amount, lockedTokenAmount, 'amount should be correct')
                assert.equal(paymentId, 0, 'payment id should be 0')
                assert.equal(paymentRepeatNumber, 0, 'payment repeat number should be 0')
                assert.equal(token, tokenInstance.address, 'token should be correct')
                assert.equal(entity, finance.address, 'entity should be correct')
                assert.isTrue(incoming, 'tx should be incoming')
                assert.equal(date, 1, 'date should be correct')
                assert.equal(getEventData(receipt, 'NewTransaction', 'reference'), 'Recover to Vault', 'ref should be correct')
            })

            it('fail to be recovered using AragonApp#transferToVault', async () => {
                return assertRevert(() => (
                    finance.transferToVault(tokenInstance.address)
                ))
            })

            it('fail to be recovered if token balance is 0', async () => {
                // if current balance is zero, it reverts
                return assertRevert(async () => (
                    finance.recoverToVault(token2.address)
                ))
            })
        })
    }

    context('locked ETH', () => {
        const lockedETH = 100

        beforeEach(async () => {
            await forceSendETH(finance.address, lockedETH)
            assert.equal((await getBalance(finance.address)).valueOf(), lockedETH, 'finance should have stuck ETH')
        })

        it('allow recoverability is disabled', async () => {
            assert.isFalse(await finance.allowRecoverability(ETH))
        })

        it('is recovered using Finance#recoverToVault', async () => {
            const receipt = await finance.recoverToVault(ETH)

            const [periodId, amount, paymentId, paymentRepeatNumber, token, entity, incoming, date] = await finance.getTransaction(1)

            assert.equal(await vault.balance(ETH), VAULT_INITIAL_ETH_BALANCE + lockedETH, 'recovered ETH must be in vault')
            assert.equal((await getBalance(finance.address)).valueOf(), 0, 'finance shouldn\'t have ETH')
            assert.equal(periodId, 0, 'period id should be correct')
            assert.equal(amount, lockedETH, 'amount should be correct')
            assert.equal(paymentId, 0, 'payment id should be 0')
            assert.equal(paymentRepeatNumber, 0, 'payment repeat number should be 0')
            assert.equal(token, ETH, 'token should be correct')
            assert.equal(entity, finance.address, 'entity should be correct')
            assert.isTrue(incoming, 'tx should be incoming')
            assert.equal(date, 1, 'date should be correct')
            assert.equal(getEventData(receipt, 'NewTransaction', 'reference'), 'Recover to Vault', 'ref should be correct')
        })

        it('fails to be recovered using AragonApp#transferToVault', async () => {
            return assertRevert(() => (
                finance.transferToVault(ETH)
            ))
        })

        it('fails to be recovered if ETH balance is 0', async () => {
            await finance.recoverToVault(ETH)

            // if current balance is zero, it reverts
            return assertRevert(async () => (
                finance.recoverToVault(ETH)
            ))
        })
    })

    context('setting budget', () => {
        const recipient = accounts[1]
        const time = START_TIME + 21

        beforeEach(async () => {
            await finance.setBudget(token1.address, 50)
            await finance.setBudget(token2.address, 100)
            await finance.setBudget(ETH, 150)

            await finance.mock_setTimestamp(time)
        })

        it('records payment', async () => {
            const amount = 10
            // repeats up to 10 times every 2 seconds
            const receipt = await finance.newPayment(token1.address, recipient, amount, time, 2, 10, 'ref')

            const [token, receiver, txAmount, initialTime, interval, maxRepeats, disabled, repeats, createdBy] = await finance.getPayment(1)

            assert.equal(token, token1.address, 'token address should match')
            assert.equal(receiver, recipient, 'receiver should match')
            assert.equal(amount, txAmount, 'amount should match')
            assert.equal(initialTime, time, 'time should match')
            assert.equal(interval, 2, 'interval should match')
            assert.equal(maxRepeats, 10, 'max repeats should match')
            assert.equal(getEventData(receipt, 'NewPayment', 'reference'), 'ref', 'ref should match')
            assert.isFalse(disabled, 'should be enabled')
            assert.equal(repeats, 1, 'should be on repeat 1')
            assert.equal(createdBy, accounts[0], 'should have correct creator')
        })

        it('fails trying to get payment out of bounds', async () => {
            const amount = 10
            // repeats up to 10 times every 2 seconds
            await finance.newPayment(token1.address, recipient, amount, time, 2, 10, 'ref')

            await assertRevert(async () => {
                await finance.getPayment(0)
            })
            await assertRevert(async () => {
                await finance.getPayment(2)
            })
        })

        it('fails trying to get transaction out of bounds', async () => {
            const amount = 10
            // repeats up to 10 times every 2 seconds
            await finance.newPayment(token1.address, recipient, amount, time, 2, 10, 'ref')

            await assertRevert(async () => {
                await finance.getTransaction(2)
            })
        })

        it('can create single payment transaction', async () => {
            const amount = 10

            const receipt = await finance.newImmediatePayment(token1.address, recipient, amount, 'ref')

            assert.equal((await token1.balanceOf(recipient)).valueOf(), amount, 'recipient should have received tokens')

            const [periodId, txAmount, paymentId, paymentRepeatNumber, token, entity, isIncoming, date] = await finance.getTransaction(1)
            assert.equal(periodId, 0, 'period id should be correct')
            assert.equal(txAmount, amount, 'amount should match')
            assert.equal(paymentId, 0, 'payment id should be 0 for single payment')
            assert.equal(paymentRepeatNumber, 0, 'payment repeat number should be 0')
            assert.equal(token, token1.address, 'token address should match')
            assert.equal(entity, recipient, 'receiver should match')
            assert.isFalse(isIncoming, 'single payment should be outgoing')
            assert.equal(date.valueOf(), time, 'date should be correct')
            assert.equal(getEventData(receipt, 'NewTransaction', 'reference'), 'ref', 'ref should match')
        })

        it('can decrease budget after spending', async () => {
            const amount = 10

            await finance.newImmediatePayment(token1.address, recipient, amount, '')

            const newBudgetAmount = 5
            await finance.setBudget(token1.address, newBudgetAmount)

            const [budget, hasBudget] = await finance.getBudget.call(token1.address)
            const remainingBudget = await finance.getRemainingBudget.call(token1.address)

            assert.equal(budget, newBudgetAmount, 'new budget should be correct')
            assert.isTrue(hasBudget, 'should have budget')
            assert.equal(remainingBudget, 0, 'remaining budget should be 0')
        })

        it('removing budget allows unlimited spending', async () => {
            await finance.removeBudget(token2.address)

            const [budget, hasBudget] = await finance.getBudget.call(token2.address)
            assert.equal(budget, 0, 'removed budget should be 0')
            assert.isFalse(hasBudget, 'should not have budget')

            // budget was 100
            await finance.newImmediatePayment(token2.address, recipient, 190, '')
            assert.equal((await token2.balanceOf(recipient)).valueOf(), 190, 'recipient should have received tokens')
        })

        it('can create recurring payment', async () => {
            const amount = 10

            // repeats up to 10 times every 2 seconds
            const firstReceipt = await finance.newPayment(token1.address, recipient, amount, time, 2, 10, '')
            await finance.mock_setTimestamp(time + 4)
            const secondReceipt = await finance.executePayment(1)

            assert.equal((await token1.balanceOf(recipient)).valueOf(), amount * 3, 'recipient should have received tokens')
            assert.equal(await finance.nextPaymentTime(1), time + 4 + 2, 'payment should be repeated again in 2')

            return Promise.all([firstReceipt, secondReceipt].map(async (receipt, index) => {
              const repeatNum = index + 1

              const transactionId = receipt.logs.filter(log => log.event == 'NewTransaction')[0].args.transactionId
              const [periodId, txAmount, paymentId, paymentRepeatNumber, token, entity, incoming, date] = await finance.getTransaction(transactionId)

              assert.equal(txAmount, amount, 'amount should be correct')
              assert.equal(paymentId, 1, 'payment id should be 1')
              assert.equal(paymentRepeatNumber.valueOf(), repeatNum, `payment repeat number should be ${repeatNum}`)
            }))
        })

        it('can create recurring ether payment', async () => {
            const amount = 10

            // repeats up to 10 times every 2 seconds
            await finance.newPayment(ETH, withdrawAddr, amount, time, 2, 10, '')
            await finance.mock_setTimestamp(time + 4)
            await finance.executePayment(1)

            assert.equal((await getBalance(withdrawAddr)).valueOf(), amount * 3, 'recipient should have received ether')
        })

        it('doesnt record payment for single payment transaction', async () => {
            const receipt = await finance.newImmediatePayment(token1.address, recipient, 1, '')
            assertEvent(receipt, 'NewPayment', 0)
            await assertRevert(async () => {
                await finance.getPayment(1)
            })
        })

        context('multitransaction period', async () => {
            beforeEach(async () => {
                // single payment
                await finance.newImmediatePayment(token1.address, recipient, 10, '') // will spend 10
                // repeats up to 2 times every 1 seconds
                await finance.newPayment(token2.address, recipient, 5, time + 1, 1, 2, '') // will spend 10
                await finance.mock_setTimestamp(time + 4)

                await finance.executePayment(1) // first create payment doesn't get an id because it is simple immediate tx

                await token1.approve(finance.address, 5)
                await finance.deposit(token1.address, 5, '')
            })

            it('has correct token statements', async () => {
                const [t1expense, t1income] = await finance.getPeriodTokenStatement(0, token1.address)
                const [t2expense, t2income] = await finance.getPeriodTokenStatement(0, token2.address)

                assert.equal(t1expense, 10, 'token 1 expenses should be correct')
                assert.equal(t1income, 5, 'token 1 income should be correct')

                assert.equal(t2expense, 10, 'token 2 expenses should be correct')
                assert.equal(t2income, 0, 'token 2 income should be correct')
            })

            it('finishes accounting period correctly', async () => {
                await finance.mock_setTimestamp(PERIOD_DURATION + 1)
                await finance.tryTransitionAccountingPeriod(1)

                const [isCurrent, start, end, firstTx, lastTx] = await finance.getPeriod(0)

                assert.isFalse(isCurrent, 'shouldnt be current period')
                assert.equal(start.valueOf(), START_TIME, 'should have correct start date')
                assert.equal(end.valueOf(), START_TIME + PERIOD_DURATION - 1, 'should have correct end date')
                assert.equal(firstTx.valueOf(), 1, 'should have correct first tx')
                assert.equal(lastTx.valueOf(), 4, 'should have correct last tx')
            })

            it('fails trying to access period out of bounds', async () => {
                await finance.mock_setTimestamp(PERIOD_DURATION + 1)
                await finance.tryTransitionAccountingPeriod(1)

                const currentPeriodId = await finance.currentPeriodId()
                return assertRevert(async () => {
                    await finance.getPeriod(currentPeriodId + 1)
                })
            })
        })

        context('many accounting period transitions', () => {
            // Arbitrary number of max transitions to simulate OOG behaviour with transitionsPeriod
            const maxTransitions = 20

            beforeEach(async () => {
                await finance.mock_setMaxPeriodTransitions(maxTransitions)
                await finance.mock_setTimestamp(time + (maxTransitions + 2) * PERIOD_DURATION)
            })

            it('fails when too many period transitions are needed', async () => {
                // Normal payments
                await assertRevert(async () => {
                    await finance.newImmediatePayment(token1.address, recipient, 10, '')
                })

                // Direct ETH transfers
                await assertRevert(async () => {
                    await finance.send(10, { gas: 3e5 })
                })
            })

            it('can transition periods externally to remove deadlock for payments', async () => {
                await finance.tryTransitionAccountingPeriod(maxTransitions)
                await finance.newImmediatePayment(token1.address, recipient, 10, '')

                assert.equal((await token1.balanceOf(recipient)).valueOf(), 10, 'recipient should have received tokens')
            })

            it('can transition periods externally to remove deadlock for direct deposits', async () => {
                const sentWei = 10
                const prevVaultBalance = (await getBalance(vault.address)).toNumber()

                await finance.tryTransitionAccountingPeriod(maxTransitions)

                const receipt = await finance.send(sentWei, { gas: 3e5 })
                const transactionId = receipt.logs.filter(log => log.event == 'NewTransaction')[0].args.transactionId
                const [periodId, amount, paymentId, paymentRepeatNumber, token, entity, incoming, date] = await finance.getTransaction(transactionId)

                assert.equal(amount, sentWei, 'app should have received ETH and sent it to vault')
                assert.equal((await getBalance(vault.address)).valueOf(), prevVaultBalance + sentWei, 'app should have received ETH and sent it to vault')
            })

            it('non-activity accounting periods have no transactions', async () => {
                await finance.tryTransitionAccountingPeriod(5)

                const [isCurrent, start, end, firstTx, lastTx] = await finance.getPeriod(2)

                assert.isFalse(isCurrent, 'shouldnt be current period')
                assert.equal(start.valueOf(), PERIOD_DURATION * 2 + 1, 'should have correct start date')
                assert.equal(end.valueOf(), PERIOD_DURATION * 3, 'should have correct end date')
                assert.equal(firstTx, 0, 'should have empty txs')
                assert.equal(lastTx, 0, 'should have empty txs')
            })
        })

        context('single payment', async () => {
            const amount = 10

            it('can create a single payment', async () => {
                const receipt = await finance.newImmediatePayment(token1.address, recipient, amount,'')
                assertEvent(receipt, 'NewTransaction')
                assertEvent(receipt, 'NewPeriod', 0)
            })

            it('fails to create a zero-amount single payment', async () => {
                await assertRevert(async () => {
                    await finance.newImmediatePayment(token1.address, recipient, 0, '')
                })
            })

            it('fails to create a single payment too high for the current budget', async () => {
                const budget = 10
                await finance.setBudget(token1.address, budget)

                return assertRevert(() => {
                    return finance.newImmediatePayment(token1.address, recipient, budget + 1, '')
                })
            })

            it('fails to execute a single payment without enough funds', async () => {
                const vaultBalance = await vault.balance(token1.address)
                await finance.removeBudget(token1.address) // clear any budget restrictions

                return assertRevert(async () => {
                    await finance.newImmediatePayment(token1.address, recipient, vaultBalance + 1, '')
                })
            })
        })

        context('recurring payment', async () => {
            const amount = 10

            it('can create a recurring payment', async () => {
                const receipt = await finance.newPayment(token1.address, recipient, amount, time + 1, 1, 4, '')
                assertEvent(receipt, 'NewPayment')
            })

            it('can create a future recurring payment too large for current funds', async () => {
                const vaultBalance = await vault.balance(token1.address)
                await finance.removeBudget(token1.address) // clear any budget restrictions

                const receipt = await finance.newPayment(token1.address, recipient, vaultBalance * 2, time + 1, 1, 4, '')
                assertEvent(receipt, 'NewPayment')
            })

            it('can create a single future payment', async () => {
                const receipt = await finance.newPayment(token1.address, recipient, amount, time + 1, 1, 1, '')
                assertEvent(receipt, 'NewPayment')
            })

            it('can create a single future payment too large for current funds', async () => {
                const vaultBalance = await vault.balance(token1.address)
                await finance.removeBudget(token1.address) // clear any budget restrictions

                const receipt = await finance.newPayment(token1.address, recipient, vaultBalance * 2, time + 1, 1, 1, '')
                assertEvent(receipt, 'NewPayment')
            })

            it('fails to create a zero-amount payment', async () => {
                await assertRevert(async () => {
                    await finance.newPayment(token1.address, recipient, 0, time + 1, 1, 2, '')
                })
            })

            it('fails to create a no-interval payment', async () => {
                await assertRevert(async () => {
                    await finance.newPayment(token1.address, recipient, 1, time + 1, 0, 2, '')
                })
            })

            it('fails to create a new one-time payment without enough budget', async () => {
                const budget = 10
                await finance.setBudget(token1.address, budget)

                return assertRevert(async () => {
                    await finance.newPayment(token1.address, recipient, budget + 1, time, 1, 1, '')
                })
            })

            it('fails to create a new one-time payment without enough funds', async () => {
                const vaultBalance = await vault.balance(token1.address)
                await finance.removeBudget(token1.address) // clear any budget restrictions

                return assertRevert(async () => {
                    await finance.newPayment(token1.address, recipient, vaultBalance + 1, time, 1, 1, '')
                })
            })

            it('fails to create an immediate non-repeatable single payment', async () => {
                await assertRevert(async () => {
                    await finance.newPayment(token1.address, recipient, 1, time - 1, 1, 1, '')
                })
            })

            it('fails to create a recurring payment too high for the current budget', async () => {
                const budget = 10
                await finance.setBudget(token1.address, budget)

                return assertRevert(() => {
                    return finance.newPayment(token1.address, recipient, budget + 1, time, 1, 2, '')
                })
            })

            it('fails to execute a recurring payment without enough funds', async () => {
                const vaultBalance = await vault.balance(token1.address)
                await finance.removeBudget(token1.address) // clear any budget restrictions

                const receipt = await finance.newPayment(token1.address, recipient, vaultBalance + 1, time, 1, 2, '')
                const newPaymentId = getEventData(receipt, 'NewPayment', 'paymentId')

                return assertRevert(async () => {
                    await finance.executePayment(newPaymentId, { from: recipient })
                })
            })

            context('created recurring payment', async () => {
                let paymentId

                beforeEach(async () => {
                    const receipt = await finance.newPayment(token1.address, recipient, amount, time + 1, 1, 4, '')
                    paymentId = getEventData(receipt, 'NewPayment', 'paymentId')
                })

                it('only repeats recurring payment until max repeats', async () => {
                    await finance.mock_setTimestamp(time + 10)
                    await finance.executePayment(paymentId)

                    assert.equal((await token1.balanceOf(recipient)).valueOf(), amount * 4, 'recipient should have received tokens')
                    assert.deepEqual(await finance.nextPaymentTime(paymentId), MAX_UINT64, 'payment should never be repeated')
                })

                it('receiver can always execute a payment', async () => {
                    await finance.mock_setTimestamp(time + 1)
                    await finance.receiverExecutePayment(paymentId, { from: recipient })

                    assert.equal((await token1.balanceOf(recipient)).valueOf(), amount, 'should have received payment')
                })


                it('fails when non-receiver attempts to execute a payment', async () => {
                    await finance.mock_setTimestamp(time + 1)

                    return assertRevert(async () => {
                        await finance.receiverExecutePayment(paymentId)
                    })
                })

                it('fails to execute a recurring payment before next available time', async () => {
                    return assertRevert(async () => {
                        await finance.executePayment(paymentId, { from: recipient })
                    })
                })

                it('fails to execute a recurring payment by receiver before next available time', async () => {
                    return assertRevert(async () => {
                        await finance.receiverExecutePayment(paymentId, { from: recipient })
                    })
                })

                it('fails to execute inactive recurring payment', async () => {
                    await finance.setPaymentStatus(paymentId, false)
                    await finance.mock_setTimestamp(time + 1)

                    return assertRevert(async () => {
                        await finance.executePayment(paymentId, { from: recipient })
                    })
                })

                it('succeeds payment after setting payment status to active', async () => {
                    await finance.setPaymentStatus(paymentId, true)
                    await finance.mock_setTimestamp(time + 1)

                    await finance.executePayment(paymentId, { from: recipient })
                })
            })

            context('payment failure', async () => {
                it('tries to execute a new recurring payment if initially possible even without enough funds', async () => {
                    const vaultBalance = await vault.balance(token1.address)
                    await finance.removeBudget(token1.address) // clear any budget restrictions

                    const receipt = await finance.newPayment(token1.address, recipient, vaultBalance + 1, time, 1, 2, '')

                    assertEvent(receipt, 'PaymentFailure')
                    // Make sure no transactions were made
                    assertEvent(receipt, 'NewTransaction', 0)
                })

                it('emits payment failure event when out of budget', async () => {
                    // Enough budget to allow creation of a new payment, but not enough left in the period
                    // to execute it
                    const budget = 50
                    const amountPerPayment = 50
                    assert.isTrue(await finance.canMakePayment(token1.address, amountPerPayment))

                    // Create the budget, and use it up for the period
                    await finance.setBudget(token1.address, budget)
                    await finance.newPayment(token1.address, recipient, amountPerPayment, time, 1, 2, '')

                    // No more budget left
                    const receipt = await finance.newPayment(token1.address, recipient, amountPerPayment, time, 1, 2, '')
                    assertEvent(receipt, 'PaymentFailure')
                    assert.isFalse(await finance.canMakePayment(token1.address, amountPerPayment))
                })

                it('emits payment failure event when out of balance', async () => {
                    const amountPerPayment = 40
                    const paidInterval = 100
                    const paidTimes = Math.floor((await vault.balance(token1.address)) / amountPerPayment)
                    await finance.removeBudget(token1.address)

                    assert.isTrue(await finance.canMakePayment(token1.address, amountPerPayment))

                    // creates a repeating payment that can be repeated one more than the vault's funds will allow
                    await finance.newPayment(token1.address, recipient, amountPerPayment, time, paidInterval, paidTimes + 1, '')
                    await finance.mock_setTimestamp(time + paidInterval * (paidTimes + 1))
                    const receipt = await finance.executePayment(1)

                    assertEvent(receipt, 'PaymentFailure')
                    assert.equal(await token1.balanceOf(recipient), amountPerPayment * paidTimes, 'recipient should have received tokens')
                    assert.isFalse(await finance.canMakePayment(token1.address, amountPerPayment))
                })
            })
        })
    })

    context('Without initialize', async () => {
        let nonInit, recVault

        beforeEach(async () => {
            const { financeApp, recoveryVault } = await newProxyFinance()
            nonInit = financeApp
            recVault = recoveryVault
            await nonInit.mock_setTimestamp(START_TIME)
        })

        it('fails to create new recurring payment', async() => {
            const recipient = accounts[1]
            const amount = 1
            const time = 22
            await nonInit.mock_setTimestamp(time)

            return assertRevert(async() => {
                await nonInit.newPayment(token1.address, recipient, amount, time, 1, 2, 'ref')
            })
        })

        it('fails to create new single payment transaction', async() => {
            const recipient = accounts[1]
            const amount = 1
            const time = 22
            await nonInit.mock_setTimestamp(time)

            return assertRevert(async() => {
                await nonInit.newImmediatePayment(token1.address, recipient, amount, 'ref')
            })
        })

        it('fails to deposit ERC20 tokens', async() => {
            await token1.approve(nonInit.address, 5)
            return assertRevert(async() => {
                await nonInit.deposit(token1.address, 5, 'ref')
            })
        })

        it('fails to send tokens to Vault', async() => {
            // 'lock' tokens
            await token1.transfer(nonInit.address, 5)
            return assertRevert(async() => {
                await nonInit.recoverToVault(token1.address)
            })
        })

        it('fails to deposit ETH', async() => {
            return assertRevert(async() => {
                await nonInit.send(10, { gas: 3e5 })
            })
        })

        context('locked ERC20', () => {
            const lockedTokenAmount = 5

            beforeEach(async () => {
                // 'lock' tokens
                await token1.transfer(nonInit.address, lockedTokenAmount)
            })

            it('allow recoverability is enabled', async () => {
                assert.isTrue(await nonInit.allowRecoverability(token1.address))
            })

            it('can be recovered using AragonApp#transferToVault', async () => {
                await nonInit.transferToVault(token1.address)

                assert.equal(await recVault.balance(token1.address), lockedTokenAmount)
            })

            it('fail to be recovered using Finance#recoverToVault', async () => {
                return assertRevert(async () => (
                    finance.recoverToVault(token1.address)
                ))
            })
        })

        context('locked ETH', () => {
            const lockedETH = 100

            beforeEach(async () => {
                await forceSendETH(nonInit.address, lockedETH)
                assert.equal((await getBalance(nonInit.address)).valueOf(), lockedETH, 'finance should have stuck ETH')
            })

            it('allow recoverability is enabled', async () => {
                assert.isTrue(await nonInit.allowRecoverability(ETH))
            })

            it('fails to be recovered using Finance#recoverToVault', async () => {
                return assertRevert(async () => (
                    await nonInit.recoverToVault(ETH)
                ))
            })

            it('can recover ETH using AragonApp#transferToVault', async () => {
                await nonInit.transferToVault(ETH)

                assert.equal(await recVault.balance(ETH), lockedETH)
            })
        })
    })
})
