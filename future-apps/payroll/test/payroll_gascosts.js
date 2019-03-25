const getContract = name => artifacts.require(name)

contract('Payroll, payday gas costs,', function(accounts) {
  const ETH = '0x0'
  const USD_DECIMALS = 18
  const USD_PRECISION = 10 ** USD_DECIMALS
  const SECONDS_IN_A_YEAR = 31557600 // 365.25 days
  const RATE_EXPIRATION_TIME = 1000

  let payroll, payrollBase, priceFeed, dao, finance, startDate, vault
  let usdToken, erc20Token1, erc20Token2, erc20Token1ExchangeRate, erc20Token2ExchangeRate, etherExchangeRate

  const [owner, employee, anotherEmployee] = accounts
  const { deployErc20TokenAndDeposit, addAllowedTokens, redistributeEth, getDaoFinanceVault, initializePayroll } = require('./helpers.js')(owner)

  const erc20Token1Decimals = 20
  const erc20Token2Decimals = 16;

  const nowMock = new Date().getTime()

  before(async () => {
    payrollBase = await getContract('PayrollMock').new()

    const daoAndFinance = await getDaoFinanceVault()

    dao = daoAndFinance.dao
    finance = daoAndFinance.finance
    vault = daoAndFinance.vault

    usdToken = await deployErc20TokenAndDeposit(owner, finance, vault, 'USD', USD_DECIMALS)
    priceFeed = await getContract('PriceFeedMock').new()
    priceFeed.mockSetTimestamp(nowMock)

    // Deploy ERC 20 Tokens
    erc20Token1 = await deployErc20TokenAndDeposit(owner, finance, vault, 'Token 1', erc20Token1Decimals)
    erc20Token2 = await deployErc20TokenAndDeposit(owner, finance, vault, 'Token 2', erc20Token2Decimals);

    // get exchange rates
    etherExchangeRate = (await priceFeed.get(usdToken.address, ETH))[0]
    erc20Token1ExchangeRate = (await priceFeed.get(usdToken.address, erc20Token1.address))[0]
    erc20Token2ExchangeRate = (await priceFeed.get(usdToken.address, erc20Token2.address))[0]

    // make sure owner and Payroll have enough funds
    await redistributeEth(accounts, finance)
  })

  beforeEach(async () => {
    payroll = await initializePayroll(dao, payrollBase, finance, usdToken, priceFeed, RATE_EXPIRATION_TIME)
    
    await payroll.mockSetTimestamp(nowMock)
    startDate = parseInt(await payroll.getTimestampPublic.call(), 10) - 2628005 // now minus 1/12 year

    const salary = (new web3.BigNumber(10000)).times(USD_PRECISION).dividedToIntegerBy(SECONDS_IN_A_YEAR)
    await payroll.addEmployee(employee, salary, 'John Doe', 'Boss', startDate)
    await payroll.addEmployee(anotherEmployee, salary, 'John Doe Jr.', 'Manager', startDate)
  })

  context('when there are not allowed tokens yet', function () {
    it('expends ~314k gas for a single allowed token', async () => {
      await payroll.addAllowedToken(usdToken.address)
      await payroll.determineAllocation([usdToken.address], [100], { from: employee })

      const { receipt: { cumulativeGasUsed } } = await payroll.payday({ from: employee })

      assert(cumulativeGasUsed > 312000 && cumulativeGasUsed < 317000, 'payout gas cost for a single allowed token should be ~314k')
    })
  })

  context('when there are some allowed tokens', function () {
    beforeEach('allow some tokens', async () => {
      await addAllowedTokens(payroll, [usdToken, erc20Token1, erc20Token2])
    })

    it('expends ~260k gas per allowed token', async () => {
      await payroll.determineAllocation([ETH, usdToken.address, erc20Token1.address], [15, 60, 25], { from: employee })
      const { receipt: { cumulativeGasUsed: employeePayoutGasUsed } } = await payroll.payday({ from: employee })

      await payroll.determineAllocation([ETH, usdToken.address, erc20Token1.address, erc20Token2.address], [15, 50, 25, 10], { from: anotherEmployee })
      const { receipt: { cumulativeGasUsed: anotherEmployeePayoutGasUsed } } = await payroll.payday({ from: anotherEmployee })

      const gasPerAllowedToken = anotherEmployeePayoutGasUsed - employeePayoutGasUsed
      assert.isTrue(gasPerAllowedToken > 250000 && gasPerAllowedToken < 270000, 'payout gas cost increment per allowed token should be ~260k')
    })
  })
})
