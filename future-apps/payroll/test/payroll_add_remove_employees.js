const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const getBalance = require('@aragon/test-helpers/balance')(web3)
const getTransaction = require('@aragon/test-helpers/transaction')(web3)

const getContract = name => artifacts.require(name)

contract('Payroll, adding and removing employees,', function(accounts) {
  const [owner, employee1, employee2] = accounts
  const {
    deployErc20TokenAndDeposit,
    addAllowedTokens,
    getTimePassed,
    getDaoFinanceVault,
    initializePayroll
  } = require('./helpers.js')(owner)

  const rateExpiryTime = 1000
  const USD_DECIMALS= 18
  const USD_PRECISION = 10**USD_DECIMALS
  const SECONDS_IN_A_YEAR = 31557600 // 365.25 days
  const ONE = 1e18
  const ETH = '0x0'

  let payroll
  let payrollBase
  let finance
  let vault
  let priceFeed
  let salary1 = (new web3.BigNumber(100000)).times(USD_PRECISION).dividedToIntegerBy(SECONDS_IN_A_YEAR)
  let salary2_1 = (new web3.BigNumber(120000)).times(USD_PRECISION).dividedToIntegerBy(SECONDS_IN_A_YEAR)
  let salary2_2 = (new web3.BigNumber(125000)).times(USD_PRECISION).dividedToIntegerBy(SECONDS_IN_A_YEAR)
  let usdToken
  let erc20Token1
  let dao
  const erc20Token1Decimals = 18
  const nowMock = new Date().getTime()

  before(async () => {
    payrollBase = await getContract('PayrollMock').new()

    const daoAndFinance = await getDaoFinanceVault()

    dao = daoAndFinance.dao
    finance = daoAndFinance.finance
    vault = daoAndFinance.vault

    usdToken = await deployErc20TokenAndDeposit(owner, finance, vault, "USD", USD_DECIMALS)
    priceFeed = await getContract('PriceFeedMock').new()

    // Deploy ERC 20 Tokens
    erc20Token1 = await deployErc20TokenAndDeposit(owner, finance, vault, "Token 1", erc20Token1Decimals)

    payroll = await initializePayroll(dao, payrollBase, finance, usdToken, priceFeed, rateExpiryTime)
    await payroll.mockSetTimestamp(nowMock)

    // adds allowed tokens
    await addAllowedTokens(payroll, [usdToken, erc20Token1])
  })

  it("adds employee", async () => {
    let name = ''
    let employeeId = 1
    let payrollTimestamp = (await payroll.getTimestampPublic()).toString()

    await payroll.addEmployee(employee1, salary1)
    let employee = await payroll.getEmployee(employeeId)

    assert.equal(employee[0], employee1, "Employee account doesn't match")
    assert.equal(employee[1].toString(), salary1.toString(), "Employee salary doesn't match")
    assert.equal(employee[2].toString(), 0, "Employee accrued value doesn't match")
    assert.equal(employee[3], name, "Employee name doesn't match")
    assert.equal(employee[4].toString(), payrollTimestamp, "last payroll should match")
    assert.equal(employee[5].toString(), payrollTimestamp, "start date should match")
  })

  it('get employee by its address', async () => {
    let name = ''
    let employeeId = 1
    let payrollTimestamp = (await payroll.getTimestampPublic()).toString()

    let employee = await payroll.getEmployeeByAddress(employee1)

    assert.equal(employee[0], employeeId, "Employee Id doesn't match")
    assert.equal(employee[1].toString(), salary1.toString(), "Employee salary doesn't match")
    assert.equal(employee[2].toString(), 0, "Employee accrued value doesn't match")
    assert.equal(employee[3], name, "Employee name doesn't match")
    assert.equal(employee[4].toString(), payrollTimestamp, "last payroll should match")
    assert.equal(employee[5].toString(), payrollTimestamp, "start date should match")
  })

  it("fails adding again same employee", async () => {
    return assertRevert(async () => {
      await payroll.addEmployee(employee1, salary1)
    })
  })

  it("adds employee with name", async () => {
    let name = 'Joe'
    let employeeId = 2

    await payroll.addEmployeeWithName(employee2, salary2_1, name)
    let employee = await payroll.getEmployee(employeeId)

    assert.equal(employee[0], employee2, "Employee account doesn't match")
    assert.equal(employee[1].toString(), salary2_1.toString(), "Employee salary doesn't match")
    assert.equal(employee[3], name, "Employee name doesn't match")
  })

  it("terminates employee with remaining payroll", async () => {
    let employeeId = 2
    await payroll.determineAllocation([usdToken.address], [100], {from: employee2})
    let initialBalance = await usdToken.balanceOf(employee2)
    let timePassed = 1000
    await payroll.mockAddTimestamp(timePassed)
    let owed = salary2_1.times(timePassed)
    await payroll.terminateEmployee(employeeId, await payroll.getTimestampPublic.call())
    await payroll.mockAddTimestamp(timePassed)
    // owed salary is only added to accrued value, employee need to call `payday` again
    let finalBalance = await usdToken.balanceOf(employee2)
    assert.equal(finalBalance.toString(), initialBalance.toString())
    await payroll.payday({ from: employee2 })
    finalBalance = await usdToken.balanceOf(employee2)
    assert.equal(finalBalance.toString(), initialBalance.add(owed).toString())
  })

  it("fails on removing non-existent employee", async () => {
    return assertRevert(async () => {
      await payroll.terminateEmployee(10, await payroll.getTimestampPublic.call())
    })
  })

  it("adds removed employee again (with name and start date)", async () => {
    let name = 'John'
    let employeeId = 3
    let payrollTimestamp = (await payroll.getTimestampPublic()).toString()
    let startDate = Math.floor((new Date()).getTime() / 1000) - 2628600

    await payroll.addEmployeeWithNameAndStartDate(employee2, salary2_2, name, startDate)
    let employee = await payroll.getEmployee(employeeId)

    assert.equal(employee[0], employee2, "Employee account doesn't match")
    assert.equal(employee[1].toString(), salary2_2.toString(), "Employee salary doesn't match")
    assert.equal(employee[3], name, "Employee name doesn't match")
    assert.equal(employee[4].toString(), startDate, "last payroll should match")
    assert.equal(employee[5].toString(), startDate, "start date should match")
  })
})
