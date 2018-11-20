const Payroll = artifacts.require("PayrollMock");
const { assertRevert, assertInvalidOpcode } = require('@aragon/test-helpers/assertThrow');
const { encodeCallScript } = require('@aragon/test-helpers/evmScript');
const ExecutionTarget = artifacts.require('ExecutionTarget');
const DAOFactory = artifacts.require('@aragon/os/contracts/factory/DAOFactory');
const EVMScriptRegistryFactory = artifacts.require('@aragon/os/contracts/factory/EVMScriptRegistryFactory');
const ACL = artifacts.require('@aragon/os/contracts/acl/ACL');
const Kernel = artifacts.require('@aragon/os/contracts/kernel/Kernel');

const getContract = name => artifacts.require(name)
const getEvent = (receipt, event, arg) => { return receipt.logs.filter(l => l.event == event)[0].args[arg] }

const ANY_ADDR = '0xffffffffffffffffffffffffffffffffffffffff';

contract('PayrollForward', function(accounts) {
  const [owner, employee1, employee2] = accounts
  const {
      deployErc20TokenAndDeposit,
      addAllowedTokens,
      getTimePassed,
      redistributeEth,
      getDaoFinanceVault,
      initializePayroll
  } = require('./helpers.js')(owner)

  const SECONDS_IN_A_YEAR = 31557600; // 365.25 days
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

  let unused_account = accounts[7];

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
  });

  beforeEach(async () => {
    payroll = await initializePayroll(dao, payrollBase, finance, usdToken, priceFeed, rateExpiryTime)

    // adds allowed tokens
    await addAllowedTokens(payroll, [usdToken, erc20Token1])

    // add employee
    const receipt = await payroll.addEmployeeShort(employee1, 100000, 'Kakaroto')
    employeeId1 = getEvent(receipt, 'AddEmployee', 'employeeId')
  });

  it("checks that it's forwarder", async () => {
    let result = await payroll.isForwarder.call();
    assert.equal(result.toString(), "true", "It's not forwarder");
  });

  it('forwards actions to employee', async () => {
    const executionTarget = await ExecutionTarget.new();
    const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() };
    const script = encodeCallScript([action]);

    await payroll.forward(script, { from: employee1 });
    assert.equal((await executionTarget.counter()).toString(), 1, 'should have received execution call');

    // can not forward call
    return assertRevert(async () => {
      await payroll.forward(script, { from: unused_account });
    });
  });
});
