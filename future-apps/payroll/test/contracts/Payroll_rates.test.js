const PAYMENT_TYPES = require('../helpers/payment_types')
const { bigExp, bn } = require('../helpers/numbers')(web3)
const { getEventArgument } = require('../helpers/events')
const { deployErc20TokenAndDeposit, deployContracts, createPayrollAndPriceFeed } = require('../helpers/deploy.js')(artifacts, web3)

contract('Payroll rates handling,', ([owner, employee]) => {
  let USD, ETH, DAI, ANT
  let dao, payroll, payrollBase, finance, vault, priceFeed, employeeId

  const NOW = 1553703809 // random fixed timestamp in seconds
  const TWO_MINUTES = 60 * 2
  const ONE_MONTH = 60 * 60 * 24 * 31
  const RATE_EXPIRATION_TIME = ONE_MONTH

  const TOKEN_DECIMALS = 18
  const ONE = bigExp(1, 18)
  const SIG = '00'.repeat(65) // sig full of 0s

  const formatRate = (n) => bn(n.toFixed(18)).times(ONE)

  const increaseTime = async seconds => {
    await payroll.mockIncreaseTime(seconds)
    await priceFeed.mockIncreaseTime(seconds)
  }

  before('deploy contracts and tokens', async () => {
    ({ dao, finance, vault, payrollBase } = await deployContracts(owner))

    USD = '0x0000000000000000000000000000000000000001'
    ETH = '0x0000000000000000000000000000000000000000'
    await finance.deposit(ETH, bn(50, 18), 'Initial ETH deposit', { from: owner, value: bn(50, 18) })

    DAI = await deployErc20TokenAndDeposit(owner, finance, 'DAI', TOKEN_DECIMALS)
    ANT = await deployErc20TokenAndDeposit(owner, finance, 'ANT', TOKEN_DECIMALS)
  })

  beforeEach('initialize payroll app with USD as denomination token', async () => {
    ({ payroll, priceFeed } = await createPayrollAndPriceFeed(dao, payrollBase, owner, NOW))
    await payroll.initialize(finance.address, USD, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
  })

  describe('rates', () => {
    beforeEach('set rates and allow tokens', async () => {
      const DAI_rate = bn(1)
      const ANT_rate = bn(0.5)
      const ETH_rate = bn(20)

      await priceFeed.update(ETH, USD, formatRate(ETH_rate), NOW, SIG)
      await priceFeed.update(DAI.address, USD, formatRate(DAI_rate), NOW, SIG)
      await priceFeed.update(ANT.address, USD, formatRate(ANT_rate), NOW, SIG)

      await payroll.addAllowedToken(ETH, { from: owner })
      await payroll.addAllowedToken(DAI.address, { from: owner })
      await payroll.addAllowedToken(ANT.address, { from: owner })
    })

    beforeEach('add employee with salary 1 USD per second', async () => {
      const salary = 1
      const receipt = await payroll.addEmployee(employee, salary, 'Boss', await payroll.getTimestampPublic())
      employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
    })

    beforeEach('increase time two minutes', async () => {
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

        const currentETH = await web3.eth.getBalance(employee)
        assert.equal(currentETH.minus(previousETH).plus(txCost).toString(), 6, 'expected current ETH amount does not match')

        const currentDAI = await DAI.balanceOf(employee)
        assert.equal(currentDAI.toString(), previousDAI.toString(), 'expected current DAI amount does not match')

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

        const currentETH = await web3.eth.getBalance(employee)
        assert.equal(currentETH.plus(txCost).toString(), previousETH.toString(), 'expected current ETH amount does not match')

        const currentDAI = await DAI.balanceOf(employee)
        assert.equal(currentDAI.toString(), previousDAI.toString(), 'expected current DAI amount does not match')

        const currentANT = await ANT.balanceOf(employee)
        assert.equal(currentANT.minus(previousANT).toString(), 240, 'expected current ANT amount does not match')
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

        const currentETH = await web3.eth.getBalance(employee)
        assert.equal(currentETH.minus(previousETH).plus(txCost).toString(), 3, 'expected current ETH amount does not match')

        const currentDAI = await DAI.balanceOf(employee)
        assert.equal(currentDAI.minus(previousDAI).toString(), 30, 'expected current DAI amount does not match')

        const currentANT = await ANT.balanceOf(employee)
        assert.equal(currentANT.minus(previousANT).toString(), 60, 'expected current ANT amount does not match')
      })
    })
  })
})
