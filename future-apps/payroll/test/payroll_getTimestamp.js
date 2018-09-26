const { assertRevert, assertInvalidOpcode } = require('@aragon/test-helpers/assertThrow')
const getContract = name => artifacts.require(name)
const getEvent = (receipt, event, arg) => { return receipt.logs.filter(l => l.event == event)[0].args[arg] }


contract('Payroll Timestamp', function(accounts) {
  const [owner, employee1, employee2] = accounts
  const {
      deployErc20TokenAndDeposit,
      addAllowedTokens,
      getTimePassed,
      redistributeEth,
      getDaoFinanceVault,
      initializePayroll
  } = require('./helpers.js')(owner)

  const SECONDS_IN_A_YEAR = 31557600 // 365.25 days
  const USD_PRECISION = 10**18
  const USD_DECIMALS= 18
  const rateExpiryTime = 1000

  let dao
  let payroll
  let payrollBase
  let finance
  let vault
  let priceFeed
  let usdToken
  let erc20Token1
  const erc20Token1Decimals = 18

  before(async () => {
    // we use here real Payroll to use getTimestamp (to achieve 100% coverage)
    payrollBase = await getContract('Payroll').new()

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

  it("deploys and initializes contract", async () => {
    const ALLOWED_TOKENS_MANAGER_ROLE = await payrollBase.ALLOWED_TOKENS_MANAGER_ROLE()
    const ADD_EMPLOYEE_ROLE = await payrollBase.ADD_EMPLOYEE_ROLE()
    const TERMINATE_EMPLOYEE_ROLE = await payrollBase.TERMINATE_EMPLOYEE_ROLE()
    const SET_EMPLOYEE_SALARY_ROLE = await payrollBase.SET_EMPLOYEE_SALARY_ROLE()
    const ADD_ACCRUED_VALUE_ROLE = await payrollBase.ADD_ACCRUED_VALUE_ROLE()
    const CHANGE_PRICE_FEED_ROLE = await payrollBase.CHANGE_PRICE_FEED_ROLE()
    const MODIFY_RATE_EXPIRY_ROLE = await payrollBase.MODIFY_RATE_EXPIRY_ROLE()

    const receipt = await dao.newAppInstance('0x4321', payrollBase.address, { from: owner })
    payroll = getContract('Payroll').at(getEvent(receipt, 'NewAppProxy', 'proxy'))

    const acl = await getContract('ACL').at(await dao.acl())
    const ANY_ENTITY = await acl.ANY_ENTITY()
    await acl.createPermission(ANY_ENTITY, payroll.address, ALLOWED_TOKENS_MANAGER_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, payroll.address, ADD_EMPLOYEE_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, payroll.address, TERMINATE_EMPLOYEE_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, payroll.address, SET_EMPLOYEE_SALARY_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, payroll.address, ADD_ACCRUED_VALUE_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, payroll.address, CHANGE_PRICE_FEED_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, payroll.address, MODIFY_RATE_EXPIRY_ROLE, owner, { from: owner })

    await payroll.initialize(finance.address, usdToken.address, priceFeed.address, rateExpiryTime)
  })

  const convertAndRoundSalary = function (a) {
    return Math.floor(a / SECONDS_IN_A_YEAR) * SECONDS_IN_A_YEAR
  }

  it("adds employee", async () => {
    let name = ''
    let salary1 = 100000 * USD_PRECISION

    const r = await payroll.addEmployee(employee1, salary1)
    let employeeId1 = getEvent(r, 'AddEmployee', 'employeeId')

    let employee = await payroll.getEmployee(employeeId1)
    assert.equal(employee[0], employee1, "Employee account doesn't match")
    assert.equal(employee[1].toString(), convertAndRoundSalary(salary1), "Employee salary doesn't match")
    assert.equal(employee[3], name, "Employee name doesn't match")
  })

  it("adds employee with name", async () => {
    let name = 'employee2'
    let salary2 = 100000 * USD_PRECISION

    const r = await payroll.addEmployeeWithName(employee2, salary2, name)
    let employeeId2 = getEvent(r, 'AddEmployee', 'employeeId')

    let employee = await payroll.getEmployee(employeeId2)
    assert.equal(employee[0], employee2, "Employee account doesn't match")
    assert.equal(employee[1].toString(), convertAndRoundSalary(salary2), "Employee salary doesn't match")
    assert.equal(employee[3], name, "Employee name doesn't match")
  })

})
