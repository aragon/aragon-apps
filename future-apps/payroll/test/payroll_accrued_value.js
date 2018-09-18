const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { deployErc20TokenAndDeposit, addAllowedTokens, getTimePassed, redistributeEth } = require('./helpers.js')

const getContract = name => artifacts.require(name)
const getEvent = (receipt, event, arg) => { return receipt.logs.filter(l => l.event == event)[0].args[arg] }

contract('Payroll, accrued value,', async (accounts) => {
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
  const erc20Token1Decimals = 18

  let employeeId1

  const root = accounts[0]
  let dao, daoFact, vaultBase, financeBase, payrollBase

  // let MAX_UINT64, ANY_ENTITY, APP_MANAGER_ROLE, CREATE_PAYMENTS_ROLE
  // let CHANGE_PERIOD_ROLE, CHANGE_BUDGETS_ROLE, EXECUTE_PAYMENTS_ROLE, DISABLE_PAYMENTS_ROLE, TRANSFER_ROLE

  before(async () => {
    const kernelBase = await getContract('Kernel').new(true) // petrify immediately
    const aclBase = await getContract('ACL').new()
    const regFact = await getContract('EVMScriptRegistryFactory').new()
    daoFact = await getContract('DAOFactory').new(kernelBase.address, aclBase.address, regFact.address)
    vaultBase = await getContract('Vault').new()
    financeBase = await getContract('Finance').new()

    console.log('1')
    payrollBase = await getContract('PayrollMock').new()
    console.log('2')


    // Setup constants
    const ETH = await financeBase.ETH()
    const MAX_UINT64 = await financeBase.MAX_UINT64()
    const ANY_ENTITY = await aclBase.ANY_ENTITY()
    const APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()

    const CREATE_PAYMENTS_ROLE = await financeBase.CREATE_PAYMENTS_ROLE()
    const CHANGE_PERIOD_ROLE = await financeBase.CHANGE_PERIOD_ROLE()
    const CHANGE_BUDGETS_ROLE = await financeBase.CHANGE_BUDGETS_ROLE()
    const EXECUTE_PAYMENTS_ROLE = await financeBase.EXECUTE_PAYMENTS_ROLE()
    const DISABLE_PAYMENTS_ROLE = await financeBase.DISABLE_PAYMENTS_ROLE()
    const TRANSFER_ROLE = await vaultBase.TRANSFER_ROLE()

    const r = await daoFact.newDAO(root)
    dao = getContract('Kernel').at(r.logs.filter(l => l.event == 'DeployDAO')[0].args.dao)
    const acl = getContract('ACL').at(await dao.acl())

    await acl.createPermission(root, dao.address, APP_MANAGER_ROLE, root, { from: root })

    // finance
    const receipt2 = await dao.newAppInstance('0x5678', financeBase.address, { from: root })
    finance = getContract('Finance').at(receipt2.logs.filter(l => l.event == 'NewAppProxy')[0].args.proxy)

    await acl.createPermission(ANY_ENTITY, finance.address, CREATE_PAYMENTS_ROLE, root, { from: root })
    await acl.createPermission(ANY_ENTITY, finance.address, CHANGE_PERIOD_ROLE, root, { from: root })
    await acl.createPermission(ANY_ENTITY, finance.address, CHANGE_BUDGETS_ROLE, root, { from: root })
    await acl.createPermission(ANY_ENTITY, finance.address, EXECUTE_PAYMENTS_ROLE, root, { from: root })
    await acl.createPermission(ANY_ENTITY, finance.address, DISABLE_PAYMENTS_ROLE, root, { from: root })

    const receipt1 = await dao.newAppInstance('0x1234', vaultBase.address, { from: root })
    vault = getContract('Vault').at(receipt1.logs.filter(l => l.event == 'NewAppProxy')[0].args.proxy)
    await acl.createPermission(finance.address, vault.address, TRANSFER_ROLE, root, { from: root })
    await vault.initialize()


    await finance.initialize(vault.address, SECONDS_IN_A_YEAR) // more than one day

    usdToken = await deployErc20TokenAndDeposit(owner, finance, vault, "USD", USD_DECIMALS)
    priceFeed = await getContract('PriceFeedMock').new()

    // Deploy ERC 20 Tokens
    erc20Token1 = await deployErc20TokenAndDeposit(owner, finance, vault, "Token 1", erc20Token1Decimals)

    // make sure owner and Payroll have enough funds
    await redistributeEth(accounts, finance)
  })

  // const newProxyPayroll = async () => {
  //
  // }

  beforeEach(async () => {
    console.log('beforeEach 1')
    const receipt = await dao.newAppInstance('0x4321', payrollBase.address, { from: root })
    console.log('beforeEach 1.1')
    payroll = getContract('PayrollMock').at(receipt.logs.filter(l => l.event == 'NewAppProxy')[0].args.proxy)
    console.log('beforeEach 2')

    // inits payroll
    await payroll.initialize(finance.address, usdToken.address, priceFeed.address, rateExpiryTime)
    console.log('beforeEach 3')

    // adds allowed tokens
    await addAllowedTokens(payroll, [usdToken, erc20Token1])
    console.log('beforeEach 4')

    // add employee
    const r = await payroll.addEmployee(employee1, salary1)
    console.log('beforeEach 5')
    employeeId1 = getEvent(r, 'AddEmployee', 'employeeId')
    console.log('beforeEach 6')
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
