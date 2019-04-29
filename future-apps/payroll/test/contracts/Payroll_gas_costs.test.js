const PAYMENT_TYPES = require('../helpers/payment_types')
const { annualSalaryPerSecond } = require('../helpers/numbers')(web3)
const { NOW, ONE_MONTH, RATE_EXPIRATION_TIME } = require('../helpers/time')
const { deployContracts, createPayrollAndPriceFeed } = require('../helpers/deploy')(artifacts, web3)
const { USD, deployDAI, deployANT, DAI_RATE, ANT_RATE, setTokenRates } = require('../helpers/tokens')(artifacts, web3)

contract('Payroll gas costs', ([owner, employee, anotherEmployee]) => {
  let dao, payroll, payrollBase, finance, vault, priceFeed, DAI, ANT

  before('deploy base apps and tokens', async () => {
    ({ dao, finance, vault, payrollBase } = await deployContracts(owner))
    DAI = await deployDAI(owner, finance)
    ANT = await deployANT(owner, finance)
  })

  beforeEach('create payroll and price feed instance', async () => {
    ({ payroll, priceFeed } = await createPayrollAndPriceFeed(dao, payrollBase, owner, NOW))
  })

  describe('gas costs', () => {
    beforeEach('initialize payroll app using USD as denomination token', async () => {
      await payroll.initialize(finance.address, USD, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })

      const startDate = NOW - ONE_MONTH
      const salary = annualSalaryPerSecond(100000)
      await payroll.addEmployee(employee, salary, 'Boss', startDate)
      await payroll.addEmployee(anotherEmployee, salary, 'Manager', startDate)
    })

    beforeEach('allow tokens and set rates', async () => {
      await payroll.addAllowedToken(DAI.address, { from: owner })
      await payroll.addAllowedToken(ANT.address, { from: owner })

      await setTokenRates(priceFeed, USD, [DAI, ANT], [DAI_RATE, ANT_RATE])
    })

    context('when there is only one allowed token', function () {
      it('expends ~335k gas for a single allowed token', async () => {
        await payroll.determineAllocation([DAI.address], [100], { from: employee })

        const { receipt: { cumulativeGasUsed } } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })

        assert.isBelow(cumulativeGasUsed, 335000, 'payout gas cost for a single allowed token should be ~335k')
      })
    })

    context('when there are two allowed token', function () {
      it('expends ~295k gas per allowed token', async () => {
        await payroll.determineAllocation([DAI.address], [100], { from: employee })
        const { receipt: { cumulativeGasUsed: employeePayoutGasUsed } } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })

        await payroll.determineAllocation([DAI.address, ANT.address], [60, 40], { from: anotherEmployee })
        const { receipt: { cumulativeGasUsed: anotherEmployeePayoutGasUsed } } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: anotherEmployee })

        const gasPerAllowedToken = anotherEmployeePayoutGasUsed - employeePayoutGasUsed
        assert.isBelow(gasPerAllowedToken, 295000, 'payout gas cost increment per allowed token should be ~295k')
      })
    })
  })
})
