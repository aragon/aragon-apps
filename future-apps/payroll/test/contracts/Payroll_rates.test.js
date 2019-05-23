const { getEvents } = require('@aragon/test-helpers/events')
const PAYMENT_TYPES = require('../helpers/payment_types')
const { bigExp, ONE } = require('../helpers/numbers')(web3)
const { NOW, TWO_MINUTES, RATE_EXPIRATION_TIME } = require('../helpers/time')
const { deployContracts, createPayrollAndPriceFeed } = require('../helpers/deploy')(artifacts, web3)
const { USD, ETH, ETH_RATE, deployDAI, DAI_RATE, deployANT, ANT_RATE, formatRate, inverseRate, setTokenRate } = require('../helpers/tokens')(artifacts, web3)

contract('Payroll rates handling,', ([owner, employee, anyone]) => {
  let dao, payroll, payrollBase, finance, vault, priceFeed, DAI, ANT

  const increaseTime = async seconds => {
    await payroll.mockIncreaseTime(seconds)
    await priceFeed.mockIncreaseTime(seconds)
  }

  before('deploy contracts and tokens', async () => {
    ({ dao, finance, vault, payrollBase } = await deployContracts(owner))

    DAI = await deployDAI(owner, finance)
    ANT = await deployANT(owner, finance)
    await finance.deposit(ETH, bigExp(50, 18), 'Initial ETH deposit', { from: anyone, value: bigExp(50, 18) })
  })

  context('when the denomination token is USD', async () => {
    beforeEach('initialize payroll app', async () => {
      ({ payroll, priceFeed } = await createPayrollAndPriceFeed(dao, payrollBase, owner, NOW))
      await payroll.initialize(finance.address, USD, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
    })

    beforeEach('set rates and allow tokens', async () => {
      await setTokenRate(priceFeed, USD, ETH, ETH_RATE)
      await setTokenRate(priceFeed, USD, DAI, DAI_RATE)
      await setTokenRate(priceFeed, USD, ANT, ANT_RATE)

      await payroll.addAllowedToken(ETH, { from: owner })
      await payroll.addAllowedToken(DAI.address, { from: owner })
      await payroll.addAllowedToken(ANT.address, { from: owner })
    })

    beforeEach('add employee with salary 1 USD per second', async () => {
      const salary = bigExp(1, 18)
      await payroll.addEmployee(employee, salary, await payroll.getTimestampPublic(), 'Boss')
    })

    beforeEach('accrue two minutes of salary', async () => {
      await increaseTime(TWO_MINUTES)
    })

    context('when the employee requests only ETH', () => {
      beforeEach('set token allocation', async () => {
        await payroll.determineAllocation([ETH], [100], { from: employee })
      })

      it('receives the expected amount of ETH', async () => {
        const previousETH = await web3.eth.getBalance(employee)
        const previousDAI = await DAI.balanceOf(employee)
        const previousANT = await ANT.balanceOf(employee)

        const { tx, receipt, logs } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })
        const { gasPrice } = await web3.eth.getTransaction(tx)
        const txCost = gasPrice.mul(receipt.gasUsed)

        const events = getEvents({ logs }, 'SendPayment')
        assert.equal(events.length, 1, 'should have emitted one event')

        // expected an income of 6 ETH since we accrued 2 minutes of salary at 1 USD per second, and the ETH rate is 20 USD
        const currentETH = await web3.eth.getBalance(employee)
        assert.equal(currentETH.minus(previousETH).plus(txCost).toString(), bigExp(6, 18).toString(), 'expected current ETH amount does not match')
        const eventETH = events.find(e => e.args.token === ETH).args
        assert.equal(eventETH.exchangeRate.toString(), inverseRate(ETH_RATE).toString(), 'ETH exchange rate does not match')

        // no DAI income expected
        const currentDAI = await DAI.balanceOf(employee)
        assert.equal(currentDAI.toString(), previousDAI.toString(), 'expected current DAI amount does not match')

        // no ANT income expected
        const currentANT = await ANT.balanceOf(employee)
        assert.equal(currentANT.toString(), previousANT.toString(), 'expected current ANT amount does not match')
      })
    })

    context('when the employee requests only ANT', () => {
      beforeEach('set token allocation', async () => {
        await payroll.determineAllocation([ANT.address], [100], { from: employee })
      })

      it('receives the expected amount of ANT', async () => {
        const previousETH = await web3.eth.getBalance(employee)
        const previousDAI = await DAI.balanceOf(employee)
        const previousANT = await ANT.balanceOf(employee)

        const { tx, receipt, logs } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })
        const { gasPrice } = await web3.eth.getTransaction(tx)
        const txCost = gasPrice.mul(receipt.gasUsed)

        const events = getEvents({ logs }, 'SendPayment')
        assert.equal(events.length, 1, 'should have emitted one event')

        // no ETH income expected
        const currentETH = await web3.eth.getBalance(employee)
        assert.equal(currentETH.plus(txCost).toString(), previousETH.toString(), 'expected current ETH amount does not match')

        // no DAI income expected
        const currentDAI = await DAI.balanceOf(employee)
        assert.equal(currentDAI.toString(), previousDAI.toString(), 'expected current DAI amount does not match')

        // expected an income of 240 ANT since we accrued 2 minutes of salary at 1 USD per second, and the ANT rate is 0.5 USD
        const currentANT = await ANT.balanceOf(employee)
        assert.equal(currentANT.minus(previousANT).toString(), bigExp(240, 18).toString(), 'expected current ANT amount does not match')
        const eventANT = events.find(e => e.args.token === ANT.address).args
        assert.equal(eventANT.exchangeRate.toString(), inverseRate(ANT_RATE).toString(), 'ANT exchange rate does not match')
      })
    })

    context('when the employee requests multiple tokens', () => {
      beforeEach('set token allocations', async () => {
        await payroll.determineAllocation([ETH, DAI.address, ANT.address], [50, 25, 25], { from: employee })
      })

      it('receives the expected amount of tokens', async () => {
        const previousETH = await web3.eth.getBalance(employee)
        const previousDAI = await DAI.balanceOf(employee)
        const previousANT = await ANT.balanceOf(employee)

        const { tx, receipt, logs } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })
        const { gasPrice } = await web3.eth.getTransaction(tx)
        const txCost = gasPrice.mul(receipt.gasUsed)

        const events = getEvents({ logs }, 'SendPayment')
        assert.equal(events.length, 3, 'should have emitted three events')

        // expected an income of 3 ETH having 50% allocated, since we accrued 2 minutes of salary at 1 USD per second, and the ETH rate is 20 USD
        const currentETH = await web3.eth.getBalance(employee)
        assert.equal(currentETH.minus(previousETH).plus(txCost).toString(), bigExp(3, 18).toString(), 'expected current ETH amount does not match')
        const eventETH = events.find(e => e.args.token === ETH).args
        assert.equal(eventETH.exchangeRate.toString(), inverseRate(ETH_RATE).toString(), 'ETH exchange rate does not match')

        // expected an income of 30 DAI having 25% allocated, since we accrued 2 minutes of salary at 1 USD per second, and the DAI rate is 1 USD
        const currentDAI = await DAI.balanceOf(employee)
        assert.equal(currentDAI.minus(previousDAI).toString(), bigExp(30, 18).toString(), 'expected current DAI amount does not match')
        const eventDAI = events.find(e => e.args.token === DAI.address).args
        assert.equal(eventDAI.exchangeRate.toString(), inverseRate(DAI_RATE).toString(), 'DAI exchange rate does not match')

        // expected an income of 60 ANT having 25% allocated, since we accrued 2 minutes of salary at 1 USD per second, and the ANT rate is 0.5 USD
        const currentANT = await ANT.balanceOf(employee)
        assert.equal(currentANT.minus(previousANT).toString(), bigExp(60, 18).toString(), 'expected current ANT amount does not match')
        const eventANT = events.find(e => e.args.token === ANT.address).args
        assert.equal(eventANT.exchangeRate.toString(), inverseRate(ANT_RATE).toString(), 'ANT exchange rate does not match')
      })
    })
  })

  context('when the denomination token is ETH', async () => {
    const ETH_TO_DAI_RATE = formatRate(ETH_RATE.div(DAI_RATE)) // 20 DAI
    const ETH_TO_ANT_RATE = formatRate(ETH_RATE.div(ANT_RATE)) // 40 ANT

    beforeEach('initialize payroll app', async () => {
      ({ payroll, priceFeed } = await createPayrollAndPriceFeed(dao, payrollBase, owner, NOW))
      await payroll.initialize(finance.address, ETH, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
    })

    beforeEach('set rates and allow tokens', async () => {
      // Note that we set ETH as the quote token for these tests so we don't need to apply the
      // inversion when checking rates
      await setTokenRate(priceFeed, DAI, ETH, ETH_TO_DAI_RATE)
      await setTokenRate(priceFeed, ANT, ETH, ETH_TO_ANT_RATE)

      await payroll.addAllowedToken(ETH, { from: owner })
      await payroll.addAllowedToken(DAI.address, { from: owner })
      await payroll.addAllowedToken(ANT.address, { from: owner })
    })

    beforeEach('add employee with salary 0.1 ETH per second', async () => {
      const salary = bigExp(0.1, 18)
      await payroll.addEmployee(employee, salary, await payroll.getTimestampPublic(), 'Boss')
    })

    beforeEach('accrue two minutes of salary', async () => {
      await increaseTime(TWO_MINUTES)
    })

    context('when the employee requests only ETH', () => {
      beforeEach('set token allocation', async () => {
        await payroll.determineAllocation([ETH], [100], { from: employee })
      })

      it('receives the expected amount of ETH', async () => {
        const previousETH = await web3.eth.getBalance(employee)
        const previousDAI = await DAI.balanceOf(employee)
        const previousANT = await ANT.balanceOf(employee)

        const { tx, receipt, logs } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })
        const { gasPrice } = await web3.eth.getTransaction(tx)
        const txCost = gasPrice.mul(receipt.gasUsed)

        const events = getEvents({ logs }, 'SendPayment')
        assert.equal(events.length, 1, 'should have emitted one event')

        // expected an income of 12 ETH since we accrued 2 minutes of salary at 0.1 ETH per second, and the denomination token is ETH
        const currentETH = await web3.eth.getBalance(employee)
        assert.equal(currentETH.minus(previousETH).plus(txCost).toString(), bigExp(12, 18).toString(), 'expected current ETH amount does not match')
        const eventETH = events.find(e => e.args.token === ETH).args
        assert.equal(eventETH.exchangeRate.toString(), ONE.toString(), 'ETH exchange rate does not match')

        // no DAI income expected
        const currentDAI = await DAI.balanceOf(employee)
        assert.equal(currentDAI.toString(), previousDAI.toString(), 'expected current DAI amount does not match')

        // no ANT income expected
        const currentANT = await ANT.balanceOf(employee)
        assert.equal(currentANT.toString(), previousANT.toString(), 'expected current ANT amount does not match')
      })
    })

    context('when the employee requests only ANT', () => {
      beforeEach('set token allocation', async () => {
        await payroll.determineAllocation([ANT.address], [100], { from: employee })
      })

      it('receives the expected amount of ANT', async () => {
        const previousETH = await web3.eth.getBalance(employee)
        const previousDAI = await DAI.balanceOf(employee)
        const previousANT = await ANT.balanceOf(employee)

        const { tx, receipt, logs } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })
        const { gasPrice } = await web3.eth.getTransaction(tx)
        const txCost = gasPrice.mul(receipt.gasUsed)

        const events = getEvents({ logs }, 'SendPayment')
        assert.equal(events.length, 1, 'should have emitted one event')

        // no ETH income expected
        const currentETH = await web3.eth.getBalance(employee)
        assert.equal(currentETH.plus(txCost).toString(), previousETH.toString(), 'expected current ETH amount does not match')

        // no DAI income expected
        const currentDAI = await DAI.balanceOf(employee)
        assert.equal(currentDAI.toString(), previousDAI.toString(), 'expected current DAI amount does not match')

        // expected an income of 480 ANT since we accrued 2 minutes of salary at 0.1 ETH per second, and the ANT rate is 0.025 ETH
        const currentANT = await ANT.balanceOf(employee)
        assert.equal(currentANT.minus(previousANT).toString(), bigExp(480, 18).toString(), 'expected current ANT amount does not match')
        const eventANT = events.find(e => e.args.token === ANT.address).args
        assert.equal(eventANT.exchangeRate.toString(), ETH_TO_ANT_RATE.toString(), 'ANT exchange rate does not match')
      })
    })

    context('when the employee requests multiple tokens', () => {
      beforeEach('set token allocations', async () => {
        await payroll.determineAllocation([ETH, DAI.address, ANT.address], [50, 25, 25], { from: employee })
      })

      it('receives the expected amount of tokens', async () => {
        const previousETH = await web3.eth.getBalance(employee)
        const previousDAI = await DAI.balanceOf(employee)
        const previousANT = await ANT.balanceOf(employee)

        const { tx, receipt, logs } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })
        const { gasPrice } = await web3.eth.getTransaction(tx)
        const txCost = gasPrice.mul(receipt.gasUsed)

        const events = getEvents({ logs }, 'SendPayment')
        assert.equal(events.length, 3, 'should have emitted three events')

        // expected an income of 6 ETH having 50% allocated, since we accrued 2 minutes of salary at 0.1 ETH per second, and the denomination token is ETH
        const currentETH = await web3.eth.getBalance(employee)
        assert.equal(currentETH.minus(previousETH).plus(txCost).toString(), bigExp(6, 18).toString(), 'expected current ETH amount does not match')
        const eventETH = events.find(e => e.args.token === ETH).args
        assert.equal(eventETH.exchangeRate.toString(), ONE.toString(), 'ETH exchange rate does not match')

        // expected an income of 60 DAI having 25% allocated, since we accrued 2 minutes of salary at 0.1 ETH per second, and the DAI rate is 0.05 ETH
        const currentDAI = await DAI.balanceOf(employee)
        assert.equal(currentDAI.minus(previousDAI).toString(), bigExp(60, 18).toString(), 'expected current DAI amount does not match')
        const eventDAI = events.find(e => e.args.token === DAI.address).args
        assert.equal(eventDAI.exchangeRate.toString(), ETH_TO_DAI_RATE.toString(), 'DAI exchange rate does not match')

        // expected an income of 120 ANT having 25% allocated, since we accrued 2 minutes of salary at 0.1 ETH per second, and the ANT rate is 0.025 ETH
        const currentANT = await ANT.balanceOf(employee)
        assert.equal(currentANT.minus(previousANT).toString(), bigExp(120, 18).toString(), 'expected current ANT amount does not match')
        const eventANT = events.find(e => e.args.token === ANT.address).args
        assert.equal(eventANT.exchangeRate.toString(), ETH_TO_ANT_RATE.toString(), 'ANT exchange rate does not match')
      })
    })
  })

  context('when the denomination token is DAI', async () => {
    const ETH_TO_DAI_RATE = formatRate(ETH_RATE.div(DAI_RATE)) //  20 DAI
    const ANT_TO_DAI_RATE = formatRate(ANT_RATE.div(DAI_RATE)) // 0.5 DAI

    beforeEach('initialize payroll app', async () => {
      ({ payroll, priceFeed } = await createPayrollAndPriceFeed(dao, payrollBase, owner, NOW))
      await payroll.initialize(finance.address, DAI.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
    })

    beforeEach('set rates and allow tokens', async () => {
      await setTokenRate(priceFeed, DAI, ETH, ETH_TO_DAI_RATE)
      await setTokenRate(priceFeed, DAI, ANT, ANT_TO_DAI_RATE)

      await payroll.addAllowedToken(ETH, { from: owner })
      await payroll.addAllowedToken(DAI.address, { from: owner })
      await payroll.addAllowedToken(ANT.address, { from: owner })
    })

    beforeEach('add employee with salary 1 DAI per second', async () => {
      const salary = bigExp(1, 18)
      await payroll.addEmployee(employee, salary, await payroll.getTimestampPublic(), 'Boss')
    })

    beforeEach('accrue two minutes of salary', async () => {
      await increaseTime(TWO_MINUTES)
    })

    context('when the employee requests only ETH', () => {
      beforeEach('set token allocation', async () => {
        await payroll.determineAllocation([ETH], [100], { from: employee })
      })

      it('receives the expected amount of ETH', async () => {
        const previousETH = await web3.eth.getBalance(employee)
        const previousDAI = await DAI.balanceOf(employee)
        const previousANT = await ANT.balanceOf(employee)

        const { tx, receipt, logs } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })
        const { gasPrice } = await web3.eth.getTransaction(tx)
        const txCost = gasPrice.mul(receipt.gasUsed)

        const events = getEvents({ logs }, 'SendPayment')
        assert.equal(events.length, 1, 'should have emitted three events')

        // expected an income of 6 ETH since we accrued 2 minutes of salary at 1 DAI per second, and the ETH rate is 20 DAI
        const currentETH = await web3.eth.getBalance(employee)
        assert.equal(currentETH.minus(previousETH).plus(txCost).toString(), bigExp(6, 18).toString(), 'expected current ETH amount does not match')
        const eventETH = events.find(e => e.args.token === ETH).args
        assert.equal(eventETH.exchangeRate.toString(), inverseRate(ETH_TO_DAI_RATE).toString(), 'ETH exchange rate does not match')

        // no DAI income expected
        const currentDAI = await DAI.balanceOf(employee)
        assert.equal(currentDAI.toString(), previousDAI.toString(), 'expected current DAI amount does not match')

        // no ANT income expected
        const currentANT = await ANT.balanceOf(employee)
        assert.equal(currentANT.toString(), previousANT.toString(), 'expected current ANT amount does not match')
      })
    })

    context('when the employee requests only ANT', () => {
      beforeEach('set token allocation', async () => {
        await payroll.determineAllocation([ANT.address], [100], { from: employee })
      })

      it('receives the expected amount of ANT', async () => {
        const previousETH = await web3.eth.getBalance(employee)
        const previousDAI = await DAI.balanceOf(employee)
        const previousANT = await ANT.balanceOf(employee)

        const { tx, receipt, logs } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })
        const { gasPrice } = await web3.eth.getTransaction(tx)
        const txCost = gasPrice.mul(receipt.gasUsed)

        const events = getEvents({ logs }, 'SendPayment')
        assert.equal(events.length, 1, 'should have emitted three events')

        // no ETH income expected
        const currentETH = await web3.eth.getBalance(employee)
        assert.equal(currentETH.plus(txCost).toString(), previousETH.toString(), 'expected current ETH amount does not match')

        // no DAI income expected
        const currentDAI = await DAI.balanceOf(employee)
        assert.equal(currentDAI.toString(), previousDAI.toString(), 'expected current DAI amount does not match')

        // expected an income of 240 ANT since we accrued 2 minutes of salary at 1 DAI per second, and the ANT rate is 0.5 DAI
        const currentANT = await ANT.balanceOf(employee)
        assert.equal(currentANT.minus(previousANT).toString(), bigExp(240, 18).toString(), 'expected current ANT amount does not match')
        const eventANT = events.find(e => e.args.token === ANT.address).args
        assert.equal(eventANT.exchangeRate.toString(), inverseRate(ANT_TO_DAI_RATE).toString(), 'ANT exchange rate does not match')
      })
    })

    context('when the employee requests multiple tokens', () => {
      beforeEach('set token allocations', async () => {
        await payroll.determineAllocation([ETH, DAI.address, ANT.address], [50, 25, 25], { from: employee })
      })

      it('receives the expected amount of tokens', async () => {
        const previousETH = await web3.eth.getBalance(employee)
        const previousDAI = await DAI.balanceOf(employee)
        const previousANT = await ANT.balanceOf(employee)

        const { tx, receipt, logs } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })
        const { gasPrice } = await web3.eth.getTransaction(tx)
        const txCost = gasPrice.mul(receipt.gasUsed)

        const events = getEvents({ logs }, 'SendPayment')
        assert.equal(events.length, 3, 'should have emitted three events')

        // expected an income of 3 ETH having 50% allocated, since we accrued 2 minutes of salary at 1 DAI per second, and the ETH rate is 20 DAI
        const currentETH = await web3.eth.getBalance(employee)
        assert.equal(currentETH.minus(previousETH).plus(txCost).toString(), bigExp(3, 18).toString(), 'expected current ETH amount does not match')
        const eventETH = events.find(e => e.args.token === ETH).args
        assert.equal(eventETH.exchangeRate.toString(), inverseRate(ETH_TO_DAI_RATE).toString(), 'ETH exchange rate does not match')

        // expected an income of 30 DAI having 25% allocated, since we accrued 2 minutes of salary at 1 DAI per second, and the denomination token is DAI
        const currentDAI = await DAI.balanceOf(employee)
        assert.equal(currentDAI.minus(previousDAI).toString(), bigExp(30, 18).toString(), 'expected current DAI amount does not match')
        const eventDAI = events.find(e => e.args.token === DAI.address).args
        assert.equal(eventDAI.exchangeRate.toString(), ONE.toString(), 'DAI exchange rate does not match')

        // expected an income of 60 ANT having 25% allocated, since we accrued 2 minutes of salary at 1 DAI per second, and the ANT rate is 0.5 DAI
        const currentANT = await ANT.balanceOf(employee)
        assert.equal(currentANT.minus(previousANT).toString(), bigExp(60, 18).toString(), 'expected current ANT amount does not match')
        const eventANT = events.find(e => e.args.token === ANT.address).args
        assert.equal(eventANT.exchangeRate.toString(), inverseRate(ANT_TO_DAI_RATE).toString(), 'ANT exchange rate does not match')
      })
    })
  })

  context('when the denomination token is ANT', async () => {
    const ETH_TO_ANT_RATE = formatRate(ETH_RATE.div(ANT_RATE)) // 40 ANT
    const DAI_TO_ANT_RATE = formatRate(DAI_RATE.div(ANT_RATE)) //  2 ANT

    beforeEach('initialize payroll app', async () => {
      ({ payroll, priceFeed } = await createPayrollAndPriceFeed(dao, payrollBase, owner, NOW))
      await payroll.initialize(finance.address, ANT.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
    })

    beforeEach('set rates and allow tokens', async () => {
      await setTokenRate(priceFeed, ANT, ETH, ETH_TO_ANT_RATE)
      await setTokenRate(priceFeed, ANT, DAI, DAI_TO_ANT_RATE)

      await payroll.addAllowedToken(ETH, { from: owner })
      await payroll.addAllowedToken(DAI.address, { from: owner })
      await payroll.addAllowedToken(ANT.address, { from: owner })
    })

    beforeEach('add employee with salary 1 ANT per second', async () => {
      const salary = bigExp(1, 18)
      await payroll.addEmployee(employee, salary, await payroll.getTimestampPublic(), 'Boss')
    })

    beforeEach('accrue two minutes of salary', async () => {
      await increaseTime(TWO_MINUTES)
    })

    context('when the employee requests only ETH', () => {
      beforeEach('set token allocation', async () => {
        await payroll.determineAllocation([ETH], [100], { from: employee })
      })

      it('receives the expected amount of ETH', async () => {
        const previousETH = await web3.eth.getBalance(employee)
        const previousDAI = await DAI.balanceOf(employee)
        const previousANT = await ANT.balanceOf(employee)

        const { tx, receipt, logs } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })
        const { gasPrice } = await web3.eth.getTransaction(tx)
        const txCost = gasPrice.mul(receipt.gasUsed)

        const events = getEvents({ logs }, 'SendPayment')
        assert.equal(events.length, 1, 'should have emitted three events')

        // expected an income of 3 ETH since we accrued 2 minutes of salary at 1 ANT per second, and the ETH rate is 40 ANT
        const currentETH = await web3.eth.getBalance(employee)
        assert.equal(currentETH.minus(previousETH).plus(txCost).toString(), bigExp(3, 18).toString(), 'expected current ETH amount does not match')
        const eventETH = events.find(e => e.args.token === ETH).args
        assert.equal(eventETH.exchangeRate.toString(), inverseRate(ETH_TO_ANT_RATE).toString(), 'ETH exchange rate does not match')

        // no DAI income expected
        const currentDAI = await DAI.balanceOf(employee)
        assert.equal(currentDAI.toString(), previousDAI.toString(), 'expected current DAI amount does not match')

        // no ANT income expected
        const currentANT = await ANT.balanceOf(employee)
        assert.equal(currentANT.toString(), previousANT.toString(), 'expected current ANT amount does not match')
      })
    })

    context('when the employee requests only ANT', () => {
      beforeEach('set token allocation', async () => {
        await payroll.determineAllocation([ANT.address], [100], { from: employee })
      })

      it('receives the expected amount of ANT', async () => {
        const previousETH = await web3.eth.getBalance(employee)
        const previousDAI = await DAI.balanceOf(employee)
        const previousANT = await ANT.balanceOf(employee)

        const { tx, receipt, logs } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })
        const { gasPrice } = await web3.eth.getTransaction(tx)
        const txCost = gasPrice.mul(receipt.gasUsed)

        const events = getEvents({ logs }, 'SendPayment')
        assert.equal(events.length, 1, 'should have emitted three events')

        // no ETH income expected
        const currentETH = await web3.eth.getBalance(employee)
        assert.equal(currentETH.plus(txCost).toString(), previousETH.toString(), 'expected current ETH amount does not match')

        // no DAI income expected
        const currentDAI = await DAI.balanceOf(employee)
        assert.equal(currentDAI.toString(), previousDAI.toString(), 'expected current DAI amount does not match')

        // expected an income of 120 ANT since we accrued 2 minutes of salary at 1 ANT per second, and the denomination token is ANT
        const currentANT = await ANT.balanceOf(employee)
        assert.equal(currentANT.minus(previousANT).toString(), bigExp(120, 18).toString(), 'expected current ANT amount does not match')
        const eventANT = events.find(e => e.args.token === ANT.address).args
        assert.equal(eventANT.exchangeRate.toString(), ONE.toString(), 'ANT exchange rate does not match')
      })
    })

    context('when the employee requests multiple tokens', () => {
      beforeEach('set token allocations', async () => {
        await payroll.determineAllocation([ETH, DAI.address, ANT.address], [50, 25, 25], { from: employee })
      })

      it('receives the expected amount of tokens', async () => {
        const previousETH = await web3.eth.getBalance(employee)
        const previousDAI = await DAI.balanceOf(employee)
        const previousANT = await ANT.balanceOf(employee)

        const { tx, receipt, logs } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })
        const { gasPrice } = await web3.eth.getTransaction(tx)
        const txCost = gasPrice.mul(receipt.gasUsed)

        const events = getEvents({ logs }, 'SendPayment')
        assert.equal(events.length, 3, 'should have emitted three events')

        // expected an income of 1.5 ETH having 50% allocated, since we accrued 2 minutes of salary at 1 ANT per second, and the ETH rate is 40 ANT
        const currentETH = await web3.eth.getBalance(employee)
        assert.equal(currentETH.minus(previousETH).plus(txCost).toString(), bigExp(1.5, 18).toString(), 'expected current ETH amount does not match')
        const eventETH = events.find(e => e.args.token === ETH).args
        assert.equal(eventETH.exchangeRate.toString(), inverseRate(ETH_TO_ANT_RATE).toString(), 'ETH exchange rate does not match')

        // expected an income of 15 DAI having 25% allocated, since we accrued 2 minutes of salary at 1 ANT per second, and the DAI rate is 2 ANT
        const currentDAI = await DAI.balanceOf(employee)
        assert.equal(currentDAI.minus(previousDAI).toString(), bigExp(15, 18).toString(), 'expected current DAI amount does not match')
        const eventDAI = events.find(e => e.args.token === DAI.address).args
        assert.equal(eventDAI.exchangeRate.toString(), inverseRate(DAI_TO_ANT_RATE).toString(), 'DAI exchange rate does not match')

        // expected an income of 30 ANT having 25% allocated, since we accrued 2 minutes of salary at 1 ANT per second, and the denomination token is ANT
        const currentANT = await ANT.balanceOf(employee)
        assert.equal(currentANT.minus(previousANT).toString(), bigExp(30, 18).toString(), 'expected current ANT amount does not match')
        const eventANT = events.find(e => e.args.token === ANT.address).args
        assert.equal(eventANT.exchangeRate.toString(), ONE.toString(), 'ANT exchange rate does not match')
      })
    })
  })
})
