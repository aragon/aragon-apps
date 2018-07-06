const { assertRevert, assertInvalidOpcode } = require('@aragon/test-helpers/assertThrow');
const getBalance = require('@aragon/test-helpers/balance')(web3);
const Payroll = artifacts.require("Payroll");
const Vault = artifacts.require('Vault');
const Finance = artifacts.require('Finance');
const PriceFeedMock = artifacts.require("./feed/PriceFeedMock.sol");
const MiniMeToken = artifacts.require('@aragon/os/contracts/common/MiniMeToken');
const Zombie = artifacts.require("Zombie.sol");

// we use here real Payroll to use getTimestamp (to achieve 100% coverage)

contract('Payroll Timestamp', function(accounts) {
  let payroll;
  let finance;
  let vault;
  let owner = accounts[0];
  let priceFeed;
  let employee1_1 = accounts[2];
  let employee1 = employee1_1;
  let usdToken;
  const rateExpiryTime = 1000
  const USD_PRECISION = 10**18;
  const SECONDS_IN_A_YEAR = 31557600; // 365.25 days

  const deployErc20Token = async (name="ERC20Token") => {
    let token = await MiniMeToken.new("0x0", "0x0", 0, name, 18, 'E20', true); // dummy parameters for minime
    let amount = new web3.BigNumber(10**9).times(new web3.BigNumber(10**18));
    let sender = owner;
    let receiver = finance.address;
    let initialSenderBalance = await token.balanceOf(sender);
    let initialVaultBalance = await token.balanceOf(vault.address);
    await token.generateTokens(sender, amount);
    await token.approve(receiver, amount, {from: sender});
    await finance.deposit(token.address, amount, "Initial deployment", {from: sender});
    assert.equal((await token.balanceOf(sender)).toString(), initialSenderBalance.toString());
    assert.equal((await token.balanceOf(vault.address)).toString(), (new web3.BigNumber(initialVaultBalance).plus(amount)).toString());
    return token;
  };

  it("deploys and initializes contract", async () => {
    vault = await Vault.new();
    await vault.initializeWithBase(vault.address)
    finance = await Finance.new();
    await finance.initialize(vault.address, SECONDS_IN_A_YEAR); // more than one day
    payroll = await Payroll.new();
    usdToken = await deployErc20Token("USD");
    priceFeed = await PriceFeedMock.new();
    await payroll.initialize(finance.address, usdToken.address, priceFeed.address, rateExpiryTime);
  });

  const convertAndRoundSalary = function (a) {
    return Math.floor(a / SECONDS_IN_A_YEAR) * SECONDS_IN_A_YEAR;
  };

  it("adds employee", async () => {
    let name = '';
    let employeeId = 1;
    let salary1 = 100000 * USD_PRECISION;
    await payroll.addEmployee(employee1_1, salary1);
    let employee = await payroll.getEmployee(employeeId);
    assert.equal(employee[0], employee1_1, "Employee account doesn't match");
    assert.equal(employee[1].toString(), convertAndRoundSalary(salary1), "Employee salary doesn't match");
    assert.equal(employee[3], name, "Employee name doesn't match");
  });

});
