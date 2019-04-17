const PAYMENT_TYPES = require('../helpers/payment_types')
const setTokenRates = require('../helpers/set_token_rates')(web3)
const { annualSalaryPerSecond } = require('../helpers/numbers')(web3)
const { deployErc20TokenAndDeposit, deployContracts, createPayrollAndPriceFeed } = require('../helpers/deploy.js')(artifacts, web3)

contract('Payroll gas costs', ([owner, employee, anotherEmployee]) => {
  let dao, payroll, payrollBase, finance, vault, priceFeed, denominationToken

  const NOW = 1553703809 // random fixed timestamp in seconds
  const ONE_MONTH = 60 * 60 * 24 * 31
  const TWO_MONTHS = ONE_MONTH * 2
  const RATE_EXPIRATION_TIME = TWO_MONTHS

  const TOKEN_DECIMALS = 18

  before('deploy base apps and tokens', async () => {
    ({ dao, finance, vault, payrollBase } = await deployContracts(owner))
    denominationToken = await deployErc20TokenAndDeposit(owner, finance, 'Denomination Token', TOKEN_DECIMALS)
  })

  beforeEach('create payroll and price feed instance', async () => {
    ({ payroll, priceFeed } = await createPayrollAndPriceFeed(dao, payrollBase, owner, NOW))
  })

  describe('gas costs', () => {
    let erc20Token1, erc20Token2

    before('deploy more tokens', async () => {
      erc20Token1 = await deployErc20TokenAndDeposit(owner, finance, 'Token 1', 16)
      erc20Token2 = await deployErc20TokenAndDeposit(owner, finance, 'Token 2', 18)
    })

    beforeEach('initialize payroll app', async () => {
      await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      await payroll.mockSetTimestamp(NOW)

      const startDate = NOW - ONE_MONTH
      const salary = annualSalaryPerSecond(100000, TOKEN_DECIMALS)
      await payroll.addEmployee(employee, salary, 'Boss', startDate)
      await payroll.addEmployee(anotherEmployee, salary, 'Manager', startDate)
    })

    context('when there are not allowed tokens yet', function () {
      it('expends ~314k gas for a single allowed token', async () => {
        await payroll.addAllowedToken(denominationToken.address)
        await payroll.determineAllocation([denominationToken.address], [100], { from: employee })

        const { receipt: { cumulativeGasUsed } } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })

        assert.isBelow(cumulativeGasUsed, 317000, 'payout gas cost for a single allowed token should be ~314k')
      })
    })

    context('when there are some allowed tokens', function () {
      const erc20Token1Rate = 2, erc20Token2Rate = 5

      beforeEach('allow tokens and set rates', async () => {
        await payroll.addAllowedToken(denominationToken.address, { from: owner })
        await payroll.addAllowedToken(erc20Token1.address, { from: owner })
        await payroll.addAllowedToken(erc20Token2.address, { from: owner })
        await setTokenRates(priceFeed, denominationToken, [erc20Token1, erc20Token2], [erc20Token1Rate, erc20Token2Rate])
      })

      it('expends ~270k gas per allowed token', async () => {
        await payroll.determineAllocation([denominationToken.address, erc20Token1.address], [60, 40], { from: employee })
        const { receipt: { cumulativeGasUsed: employeePayoutGasUsed } } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })

        await payroll.determineAllocation([denominationToken.address, erc20Token1.address, erc20Token2.address], [65, 25, 10], { from: anotherEmployee })
        const { receipt: { cumulativeGasUsed: anotherEmployeePayoutGasUsed } } = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: anotherEmployee })

        const gasPerAllowedToken = anotherEmployeePayoutGasUsed - employeePayoutGasUsed
        assert.isBelow(gasPerAllowedToken, 280000, 'payout gas cost increment per allowed token should be ~270k')
      })
    })
  })
})
