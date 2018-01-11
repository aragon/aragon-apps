const { assertRevert, assertInvalidOpcode } = require('@aragon/test-helpers/assertThrow')
const getBalance = require('@aragon/test-helpers/balance')(web3)

const Vault = artifacts.require('Vault')
const Finance = artifacts.require('FinanceMock')
const MiniMeToken = artifacts.require('MiniMeToken')
const EtherToken = artifacts.require('EtherToken')

contract('Finance App', accounts => {
    let app, vault, token1, token2, executionTarget, etherToken = {}

    const n = '0x00'
    const periodDuration = 100
    const withdrawAddr = '0x0000000000000000000000000000000000001234'

    beforeEach(async () => {
        vault = await Vault.new()

        etherToken = await EtherToken.new()

        token1 = await MiniMeToken.new(n, n, 0, 'n', 0, 'n', true) // dummy parameters for minime
        await token1.generateTokens(vault.address, 100)
        await token1.generateTokens(accounts[0], 10)

        token2 = await MiniMeToken.new(n, n, 0, 'n', 0, 'n', true) // dummy parameters for minime
        await token2.generateTokens(vault.address, 200)

        await etherToken.wrap({ value: 500 })
        await etherToken.transfer(vault.address, 400)

        app = await Finance.new()
        await app.mock_setTimestamp(1)

        await app.initialize(vault.address, etherToken.address, periodDuration)
    })

    it('initialized first accounting period and settings', async () => {
        assert.equal(periodDuration, await app.getPeriodDuration(), 'period duration should match')
        assert.equal(await app.currentPeriodId(), 0, 'current period should be 0')
    })

    it('fails on reinitialization', async () => {
        return assertRevert(async () => {
            await app.initialize(vault.address, '0x00', periodDuration)
        })
    })

    it('adds new token to budget', async () => {
        await app.setBudget(token1.address, 10)

        const [budget, hasBudget, remainingBudget] = await app.getBudget(token1.address)
        assert.equal(budget, 10, 'should have correct budget')
        assert.isTrue(hasBudget, 'has budget should be true')
        assert.equal(remainingBudget, 10, 'all budget is remaining')
    })

    it('records ERC20 deposits', async () => {
        await token1.approve(app.address, 5)
        await app.deposit(token1.address, 5, 'ref')

        const [periodId, amount, paymentId, token, entity, incoming, date, ref] = await app.getTransaction(1)

        // vault has 100 token1 initially
        assert.equal(await token1.balanceOf(vault.address), 100 + 5, 'deposited tokens must be in vault')
        assert.equal(periodId, 0, 'period id should be correct')
        assert.equal(amount, 5, 'amount should be correct')
        assert.equal(paymentId, 0, 'payment id should be 0')
        assert.equal(token, token1.address, 'token should be correct')
        assert.equal(entity, accounts[0], 'entity should be correct')
        assert.isTrue(incoming, 'tx should be incoming')
        assert.equal(date, 1, 'date should be correct')
        assert.equal(ref, 'ref', 'ref should be correct')
    })

    it('records ERC20 approveAndCall deposits', async () => {
        let initialBalance = await token1.balanceOf(vault.address)
        await token1.approveAndCall(app.address, 5, 'ref')

        const [periodId, amount, paymentId, token, entity, incoming, date, ref] = await app.getTransaction(1)

        let finalBalance = await token1.balanceOf(vault.address)
        assert.equal(finalBalance.toString(), initialBalance.plus(5).toString(), 'deposited tokens must be in vault')
        assert.equal(periodId, 0, 'period id should be correct')
        assert.equal(amount, 5, 'amount should be correct')
        assert.equal(paymentId, 0, 'payment id should be 0')
        assert.equal(token, token1.address, 'token should be correct')
        assert.equal(entity, accounts[0], 'entity should be correct')
        assert.isTrue(incoming, 'tx should be incoming')
        assert.equal(date, 1, 'date should be correct')
        assert.equal(ref, 'ref', 'ref should be correct')
    })

    it('records ERC677 deposits', async () => {
        await etherToken.transferAndCall(app.address, 50, 'reference')

        const [periodId, amount, paymentId, token, entity, incoming, date, ref] = await app.getTransaction(1)

        // vault has 400 ether tokens initially
        assert.equal(await etherToken.balanceOf(vault.address), 400 + 50, 'deposited tokens must be in vault')
        assert.equal(periodId, 0, 'period id should be correct')
        assert.equal(amount, 50, 'amount should be correct')
        assert.equal(paymentId, 0, 'payment id should be 0')
        assert.equal(token, etherToken.address, 'token should be correct')
        assert.equal(entity, accounts[0], 'entity should be correct')
        assert.isTrue(incoming, 'tx should be incoming')
        assert.equal(date, 1, 'date should be correct')
        assert.equal(ref, 'reference', 'ref should be correct')
    })

    it('can wrapAndCall with EtherToken', async () => {
        await etherToken.wrapAndCall(app.address, 'reference', { from: accounts[1], value: 100 })

        const [periodId, amount, paymentId, token, entity, incoming, date, ref] = await app.getTransaction(1)

        // vault has 400 ether tokens initially
        assert.equal(await etherToken.balanceOf(vault.address), 400 + 100, 'deposited tokens must be in vault')
        assert.equal(periodId, 0, 'period id should be correct')
        assert.equal(amount, 100, 'amount should be correct')
        assert.equal(paymentId, 0, 'payment id should be 0')
        assert.equal(token, etherToken.address, 'token should be correct')
        assert.equal(entity, accounts[1], 'entity should be correct')
        assert.isTrue(incoming, 'tx should be incoming')
        assert.equal(date, 1, 'date should be correct')
        assert.equal(ref, 'reference', 'ref should be correct')
    })

    it('sends locked tokens to Vault', async () => {
        let initialBalance = await token1.balanceOf(vault.address)
        // 'lock' tokens
        await token1.transfer(app.address, 5)

        await app.depositToVault(token1.address)

        const [periodId, amount, paymentId, token, entity, incoming, date, ref] = await app.getTransaction(1)

        let finalBalance = await token1.balanceOf(vault.address)
        assert.equal(finalBalance.toString(), initialBalance.plus(5).toString(), 'deposited tokens must be in vault')
        assert.equal(await token1.balanceOf(app.address), 0, 'finance shouldn\'t have tokens')
        assert.equal(periodId, 0, 'period id should be correct')
        assert.equal(amount, 5, 'amount should be correct')
        assert.equal(paymentId, 0, 'payment id should be 0')
        assert.equal(token, token1.address, 'token should be correct')
        assert.equal(entity, app.address, 'entity should be correct')
        assert.isTrue(incoming, 'tx should be incoming')
        assert.equal(date, 1, 'date should be correct')
        assert.equal(ref, 'Deposit to Vault', 'ref should be correct')

    })

    it('try to send locked tokens to Vault, but balance is 0', async () => {
        // if current balance is zero, it just fails
        return assertRevert(async () => {
            await app.depositToVault(token1.address)
        })
    })

    it('before setting budget allows unlimited spending', async () => {
        const recipient = accounts[1]
        const time = 22

        await app.mock_setTimestamp(time)

        await app.newPayment(token2.address, recipient, 190, time, 0, 1, '')
        assert.equal(await token2.balanceOf(recipient), 190, 'recipient should have received tokens')
    })

    it('can change period duration', async () => {
        await app.setPeriodDuration(50)
        await app.mock_setTimestamp(160) // previous period duration was 100, so at time 160 must have transitioned 2 periods

        await app.tryTransitionAccountingPeriod(5) // transition a maximum of 5 accounting periods

        assert.equal(await app.currentPeriodId(), 2, 'should have transitioned 2 periods')
    })

    context('setting budget', () => {
        const recipient = accounts[1]
        const time = 22

        beforeEach(async () => {
            await app.setBudget(token1.address, 50)
            await app.setBudget(token2.address, 100)
            await app.setBudget(etherToken.address, 150)

            await app.mock_setTimestamp(time)
        })

        it('records payment', async () => {
            const amount = 10
            // repeats up to 10 times every 2 seconds
            await app.newPayment(token1.address, recipient, amount, time, 2, 10, 'ref')

            const [token, receiver, am, initialTime, interval, maxRepeats, ref, disabled, repeats, createdBy] = await app.getPayment(1)

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
            await app.newPayment(token1.address, recipient, amount, time, 0, 1, '')

            assert.equal(await token1.balanceOf(recipient), amount, 'recipient should have received tokens')
        })

        it('can decrease budget after spending', async () => {
            const amount = 10

            // interval 0, repeat 1 (single payment)
            await app.newPayment(token1.address, recipient, amount, time, 0, 1, '')

            const newBudgetAmount = 5
            await app.setBudget(token1.address, newBudgetAmount)

            const [budget, hasBudget, remainingBudget] = await app.getBudget(token1.address)

            assert.equal(budget, newBudgetAmount, 'new budget should be correct')
            assert.isTrue(hasBudget, 'should have budget')
            assert.equal(remainingBudget, 0, 'remaining budget should be 0')
        })

        it('removing budget allows unlimited spending', async () => {
            await app.removeBudget(token2.address)
            // budget was 100
            await app.newPayment(token2.address, recipient, 190, time, 0, 1, '')
            assert.equal(await token2.balanceOf(recipient), 190, 'recipient should have received tokens')
        })

        it('can create recurring payment', async () => {
            const amount = 10

            // repeats up to 10 times every 2 seconds
            await app.newPayment(token1.address, recipient, amount, time, 2, 10, '')
            await app.mock_setTimestamp(time + 4)
            await app.executePayment(1)

            assert.equal(await token1.balanceOf(recipient), amount * 3, 'recipient should have received tokens')
            assert.equal(await app.nextPaymentTime(1), time + 4 + 2, 'payment should be repeated again in 2')
        })

        it('can create recurring ether payment', async () => {
            const amount = 10

            // repeats up to 10 times every 2 seconds
            await app.newPayment(etherToken.address, withdrawAddr, amount, time, 2, 10, '')
            await app.mock_setTimestamp(time + 4)
            await app.executePayment(1)

            assert.equal(await getBalance(withdrawAddr), amount * 3, 'recipient should have received ether')
        })

        it('doesnt record payment for one time past transaction', async () => {
            await app.newPayment(token1.address, recipient, 1, time, 1, 1, '')
            return assertInvalidOpcode(async () => {
                await app.getPayment(1) // call will do an invalid jump
            })
        })

        context('multitransaction period', async () => {
            beforeEach(async () => {
                // single payment
                await app.newPayment(token1.address, recipient, 10, time, 0, 1, '') // will spend 10
                // repeats up to 2 times every 1 seconds
                await app.newPayment(token2.address, recipient, 5, time + 1, 1, 2, '') // will spend 10
                await app.mock_setTimestamp(time + 4)

                await app.executePayment(1) // first create payment doesn't get an id because it is simple immediate tx

                await token1.approve(app.address, 5)
                await app.deposit(token1.address, 5, '')
            })

            it('has correct token statements', async () => {
                const [t1expense, t1income] = await app.getPeriodTokenStatement(0, token1.address)
                const [t2expense, t2income] = await app.getPeriodTokenStatement(0, token2.address)

                assert.equal(t1expense, 10, 'token 1 expenses should be correct')
                assert.equal(t1income, 5, 'token 1 income should be correct')

                assert.equal(t2expense, 10, 'token 2 expenses should be correct')
                assert.equal(t2income, 0, 'token 2 income should be correct')
            })

            it('finishes accounting period correctly', async () => {
                await app.mock_setTimestamp(101)
                await app.tryTransitionAccountingPeriod(1)

                const [isCurrent, start, end, firstTx, lastTx] = await app.getPeriod(0)

                assert.isFalse(isCurrent, 'shouldnt be current period')
                assert.equal(start, 1, 'should have correct start date')
                assert.equal(end, 100, 'should have correct end date')
                assert.equal(firstTx, 1, 'should have correct first tx')
                assert.equal(lastTx, 4, 'should have correct last tx')
            })
        })

        context('many accounting period transitions', () => {
            let maxTransitions = 0

            beforeEach(async () => {
                maxTransitions = await app.MAX_PERIOD_TRANSITIONS_PER_TX().then(bn => bn.toNumber())
                await app.mock_setTimestamp(time + (maxTransitions + 2) * periodDuration)
            })

            it('fails when too many period transitions are needed', async () => {
                return assertRevert(async () => {
                    await app.newPayment(token1.address, recipient, 10, time, 1, 1, '')
                })
            })

            it('can transition periods externally to remove deadlock', async () => {
                await app.tryTransitionAccountingPeriod(maxTransitions)
                await app.newPayment(token1.address, recipient, 10, time, 1, 1, '')

                assert.equal(await token1.balanceOf(recipient), 10, 'recipient should have received tokens')
            })

            it('non-activity accounting periods have no transactions', async () => {
                await app.tryTransitionAccountingPeriod(5)

                const [isCurrent, start, end, firstTx, lastTx] = await app.getPeriod(2)

                assert.isFalse(isCurrent, 'shouldnt be current period')
                assert.equal(start, 201, 'should have correct start date')
                assert.equal(end, 300, 'should have correct end date')
                assert.equal(firstTx, 0, 'should have empty txs')
                assert.equal(lastTx, 0, 'should have empty txs')
            })
        })

        context('creating payment', async () => {
            const amount = 10

            beforeEach(async () => {
                await app.newPayment(token1.address, recipient, amount, time + 1, 1, 4, '')
            })

            it('only repeats payment until max repeats', async () => {
                await app.mock_setTimestamp(time + 10)
                await app.executePayment(1)

                assert.equal(await token1.balanceOf(recipient), amount * 4, 'recipient should have received tokens')
                assert.deepEqual(await app.nextPaymentTime(1), await app.MAX_UINT64(), 'payment should be repeated again in 2')
            })

            it('receiver can always execute a payment', async () => {
                await app.mock_setTimestamp(time + 1)
                await app.receiverExecutePayment(1, { from: recipient })

                assert.equal(await token1.balanceOf(recipient), amount, 'should have received payment')
            })

            it('fails when non-receiver attempts to execute a payment', async () => {
                await app.mock_setTimestamp(time + 1)

                return assertRevert(async () => {
                    await app.receiverExecutePayment(1)
                })
            })

            it('fails executing a payment before time', async () => {
                return assertRevert(async () => {
                    await app.executePayment(1, { from: recipient })
                })
            })

            it('fails executing a payment by receiver before time', async () => {
                return assertRevert(async () => {
                    await app.receiverExecutePayment(1, { from: recipient })
                })
            })

            it('fails executing disabled payment', async () => {
                await app.setPaymentDisabled(1, true)
                await app.mock_setTimestamp(time + 1)

                return assertRevert(async () => {
                    await app.executePayment(1, { from: recipient })
                })
            })
        })

        const assertPaymentFailure = receipt => {
            const filteredLogs = receipt.logs.filter(log => log.event == 'PaymentFailure')
            assert.equal(filteredLogs.length, 1, 'should have logged payment failure')
        }

        it('emits payment failure event when out of budget', async () => {
            // repeats up to 4 times every 1 seconds
            const receipt = await app.newPayment(token1.address, recipient, 51, time, 1, 4, '')
            assertPaymentFailure(receipt)
        })

        it('emits payment failure event when out of balance', async () => {
            // repeats up to 3 times every 100 seconds
            await app.newPayment(token1.address, recipient, 40, time, 100, 3, '')
            await app.mock_setTimestamp(time + 100)
            await app.executePayment(1)

            await app.mock_setTimestamp(time + 200)
            const receipt = await app.executePayment(1)

            assertPaymentFailure(receipt)
            assert.equal(await token1.balanceOf(recipient), 80, 'recipient should have received tokens')
        })
    })
})
