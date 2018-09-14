const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const getBalance = require('@aragon/test-helpers/balance')(web3)
const getTransaction = require('@aragon/test-helpers/transaction')(web3)

const getContract = name => artifacts.require(name)
const getEvent = (receipt, event, arg) => { return receipt.logs.filter(l => l.event == event)[0].args[arg] }

const { deployErc20TokenAndDeposit, addAllowedTokens, getTimePassed } = require('./helpers.js')

contract('Payroll, modifying employees,', function(accounts) {
  const rateExpiryTime = 1000
  const USD_DECIMALS= 18
  const USD_PRECISION = 10**USD_DECIMALS
  const SECONDS_IN_A_YEAR = 31557600 // 365.25 days
  const ONE = 1e18
  const ETH = '0x0'
  let payroll
  let finance
  let vault
  let priceFeed

  let owner = accounts[0]
  let employee1_1 = accounts[1]
  let employee1_2 = accounts[2]
  let employee2 = accounts[3]
  let unused_account = accounts[7]
  let salary1 = (new web3.BigNumber(100000)).times(USD_PRECISION).dividedToIntegerBy(SECONDS_IN_A_YEAR)
  let salary2 = (new web3.BigNumber(120000)).times(USD_PRECISION).dividedToIntegerBy(SECONDS_IN_A_YEAR)

  let usdToken
  let erc20Token1
  const erc20Token1Decimals = 18

  let employeeId

  before(async () => {
    vault = await getContract('Vault').new()
    await vault.initializeWithBase(vault.address)
    finance = await getContract('Finance').new()
    await finance.initialize(vault.address, SECONDS_IN_A_YEAR) // more than one day

    usdToken = await deployErc20TokenAndDeposit(owner, finance, vault, "USD", USD_DECIMALS)
    priceFeed = await getContract('PriceFeedMock').new()

    // Deploy ERC 20 Tokens
    erc20Token1 = await deployErc20TokenAndDeposit(owner, finance, vault, "Token 1", erc20Token1Decimals)
  })

  beforeEach(async () => {
    payroll = await getContract('PayrollMock').new()

    // inits payroll
    await payroll.initialize(finance.address, usdToken.address, priceFeed.address, rateExpiryTime)

    // adds allowed tokens
    await addAllowedTokens(payroll, [usdToken, erc20Token1])

    // add employee
    const r = await payroll.addEmployee(employee1_1, salary1)
    employeeId = getEvent(r, 'AddEmployee', 'employeeId')
  })

  it("modifies employee salary", async () => {
    await payroll.setEmployeeSalary(employeeId, salary2);
    let employee = await payroll.getEmployee(employeeId);
    assert.equal(employee[1].toString(), salary2.toString(), "Salary doesn't match");
  });

  it("fails modifying non-existent employee salary", async () => {
    return assertRevert(async () => {
      await payroll.setEmployeeSalary(employeeId + 10, salary2);
    });
  });

  it("fails modifying employee account address by Employee, for already existent account", async () => {
    // add another employee
    await payroll.addEmployee(employee2, salary1)
    // try to use account from this other employee
    let account_old = employee1_1;
    let account_new = employee2;
    return assertRevert(async () => {
      await payroll.changeAddressByEmployee(account_new, {from: account_old});
    });
  });

  it("fails modifying employee account address by Employee, for null account", async () => {
    let account_old = employee1_1;
    let account_new = "0x0";
    return assertRevert(async () => {
      await payroll.changeAddressByEmployee(account_new, {from: account_old});
    });
  });

  it("fails modifying employee account address by non Employee", async () => {
    let account_new = employee1_2;
    return assertRevert(async () => {
      await payroll.changeAddressByEmployee(account_new, {from: unused_account});
    });
  });

  it("modifies employee account address by Employee", async () => {
    let account_old = employee1_1;
    let account_new = employee1_2;
    let employeeId = 1;
    await payroll.changeAddressByEmployee(account_new, {from: account_old});
    let employee = await payroll.getEmployee(employeeId);
    assert.equal(employee[0], account_new, "Employee account doesn't match");
  });
})
