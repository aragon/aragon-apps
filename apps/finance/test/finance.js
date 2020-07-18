const ERRORS = require('./helpers/errors')
const { newDao, installNewApp, getInstalledApp } = require('@aragon/contract-helpers-test/src/aragon-os')
const { assertBn, assertRevert, assertEvent, assertAmountOfEvents } = require('@aragon/contract-helpers-test/src/asserts')
const { ONE_DAY, ZERO_ADDRESS, MAX_UINT64, bn, getEventArgument, injectWeb3, injectArtifacts } = require('@aragon/contract-helpers-test')

injectWeb3(web3)
injectArtifacts(artifacts)

const Finance = artifacts.require('FinanceMock')
const Vault = artifacts.require('Vault')
const TokenMock = artifacts.require('TokenMock')
const ForceSendETH = artifacts.require('ForceSendETH')
const TokenReturnFalseMock = artifacts.require('TokenReturnFalseMock')
const TokenReturnMissingMock = artifacts.require('TokenReturnMissingMock')

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

contract('Finance App', ([root, owner, recipient]) => {
  let financeBase, finance, vaultBase, vault, token1, token2
  let CREATE_PAYMENTS_ROLE, CHANGE_PERIOD_ROLE, CHANGE_BUDGETS_ROLE, EXECUTE_PAYMENTS_ROLE, MANAGE_PAYMENTS_ROLE, TRANSFER_ROLE

  const NOW = 1
  const PERIOD_DURATION = ONE_DAY
  const ETH = ZERO_ADDRESS
  const withdrawAddr = '0x0000000000000000000000000000000000001234'
  const APP_ID = '0x1234123412341234123412341234123412341234123412341234123412341234'
  const VAULT_INITIAL_ETH_BALANCE = 400
  const VAULT_INITIAL_TOKEN1_BALANCE = 100
  const VAULT_INITIAL_TOKEN2_BALANCE = 200

  before(async () => {
    vaultBase = await Vault.new()
    financeBase = await Finance.new()

    CREATE_PAYMENTS_ROLE = await financeBase.CREATE_PAYMENTS_ROLE()
    CHANGE_PERIOD_ROLE = await financeBase.CHANGE_PERIOD_ROLE()
    CHANGE_BUDGETS_ROLE = await financeBase.CHANGE_BUDGETS_ROLE()
    EXECUTE_PAYMENTS_ROLE = await financeBase.EXECUTE_PAYMENTS_ROLE()
    MANAGE_PAYMENTS_ROLE = await financeBase.MANAGE_PAYMENTS_ROLE()
    TRANSFER_ROLE = await vaultBase.TRANSFER_ROLE()
  })

  const setupRecoveryVault = async (dao) => {
    const recoveryVaultAppId = '0x90ab'
    const vaultReceipt = await dao.newAppInstance(recoveryVaultAppId, vaultBase.address, '0x', false, { from: root })
    const recoveryVault = await Vault.at(getInstalledApp(vaultReceipt))
    await recoveryVault.initialize()
    await dao.setApp(await dao.APP_ADDR_NAMESPACE(), recoveryVaultAppId, recoveryVault.address)
    await dao.setRecoveryVaultAppId(recoveryVaultAppId, { from: root })

    return recoveryVault
  }

  const newProxyFinance = async () => {
    const { dao, acl } = await newDao(root)
    const financeApp = await Finance.at(await installNewApp(dao, APP_ID, financeBase.address, root))

    await financeApp.mockSetTimestamp(NOW)
    await financeApp.mock_setMaxPeriodTransitions(MAX_UINT64)

    await acl.createPermission(root, financeApp.address, CREATE_PAYMENTS_ROLE, root, { from: root })
    await acl.createPermission(root, financeApp.address, CHANGE_PERIOD_ROLE, root, { from: root })
    await acl.createPermission(root, financeApp.address, CHANGE_BUDGETS_ROLE, root, { from: root })
    await acl.createPermission(root, financeApp.address, EXECUTE_PAYMENTS_ROLE, root, { from: root })
    await acl.createPermission(root, financeApp.address, MANAGE_PAYMENTS_ROLE, root, { from: root })

    const recoveryVault = await setupRecoveryVault(dao)

    return { dao, acl, financeApp, recoveryVault }
  }

  const forceSendETH = async (to, value) => {
    // Using this contract ETH will be send by selfdestruct which always succeeds
    const forceSend = await ForceSendETH.new()
    return forceSend.sendByDying(to, { value })
  }

  beforeEach(async () => {
    const { dao, acl, financeApp } = await newProxyFinance()
    finance = financeApp

    // vault
    const receipt1 = await dao.newAppInstance('0x1234', vaultBase.address, '0x', false, { from: root })
    vault = await Vault.at(getInstalledApp(receipt1))
    await acl.createPermission(finance.address, vault.address, TRANSFER_ROLE, root, { from: root })
    await vault.initialize()

    // Set up initial balances
    token1 = await TokenMock.new(owner, 10000 + VAULT_INITIAL_TOKEN1_BALANCE)
    await token1.transfer(vault.address, VAULT_INITIAL_TOKEN1_BALANCE, { from: owner })
    token2 = await TokenMock.new(owner, 10000 + VAULT_INITIAL_TOKEN2_BALANCE)
    await token2.transfer(vault.address, VAULT_INITIAL_TOKEN2_BALANCE, { from: owner })
    await vault.deposit(ETH, VAULT_INITIAL_ETH_BALANCE, { value: VAULT_INITIAL_ETH_BALANCE, from: owner });

    await finance.initialize(vault.address, PERIOD_DURATION)
  })

  it('initialized first accounting period and settings', async () => {
    assert.equal(PERIOD_DURATION, await finance.getPeriodDuration(), 'period duration should match')
    assert.equal(await finance.currentPeriodId(), 0, 'current period should be 0')
  })

  it('sets the end of time correctly', async () => {
    const { financeApp } = await newProxyFinance()
    await financeApp.mockIncreaseTime(100) // to make sure it overflows with MAX_UINT64 period length
    // initialize with MAX_UINT64 as period duration
    await financeApp.initialize(vault.address, MAX_UINT64)
    const { endTime } = await financeApp.getPeriod(await financeApp.currentPeriodId())

    assertBn(endTime, MAX_UINT64, "should have set the period's end date to MAX_UINT64")
  })

  it('fails on reinitialization', async () => {
    await assertRevert(finance.initialize(vault.address, PERIOD_DURATION), ERRORS.INIT_ALREADY_INITIALIZED)
  })

  it('cannot initialize base app', async () => {
    const newFinance = await Finance.new()
    assert.isTrue(await newFinance.isPetrified())
    await assertRevert(newFinance.initialize(vault.address, PERIOD_DURATION), ERRORS.INIT_ALREADY_INITIALIZED)
  })

  it('fails on initializing with no vault', async () => {
    const { financeApp } = await newProxyFinance()

    await assertRevert(financeApp.initialize(ZERO_ADDRESS, PERIOD_DURATION), ERRORS.FINANCE_VAULT_NOT_CONTRACT)
    await assertRevert(financeApp.initialize(withdrawAddr, PERIOD_DURATION), ERRORS.FINANCE_VAULT_NOT_CONTRACT)
  })

  it('fails on initializing with less than one day period', async () => {
    const badPeriod = 60 * 60 * 24 - 1
    const { financeApp } = await newProxyFinance()

    await assertRevert(financeApp.initialize(vault.address, badPeriod), ERRORS.FINANCE_SET_PERIOD_TOO_SHORT)
  })

  it('adds new token to budget', async () => {
    await finance.setBudget(token1.address, 10)

    const { budget, hasBudget } = await finance.getBudget(token1.address)
    const remainingBudget = await finance.getRemainingBudget(token1.address)
    assert.equal(budget, 10, 'should have correct budget')
    assert.isTrue(hasBudget, 'has budget should be true')
    assert.equal(remainingBudget, 10, 'all budget is remaining')
  })

  it('before setting budget allows unlimited spending', async () => {
    const amount = 190

    await finance.newImmediatePayment(token2.address, recipient, amount, '')
    assertBn(await token2.balanceOf(recipient), amount, 'recipient should have received tokens')
  })

  it('can change period duration', async () => {
    const NEW_PERIOD_DURATION = ONE_DAY * 2 // two days
    await finance.setPeriodDuration(NEW_PERIOD_DURATION)
    await finance.mockSetTimestamp(NEW_PERIOD_DURATION * 2.5) // Force at least two transitions

    await finance.tryTransitionAccountingPeriod(3) // transition a maximum of 3 accounting periods

    assertBn(await finance.currentPeriodId(), 2, 'should have transitioned 2 periods')
  })

  it('can transition periods', async () => {
    await finance.mockIncreaseTime(PERIOD_DURATION * 2.5) // Force at least two transitions

    await finance.tryTransitionAccountingPeriod(3) // transition a maximum of 3 accounting periods

    assert.equal(await finance.currentPeriodId(), 2, 'should have transitioned 2 periods')
  })

  it('only transitions as many periods as allowed', async () => {
    await finance.mockIncreaseTime(PERIOD_DURATION * 2.5) // Force at least two transitions

    const receipt = await finance.tryTransitionAccountingPeriod(1) // Fail if we only allow a single transition
    assertAmountOfEvents(receipt, 'NewPeriod')

    assert.equal(await finance.currentPeriodId(), 1, 'should have transitioned 1 periods')
  })

  it('fails on changing period duration to too short', async () => {
    const badPeriod = 60 * 60 * 24 - 1
    await assertRevert(finance.setPeriodDuration(badPeriod), ERRORS.FINANCE_SET_PERIOD_TOO_SHORT)
  })

  for (const { title, tokenContract} of tokenTestGroups) {
    context(`ERC20 (${title}) deposits`, () => {
      const transferAmount = 5
      let tokenInstance

      beforeEach(async () => {
        // Set up a new token similar to token1's distribution
        tokenInstance = await tokenContract.new(owner, 10000 + VAULT_INITIAL_TOKEN1_BALANCE)
        await tokenInstance.transfer(vault.address, VAULT_INITIAL_TOKEN1_BALANCE, { from: owner })
      })

      it('records deposits', async () => {
        await tokenInstance.approve(finance.address, transferAmount, { from: owner })
        const receipt = await finance.deposit(tokenInstance.address, transferAmount, 'ref', { from: owner })

        // vault has 100 tokens initially
        assertBn(await tokenInstance.balanceOf(vault.address), VAULT_INITIAL_TOKEN1_BALANCE + transferAmount, 'deposited tokens must be in vault')

        const { periodId, amount, paymentId, paymentExecutionNumber, token, entity, isIncoming, date } = await finance.getTransaction(1)
        assertBn(periodId, 0, 'period id should be correct')
        assertBn(amount, transferAmount, 'amount should be correct')
        assertBn(paymentId, 0, 'payment id should be 0')
        assertBn(paymentExecutionNumber, 0, 'payment execution number should be 0')
        assert.equal(token, tokenInstance.address, 'token should be correct')
        assert.equal(entity, owner, 'entity should be correct')
        assert.isTrue(isIncoming, 'tx should be incoming')
        assertBn(date, 1, 'date should be correct')

        assertEvent(receipt, 'NewTransaction', { expectedArgs: { reference: 'ref' } })
      })

      it('fails on no value deposits', async () => {
        await assertRevert(finance.deposit(tokenInstance.address, 0, 'ref'), ERRORS.FINANCE_DEPOSIT_AMOUNT_ZERO)
      })
    })
  }

  context('ETH deposits', () => {
    const reference = 'deposit reference'
    const sentWei = 10

    it('records deposits using deposit function', async () => {
      const receipt = await finance.deposit(ETH, sentWei, reference, { from: owner, value: sentWei })

      const transactionId = getEventArgument(receipt, 'NewTransaction', 'transactionId')

      const { periodId, amount, paymentId, paymentExecutionNumber, token, entity, isIncoming, date } = await finance.getTransaction(transactionId)

      assert.equal(await vault.balance(ETH), VAULT_INITIAL_ETH_BALANCE + sentWei, 'deposited ETH must be in vault')
      assertBn(periodId, 0, 'period id should be correct')
      assertBn(amount, sentWei, 'amount should be correct')
      assertBn(paymentId, 0, 'payment id should be 0')
      assertBn(paymentExecutionNumber, 0, 'payment execution number should be 0')
      assert.equal(token, ETH, 'token should be ETH token')
      assert.equal(entity, owner, 'entity should be correct')
      assert.isTrue(isIncoming, 'tx should be incoming')
      assertBn(date, 1, 'date should be correct')

      assertEvent(receipt, 'NewTransaction', { expectedArgs: { reference } })
    })

    it('records ETH deposits using fallback', async () => {
      const receipt = await finance.sendTransaction({ from: owner, value: sentWei })
      const transactionId = getEventArgument(receipt, 'NewTransaction', 'transactionId')

      const { periodId, amount, paymentId, paymentExecutionNumber, token, entity, isIncoming, date } = await finance.getTransaction(transactionId)

      assert.equal(await vault.balance(ETH), VAULT_INITIAL_ETH_BALANCE + sentWei, 'deposited ETH must be in vault')
      assertBn(periodId, 0, 'period id should be correct')
      assertBn(amount, sentWei, 'amount should be correct')
      assertBn(paymentId, 0, 'payment id should be 0')
      assertBn(paymentExecutionNumber, 0, 'payment execution number should be 0')
      assert.equal(token, ETH, 'token should be ETH token')
      assert.equal(entity, owner, 'entity should be correct')
      assert.isTrue(isIncoming, 'tx should be incoming')
      assertBn(date, 1, 'date should be correct')

      assertEvent(receipt, 'NewTransaction', { expectedArgs: { reference: 'Ether transfer to Finance app' } })
    })

    it('fails to deposit if amount does not match value', async () => {
      await assertRevert(finance.deposit(ETH, sentWei - 1, reference, { value: sentWei }), ERRORS.FINANCE_ETH_VALUE_MISMATCH)
    })
  })

  for (const { title, tokenContract} of tokenTestGroups) {
    context(`locked ERC20 (${title})`, () => {
      const lockedTokenAmount = 5
      let tokenInstance

      beforeEach(async () => {
        // Set up a new token similar to token1's distribution
        tokenInstance = await tokenContract.new(owner, 10000 + VAULT_INITIAL_TOKEN1_BALANCE + lockedTokenAmount)
        await tokenInstance.transfer(vault.address, VAULT_INITIAL_TOKEN1_BALANCE, { from: owner })

        // 'lock' tokens
        await tokenInstance.transfer(finance.address, lockedTokenAmount, { from: owner })
      })

      it('allow recoverability is disabled', async () => {
        assert.isFalse(await finance.allowRecoverability(tokenInstance.address))
      })

      it('are recovered using Finance#recoverToVault', async () => {
        const receipt = await finance.recoverToVault(tokenInstance.address)

        assertBn(await tokenInstance.balanceOf(vault.address), VAULT_INITIAL_TOKEN1_BALANCE + lockedTokenAmount, 'deposited tokens must be in vault')
        assert.equal(await tokenInstance.balanceOf(finance.address), 0, 'finance shouldn\'t have tokens')

        const { periodId, amount, paymentId, paymentExecutionNumber, token, entity, isIncoming, date } = await finance.getTransaction(1)
        assertBn(periodId, 0, 'period id should be correct')
        assertBn(amount, lockedTokenAmount, 'amount should be correct')
        assertBn(paymentId, 0, 'payment id should be 0')
        assertBn(paymentExecutionNumber, 0, 'payment execution number should be 0')
        assert.equal(token, tokenInstance.address, 'token should be correct')
        assert.equal(entity, finance.address, 'entity should be correct')
        assert.isTrue(isIncoming, 'tx should be incoming')
        assertBn(date, 1, 'date should be correct')

        assertEvent(receipt, 'NewTransaction', { expectedArgs: { reference: 'Recover to Vault' } })
      })

      it('fail to be recovered using AragonApp#transferToVault', async () => {
        await assertRevert(finance.transferToVault(tokenInstance.address), ERRORS.RECOVER_DISALLOWED)
      })

      it('fail to be recovered if token balance is 0', async () => {
        // if current balance is zero, it reverts
        await assertRevert(finance.recoverToVault(token2.address), ERRORS.FINANCE_RECOVER_AMOUNT_ZERO)
      })
    })
  }

  context('locked ETH', () => {
    const lockedETH = 100

    beforeEach(async () => {
      await forceSendETH(finance.address, lockedETH)
      assertBn(await web3.eth.getBalance(finance.address), lockedETH, 'finance should have stuck ETH')
    })

    it('allow recoverability is disabled', async () => {
      assert.isFalse(await finance.allowRecoverability(ETH))
    })

    it('is recovered using Finance#recoverToVault', async () => {
      const receipt = await finance.recoverToVault(ETH)

      const { periodId, amount, paymentId, paymentExecutionNumber, token, entity, isIncoming, date } = await finance.getTransaction(1)

      assert.equal(await vault.balance(ETH), VAULT_INITIAL_ETH_BALANCE + lockedETH, 'recovered ETH must be in vault')
      assertBn(await web3.eth.getBalance(finance.address), 0, 'finance should not have ETH')
      assertBn(periodId, 0, 'period id should be correct')
      assertBn(amount, lockedETH, 'amount should be correct')
      assertBn(paymentId, 0, 'payment id should be 0')
      assertBn(paymentExecutionNumber, 0, 'payment execution number should be 0')
      assert.equal(token, ETH, 'token should be correct')
      assert.equal(entity, finance.address, 'entity should be correct')
      assert.isTrue(isIncoming, 'tx should be incoming')
      assertBn(date, 1, 'date should be correct')

      assertEvent(receipt, 'NewTransaction', { expectedArgs: { reference: 'Recover to Vault' } })
    })

    it('fails to be recovered using AragonApp#transferToVault', async () => {
      await assertRevert(finance.transferToVault(ETH), ERRORS.RECOVER_DISALLOWED)
    })

    it('fails to be recovered if ETH balance is 0', async () => {
      await finance.recoverToVault(ETH)

      // if current balance is zero, it reverts
      await assertRevert(finance.recoverToVault(ETH), ERRORS.FINANCE_RECOVER_AMOUNT_ZERO)
    })
  })

  context('setting budget', () => {
    beforeEach(async () => {
      await finance.setBudget(token1.address, 50)
      await finance.setBudget(token2.address, 100)
      await finance.setBudget(ETH, 150)
    })

    it('records payment', async () => {
      const amount = 10
      // executes up to 10 times every 2 seconds
      const receipt = await finance.newScheduledPayment(token1.address, recipient, amount, NOW, 2, 10, 'ref')
      assertEvent(receipt, 'NewPayment', { expectedArgs: { reference: 'ref' } })

      const { token, receiver, amount: txAmount, initialPaymentTime, interval, maxExecutions, inactive, executions, createdBy } = await finance.getPayment(1)

      assert.equal(token, token1.address, 'token address should match')
      assert.equal(receiver, recipient, 'receiver should match')
      assertBn(amount, txAmount, 'amount should match')
      assertBn(initialPaymentTime, NOW, 'time should match')
      assertBn(interval, 2, 'interval should match')
      assertBn(maxExecutions, 10, 'max executions should match')
      assert.isFalse(inactive, 'should be enabled')
      assertBn(executions, 1, 'should be on first execution')
      assert.equal(createdBy, root, 'should have correct creator')
    })

    it('fails trying to get payment out of bounds', async () => {
      const amount = 10
      // executes up to 10 times every 2 seconds
      await finance.newScheduledPayment(token1.address, recipient, amount, NOW, 2, 10, 'ref')

      await assertRevert(finance.getPayment(0), ERRORS.FINANCE_NO_SCHEDULED_PAYMENT)
      await assertRevert(finance.getPayment(2), ERRORS.FINANCE_NO_SCHEDULED_PAYMENT)
    })

    it('fails trying to get transaction out of bounds', async () => {
      const amount = 10
      // executes up to 10 times every 2 seconds
      await finance.newScheduledPayment(token1.address, recipient, amount, NOW, 2, 10, 'ref')

      await assertRevert(finance.getTransaction(2), ERRORS.FINANCE_NO_TRANSACTION)
    })

    it('can create single payment transaction', async () => {
      const amount = 10

      const receipt = await finance.newImmediatePayment(token1.address, recipient, amount, 'ref')
      assertEvent(receipt, 'NewTransaction', { expectedArgs: { reference: 'ref' } })

      assertBn(await token1.balanceOf(recipient), amount, 'recipient should have received tokens')

      const { periodId, amount: txAmount, paymentId, paymentExecutionNumber, token, entity, isIncoming, date } = await finance.getTransaction(1)
      assertBn(periodId, 0, 'period id should be correct')
      assertBn(txAmount, amount, 'amount should match')
      assertBn(paymentId, 0, 'payment id should be 0 for single payment')
      assertBn(paymentExecutionNumber, 0, 'payment execution number should be 0')
      assert.equal(token, token1.address, 'token address should match')
      assert.equal(entity, recipient, 'receiver should match')
      assert.isFalse(isIncoming, 'single payment should be outgoing')
      assertBn(date, NOW, 'date should be correct')
    })

    it('can decrease budget after spending', async () => {
      const amount = 10

      await finance.newImmediatePayment(token1.address, recipient, amount, '')

      const newBudgetAmount = 5
      await finance.setBudget(token1.address, newBudgetAmount)

      const { budget, hasBudget } = await finance.getBudget(token1.address)
      const remainingBudget = await finance.getRemainingBudget(token1.address)

      assert.equal(budget, newBudgetAmount, 'new budget should be correct')
      assert.isTrue(hasBudget, 'should have budget')
      assert.equal(remainingBudget, 0, 'remaining budget should be 0')
    })

    it('removing budget allows unlimited spending', async () => {
      await finance.removeBudget(token2.address)

      const { budget, hasBudget } = await finance.getBudget(token2.address)
      assert.equal(budget, 0, 'removed budget should be 0')
      assert.isFalse(hasBudget, 'should not have budget')

      // budget was 100
      await finance.newImmediatePayment(token2.address, recipient, 190, '')
      assertBn(await token2.balanceOf(recipient), 190, 'recipient should have received tokens')
    })

    it('can create scheduled payment', async () => {
      const amount = 10

      // executes up to 10 times every 2 seconds
      const firstReceipt = await finance.newScheduledPayment(token1.address, recipient, amount, NOW, 2, 10, '')
      await finance.mockIncreaseTime(4)
      const secondReceipt = await finance.executePayment(1)

      assertBn(await token1.balanceOf(recipient), amount * 3, 'recipient should have received tokens')
      assert.equal(await finance.nextPaymentTime(1), NOW + 4 + 2, 'payment should be executed again in 2')

      return Promise.all([firstReceipt, secondReceipt].map(async (receipt, index) => {
        const executionNum = index + 1

        const transactionId = getEventArgument(receipt, 'NewTransaction', 'transactionId')
        const { amount: txAmount, paymentId, paymentExecutionNumber } = await finance.getTransaction(transactionId)

        assertBn(txAmount, amount, 'amount should be correct')
        assertBn(paymentId, 1, 'payment id should be 1')
        assertBn(paymentExecutionNumber, executionNum, `payment execution number should be ${executionNum}`)
      }))
    })

    it('can create scheduled ether payment', async () => {
      const amount = 10

      // executes up to 10 times every 2 seconds
      await finance.newScheduledPayment(ETH, withdrawAddr, amount, NOW, 2, 10, '')
      await finance.mockIncreaseTime(4)
      await finance.executePayment(1)

      assertBn(await web3.eth.getBalance(withdrawAddr), amount * 3, 'recipient should have received ether')
    })

    it('doesnt record payment for single payment transaction', async () => {
      const receipt = await finance.newImmediatePayment(token1.address, recipient, 1, '')
      assertAmountOfEvents(receipt, 'NewPayment', { expectedAmount: 0 })
      await assertRevert(finance.getPayment(1), ERRORS.FINANCE_NO_SCHEDULED_PAYMENT)
    })

    context('multitransaction period', async () => {
      beforeEach(async () => {
        // single payment
        await finance.newImmediatePayment(token1.address, recipient, 10, '') // will spend 10
        // executes up to 2 times every 1 seconds
        await finance.newScheduledPayment(token2.address, recipient, 5, NOW + 1, 1, 2, '') // will spend 10
        await finance.mockIncreaseTime(4)

        await finance.executePayment(1) // first create payment doesn't get an id because it is simple immediate tx

        await token1.approve(finance.address, 5, { from: owner })
        await finance.deposit(token1.address, 5, '', { from: owner })
      })

      it('has correct token statements', async () => {
        const { expenses: t1expense, income: t1income } = await finance.getPeriodTokenStatement(0, token1.address)
        const { expenses: t2expense, income: t2income } = await finance.getPeriodTokenStatement(0, token2.address)

        assert.equal(t1expense, 10, 'token 1 expenses should be correct')
        assert.equal(t1income, 5, 'token 1 income should be correct')

        assert.equal(t2expense, 10, 'token 2 expenses should be correct')
        assert.equal(t2income, 0, 'token 2 income should be correct')
      })

      it('finishes accounting period correctly', async () => {
        await finance.mockIncreaseTime(PERIOD_DURATION + 1)
        await finance.tryTransitionAccountingPeriod(1)

        const { isCurrent, startTime, endTime, firstTransactionId, lastTransactionId } = await finance.getPeriod(0)

        assert.isFalse(isCurrent, 'should not be current period')
        assertBn(startTime, NOW, 'should have correct start date')
        assertBn(endTime, NOW + PERIOD_DURATION - 1, 'should have correct end date')
        assertBn(firstTransactionId, 1, 'should have correct first tx')
        assertBn(lastTransactionId, 4, 'should have correct last tx')
      })

      it('fails trying to access period out of bounds', async () => {
        await finance.mockIncreaseTime(PERIOD_DURATION + 1)
        await finance.tryTransitionAccountingPeriod(1)

        const currentPeriodId = await finance.currentPeriodId()
        await assertRevert(finance.getPeriod(currentPeriodId + 1), ERRORS.FINANCE_NO_PERIOD)
      })
    })

    context('many accounting period transitions', () => {
      // Arbitrary number of max transitions to simulate OOG behaviour with transitionsPeriod
      const maxTransitions = 20

      beforeEach(async () => {
        await finance.mock_setMaxPeriodTransitions(maxTransitions)
        await finance.mockIncreaseTime((maxTransitions + 2) * PERIOD_DURATION)
      })

      it('fails when too many period transitions are needed', async () => {
        // Normal payments
        await assertRevert(
          finance.newImmediatePayment(token1.address, recipient, 10, ''),
          ERRORS.FINANCE_COMPLETE_TRANSITION
        )

        // Direct ETH transfers
        await assertRevert(finance.send(10, { gas: 3e6 }), ERRORS.FINANCE_COMPLETE_TRANSITION)
      })

      it('can transition periods externally to remove deadlock for payments', async () => {
        await finance.tryTransitionAccountingPeriod(maxTransitions)
        await finance.newImmediatePayment(token1.address, recipient, 10, '')

        assertBn(await token1.balanceOf(recipient), 10, 'recipient should have received tokens')
      })

      it('can transition periods externally to remove deadlock for direct deposits', async () => {
        const sentWei = bn(10)
        const prevVaultBalance = await web3.eth.getBalance(vault.address)

        await finance.tryTransitionAccountingPeriod(maxTransitions)

        const receipt = await finance.send(sentWei, { gas: 4e5 })
        const transactionId = getEventArgument(receipt, 'NewTransaction', 'transactionId')
        const { amount } = await finance.getTransaction(transactionId)

        assertBn(amount, sentWei, 'app should have received ETH and sent it to vault')
        assertBn(await web3.eth.getBalance(vault.address), bn(prevVaultBalance).add(sentWei), 'app should have received ETH and sent it to vault')
      })

      it('non-activity accounting periods have no transactions', async () => {
        await finance.tryTransitionAccountingPeriod(5)

        const { isCurrent, startTime, endTime, firstTransactionId, lastTransactionId } = await finance.getPeriod(2)

        assert.isFalse(isCurrent, 'shouldnt be current period')
        assertBn(startTime, PERIOD_DURATION * 2 + 1, 'should have correct start date')
        assertBn(endTime, PERIOD_DURATION * 3, 'should have correct end date')
        assertBn(firstTransactionId, 0, 'should have empty txs')
        assertBn(lastTransactionId, 0, 'should have empty txs')
      })
    })

    context('single payment', async () => {
      const amount = 10

      it('can create a single payment', async () => {
        const receipt = await finance.newImmediatePayment(token1.address, recipient, amount,'')
        assertAmountOfEvents(receipt, 'NewTransaction')
        assertAmountOfEvents(receipt, 'NewPeriod', { expectedAmount: 0 })
      })

      it('fails to create a zero-amount single payment', async () => {
        await assertRevert(
          finance.newImmediatePayment(token1.address, recipient, 0, ''),
          ERRORS.FINANCE_NEW_PAYMENT_AMOUNT_ZERO
        )
      })

      it('fails to create a single payment too high for the current budget', async () => {
        const budget = 10
        await finance.setBudget(token1.address, budget)

        await assertRevert(
          finance.newImmediatePayment(token1.address, recipient, budget + 1, ''),
          ERRORS.FINANCE_REMAINING_BUDGET
        )
      })

      it('fails to execute a single payment without enough funds', async () => {
        const vaultBalance = await vault.balance(token1.address)
        await finance.removeBudget(token1.address) // clear any budget restrictions

        await assertRevert(
          finance.newImmediatePayment(token1.address, recipient, vaultBalance + 1, ''),
          ERRORS.VAULT_TOKEN_TRANSFER_REVERTED
        )
      })
    })

    context('scheduled payment', async () => {
      const amount = 10

      it('can create a scheduled payment', async () => {
        const receipt = await finance.newScheduledPayment(token1.address, recipient, amount, NOW + 1, 1, 4, '')
        assertAmountOfEvents(receipt, 'NewPayment')
      })

      it('can create a future payment too large for current funds', async () => {
        const vaultBalance = await vault.balance(token1.address)
        await finance.removeBudget(token1.address) // clear any budget restrictions

        const receipt = await finance.newScheduledPayment(token1.address, recipient, vaultBalance * 2, NOW + 1, 1, 4, '')
        assertAmountOfEvents(receipt, 'NewPayment')
      })

      it('can create a single future payment', async () => {
        const receipt = await finance.newScheduledPayment(token1.address, recipient, amount, NOW + 1, 1, 1, '')
        assertAmountOfEvents(receipt, 'NewPayment')
      })

      it('can create a single future payment too large for current funds', async () => {
        const vaultBalance = await vault.balance(token1.address)
        await finance.removeBudget(token1.address) // clear any budget restrictions

        const receipt = await finance.newScheduledPayment(token1.address, recipient, vaultBalance * 2, NOW + 1, 1, 1, '')
        assertAmountOfEvents(receipt, 'NewPayment')
      })

      it('fails to create a zero-amount payment', async () => {
        await assertRevert(
          finance.newScheduledPayment(token1.address, recipient, 0, NOW + 1, 1, 2, ''),
          ERRORS.FINANCE_NEW_PAYMENT_AMOUNT_ZERO
        )
      })

      it('fails to create a no-interval payment', async () => {
        await assertRevert(
          finance.newScheduledPayment(token1.address, recipient, 1, NOW + 1, 0, 2, ''),
          ERRORS.FINANCE_NEW_PAYMENT_INTRVL_ZERO
        )
      })

      it('fails to create a no-executions payment', async () => {
        await assertRevert(
          finance.newScheduledPayment(token1.address, recipient, 1, NOW + 1, 1, 0, ''),
          ERRORS.FINANCE_NEW_PAYMENT_EXECS_ZERO
        )
      })

      it('fails to create a payment too large for budget', async () => {
        const budget = 10
        await finance.setBudget(token1.address, budget)

        await assertRevert(
          finance.newScheduledPayment(token1.address, recipient, budget + 1, NOW, 1, 1, ''),
          ERRORS.FINANCE_BUDGET
        )
      })

      it('fails to create an immediate single payment', async () => {
        await assertRevert(
          finance.newScheduledPayment(token1.address, recipient, 1, NOW - 1, 1, 1, ''),
          ERRORS.FINANCE_NEW_PAYMENT_IMMEDIATE
        )
      })

      it('fails to create a payment too high for the current budget', async () => {
        const budget = 10
        await finance.setBudget(token1.address, budget)

        await assertRevert(
          finance.newScheduledPayment(token1.address, recipient, budget + 1, NOW, 1, 2, ''),
          ERRORS.FINANCE_BUDGET
        )
      })

      it('fails to execute a payment without enough funds', async () => {
        const vaultBalance = await vault.balance(token1.address)
        await finance.removeBudget(token1.address) // clear any budget restrictions

        const receipt = await finance.newScheduledPayment(token1.address, recipient, vaultBalance + 1, NOW, 1, 2, '')
        const newScheduledPaymentId = getEventArgument(receipt, 'NewPayment', 'paymentId')

        await assertRevert(finance.executePayment(newScheduledPaymentId), ERRORS.FINANCE_EXECUTE_PAYMENT_NUM)
      })

      it('fails to execute a payment by receiver without enough funds', async () => {
        const vaultBalance = await vault.balance(token1.address)
        await finance.removeBudget(token1.address) // clear any budget restrictions

        const receipt = await finance.newScheduledPayment(token1.address, recipient, vaultBalance + 1, NOW, 1, 2, '')
        const newScheduledPaymentId = getEventArgument(receipt, 'NewPayment', 'paymentId')

        await assertRevert(
          finance.receiverExecutePayment(newScheduledPaymentId, { from: recipient }),
          ERRORS.FINANCE_EXECUTE_PAYMENT_NUM
        )
      })

      context('executing scheduled payment', async () => {
        let paymentId

        beforeEach(async () => {
          const receipt = await finance.newScheduledPayment(token1.address, recipient, amount, NOW + 1, 1, 4, '')
          paymentId = getEventArgument(receipt, 'NewPayment', 'paymentId')
        })

        it('only executes payment until max executions', async () => {
          await finance.mockIncreaseTime(10)
          await finance.executePayment(paymentId)

          assertBn(await token1.balanceOf(recipient), amount * 4, 'recipient should have received tokens')
          assertBn(await finance.nextPaymentTime(paymentId), MAX_UINT64, 'payment should never be repeated')
        })

        it('receiver can always execute a payment', async () => {
          await finance.mockIncreaseTime(1)
          await finance.receiverExecutePayment(paymentId, { from: recipient })

          assertBn(await token1.balanceOf(recipient), amount, 'should have received payment')
        })

        it('fails when non-receiver attempts to execute a payment', async () => {
          await finance.mockIncreaseTime(1)

          await assertRevert(finance.receiverExecutePayment(paymentId), ERRORS.FINANCE_PAYMENT_RECEIVER)
        })

        it('fails when executing before next available time', async () => {
          await assertRevert(finance.executePayment(paymentId), ERRORS.FINANCE_EXECUTE_PAYMENT_TIME)
        })

        it('fails when executed by receiver before next available time', async () => {
          await assertRevert(
            finance.receiverExecutePayment(paymentId, { from: recipient }),
            ERRORS.FINANCE_EXECUTE_PAYMENT_TIME
          )
        })

        it('fails to execute inactive payment', async () => {
          await finance.setPaymentStatus(paymentId, false)
          await finance.mockIncreaseTime(1)

          await assertRevert(finance.executePayment(paymentId), ERRORS.FINANCE_PAYMENT_INACTIVE)
        })

        it('succeeds payment after re-setting payment status to active', async () => {
          await finance.setPaymentStatus(paymentId, false)
          await finance.mockIncreaseTime(1)

          await finance.setPaymentStatus(paymentId, true)

          await finance.executePayment(paymentId)
        })
      })

      context('payment failure', async () => {
        it('tries to execute a new scheduled payment if initially possible even without enough funds', async () => {
          const vaultBalance = await vault.balance(token1.address)
          await finance.removeBudget(token1.address) // clear any budget restrictions

          const receipt = await finance.newScheduledPayment(token1.address, recipient, vaultBalance + 1, NOW, 1, 2, '')

          assertAmountOfEvents(receipt, 'PaymentFailure')
          // Make sure no transactions were made
          assertAmountOfEvents(receipt, 'NewTransaction', { expectedAmount: 0 })
        })

        it('emits payment failure event when out of budget', async () => {
          // Enough budget to allow creation of a new payment, but not enough left in the period
          // to execute it
          const budget = 50
          const amountPerPayment = 50
          assert.isTrue(await finance.canMakePayment(token1.address, amountPerPayment))

          // Create the budget, and use it up for the period
          await finance.setBudget(token1.address, budget)
          await finance.newScheduledPayment(token1.address, recipient, amountPerPayment, NOW, 1, 2, '')

          // No more budget left
          const receipt = await finance.newScheduledPayment(token1.address, recipient, amountPerPayment, NOW, 1, 2, '')
          assertAmountOfEvents(receipt, 'PaymentFailure')
          assert.isFalse(await finance.canMakePayment(token1.address, amountPerPayment))
        })

        it('emits payment failure event when out of balance', async () => {
          const amountPerPayment = 40
          const paidInterval = 100
          const paidTimes = Math.floor((await vault.balance(token1.address)) / amountPerPayment)
          await finance.removeBudget(token1.address)

          assert.isTrue(await finance.canMakePayment(token1.address, amountPerPayment))

          // creates a repeating payment that can be executed one more than the vault's funds will allow
          await finance.newScheduledPayment(token1.address, recipient, amountPerPayment, NOW, paidInterval, paidTimes + 1, '')
          await finance.mockIncreaseTime(paidInterval * (paidTimes + 1))
          const receipt = await finance.executePayment(1)

          assertAmountOfEvents(receipt, 'PaymentFailure')
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
    })

    it('fails to create new scheduled payment', async() => {
      const amount = 1

      await assertRevert(
        nonInit.newScheduledPayment(token1.address, recipient, amount, NOW, 1, 2, 'ref'),
        ERRORS.APP_AUTH_FAILED
      )
    })

    it('fails to create new single payment transaction', async() => {
      const amount = 1

      await assertRevert(
        nonInit.newImmediatePayment(token1.address, recipient, amount, 'ref'),
        ERRORS.APP_AUTH_FAILED
      )
    })

    it('fails to deposit ERC20 tokens', async() => {
      await token1.approve(nonInit.address, 5)
      await assertRevert(nonInit.deposit(token1.address, 5, 'ref'), ERRORS.INIT_NOT_INITIALIZED)
    })

    it('fails to deposit ETH', async() => {
      await assertRevert(nonInit.send(10, { gas: 3e5 }), ERRORS.INIT_NOT_INITIALIZED)
    })

    context('locked ERC20', () => {
      const lockedTokenAmount = 5

      beforeEach(async () => {
        // 'lock' tokens
        await token1.transfer(nonInit.address, lockedTokenAmount, { from: owner })
      })

      it('allow recoverability is enabled', async () => {
        assert.isTrue(await nonInit.allowRecoverability(token1.address))
      })

      it('can be recovered using AragonApp#transferToVault', async () => {
        await nonInit.transferToVault(token1.address)

        assert.equal(await recVault.balance(token1.address), lockedTokenAmount)
      })

      it('fails to be recovered using Finance#recoverToVault', async () => {
        await assertRevert(nonInit.recoverToVault(token1.address), ERRORS.INIT_NOT_INITIALIZED)
      })
    })

    context('locked ETH', () => {
      const lockedETH = 100

      beforeEach(async () => {
        await forceSendETH(nonInit.address, lockedETH)
        assertBn(await web3.eth.getBalance(nonInit.address), lockedETH, 'finance should have stuck ETH')
      })

      it('allow recoverability is enabled', async () => {
        assert.isTrue(await nonInit.allowRecoverability(ETH))
      })

      it('can recover ETH using AragonApp#transferToVault', async () => {
        await nonInit.transferToVault(ETH)

        assert.equal(await recVault.balance(ETH), lockedETH)
      })

      it('fails to be recovered using Finance#recoverToVault', async () => {
        await assertRevert(nonInit.recoverToVault(ETH), ERRORS.INIT_NOT_INITIALIZED)
      })
    })
  })
})
