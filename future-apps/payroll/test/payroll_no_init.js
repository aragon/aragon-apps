const { assertRevert } = require('@aragon/test-helpers/assertThrow');
const getContract = name => artifacts.require(name)
const getEvent = (receipt, event, arg) => {
  return receipt.logs.filter(l => l.event == event)[0].args[arg]
}

contract('Payroll, without init,', function(accounts) {
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
  let payrollBase
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

    const receipt = await dao.newAppInstance('0x4321', payrollBase.address, '0x', false, { from: owner })
    payroll = getContract('PayrollMock').at(getEvent(receipt, 'NewAppProxy', 'proxy'))
  })

  it('fails to call setPriceFeed', async () => {
    return assertRevert(async () => {
      await payroll.setPriceFeed(priceFeed.address)
    })
  })

  it('fails to call setRateExpiryTime', async () => {
    return assertRevert(async () => {
      await payroll.setRateExpiryTime(1000)
    })
  })

  it('fails to call addAllowedToken', async () => {
    return assertRevert(async () => {
      await payroll.addAllowedToken(erc20Token1.address)
    })
  })

  it('fails to call addEmployee', async () => {
    return assertRevert(async () => {
      const startDate = Math.floor((new Date()).getTime() / 1000)
      await payroll.addEmployee(employee1, 10000, 'Kakaroto', startDate)
    })
  })

  it('fails to call setEmployeeSalary', async () => {
    return assertRevert(async () => {
      await payroll.setEmployeeSalary(1, 20000)
    })
  })

  it('fails to call terminateEmployee', async () => {
    return assertRevert(async () => {
      await payroll.terminateEmployee(1, await payroll.getTimestampPublic.call())
    })
  })

  it('fails to call determineAllocation', async () => {
    return assertRevert(async () => {
      await payroll.determineAllocation([erc20Token1.address], [100], { from: employee1 })
    })
  })

  it('fails to call payday', async () => {
    return assertRevert(async () => {
      await payroll.payday({ from: employee1 })
    })
  })

  it('fails to call changeAddressByEmployee', async () => {
    return assertRevert(async () => {
      await payroll.changeAddressByEmployee(owner, { from: employee1 })
    })
  })

  it('fails to call addAccruedValue', async () => {
    return assertRevert(async () => {
      await payroll.addAccruedValue(1, 1000)
    })
  })
})
