const PAYMENT_TYPES = require('../helpers/payment_types')
const { annualSalaryPerSecond } = require('../helpers/numbers')(web3)
const { NOW, ONE_MONTH, RATE_EXPIRATION_TIME } = require('../helpers/time')
const { deployContracts, createPayrollAndPriceFeed } = require('../helpers/deploy')(artifacts, web3)
const { USD, deployDAI, deployANT, DAI_RATE, ANT_RATE, inverseRate, setTokenRates } = require('../helpers/tokens')(artifacts, web3)

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
      await payroll.addEmployee(employee, salary, startDate, 'Boss')
      await payroll.addEmployee(anotherEmployee, salary, startDate, 'Manager')
    })

    beforeEach('allow tokens and set rates', async () => {
      await payroll.setAllowedToken(DAI.address, true, { from: owner })
      await payroll.setAllowedToken(ANT.address, true, { from: owner })

      await setTokenRates(priceFeed, USD, [DAI, ANT], [DAI_RATE, ANT_RATE])
    })

    context('when there is only one allowed token', function () {
      it('expends ~337k gas for a single allowed token', async () => {
        await payroll.determineAllocation([DAI.address], [100], { from: employee })

        const { receipt: { cumulativeGasUsed } } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, [], { from: employee })

        console.log('cumulativeGasUsed:', cumulativeGasUsed)
        assert.isAtMost(cumulativeGasUsed, 337000, 'payout gas cost for a single allowed token should be ~338k')
      })
    })

    context('when there are two allowed token', function () {
      it('expends ~49k gas in setting a allocation tokens per token', async () => {
        const { receipt: { cumulativeGasUsed: oneTokenAllocationGasUsed } } = await payroll.determineAllocation([DAI.address], [100], { from: employee })
        const { receipt: { cumulativeGasUsed: twoTokensAllocationGasUsed } } = await payroll.determineAllocation([DAI.address, ANT.address], [60, 40], { from: anotherEmployee })

        const gasPerAllocationToken = twoTokensAllocationGasUsed - oneTokenAllocationGasUsed
        console.log('gasPerAllocationToken:', gasPerAllocationToken)
        assert.isAtMost(gasPerAllocationToken, 49000, 'gas cost increment of setting allocation token sets should be ~49k per token')
      })

      it('expends ~30k gas in overwriting an allocation set per token', async () => {
        await payroll.determineAllocation([DAI.address], [100], { from: employee })
        const { receipt: { cumulativeGasUsed: oneTokenAllocationOverwriteGasUsed } } = await payroll.determineAllocation([ANT.address], [100], { from: employee })

        await payroll.determineAllocation([DAI.address, ANT.address], [60, 40], { from: anotherEmployee })
        const { receipt: { cumulativeGasUsed: twoTokensAllocationOverwriteGasUsed } } = await payroll.determineAllocation([DAI.address, ANT.address], [40, 60], { from: anotherEmployee })

        const gasPerAllocationToken = twoTokensAllocationOverwriteGasUsed - oneTokenAllocationOverwriteGasUsed
        console.log('gasPerAllocationToken:', gasPerAllocationToken)
        assert.isAtMost(gasPerAllocationToken, 30000, 'gas cost increment of overwriting allocation token sets should be ~30k per token')
      })

      it('expends ~295k gas in payday per allowed token', async () => {
        await payroll.determineAllocation([DAI.address], [100], { from: employee })
        const { receipt: { cumulativeGasUsed: employeePayoutGasUsed } } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, [], { from: employee })

        await payroll.determineAllocation([DAI.address, ANT.address], [60, 40], { from: anotherEmployee })
        const { receipt: { cumulativeGasUsed: anotherEmployeePayoutGasUsed } } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, [], { from: anotherEmployee })

        const gasPerAllowedToken = anotherEmployeePayoutGasUsed - employeePayoutGasUsed
        console.log('gasPerAllowedToken:', gasPerAllowedToken)
        assert.isAtMost(gasPerAllowedToken, 295000, 'payroll payday gas cost increment per allowed token should be ~295k')
      })
    })
  })
})
