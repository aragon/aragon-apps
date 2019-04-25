const PAYMENT_TYPES = require('../helpers/payment_types')
const { bn } = require('../helpers/numbers')(web3)
const { getEventArgument } = require('../helpers/events')
const { NOW, TWO_MINUTES, RATE_EXPIRATION_TIME } = require('../helpers/time')
const { deployContracts, createPayrollAndPriceFeed } = require('../helpers/deploy')(artifacts, web3)
const { USD, ETH, ETH_RATE, deployDAI, DAI_RATE, deployANT, ANT_RATE, setTokenRate } = require('../helpers/tokens.js')(artifacts, web3)

contract('Payroll rates handling,', ([owner, employee]) => {
  let dao, payroll, payrollBase, finance, vault, priceFeed, employeeId, DAI, ANT

  const increaseTime = async seconds => {
    await payroll.mockIncreaseTime(seconds)
    await priceFeed.mockIncreaseTime(seconds)
  }

  before('deploy contracts and tokens', async () => {
    ({ dao, finance, vault, payrollBase } = await deployContracts(owner))

    DAI = await deployDAI(owner, finance)
    ANT = await deployANT(owner, finance)
    await finance.deposit(ETH, bn(50, 18), 'Initial ETH deposit', { from: owner, value: bn(50, 18) })
  })

  beforeEach('initialize payroll app with USD as denomination token', async () => {
    ({ payroll, priceFeed } = await createPayrollAndPriceFeed(dao, payrollBase, owner, NOW))
    await payroll.initialize(finance.address, USD, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
  })

  describe('rates', () => {
    beforeEach('set rates and allow tokens', async () => {
      await setTokenRate(priceFeed, ETH, USD, ETH_RATE)
      await setTokenRate(priceFeed, DAI, USD, DAI_RATE)
      await setTokenRate(priceFeed, ANT, USD, ANT_RATE)

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
