const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const getContract = name => artifacts.require(name)
const getEvent = (receipt, event, arg) => { return receipt.logs.filter(l => l.event == event)[0].args[arg] }

contract('Payroll, accrued value,', async (accounts) => {
  const USD_DECIMALS= 18
  const USD_PRECISION = 10**USD_DECIMALS
  const SECONDS_IN_A_YEAR = 31557600 // 365.25 days
  const ETH = '0x0'
  const rateExpiryTime = 1000

  const [owner, employee1, _] = accounts
  const {
    deployErc20TokenAndDeposit,
    addAllowedTokens,
    getTimePassed,
    redistributeEth,
    getDaoFinanceVault,
    initializePayroll
  } = require('./helpers.js')(owner)
  const salary1 = 1000
  const erc20Token1Decimals = 18

  let payroll
  let ayrollBase
  let priceFeed
  let usdToken
  let erc20Token1
  let employeeId1
  let dao
  let finance
  let vault

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

    // make sure owner and Payroll have enough funds
    await redistributeEth(accounts, finance)
  })


  beforeEach(async () => {
    payroll = await initializePayroll(dao, payrollBase, finance, usdToken, priceFeed, rateExpiryTime)

    // adds allowed tokens
    await addAllowedTokens(payroll, [usdToken, erc20Token1])

    // add employee
    const r = await payroll.addEmployee(employee1, salary1)
    employeeId1 = getEvent(r, 'AddEmployee', 'employeeId')
  })

  it('adds accrued Value manually', async () => {
    const accruedValue = 50
    await payroll.addAccruedValue(employeeId1, accruedValue)
    assert.equal((await payroll.getEmployee(employeeId1))[2].toString(), accruedValue, 'Accrued Value should match')
  })

  it('fails adding an accrued Value too large', async () => {
    const accruedValue = new web3.BigNumber(await payroll.MAX_ACCRUED_VALUE()).plus(1)
    return assertRevert(async () => {
      await payroll.addAccruedValue(employeeId1, accruedValue)
    })
  })

  it('fails trying to terminate an employee in the past', async () => {
    const terminationDate = parseInt(await payroll.getTimestampPublic.call(), 10) - 1
    return assertRevert(async () => {
      await payroll.terminateEmployee(employeeId1, terminationDate)
    })
  })

  it('fails trying to re-enable employee', async () => {
    const timestamp = parseInt(await payroll.getTimestampPublic.call(), 10)
    await payroll.terminateEmployeeNow(employeeId1)
    await payroll.mockSetTimestamp(timestamp + 500);
    return assertRevert(async () => {
      await payroll.terminateEmployee(employeeId1, timestamp + SECONDS_IN_A_YEAR)
    })
  })

  it('modifies salary and payroll is computed properly, right after the change', async () => {
    const salary1_1 = salary1 * 2
    const timeDiff = 864000
    await payroll.mockAddTimestamp(timeDiff)
    await payroll.setEmployeeSalary(employeeId1, salary1_1)
    await payroll.determineAllocation([usdToken.address], [100], { from: employee1 })
    const initialBalance = await usdToken.balanceOf(employee1)
    await payroll.payday({ from: employee1 })
    const finalBalance = await usdToken.balanceOf(employee1)
    const payrollOwed = salary1 * timeDiff
    assert.equal(finalBalance - initialBalance, payrollOwed, "Payroll payed doesn't match")
  })

  it('modifies salary and payroll is computed properly, some time after the change', async () => {
    const salary1_1 = salary1 * 2
    const timeDiff = 864000
    await payroll.mockAddTimestamp(timeDiff)
    await payroll.setEmployeeSalary(employeeId1, salary1_1)
    await payroll.mockAddTimestamp(timeDiff * 2)
    await payroll.determineAllocation([usdToken.address], [100], { from: employee1 })
    const initialBalance = await usdToken.balanceOf(employee1)
    await payroll.payday({ from: employee1 })
    const finalBalance = await usdToken.balanceOf(employee1)
    const payrollOwed = salary1 * timeDiff + salary1_1 * timeDiff * 2
    assert.equal(finalBalance - initialBalance, payrollOwed, "Payroll payed doesn't match")
  })
})
