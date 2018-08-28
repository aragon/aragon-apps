const { assertRevert, assertInvalidOpcode } = require('@aragon/test-helpers/assertThrow')
const getBalance = require('@aragon/test-helpers/balance')(web3)

const Vault = artifacts.require('Vault')
const ERC20Connector = artifacts.require('ERC20Connector')
const ETHConnector = artifacts.require('ETHConnector')
const Finance = artifacts.require('FinanceMock')
const MiniMeToken = artifacts.require('MiniMeToken')

contract('Finance App', accounts => {
    let finance, vault, token1, token2, executionTarget, etherToken = {}

    const n = '0x00'
    const periodDuration = 60 * 60 * 24 // One day in seconds
    const withdrawAddr = '0x0000000000000000000000000000000000001234'

    const ETH = '0x0000000000000000000000000000000000000000'

    beforeEach(async () => {
        vault = await Vault.new()
        const ethConnector = await ETHConnector.new()
        const erc20Connector = await ERC20Connector.new()
        await vault.initialize(erc20Connector.address, ethConnector.address)


        token1 = await MiniMeToken.new(n, n, 0, 'n', 0, 'n', true) // dummy parameters for minime
        await token1.generateTokens(vault.address, 100)
        await token1.generateTokens(accounts[0], 10)

        token2 = await MiniMeToken.new(n, n, 0, 'n', 0, 'n', true) // dummy parameters for minime
        await token2.generateTokens(vault.address, 200)

        await ETHConnector.at(vault.address).deposit(ETH, accounts[0], 400, [0], { value: 400 });

        finance = await Finance.new()
        await finance.mock_setTimestamp(1)

        await finance.initialize(vault.address, periodDuration)
    })

    it('initialized first accounting period and settings', async () => {
        assert.equal(periodDuration, await finance.getPeriodDuration(), 'period duration should match')
        assert.equal(await finance.currentPeriodId(), 0, 'current period should be 0')
    })

    it('sets the end of time correctly', async () => {
        const maxUint64 = await finance.MAX_UINT64()

        finance = await Finance.new()
        // initialize with MAX_UINT64 as period duration
        await finance.initialize(vault.address, maxUint64)
        const [isCurrent, start, end, firstTx, lastTx] = await finance.getPeriod(await finance.currentPeriodId())

        assert.equal(end.toNumber(), maxUint64.toNumber(), "should have set the period's end date to MAX_UINT64")
    })

    it('fails on reinitialization', async () => {
        return assertRevert(async () => {
            await finance.initialize(vault.address, periodDuration)
        })
    })

    it('fails on initializing with less than one day period', async () => {
        const badPeriod = 60 * 60 * 24 - 1

        finance = await Finance.new()
        await finance.mock_setTimestamp(1)

        return assertRevert(() => finance.initialize(vault.address, badPeriod))
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

    it('records ETH deposits', async () => {
        const sentWei = 10
        const receipt = await finance.send(sentWei, { gas: 3e5 })
        const transactionId = receipt.logs.filter(log => log.event == 'NewTransaction')[0].args.transactionId

        const [periodId, amount, paymentId, paymentRepeatNumber, token, entity, incoming, date, ref] = await finance.getTransaction(transactionId)

        // vault has 400 wei initially
        assert.equal(await ETHConnector.at(vault.address).balance(ETH), 400 + 10, 'deposited ETH must be in vault')
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

    /* TODO: ERC777 */

    it('sends locked tokens to Vault', async () => {
        let initialBalance = await token1.balanceOf(vault.address)
        // 'lock' tokens
        await token1.transfer(finance.address, 5)

        await finance.depositToVault(token1.address)

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
        assert.equal(ref, 'Deposit to Vault', 'ref should be correct')

    })

    it('try to send locked tokens to Vault, but balance is 0', async () => {
        // if current balance is zero, it just fails
        return assertRevert(async () => {
            await finance.depositToVault(token1.address)
        })
    })

    it('before setting budget allows unlimited spending', async () => {
        const recipient = accounts[1]
        const time = 22

        await finance.mock_setTimestamp(time)

        await finance.newPayment(token2.address, recipient, 190, time, 0, 1, '')
        assert.equal(await token2.balanceOf(recipient), 190, 'recipient should have received tokens')
    })

    it('can change period duration', async () => {
        const newDuration = 60 * 60 * 24 * 2 // two days
        await finance.setPeriodDuration(newDuration)
        await finance.mock_setTimestamp(newDuration * 2.5) // Force at least two transitions

        await finance.tryTransitionAccountingPeriod(3) // transition a maximum of 3 accounting periods

        assert.equal(await finance.currentPeriodId(), 2, 'should have transitioned 2 periods')
    })

    it('can transition periods', async () => {
        await finance.mock_setTimestamp(periodDuration * 2.5) // Force at least two transitions

        await finance.tryTransitionAccountingPeriod(3) // transition a maximum of 3 accounting periods

        assert.equal(await finance.currentPeriodId(), 2, 'should have transitioned 2 periods')
    })

    it('only transitions as many periods as allowed', async () => {
        await finance.mock_setTimestamp(periodDuration * 2.5) // Force at least two transitions

        const receipt = await finance.tryTransitionAccountingPeriod(1) // Fail if we only allow a single transition
        const newPeriodEvents = receipt.logs.filter(log => log.event == 'NewPeriod')
        assert.equal(newPeriodEvents.length, 1, 'should have only emitted one new period event')
        assert.equal(await finance.currentPeriodId(), 1, 'should have transitioned 1 periods')
    })

    it("escapes hatch, recovers ETH", async () => {
        let vaultInitialBalance = await getBalance(vault.address)
        let financeInitialBalance = await getBalance(finance.address)
        let amount = web3.toWei('1', 'ether')
        await finance.sendTransaction({value: amount})
        let vaultFinalBalance = await getBalance(vault.address)
        let financeFinalBalance = await getBalance(finance.address)
        assert.equal(financeFinalBalance.valueOf(), 0, "Funds not recovered (Finance)!")
        assert.equal(vaultFinalBalance.toString(), vaultInitialBalance.add(amount).toString(), "Funds not recovered (Vault)!")
    })

    context('setting budget', () => {
        const recipient = accounts[1]
        const time = 22

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

            assert.equal(await token1.balanceOf(recipient), amount, 'recipient should have received tokens')

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
            assert.equal(await token2.balanceOf(recipient), 190, 'recipient should have received tokens')
        })

        it('can create recurring payment', async () => {
            const amount = 10

            // repeats up to 10 times every 2 seconds
            const firstReceipt = await finance.newPayment(token1.address, recipient, amount, time, 2, 10, '')
            await finance.mock_setTimestamp(time + 4)
            const secondReceipt = await finance.executePayment(1)

            assert.equal(await token1.balanceOf(recipient), amount * 3, 'recipient should have received tokens')
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

            assert.equal(await getBalance(withdrawAddr), amount * 3, 'recipient should have received ether')
        })

        it('doesnt record payment for one time past transaction', async () => {
            await finance.newPayment(token1.address, recipient, 1, time, 1, 1, '')
            return assertInvalidOpcode(async () => {
                await finance.getPayment(1) // call will do an invalid jump
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
                await finance.mock_setTimestamp(periodDuration + 1)
                await finance.tryTransitionAccountingPeriod(1)

                const [isCurrent, start, end, firstTx, lastTx] = await finance.getPeriod(0)

                assert.isFalse(isCurrent, 'shouldnt be current period')
                assert.equal(start, 1, 'should have correct start date')
                assert.equal(end, periodDuration, 'should have correct end date')
                assert.equal(firstTx, 1, 'should have correct first tx')
                assert.equal(lastTx, 4, 'should have correct last tx')
            })
        })

        context('many accounting period transitions', () => {
            // Arbitrary number of max transitions to simulate OOG behaviour with transitionsPeriod
            const maxTransitions = 20

            beforeEach(async () => {
                await finance.mock_setMaxPeriodTransitions(maxTransitions)
                await finance.mock_setTimestamp(time + (maxTransitions + 2) * periodDuration)
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

                assert.equal(await token1.balanceOf(recipient), 10, 'recipient should have received tokens')
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
                assert.equal(start, periodDuration * 2 + 1, 'should have correct start date')
                assert.equal(end, periodDuration * 3, 'should have correct end date')
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

                assert.equal(await token1.balanceOf(recipient), amount * 4, 'recipient should have received tokens')
                assert.deepEqual(await finance.nextPaymentTime(1), await finance.MAX_UINT64(), 'payment should be repeated again in 2')
            })

            it('receiver can always execute a payment', async () => {
                await finance.mock_setTimestamp(time + 1)
                await finance.receiverExecutePayment(1, { from: recipient })

                assert.equal(await token1.balanceOf(recipient), amount, 'should have received payment')
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
            await finance.mock_setTimestamp(time + periodDuration)
            await finance.executePayment(1)

            await finance.mock_setTimestamp(time + periodDuration * 2)
            const receipt = await finance.executePayment(1)

            assertPaymentFailure(receipt)
            assert.equal(await token1.balanceOf(recipient), 80, 'recipient should have received tokens')
        })
    })

    context('Without initialize', async () => {
        let nonInit

        beforeEach(async () => {
            nonInit = await Finance.new()
            await nonInit.mock_setTimestamp(1)
        })

        it('fails to create new Payment', async() => {
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
                await nonInit.depositToVault(token1.address)
            })
        })

        it('fails to deposit ETH', async() => {
            return assertRevert(async() => {
                await nonInit.send(10, { gas: 3e5 })
            })
        })
    })
})
