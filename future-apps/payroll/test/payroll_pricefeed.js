const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const getBalance = require('@aragon/test-helpers/balance')(web3)
const getTransaction = require('@aragon/test-helpers/transaction')(web3)

const getContract = name => artifacts.require(name)
const getEvent = (receipt, event, arg) => { return receipt.logs.filter(l => l.event == event)[0].args[arg] }

contract('Payroll, price feed,', function(accounts) {
  const USD_DECIMALS = 18
  const USD_PRECISION = 10 ** USD_DECIMALS
  const SECONDS_IN_A_YEAR = 31557600 // 365.25 days
  const ONE = 1e18
  const ETH = "0x0"
  const rateExpiryTime = 1000

  const [owner, employee] = accounts
  const unused_account = accounts[7]
  const {
    deployErc20TokenAndDeposit,
    addAllowedTokens,
    getTimePassed,
    redistributeEth,
    getDaoFinanceVault,
    initializePayroll
  } = require("./helpers.js")(owner)

  let salary = (new web3.BigNumber(10000)).times(USD_PRECISION).dividedToIntegerBy(SECONDS_IN_A_YEAR)

  let usdToken
  let erc20Token1
  let erc20Token1ExchangeRate
  const erc20Token1Decimals = 20
  let erc20Token2;
  const erc20Token2Decimals = 16;
  let etherExchangeRate

  let payroll
  let payrollBase
  let priceFeed
  let employeeId
  let dao
  let finance
  let vault

  before(async () => {
    payrollBase = await getContract("PayrollMock").new()

    const daoAndFinance = await getDaoFinanceVault()

    dao = daoAndFinance.dao
    finance = daoAndFinance.finance
    vault = daoAndFinance.vault

    usdToken = await deployErc20TokenAndDeposit(owner, finance, vault, "USD", USD_DECIMALS)
    priceFeed = await getContract("PriceFeedMock").new()

    // Deploy ERC 20 Tokens
    erc20Token1 = await deployErc20TokenAndDeposit(owner, finance, vault, "Token 1", erc20Token1Decimals)
    erc20Token2 = await deployErc20TokenAndDeposit(owner, finance, vault, "Token 2", erc20Token2Decimals);

    // make sure owner and Payroll have enough funds
    await redistributeEth(accounts, finance)
  })

  beforeEach(async () => {
    payroll = await initializePayroll(
      dao,
      payrollBase,
      finance,
      usdToken,
      priceFeed,
      rateExpiryTime
    )

    // adds allowed tokens
    await addAllowedTokens(payroll, [usdToken, erc20Token1])
  })

  it('fails to pay if rates are obsolete', async () => {
    // add employee
    const startDate = parseInt(await payroll.getTimestampPublic.call(), 10) - 2628005 // now minus 1/12 year
    const r = await payroll.addEmployee(employee, salary, "Kakaroto", startDate)
    const employeeId = getEvent(r, 'AddEmployee', 'employeeId')

    const usdTokenAllocation = 50
    const erc20Token1Allocation = 20
    const ethAllocation = 100 - usdTokenAllocation - erc20Token1Allocation
    // determine allocation
    await payroll.determineAllocation([ETH, usdToken.address, erc20Token1.address], [ethAllocation, usdTokenAllocation, erc20Token1Allocation], {from: employee})
    await getTimePassed(payroll, employeeId)
    // set old date in price feed
    const oldTime = parseInt(await payroll.getTimestampPublic(), 10) - rateExpiryTime - 1
    await priceFeed.mockSetTimestamp(oldTime)
    // call payday
    return assertRevert(async () => {
      await payroll.payday({from: employee})
    })
  })

  it('fails to change the price feed time to 0', async () => {
    return assertRevert(async () => {
      await payroll.setPriceFeed('0x0')
    })
  })

  it('changes the rate expiry time', async () => {
    const newTime = rateExpiryTime * 2
    await payroll.setRateExpiryTime(newTime)
    assert.equal(await payroll.rateExpiryTime(), newTime)
  })

  it('fails to change the rate expiry time to 0', async () => {
    const newTime = 0
    return assertRevert(async () => {
      await payroll.setRateExpiryTime(newTime)
    })
  })
})
