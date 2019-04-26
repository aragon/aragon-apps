const PAYMENT_TYPES = require('../helpers/payment_types')
const { bigExp } = require('../helpers/numbers')(web3)
const { NOW, TWO_MINUTES, RATE_EXPIRATION_TIME } = require('../helpers/time')
const { deployContracts, createPayrollAndPriceFeed } = require('../helpers/deploy')(artifacts, web3)
const { USD, ETH, ETH_RATE, deployDAI, DAI_RATE, deployANT, ANT_RATE, setTokenRate } = require('../helpers/tokens.js')(artifacts, web3)

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
      await setTokenRate(priceFeed, ETH, USD, ETH_RATE)
      await setTokenRate(priceFeed, DAI, USD, DAI_RATE)
      await setTokenRate(priceFeed, ANT, USD, ANT_RATE)

      await payroll.addAllowedToken(ETH, { from: owner })
      await payroll.addAllowedToken(DAI.address, { from: owner })
      await payroll.addAllowedToken(ANT.address, { from: owner })
    })

    beforeEach('add employee with salary 1 USD per second', async () => {
      const salary = bigExp(1, 18)
      await payroll.addEmployee(employee, salary, 'Boss', await payroll.getTimestampPublic())
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

        const { tx, receipt } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })
        const { gasPrice } = await web3.eth.getTransaction(tx)
        const txCost = gasPrice.mul(receipt.gasUsed)

        // expected an income of 6 ETH since we accrued 2 minutes of salary at 1 USD per second, and the ETH rate is 20 USD
        const currentETH = await web3.eth.getBalance(employee)
        assert.equal(currentETH.minus(previousETH).plus(txCost).toString(), bigExp(6, 18).toString(), 'expected current ETH amount does not match')

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

        const { tx, receipt } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })
        const { gasPrice } = await web3.eth.getTransaction(tx)
        const txCost = gasPrice.mul(receipt.gasUsed)

        // no ETH income expected
        const currentETH = await web3.eth.getBalance(employee)
        assert.equal(currentETH.plus(txCost).toString(), previousETH.toString(), 'expected current ETH amount does not match')

        // no DAI income expected
        const currentDAI = await DAI.balanceOf(employee)
        assert.equal(currentDAI.toString(), previousDAI.toString(), 'expected current DAI amount does not match')

        // expected an income of 240 ANT since we accrued 2 minutes of salary at 1 USD per second, and the ANT rate is 0.5 USD
        const currentANT = await ANT.balanceOf(employee)
        assert.equal(currentANT.minus(previousANT).toString(), bigExp(240, 18).toString(), 'expected current ANT amount does not match')
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

        const { tx, receipt } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })
        const { gasPrice } = await web3.eth.getTransaction(tx)
        const txCost = gasPrice.mul(receipt.gasUsed)

        // expected an income of 3 ETH having 50% allocated, since we accrued 2 minutes of salary at 1 USD per second, and the ETH rate is 20 USD
        const currentETH = await web3.eth.getBalance(employee)
        assert.equal(currentETH.minus(previousETH).plus(txCost).toString(), bigExp(3, 18).toString(), 'expected current ETH amount does not match')

        // expected an income of 30 DAI having 25% allocated, since we accrued 2 minutes of salary at 1 USD per second, and the DAI rate is 1 USD
        const currentDAI = await DAI.balanceOf(employee)
        assert.equal(currentDAI.minus(previousDAI).toString(), bigExp(30, 18).toString(), 'expected current DAI amount does not match')

        // expected an income of 60 ANT having 25% allocated, since we accrued 2 minutes of salary at 1 USD per second, and the ANT rate is 0.5 USD
        const currentANT = await ANT.balanceOf(employee)
        assert.equal(currentANT.minus(previousANT).toString(), bigExp(60, 18).toString(), 'expected current ANT amount does not match')
      })
    })
  })

  context('when the denomination token is ETH', async () => {
    beforeEach('initialize payroll app', async () => {
      ({ payroll, priceFeed } = await createPayrollAndPriceFeed(dao, payrollBase, owner, NOW))
      await payroll.initialize(finance.address, ETH, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
    })

    beforeEach('set rates and allow tokens', async () => {
      await setTokenRate(priceFeed, DAI, ETH, DAI_RATE.div(ETH_RATE)) // 0.050 ETH
      await setTokenRate(priceFeed, ANT, ETH, ANT_RATE.div(ETH_RATE)) // 0.025 ETH

      await payroll.addAllowedToken(ETH, { from: owner })
      await payroll.addAllowedToken(DAI.address, { from: owner })
      await payroll.addAllowedToken(ANT.address, { from: owner })
    })

    beforeEach('add employee with salary 0.1 ETH per second', async () => {
      const salary = bigExp(0.1, 18)
      await payroll.addEmployee(employee, salary, 'Boss', await payroll.getTimestampPublic())
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

        const { tx, receipt } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })
        const { gasPrice } = await web3.eth.getTransaction(tx)
        const txCost = gasPrice.mul(receipt.gasUsed)

        // expected an income of 12 ETH since we accrued 2 minutes of salary at 0.1 ETH per second, and the denomination token is ETH
        const currentETH = await web3.eth.getBalance(employee)
        assert.equal(currentETH.minus(previousETH).plus(txCost).toString(), bigExp(12, 18).toString(), 'expected current ETH amount does not match')

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

        const { tx, receipt } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })
        const { gasPrice } = await web3.eth.getTransaction(tx)
        const txCost = gasPrice.mul(receipt.gasUsed)

        // no ETH income expected
        const currentETH = await web3.eth.getBalance(employee)
        assert.equal(currentETH.plus(txCost).toString(), previousETH.toString(), 'expected current ETH amount does not match')

        // no DAI income expected
        const currentDAI = await DAI.balanceOf(employee)
        assert.equal(currentDAI.toString(), previousDAI.toString(), 'expected current DAI amount does not match')

        // expected an income of 480 ANT since we accrued 2 minutes of salary at 0.1 ETH per second, and the ANT rate is 0.025 ETH
        const currentANT = await ANT.balanceOf(employee)
        assert.equal(currentANT.minus(previousANT).toString(), bigExp(480, 18).toString(), 'expected current ANT amount does not match')
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

        const { tx, receipt } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })
        const { gasPrice } = await web3.eth.getTransaction(tx)
        const txCost = gasPrice.mul(receipt.gasUsed)

        // expected an income of 6 ETH having 50% allocated, since we accrued 2 minutes of salary at 0.1 ETH per second, and the denomination token is ETH
        const currentETH = await web3.eth.getBalance(employee)
        assert.equal(currentETH.minus(previousETH).plus(txCost).toString(), bigExp(6, 18).toString(), 'expected current ETH amount does not match')

        // expected an income of 60 DAI having 25% allocated, since we accrued 2 minutes of salary at 0.1 ETH per second, and the DAI rate is 0.05 ETH
        const currentDAI = await DAI.balanceOf(employee)
        assert.equal(currentDAI.minus(previousDAI).toString(), bigExp(60, 18).toString(), 'expected current DAI amount does not match')

        // expected an income of 120 ANT having 25% allocated, since we accrued 2 minutes of salary at 0.1 ETH per second, and the ANT rate is 0.025 ETH
        const currentANT = await ANT.balanceOf(employee)
        assert.equal(currentANT.minus(previousANT).toString(), bigExp(120, 18).toString(), 'expected current ANT amount does not match')
      })
    })
  })

  context('when the denomination token is DAI', async () => {
    beforeEach('initialize payroll app', async () => {
      ({ payroll, priceFeed } = await createPayrollAndPriceFeed(dao, payrollBase, owner, NOW))
      await payroll.initialize(finance.address, DAI.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
    })

    beforeEach('set rates and allow tokens', async () => {
      await setTokenRate(priceFeed, ETH, DAI, ETH_RATE.div(DAI_RATE)) //  20 DAI
      await setTokenRate(priceFeed, ANT, DAI, ANT_RATE.div(DAI_RATE)) // 0.5 DAI

      await payroll.addAllowedToken(ETH, { from: owner })
      await payroll.addAllowedToken(DAI.address, { from: owner })
      await payroll.addAllowedToken(ANT.address, { from: owner })
    })

    beforeEach('add employee with salary 1 DAI per second', async () => {
      const salary = bigExp(1, 18)
      await payroll.addEmployee(employee, salary, 'Boss', await payroll.getTimestampPublic())
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

        const { tx, receipt } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })
        const { gasPrice } = await web3.eth.getTransaction(tx)
        const txCost = gasPrice.mul(receipt.gasUsed)

        // expected an income of 6 ETH since we accrued 2 minutes of salary at 1 DAI per second, and the ETH rate is 20 DAI
        const currentETH = await web3.eth.getBalance(employee)
        assert.equal(currentETH.minus(previousETH).plus(txCost).toString(), bigExp(6, 18).toString(), 'expected current ETH amount does not match')

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

        const { tx, receipt } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })
        const { gasPrice } = await web3.eth.getTransaction(tx)
        const txCost = gasPrice.mul(receipt.gasUsed)

        // no ETH income expected
        const currentETH = await web3.eth.getBalance(employee)
        assert.equal(currentETH.plus(txCost).toString(), previousETH.toString(), 'expected current ETH amount does not match')

        // no DAI income expected
        const currentDAI = await DAI.balanceOf(employee)
        assert.equal(currentDAI.toString(), previousDAI.toString(), 'expected current DAI amount does not match')

        // expected an income of 240 ANT since we accrued 2 minutes of salary at 1 DAI per second, and the ANT rate is 0.5 DAI
        const currentANT = await ANT.balanceOf(employee)
        assert.equal(currentANT.minus(previousANT).toString(), bigExp(240, 18).toString(), 'expected current ANT amount does not match')
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

        const { tx, receipt } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })
        const { gasPrice } = await web3.eth.getTransaction(tx)
        const txCost = gasPrice.mul(receipt.gasUsed)

        // expected an income of 3 ETH having 50% allocated, since we accrued 2 minutes of salary at 1 DAI per second, and the ETH rate is 20 DAI
        const currentETH = await web3.eth.getBalance(employee)
        assert.equal(currentETH.minus(previousETH).plus(txCost).toString(), bigExp(3, 18).toString(), 'expected current ETH amount does not match')

        // expected an income of 30 DAI having 25% allocated, since we accrued 2 minutes of salary at 1 DAI per second, and the denomination token is DAI
        const currentDAI = await DAI.balanceOf(employee)
        assert.equal(currentDAI.minus(previousDAI).toString(), bigExp(30, 18).toString(), 'expected current DAI amount does not match')

        // expected an income of 60 ANT having 25% allocated, since we accrued 2 minutes of salary at 1 DAI per second, and the ANT rate is 0.5 DAI
        const currentANT = await ANT.balanceOf(employee)
        assert.equal(currentANT.minus(previousANT).toString(), bigExp(60, 18).toString(), 'expected current ANT amount does not match')
      })
    })
  })

  context('when the denomination token is ANT', async () => {
    beforeEach('initialize payroll app', async () => {
      ({ payroll, priceFeed } = await createPayrollAndPriceFeed(dao, payrollBase, owner, NOW))
      await payroll.initialize(finance.address, ANT.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
    })

    beforeEach('set rates and allow tokens', async () => {
      await setTokenRate(priceFeed, ETH, ANT, ETH_RATE.div(ANT_RATE)) // 40 ANT
      await setTokenRate(priceFeed, DAI, ANT, DAI_RATE.div(ANT_RATE)) //  2 ANT

      await payroll.addAllowedToken(ETH, { from: owner })
      await payroll.addAllowedToken(DAI.address, { from: owner })
      await payroll.addAllowedToken(ANT.address, { from: owner })
    })

    beforeEach('add employee with salary 1 ANT per second', async () => {
      const salary = bigExp(1, 18)
      await payroll.addEmployee(employee, salary, 'Boss', await payroll.getTimestampPublic())
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

        const { tx, receipt } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })
        const { gasPrice } = await web3.eth.getTransaction(tx)
        const txCost = gasPrice.mul(receipt.gasUsed)

        // expected an income of 3 ETH since we accrued 2 minutes of salary at 1 ANT per second, and the ETH rate is 40 ANT
        const currentETH = await web3.eth.getBalance(employee)
        assert.equal(currentETH.minus(previousETH).plus(txCost).toString(), bigExp(3, 18).toString(), 'expected current ETH amount does not match')

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

        const { tx, receipt } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })
        const { gasPrice } = await web3.eth.getTransaction(tx)
        const txCost = gasPrice.mul(receipt.gasUsed)

        // no ETH income expected
        const currentETH = await web3.eth.getBalance(employee)
        assert.equal(currentETH.plus(txCost).toString(), previousETH.toString(), 'expected current ETH amount does not match')

        // no DAI income expected
        const currentDAI = await DAI.balanceOf(employee)
        assert.equal(currentDAI.toString(), previousDAI.toString(), 'expected current DAI amount does not match')

        // expected an income of 120 ANT since we accrued 2 minutes of salary at 1 ANT per second, and the denomination token is ANT
        const currentANT = await ANT.balanceOf(employee)
        assert.equal(currentANT.minus(previousANT).toString(), bigExp(120, 18).toString(), 'expected current ANT amount does not match')
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

        const { tx, receipt } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })
        const { gasPrice } = await web3.eth.getTransaction(tx)
        const txCost = gasPrice.mul(receipt.gasUsed)

        // expected an income of 1.5 ETH having 50% allocated, since we accrued 2 minutes of salary at 1 ANT per second, and the ETH rate is 40 ANT
        const currentETH = await web3.eth.getBalance(employee)
        assert.equal(currentETH.minus(previousETH).plus(txCost).toString(), bigExp(1.5, 18).toString(), 'expected current ETH amount does not match')

        // expected an income of 15 DAI having 25% allocated, since we accrued 2 minutes of salary at 1 ANT per second, and the DAI rate is 2 ANT
        const currentDAI = await DAI.balanceOf(employee)
        assert.equal(currentDAI.minus(previousDAI).toString(), bigExp(15, 18).toString(), 'expected current DAI amount does not match')

        // expected an income of 30 ANT having 25% allocated, since we accrued 2 minutes of salary at 1 ANT per second, and the denomination token is ANT
        const currentANT = await ANT.balanceOf(employee)
        assert.equal(currentANT.minus(previousANT).toString(), bigExp(30, 18).toString(), 'expected current ANT amount does not match')
      })
    })
  })
})
