const { assertRevert } = require('@aragon/test-helpers/assertThrow');

const MiniMeToken = artifacts.require('@aragon/os/contracts/common/MiniMeToken');
const Vault = artifacts.require('Vault');
const Finance = artifacts.require('Finance');
const Payroll = artifacts.require("PayrollMock");
const PriceFeedMock = artifacts.require("./mocks/feed/PriceFeedMock.sol");

const { deployErc20TokenAndDeposit, addAllowedTokens, getTimePassed } = require('./helpers.js')

contract('Payroll, without init,', function([owner, employee1, _]) {
  // let vault, finance, payroll, priceFeed, erc20Token1;
  //
  // const SECONDS_IN_A_YEAR = 31557600; // 365.25 days
  // const erc20Token1Decimals = 18;
  //
  // beforeEach(async () => {
  //   vault = await Vault.new();
  //   await vault.initializeWithBase(vault.address)
  //   finance = await Finance.new();
  //   await finance.initialize(vault.address, SECONDS_IN_A_YEAR); // more than one day
  //
  //   priceFeed = await PriceFeedMock.new();
  //   payroll = await Payroll.new();
  //
  //   // Deploy ERC 20 Tokens
  //   erc20Token1 = await deployErc20TokenAndDeposit(owner, finance, "Token 1", erc20Token1Decimals);
  // })
  //
  // it('fails to call setPriceFeed', async () => {
  //   return assertRevert(async () => {
  //     await payroll.setPriceFeed(priceFeed.address)
  //   })
  // })
  //
  // it('fails to call setRateExpiryTime', async () => {
  //   return assertRevert(async () => {
  //     await payroll.setRateExpiryTime(1000)
  //   })
  // })
  //
  // it('fails to call addAllowedToken', async () => {
  //   return assertRevert(async () => {
  //     await payroll.addAllowedToken(erc20Token1.address)
  //   })
  // })
  //
  // it('fails to call addEmployee', async () => {
  //   return assertRevert(async () => {
  //     await payroll.addEmployee(employee1, 10000)
  //   })
  // })
  //
  // it('fails to call setEmployeeSalary', async () => {
  //   return assertRevert(async () => {
  //     await payroll.setEmployeeSalary(1, 20000)
  //   })
  // })
  //
  // it('fails to call terminateEmployee', async () => {
  //   return assertRevert(async () => {
  //     await payroll.terminateEmployee(1, await payroll.getTimestampPublic.call())
  //   })
  // })
  //
  // it('fails to call escapeHatch', async () => {
  //   return assertRevert(async () => {
  //     await payroll.escapeHatch()
  //   })
  // })
  //
  // it('fails to call depositToFinance', async () => {
  //   return assertRevert(async () => {
  //     await payroll.depositToFinance(erc20Token1.address)
  //   })
  // })
  //
  // it('fails to call determineAllocation', async () => {
  //   return assertRevert(async () => {
  //     await payroll.determineAllocation([erc20Token1.address], [100], { from: employee1 })
  //   })
  // })
  //
  // it('fails to call payday', async () => {
  //   return assertRevert(async () => {
  //     await payroll.payday({ from: employee1 })
  //   })
  // })
  //
  // it('fails to call changeAddressByEmployee', async () => {
  //   return assertRevert(async () => {
  //     await payroll.changeAddressByEmployee(owner, { from: employee1 })
  //   })
  // })
  //
  // it('fails to call addAccruedValue', async () => {
  //   return assertRevert(async () => {
  //     await payroll.addAccruedValue(1, 1000)
  //   })
  // })

})
