const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { deployErc20Token, addAllowedTokens, getTimePassed } = require('./helpers.js')

const getContract = name => artifacts.require(name)
const getEvent = (receipt, event, arg) => { return receipt.logs.filter(l => l.event == event)[0].args[arg] }

contract('Payroll - accrued value', async (accounts) => {
  const USD_DECIMALS= 18
  const USD_PRECISION = 10**USD_DECIMALS
  const SECONDS_IN_A_YEAR = 31557600 // 365.25 days
  const ETH = '0x0'
  const rateExpiryTime = 1000

  const [owner, employee1, _] = accounts
  //const owner = accounts[0]
  //const employee1 = accounts[1]
  const salary1 = 1000

  let payroll
  let finance
  let vault
  let priceFeed

  let usdToken
  let erc20Token1
  let erc20Token1ExchangeRate
  const erc20Token1Decimals = 18
  let etherExchangeRate

  let employeeId1

  before(async () => {
    vault = await getContract('Vault').new()
    await vault.initializeWithBase(vault.address)
    finance = await getContract('Finance').new()
    await finance.initialize(vault.address, SECONDS_IN_A_YEAR) // more than one day

    usdToken = await deployErc20Token(owner, finance, vault, "USD", USD_DECIMALS)
    priceFeed = await getContract('PriceFeedMock').new()

    // Deploy ERC 20 Tokens
    erc20Token1 = await deployErc20Token(owner, finance, vault, "Token 1", erc20Token1Decimals)

    // get exchange rates
    erc20Token1ExchangeRate = (await priceFeed.get(usdToken.address, erc20Token1.address))[0]
    etherExchangeRate = (await priceFeed.get(usdToken.address, ETH))[0]

    // transfer ETH to Payroll contract
    for (let i = 1; i < 9; i++)
      await finance.sendTransaction({ from: accounts[i], value: web3.toWei(90, 'ether') })
  })

  beforeEach(async () => {
    payroll = await getContract('PayrollMock').new()

    // initis payroll
    await payroll.initialize(finance.address, usdToken.address, priceFeed.address, rateExpiryTime)

    // adds allowed tokens
    await addAllowedTokens(payroll, [usdToken, erc20Token1])

    // add employee
    const r = await payroll.addEmployee(employee1, salary1)
    employeeId1 = getEvent(r, 'AddEmployee', 'employeeId')
  })

  it('Adds accrued Value manually', async () => {
    const accruedValue = 50
    await payroll.addAccruedValue(employeeId1, accruedValue)
    assert.equal((await payroll.getEmployee(employeeId1))[2].toString(), accruedValue, 'Accrued Value should match')
  })

  it('Fails trying to terminate an employee in the past', async () => {
    const terminationDate = parseInt(await payroll.getTimestampPublic.call(), 10) - 1
    return assertRevert(async () => {
      await payroll.terminateEmployee(employeeId1, terminationDate)
    })
  })

  it('Fails trying to re-enable employee', async () => {
    const timestamp = parseInt(await payroll.getTimestampPublic.call(), 10)
    await payroll.terminateEmployeeNow(employeeId1)
    await payroll.mockSetTimestamp(timestamp + 500);
    return assertRevert(async () => {
      await payroll.terminateEmployee(employeeId1, timestamp + SECONDS_IN_A_YEAR)
    })
    assert.isTrue(0)
  })

  it('Fails trying to modify employee salary in the past', async () => {
    const changeDate = parseInt(await payroll.getTimestampPublic.call(), 10) - 1
    return assertRevert(async () => {
      await payroll.setEmployeeSalary(employeeId1, 2000, changeDate)
    })
  })

  it('modifies salary and payroll is computed properly', async () => {
    const salary1_1 = salary1 * 2
    const timeDiff = 864000
    const timestamp = parseInt(await payroll.getTimestampPublic.call(), 10)
    await payroll.setEmployeeSalary(employeeId1, salary1_1, timestamp + timeDiff)
    await payroll.mockAddTimestamp(timeDiff * 3)
    await payroll.determineAllocation([usdToken.address], [100], { from: employee1 })
    const initialBalance = await usdToken.balanceOf(employee1)
    await payroll.payday({ from: employee1 })
    const finalBalance = await usdToken.balanceOf(employee1)
    const payrollOwed = salary1 * timeDiff + salary1_1 * timeDiff * 2
    assert.equal(finalBalance - initialBalance, payrollOwed, "Payroll payed doesn't match")
  })
})
