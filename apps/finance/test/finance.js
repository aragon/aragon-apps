const { assertRevert, assertInvalidOpcode } = require('@aragon/test-helpers/assertThrow')
const getBalance = require('@aragon/test-helpers/balance')(web3)

const Finance = artifacts.require('FinanceMock')
const Vault = artifacts.require('Vault')
const MiniMeToken = artifacts.require('MiniMeToken')

const getContract = name => artifacts.require(name)

contract('Finance App', accounts => {
    let daoFact, financeBase, finance, vaultBase, vault, token1, token2, executionTarget, etherToken = {}

    let ETH, MAX_UINT64, ANY_ENTITY, APP_MANAGER_ROLE
    let CREATE_PAYMENTS_ROLE, CHANGE_PERIOD_ROLE, CHANGE_BUDGETS_ROLE, EXECUTE_PAYMENTS_ROLE, DISABLE_PAYMENTS_ROLE
    let TRANSFER_ROLE

    const root = accounts[0]
    const n = '0x00'
    const START_TIME = 1
    const PERIOD_DURATION = 60 * 60 * 24 // One day in seconds
    const withdrawAddr = '0x0000000000000000000000000000000000001234'
    const VAULT_INITIAL_ETH_BALANCE = 400

    before(async () => {
        const kernelBase = await getContract('Kernel').new(true) // petrify immediately
        const aclBase = await getContract('ACL').new()
        const regFact = await getContract('EVMScriptRegistryFactory').new()
        daoFact = await getContract('DAOFactory').new(kernelBase.address, aclBase.address, regFact.address)
        vaultBase = await Vault.new()
        financeBase = await Finance.new()

        // Setup constants
        ETH = await financeBase.ETH()
        MAX_UINT64 = await financeBase.MAX_UINT64()
        ANY_ENTITY = await aclBase.ANY_ENTITY()
        APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()

        CREATE_PAYMENTS_ROLE = await financeBase.CREATE_PAYMENTS_ROLE()
        CHANGE_PERIOD_ROLE = await financeBase.CHANGE_PERIOD_ROLE()
        CHANGE_BUDGETS_ROLE = await financeBase.CHANGE_BUDGETS_ROLE()
        EXECUTE_PAYMENTS_ROLE = await financeBase.EXECUTE_PAYMENTS_ROLE()
        DISABLE_PAYMENTS_ROLE = await financeBase.DISABLE_PAYMENTS_ROLE()
        TRANSFER_ROLE = await vaultBase.TRANSFER_ROLE()
    })

    const setupRecoveryVault = async (dao) => {
        const recoveryVaultAppId = '0x90ab'
        const vaultReceipt = await dao.newAppInstance(recoveryVaultAppId, vaultBase.address, { from: root })
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
        const receipt2 = await dao.newAppInstance('0x5678', financeBase.address, { from: root })
        const financeApp = Finance.at(receipt2.logs.filter(l => l.event == 'NewAppProxy')[0].args.proxy)
        await financeApp.mock_setMaxPeriodTransitions(MAX_UINT64)

        await acl.createPermission(ANY_ENTITY, financeApp.address, CREATE_PAYMENTS_ROLE, root, { from: root })
        await acl.createPermission(ANY_ENTITY, financeApp.address, CHANGE_PERIOD_ROLE, root, { from: root })
        await acl.createPermission(ANY_ENTITY, financeApp.address, CHANGE_BUDGETS_ROLE, root, { from: root })
        await acl.createPermission(ANY_ENTITY, financeApp.address, EXECUTE_PAYMENTS_ROLE, root, { from: root })
        await acl.createPermission(ANY_ENTITY, financeApp.address, DISABLE_PAYMENTS_ROLE, root, { from: root })

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
        const receipt1 = await dao.newAppInstance('0x1234', vaultBase.address, { from: root })
        vault = getContract('Vault').at(receipt1.logs.filter(l => l.event == 'NewAppProxy')[0].args.proxy)
        const acl = getContract('ACL').at(await dao.acl())
        await acl.createPermission(finance.address, vault.address, TRANSFER_ROLE, root, { from: root })
        await vault.initialize()

        token1 = await MiniMeToken.new(n, n, 0, 'n', 0, 'n', true) // dummy parameters for minime
        await token1.generateTokens(vault.address, 100)
        await token1.generateTokens(accounts[0], 10)
        token2 = await MiniMeToken.new(n, n, 0, 'n', 0, 'n', true) // dummy parameters for minime
        await token2.generateTokens(vault.address, 200)
        await vault.deposit(ETH, accounts[0], VAULT_INITIAL_ETH_BALANCE, { value: VAULT_INITIAL_ETH_BALANCE });

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

        assert.equal(end.toNumber(), MAX_UINT64.toNumber(), "should have set the period's end date to MAX_UINT64")
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

    it('records ERC20 deposits', async () => {
        await token1.approve(finance.address, 5)
        await finance.deposit(token1.address, 5, 'ref')

        const [periodId, amount, paymentId, paymentRepeatNumber, token, entity, incoming, date, ref] = await finance.getTransaction(1)

        // vault has 100 token1 initially
        assert.equal((await token1.balanceOf(vault.address)).toString(), 100 + 5, 'deposited tokens must be in vault')
        assert.equal(periodId, 0, 'period id should be correct')
        assert.equal(amount, 5, 'amount should be correct')
        assert.equal(paymentId, 0, 'payment id should be 0')
        assert.equal(paymentRepeatNumber, 0, 'payment repeat number should be 0')
        assert.equal(token, token1.address, 'token should be correct')
        assert.equal(entity, accounts[0], 'entity should be correct')
        assert.isTrue(incoming, 'tx should be incoming')
        assert.equal(date, 1, 'date should be correct')
        assert.equal(ref, 'ref', 'ref should be correct')
    })

    it('fails on no value ERC20 deposits', async () => {
        await assertRevert(() => {
          return finance.deposit(token1.address, 0, 'ref')
        })
    })

    it('records ETH deposits using deposit function', async () => {
        const sentWei = 10
        const reference = 'deposit reference'
        const receipt = await finance.deposit(ETH, sentWei, reference, { value: sentWei })

        const transactionId = receipt.logs.filter(log => log.event == 'NewTransaction')[0].args.transactionId

        const [periodId, amount, paymentId, paymentRepeatNumber, token, entity, incoming, date, ref] = await finance.getTransaction(transactionId)

        assert.equal(await vault.balance(ETH), VAULT_INITIAL_ETH_BALANCE + 10, 'deposited ETH must be in vault')
        assert.equal(periodId, 0, 'period id should be correct')
        assert.equal(amount, sentWei, 'amount should be correct')
        assert.equal(paymentId, 0, 'payment id should be 0')
        assert.equal(paymentRepeatNumber, 0, 'payment repeat number should be 0')
        assert.equal(token, ETH, 'token should be ETH token')
        assert.equal(entity, accounts[0], 'entity should be correct')
        assert.isTrue(incoming, 'tx should be incoming')
        assert.equal(date, 1, 'date should be correct')
        assert.equal(ref, reference, 'ref should be correct')
    })

    it('records ETH deposits using fallback', async () => {
        const sentWei = 10
        const receipt = await finance.send(sentWei)
        const transactionId = receipt.logs.filter(log => log.event == 'NewTransaction')[0].args.transactionId

        const [periodId, amount, paymentId, paymentRepeatNumber, token, entity, incoming, date, ref] = await finance.getTransaction(transactionId)

        assert.equal(await vault.balance(ETH), VAULT_INITIAL_ETH_BALANCE + 10, 'deposited ETH must be in vault')
        assert.equal(periodId, 0, 'period id should be correct')
        assert.equal(amount, sentWei, 'amount should be correct')
        assert.equal(paymentId, 0, 'payment id should be 0')
        assert.equal(paymentRepeatNumber, 0, 'payment repeat number should be 0')
        assert.equal(token, ETH, 'token should be ETH token')
        assert.equal(entity, accounts[0], 'entity should be correct')
        assert.isTrue(incoming, 'tx should be incoming')
        assert.equal(date, 1, 'date should be correct')
        assert.equal(ref, 'Ether transfer to Finance app', 'ref should be correct')
    })

    context('locked tokens', () => {
        let initialBalance

        beforeEach(async () => {
            initialBalance = await token1.balanceOf(vault.address)
            // 'lock' tokens
            await token1.transfer(finance.address, 5)
        })

        it('allows recoverability is disabled', async () => {
            assert.isFalse(await finance.allowsRecoverability(token1.address))
        })

        it('are recovered using Finance#recoverToVault', async () => {
            await finance.recoverToVault(token1.address)

            const [periodId, amount, paymentId, paymentRepeatNumber, token, entity, incoming, date, ref] = await finance.getTransaction(1)

            let finalBalance = await token1.balanceOf(vault.address)
            assert.equal(finalBalance.toString(), initialBalance.plus(5).toString(), 'deposited tokens must be in vault')
            assert.equal(await token1.balanceOf(finance.address), 0, 'finance shouldn\'t have tokens')
            assert.equal(periodId, 0, 'period id should be correct')
            assert.equal(amount, 5, 'amount should be correct')
            assert.equal(paymentId, 0, 'payment id should be 0')
            assert.equal(paymentRepeatNumber, 0, 'payment repeat number should be 0')
            assert.equal(token, token1.address, 'token should be correct')
            assert.equal(entity, finance.address, 'entity should be correct')
            assert.isTrue(incoming, 'tx should be incoming')
            assert.equal(date, 1, 'date should be correct')
            assert.equal(ref, 'Recover to Vault', 'ref should be correct')
        })

        it('fail to be recovered using AragonApp#transferToVault', async () => {
            return assertRevert(() => (
                finance.transferToVault(token1.address)
            ))
        })

        it('fail to be recovered if token balance is 0', async () => {
            // if current balance is zero, it reverts
            return assertRevert(async () => (
                finance.recoverToVault(token2.address)
            ))
        })
    })

    context('locked ETH', () => {
        const lockedETH = 100

        beforeEach(async () => {
            await forceSendETH(finance.address, lockedETH)
            assert.equal((await getBalance(finance.address)).toNumber(), lockedETH, 'finance should have stuck ETH')
        })

        it('allows recoverability is disabled', async () => {
            assert.isFalse(await finance.allowsRecoverability(ETH))
        })

        it('is recovered using Finance#recoverToVault', async () => {
            await finance.recoverToVault(ETH)

            const [periodId, amount, paymentId, paymentRepeatNumber, token, entity, incoming, date, ref] = await finance.getTransaction(1)

            assert.equal(await vault.balance(ETH), VAULT_INITIAL_ETH_BALANCE + lockedETH, 'recovered ETH must be in vault')
            assert.equal((await getBalance(finance.address)).toNumber(), 0, 'finance shouldn\'t have ETH')
            assert.equal(periodId, 0, 'period id should be correct')
            assert.equal(amount, lockedETH, 'amount should be correct')
            assert.equal(paymentId, 0, 'payment id should be 0')
            assert.equal(paymentRepeatNumber, 0, 'payment repeat number should be 0')
            assert.equal(token, ETH, 'token should be correct')
            assert.equal(entity, finance.address, 'entity should be correct')
            assert.isTrue(incoming, 'tx should be incoming')
            assert.equal(date, 1, 'date should be correct')
            assert.equal(ref, 'Recover to Vault', 'ref should be correct')
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

    it('before setting budget allows unlimited spending', async () => {
        const recipient = accounts[1]
        const time = 22
        const amount = 190

        await finance.mock_setTimestamp(time)

        await finance.newPayment(token2.address, recipient, amount, time, 0, 1, '')
        assert.equal((await token2.balanceOf(recipient)).toString(), amount, 'recipient should have received tokens')
    })

    it('can change period duration', async () => {
        const newDuration = 60 * 60 * 24 * 2 // two days
        await finance.setPeriodDuration(newDuration)
        await finance.mock_setTimestamp(newDuration * 2.5) // Force at least two transitions

        await finance.tryTransitionAccountingPeriod(3) // transition a maximum of 3 accounting periods

        assert.equal((await finance.currentPeriodId()).toString(), 2, 'should have transitioned 2 periods')
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
            await finance.newPayment(token1.address, recipient, amount, time, 2, 10, 'ref')

            const [token, receiver, am, initialTime, interval, maxRepeats, ref, disabled, repeats, createdBy] = await finance.getPayment(1)

            assert.equal(token, token1.address, 'token address should match')
            assert.equal(receiver, recipient, 'receiver should match')
            assert.equal(amount, am, 'amount should match')
            assert.equal(initialTime, time, 'time should match')
            assert.equal(interval, 2, 'interval should match')
            assert.equal(maxRepeats, 10, 'max repeats should match')
            assert.equal(ref, 'ref', 'ref should match')
            assert.isFalse(disabled, 'should be enabled')
            assert.equal(repeats, 1, 'should be on repeat 1')
            assert.equal(createdBy, accounts[0], 'should have correct creator')
        })

        it('can create single payment', async () => {
            const amount = 10

            // interval 0, repeat 1 (single payment)
            await finance.newPayment(token1.address, recipient, amount, time, 0, 1, 'ref')

            assert.equal((await token1.balanceOf(recipient)).toString(), amount, 'recipient should have received tokens')

            const [periodId, am, paymentId, paymentRepeatNumber, token, entity, isIncoming, date, ref] = await finance.getTransaction(1)
            assert.equal(periodId, 0, 'period id should be correct')
            assert.equal(am, amount, 'amount should match')
            assert.equal(paymentId, 0, 'payment id should be 0 for single payment')
            assert.equal(paymentRepeatNumber, 0, 'payment repeat number should be 0')
            assert.equal(token, token1.address, 'token address should match')
            assert.equal(entity, recipient, 'receiver should match')
            assert.isFalse(isIncoming, 'single payment should be outgoing')
            assert.equal(date.toNumber(), time, 'date should be correct')
            assert.equal(ref, 'ref', 'ref should match')
        })

        it('can decrease budget after spending', async () => {
            const amount = 10

            // interval 0, repeat 1 (single payment)
            await finance.newPayment(token1.address, recipient, amount, time, 0, 1, '')

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
            await finance.newPayment(token2.address, recipient, 190, time, 0, 1, '')
            assert.equal((await token2.balanceOf(recipient)).toString(), 190, 'recipient should have received tokens')
        })

        it('can create recurring payment', async () => {
            const amount = 10

            // repeats up to 10 times every 2 seconds
            const firstReceipt = await finance.newPayment(token1.address, recipient, amount, time, 2, 10, '')
            await finance.mock_setTimestamp(time + 4)
            const secondReceipt = await finance.executePayment(1)

            assert.equal((await token1.balanceOf(recipient)).toString(), amount * 3, 'recipient should have received tokens')
            assert.equal(await finance.nextPaymentTime(1), time + 4 + 2, 'payment should be repeated again in 2')

            return Promise.all([firstReceipt, secondReceipt].map(async (receipt, index) => {
              const repeatNum = index + 1

              const transactionId = receipt.logs.filter(log => log.event == 'NewTransaction')[0].args.transactionId
              const [periodId, txAmount, paymentId, paymentRepeatNumber, token, entity, incoming, date, ref] = await finance.getTransaction(transactionId)

              assert.equal(txAmount, amount, 'amount should be correct')
              assert.equal(paymentId, 1, 'payment id should be 1')
              assert.equal(paymentRepeatNumber.toNumber(), repeatNum, `payment repeat number should be ${repeatNum}`)
            }))
        })

        it('can create recurring ether payment', async () => {
            const amount = 10

            // repeats up to 10 times every 2 seconds
            await finance.newPayment(ETH, withdrawAddr, amount, time, 2, 10, '')
            await finance.mock_setTimestamp(time + 4)
            await finance.executePayment(1)

            assert.equal((await getBalance(withdrawAddr)).toString(), amount * 3, 'recipient should have received ether')
        })

        it('doesnt record payment for one time past transaction', async () => {
            await finance.newPayment(token1.address, recipient, 1, time, 1, 1, '')
            return assertRevert(async () => {
                await finance.getPayment(1)
            })
        })

        context('multitransaction period', async () => {
            beforeEach(async () => {
                // single payment
                await finance.newPayment(token1.address, recipient, 10, time, 0, 1, '') // will spend 10
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
                assert.equal(start.toString(), START_TIME, 'should have correct start date')
                assert.equal(end.toString(), START_TIME + PERIOD_DURATION - 1, 'should have correct end date')
                assert.equal(firstTx, 1, 'should have correct first tx')
                assert.equal(lastTx, 4, 'should have correct last tx')
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
                    await finance.newPayment(token1.address, recipient, 10, time, 1, 1, '')
                })

                // Direct ETH transfers
                await assertRevert(async () => {
                    await finance.send(10, { gas: 3e5 })
                })
            })

            it('can transition periods externally to remove deadlock for payments', async () => {
                await finance.tryTransitionAccountingPeriod(maxTransitions)
                await finance.newPayment(token1.address, recipient, 10, time, 1, 1, '')

                assert.equal((await token1.balanceOf(recipient)).toString(), 10, 'recipient should have received tokens')
            })

            it('can transition periods externally to remove deadlock for direct deposits', async () => {
                const sentWei = 10
                const prevVaultBalance = (await getBalance(vault.address)).toNumber()

                await finance.tryTransitionAccountingPeriod(maxTransitions)

                const receipt = await finance.send(sentWei, { gas: 3e5 })
                const transactionId = receipt.logs.filter(log => log.event == 'NewTransaction')[0].args.transactionId
                const [periodId, amount, paymentId, paymentRepeatNumber, token, entity, incoming, date, ref] = await finance.getTransaction(transactionId)

                assert.equal(amount, sentWei, 'app should have received ETH and sent it to vault')
                assert.equal((await getBalance(vault.address)).toNumber(), prevVaultBalance + sentWei, 'app should have received ETH and sent it to vault')
            })

            it('non-activity accounting periods have no transactions', async () => {
                await finance.tryTransitionAccountingPeriod(5)

                const [isCurrent, start, end, firstTx, lastTx] = await finance.getPeriod(2)

                assert.isFalse(isCurrent, 'shouldnt be current period')
                assert.equal(start.toString(), PERIOD_DURATION * 2 + 1, 'should have correct start date')
                assert.equal(end.toString(), PERIOD_DURATION * 3, 'should have correct end date')
                assert.equal(firstTx, 0, 'should have empty txs')
                assert.equal(lastTx, 0, 'should have empty txs')
            })
        })

        context('creating payment', async () => {
            const amount = 10

            beforeEach(async () => {
                await finance.newPayment(token1.address, recipient, amount, time + 1, 1, 4, '')
            })

            it('only repeats payment until max repeats', async () => {
                await finance.mock_setTimestamp(time + 10)
                await finance.executePayment(1)

                assert.equal((await token1.balanceOf(recipient)).toString(), amount * 4, 'recipient should have received tokens')
                assert.deepEqual(await finance.nextPaymentTime(1), await finance.MAX_UINT64(), 'payment should be repeated again in 2')
            })

            it('receiver can always execute a payment', async () => {
                await finance.mock_setTimestamp(time + 1)
                await finance.receiverExecutePayment(1, { from: recipient })

                assert.equal((await token1.balanceOf(recipient)).toString(), amount, 'should have received payment')
            })

            it('fails creating a zero-amount payment', async () => {
                await assertRevert(async () => {
                    // one-time
                    await finance.newPayment(token1.address, recipient, 0, time + 1, 1, 1, '')
                })

                await assertRevert(async () => {
                    // recurring
                    await finance.newPayment(token1.address, recipient, 0, time + 1, 4, 1, '')
                })
            })

            it('fails when non-receiver attempts to execute a payment', async () => {
                await finance.mock_setTimestamp(time + 1)

                return assertRevert(async () => {
                    await finance.receiverExecutePayment(1)
                })
            })

            it('fails to create a payment too high for the current budget', async () => {
                const budget = 10
                await finance.setBudget(token1.address, budget)

                return assertRevert(() => {
                    const paymentAmount = budget * 10
                    return finance.newPayment(token1.address, recipient, 50, paymentAmount, 1, 2, '')
                })
            })

            it('fails executing a payment before time', async () => {
                return assertRevert(async () => {
                    await finance.executePayment(1, { from: recipient })
                })
            })

            it('fails executing a payment by receiver before time', async () => {
                return assertRevert(async () => {
                    await finance.receiverExecutePayment(1, { from: recipient })
                })
            })

            it('fails executing disabled payment', async () => {
                await finance.setPaymentDisabled(1, true)
                await finance.mock_setTimestamp(time + 1)

                return assertRevert(async () => {
                    await finance.executePayment(1, { from: recipient })
                })
            })
        })

        const assertPaymentFailure = receipt => {
            const filteredLogs = receipt.logs.filter(log => log.event == 'PaymentFailure')
            assert.equal(filteredLogs.length, 1, 'should have logged payment failure')
        }

        it('emits payment failure event when out of budget', async () => {
            // Enough budget to allow creation of a new payment, but not enough left in the period
            // to execute it
            const budget = 50
            const amountPerPayment = 50

            // Create the budget, and use it up for the period
            await finance.setBudget(token1.address, budget)
            await finance.newPayment(token1.address, recipient, amountPerPayment, time, 1, 2, '')

            // No more budget left
            const receipt = await finance.newPayment(token1.address, recipient, amountPerPayment, time, 1, 2, '')
            assertPaymentFailure(receipt)
        })

        it('emits payment failure event when out of balance', async () => {
            // repeats up to 3 times every 100 seconds
            await finance.newPayment(token1.address, recipient, 40, time, 100, 3, '')
            await finance.mock_setTimestamp(time + PERIOD_DURATION)
            await finance.executePayment(1)

            await finance.mock_setTimestamp(time + PERIOD_DURATION * 2)
            const receipt = await finance.executePayment(1)

            assertPaymentFailure(receipt)
            assert.equal(await token1.balanceOf(recipient), 80, 'recipient should have received tokens')
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

        it('fails to create new payment', async() => {
            const recipient = accounts[1]
            const amount = 1
            const time = 22
            await nonInit.mock_setTimestamp(time)

            return assertRevert(async() => {
                await nonInit.newPayment(token1.address, recipient, amount, time, 0, 1, 'ref')
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

        it('can recover ETH using AragonApp#transferToVault', async () => {
            await forceSendETH(nonInit.address, 100)

            await nonInit.transferToVault(ETH)

            assert.equal(await recVault.balance(ETH), 100)
        })

        context('locked tokens', () => {
            const lockedTokens = 5

            beforeEach(async () => {
                // 'lock' tokens
                await token1.transfer(nonInit.address, lockedTokens)
            })

            it('allows recoverability is enabled', async () => {
                assert.isTrue(await nonInit.allowsRecoverability(token1.address))
            })

            it('can be recovered using AragonApp#transferToVault', async () => {
                await nonInit.transferToVault(token1.address)

                assert.equal(await recVault.balance(token1.address), lockedTokens)
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
                assert.equal((await getBalance(nonInit.address)).toNumber(), lockedETH, 'finance should have stuck ETH')
            })

            it('allows recoverability is enabled', async () => {
                assert.isTrue(await nonInit.allowsRecoverability(ETH))
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
