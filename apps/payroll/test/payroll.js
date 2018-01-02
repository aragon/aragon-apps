const { assertRevert, assertInvalidOpcode } = require('@aragon/test-helpers/assertThrow');
const getBalance = require('@aragon/test-helpers/balance')(web3);
const getTransaction = require('@aragon/test-helpers/transaction')(web3);
const MiniMeToken = artifacts.require('@aragon/core/contracts/common/MiniMeToken');
const EtherToken = artifacts.require('EtherToken');
const Vault = artifacts.require('Vault');
const Finance = artifacts.require('Finance');
const Payroll = artifacts.require("PayrollMock");
const ERC677Token = artifacts.require("./tokens/ERC677GenToken.sol");
const OracleMockup = artifacts.require("./oracle/OracleMockup.sol");
const OracleFailMockup = artifacts.require("./oracle/OracleFailMockup.sol");


contract('Payroll', function(accounts) {
  let payroll;
  let payroll2;
  let finance;
  let vault;
  let owner = accounts[0];
  let oracle;
  let employee1_1 = accounts[2];
  let employee1 = employee1_1;
  let employee2 = accounts[3];
  let employee1_2 = accounts[4];
  let employee1_3 = accounts[5];
  let owner_read = accounts[6];
  let unused_account = accounts[7];
  let total_salary = 0;
  let salary1_1 = 100000;
  let salary1_2 = 110000;
  let salary1 = salary1_1;
  let salary2_1 = 120000;
  let salary2_2 = 125000;
  let salary2 = salary2_1;
  let etherToken;
  let usdToken;
  let erc20Token1;
  let erc20Token2;
  let erc677Factory;
  let erc677Token1;
  let erc677Token2;
  let etherExchangeRate = web3.toWei(2500, 'szabo');;
  let erc20Token1ExchangeRate = web3.toWei(5, 'ether');
  let erc20Token2ExchangeRate = web3.toWei(300, 'finney');
  let erc677Token1ExchangeRate = web3.toWei(7, 'ether');

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

  it("Deploying and initializing contract", async () => {

    etherToken = await EtherToken.new();
    vault = await Vault.new();
    finance = await Finance.new();
    await finance.initialize(vault.address, etherToken.address, 100);
    payroll = await Payroll.new();
    usdToken = await deployErc20Token("USD");
    oracle = await OracleMockup.new();
    await payroll.initialize(finance.address, etherToken.address, usdToken.address, oracle.address);
    // transfer ETH to Payroll contract
    for (let i = 1; i < 9; i++)
      await payroll.addFunds.sendTransaction({ from: accounts[i], to: owner, value: web3.toWei(90, 'ether') });
  });

  it('Fails on reinitialization', async () => {
    return assertRevert(async () => {
      await payroll.initialize(finance.address, etherToken.address, usdToken.address, oracle.address);
    });
  });

  it("Initial values should match", async () => {
    let tmpEther = await payroll.etherToken();
    assert.equal(tmpEther.valueOf(), etherToken.address, "USD Token address is wrong");
    let tmpUsd = await payroll.usdToken();
    assert.equal(tmpUsd.valueOf(), usdToken.address, "USD Token address is wrong");
    let tmpOracle = await payroll.oracle();
    assert.equal(tmpOracle.valueOf(), oracle.address, "Oracle address is wrong!");
    let numEmployees = await payroll.getEmployeeCount();
    assert.equal(numEmployees.valueOf(), 0, "Num Employees doesn't match!");
    let burnrate = await payroll.calculatePayrollBurnrate();
    assert.equal(burnrate.valueOf(), 0, "Initial total payroll should be zero!");
    let runway = await payroll.calculatePayrollRunway();
    assert.equal(runway.valueOf(), 1.15792089237316195423570985008687907853269984665640564039457584007913129639935e+77, "Initial payroll runway is wrong!");
  });

  it("Deploying tokens", async () => {
    let totalSupply;

    const deployErc677Token = async (name="Erc677Token") => {
      let token = await ERC677Token.new(name, 18, '677'); // dummy parameters
      let amount = new web3.BigNumber(10**9).times(new web3.BigNumber(10**18));
      let sender = owner;
      let receiver = finance.address;
      let initialSenderBalance = await token.balanceOf(sender);
      let initialVaultBalance = await token.balanceOf(vault.address);
      await token.generateTokens(sender, amount);
      await token.transferAndCall(receiver, amount, "Initial deployment", {from: sender});
      assert.equal((await token.balanceOf(sender)).toString(), initialSenderBalance.toString());
      assert.equal((await token.balanceOf(vault.address)).toString(), (new web3.BigNumber(initialVaultBalance).plus(amount)).toString());
      return token;
    };

    const setAndCheckRate = async (payroll, token, exchangeRate, name='') => {
      await oracle.setRate(payroll.address, token.address, exchangeRate);
      let result = await payroll.getExchangeRate(token.address);
      assert.equal(result.toString(), exchangeRate.toString(), "Exchange rate for " + name + " doesn't match!");
    };

    // ERC 20 Tokens
    erc20Token1 = await deployErc20Token();
    erc20Token2 = await deployErc20Token();

    // ERC 677 Tokens
    erc677Token1 = await deployErc677Token();
    erc677Token2 = await deployErc677Token();

    // finally set exchange rates
    await oracle.setRate(payroll.address, etherToken.address, etherExchangeRate);
    let tmpEthExchange = await payroll.getExchangeRate(etherToken.address);
    assert.equal(tmpEthExchange.toString(), etherExchangeRate.toString(), "Exchange rate for Ether doesn't match!");
    await oracle.setRate(payroll.address, usdToken.address, 999);
    let tmpUsdExchange = await payroll.getExchangeRate(usdToken.address);
    // USD Token rate should be always 100
    assert.equal(tmpUsdExchange.valueOf(), 100, "Exchange rate for USD Token doesn't match!");
    await setAndCheckRate(payroll, erc20Token1, erc20Token1ExchangeRate, "ERC20 Token 1");
    await setAndCheckRate(payroll, erc20Token2, erc20Token2ExchangeRate, "ERC 20 Token 2");
    await setAndCheckRate(payroll, erc677Token1, erc677Token1ExchangeRate, "ERC 677 Token 1");
    let tmpErc677Exchange2 = await payroll.getExchangeRate(erc677Token2.address);
    assert.equal(tmpErc677Exchange2.valueOf(), 0, "Exchange rate for ERC 677 Token 2 doesn't match!");
  });

  it("Add employee", async () => {
    let name = '';
    let employeeId = 1;
    await payroll.addEmployee(employee1_1, [etherToken.address, usdToken.address, erc20Token1.address, erc20Token2.address, erc677Token1.address, erc677Token2.address], salary1_1);
    salary1 = salary1_1;
    let numEmployees = await payroll.getEmployeeCount();
    assert.equal(numEmployees.valueOf(), employeeId, "Num Employees doesn't match!");
    let employee = await payroll.getEmployee(employeeId);
    assert.equal(employee[0], employee1_1, "Employee account doesn't match");
    assert.equal(employee[1], salary1_1, "Employee salary doesn't match");
    assert.equal(employee[2], name, "Employee name doesn't match");
  });

  it("Add employee with name", async () => {
    let name = 'Joe';
    let employeeId = 2;
    await payroll.addEmployeeWithName(employee2, [etherToken.address, usdToken.address, erc20Token1.address, erc677Token1.address], salary2_1, name);
    salary2 = salary2_1;
    let numEmployees = await payroll.getEmployeeCount();
    assert.equal(numEmployees.valueOf(), employeeId, "Num Employees doesn't match!");
    let employee = await payroll.getEmployee(employeeId);
    assert.equal(employee[0], employee2, "Employee account doesn't match");
    assert.equal(employee[1], salary2_1, "Employee salary doesn't match");
    assert.equal(employee[2], name, "Employee name doesn't match");
  });

  it("Remove employee", async () => {
    let employeeId = 2;
    await payroll.removeEmployee(employeeId);
    salary2 = 0;
    let numEmployees = await payroll.getEmployeeCount();
    assert.equal(numEmployees.valueOf(), 1, "Num Employees doesn't match!");
  });

  it("Add it again and check global payroll", async () => {
    let name = 'John';
    let employeeId = 3;
    let transaction = await payroll.addEmployeeWithName(employee2, [etherToken.address, usdToken.address, erc20Token1.address, erc677Token1.address], salary2_2, name);
    let numEmployees = await payroll.getEmployeeCount();
    assert.equal(numEmployees.valueOf(), 2, "Num Employees doesn't match!");
    let employee = await payroll.getEmployee(employeeId);
    assert.equal(employee[0], employee2, "Employee account doesn't match");
    assert.equal(employee[1], salary2_2, "Employee salary doesn't match");
    assert.equal(employee[2], name, "Employee name doesn't match");
    let burnrate = await payroll.calculatePayrollBurnrate();
    salary2 = salary2_2;
    let expected_burnrate = Math.trunc((salary1 + salary2) / 12);
    assert.equal(burnrate.valueOf(), expected_burnrate, "Payroll burnrate doesn't match");
    let balance = await getBalance(payroll.address);
    let yearlyTotalPayroll = await payroll.getYearlyTotalPayroll();
    let runway = await payroll.calculatePayrollRunway();
    let runwayExpected = balance * 365 / yearlyTotalPayroll;
    assert.equal(runwayExpected.valueOf(), runway, "Payroll runway doesn't match!");
  });

  it("Modify employee salary ", async () => {
    let employeeId = 1;
    await payroll.setEmployeeSalary(employeeId, salary1_2);
    let burnrate = await payroll.calculatePayrollBurnrate();
    salary1 = salary1_2;
    let expected_burnrate = Math.trunc((salary1 + salary2) / 12);
    assert.equal(burnrate.valueOf(), expected_burnrate, "Payroll burnrate doesn't match");
  });

  it("Modify employee account address by Employer ", async () => {
    let employeeId = 1;
    await payroll.changeAddressByOwner(employeeId, employee1_2);
    let employee = await payroll.getEmployee(employeeId);
    assert.equal(employee[0], employee1_2, "Employee employee doesn't match");
    employee1 = employee1_2;
  });

  it("Modify employee account address by Employee ", async () => {
    let account_old = employee1_2;
    let account_new = employee1_3;
    let employeeId = 1;
    await payroll.changeAddressByEmployee(account_new, {from: account_old});
    let employee = await payroll.getEmployee(employeeId);
    assert.equal(employee[0], account_new, "Employee account doesn't match");
    employee1 = employee1_3;
  });

  // Owner permissions
  /* TODO
  it('Fails on non-owner-write calling setOracle', async () => {
    assertRevert(async () => {
      await payroll.setOracle(oracle.address, {from: owner_read});
    });
  });

  it('Fails on non-owner-write calling addEmployee', async () => {
    assertRevert(async () => {
      await payroll.addEmployee(unused_account, [etherToken], 100000, {from: owner_read});
    });
  });

  it('Fails on non-owner-write-write calling addEmployeeWithName', async () => {
    assertRevert(async () => {
      await payroll.addEmployeeWithName(unused_account, [etherToken], 100000, "test", {from: owner_read});
    });
  });

  it('Fails on non-owner-write calling setEmployeeSalary', async () => {
    assertRevert(async () => {
      await payroll.setEmployeeSalary(1, 120000, {from: owner_read});
    });
  });

  it('Fails on non-owner-write calling removeEmployee', async () => {
    assertRevert(async () => {
      await payroll.removeEmployee(1, {from: owner_read});
    });
  });

  it('Fails on non-owner-write calling escapeHatch', async () => {
    assertRevert(async () => {
      await payroll.escapeHatch({from: owner_read});
    });
  });

  // owner read
  it('Fails on non-owner-read calling getEmployeeCount', async () => {
    assertRevert(async () => {
      await payroll.getEmployeeCount({from: unused_account});
    });
  });

  it('Fails on non-owner-read calling getEmployee', async () => {
    assertRevert(async () => {
      await payroll.getEmployee(1, {from: unused_account});
    });
  });

  it('Fails on non-owner-read calling calculatePayrollBurnrate', async () => {
    assertRevert(async () => {
      await payroll.calculatePayrollBurnrate({from: unused_account});
    });
  });

  it('Fails on non-owner-read calling calculatePayrollRunway', async () => {
    assertRevert(async () => {
      await payroll.calculatePayrollRunway({from: unused_account});
    });
  });

  // Employee permissions
  it('Fails on non-employee calling determineAllocation', async () => {
    assertRevert(async () => {
      await payroll.determineAllocation([etherToken.address], [100], {from: owner});
    });
  });

  it('Fails on non-employee calling payday', async () => {
    assertRevert(async () => {
      await payroll.payday({from: owner});
    });
  });

  it('Fails on non-employee calling change Address', async () => {
    assertRevert(async () => {
      await payroll.changeAddressByEmployee(unused_account, {from: owner});
    });
  });

  // Oracle permission
  it('Fails on non-oracle calling setExchangeRate', async () => {
    assertRevert(async () => {
      await payroll.setExchangeRate(erc20Token1.address, {from: owner});
    });
  });
   */

  it("Test approveAndCall and transferAndCall", async () => {
    // ERC20
    const amount = new web3.BigNumber(10**2).times(new web3.BigNumber(10**18));
    let sender = owner;
    let receiver;
    let initialSenderBalance;
    let initialVaultBalance;

    const setInitial = async (token, _receiver) => {
      receiver = _receiver;
      initialSenderBalance = await token.balanceOf(sender);
      initialVaultBalance = await token.balanceOf(vault.address);
    };
    const checkFinal = async (token) => {
      assert.equal((await token.balanceOf(sender)).toString(), initialSenderBalance.toString(), "Sender balances don't match");
      assert.equal((await token.balanceOf(vault.address)).toString(), (new web3.BigNumber(initialVaultBalance).plus(amount)).toString(), "Vault balances don't match");
    };

    // Send ERC20 Tokens to Payroll (with direct transfer)
    await setInitial(erc20Token1, payroll.address);
    await erc20Token1.generateTokens(sender, amount);
    await erc20Token1.transfer(receiver, amount, {from: sender});
    await payroll.depositToFinance(erc20Token1.address);
    await checkFinal(erc20Token1);

    // Send ERC20 Tokens to Payroll
    await setInitial(erc20Token1, payroll.address);
    await erc20Token1.generateTokens(sender, amount);
    await erc20Token1.approveAndCall(receiver, amount, "", {from: sender});
    await checkFinal(erc20Token1);

    // Send ERC677 Tokens to Payroll
    await setInitial(erc677Token1, payroll.address);
    await erc677Token1.generateTokens(sender, amount);
    await erc677Token1.transferAndCall(receiver, amount, "", {from: sender});
    await checkFinal(erc677Token1);

    // Send ERC677 Tokens to Finance
    await setInitial(erc677Token1, finance.address);
    await erc677Token1.generateTokens(sender, amount);
    await erc677Token1.transferAndCall(receiver, amount, "", {from: sender});
    await checkFinal(erc677Token1);
  });

  it("Test payday no token allocation", async () => {
    payroll2 = await Payroll.new();
    await payroll2.initialize(finance.address, etherToken.address, usdToken.address, oracle.address);
    // make sure this payroll has enough funds
    let etherTokenFunds = new web3.BigNumber(90).times(10**18);
    let usdTokenFunds = new web3.BigNumber(10**9).times(10**2);
    let erc20Token1Funds = new web3.BigNumber(10**9).times(10**18);
    let erc677Token1Funds = new web3.BigNumber(10**9).times(10**18);
    await usdToken.generateTokens(owner, usdTokenFunds);
    await erc20Token1.generateTokens(owner, erc20Token1Funds);
    await erc677Token1.generateTokens(owner, erc677Token1Funds);
    // Send funds to Finance
    await etherToken.wrapAndCall(finance.address, "ETH payroll", {from: owner, value: etherTokenFunds});
    await usdToken.approve(finance.address, usdTokenFunds, {from: owner});
    await finance.deposit(usdToken.address, usdTokenFunds, "USD payroll", {from: owner});
    await erc20Token1.approve(finance.address, erc20Token1Funds, {from: owner});
    await finance.deposit(erc20Token1.address, erc20Token1Funds, "ERC20 1 payroll", {from: owner});
    await erc677Token1.transferAndCall(finance.address, erc677Token1Funds, "ERC677 1 payroll", {from: owner});
     // Add employee
    await payroll2.addEmployee(employee1_1, [etherToken.address, usdToken.address, erc20Token1.address, erc20Token2.address, erc677Token1.address, erc677Token2.address], salary1_1);
    // No Token allocation
    return assertRevert(async () => {
      await payroll2.payday({from: employee1_1});
    });
  });

  it("Test payday zero exchange rate token", async () => {
    let oracleFail = await OracleFailMockup.new();
    // Allocation
    await payroll2.determineAllocation([etherToken.address, usdToken.address, erc20Token1.address, erc677Token1.address], [10, 20, 30, 40], {from: employee1_1});
    await payroll2.setOracle(oracleFail.address);
    await oracleFail.setRate(payroll2.address, etherToken.address, 0);
    // Zero exchange rate
    return assertRevert(async () => {
      await payroll2.payday({from: employee1_1});
    });
  });

  it("Test payday, time condition", async () => {
    // correct oracle
    await payroll2.setOracle(oracle.address);
    // make sure rates are correct
    await oracle.setRate(payroll2.address, etherToken.address, etherExchangeRate);
    await oracle.setRate(payroll2.address, usdToken.address, 100);
    await oracle.setRate(payroll2.address, erc20Token1.address, erc20Token1ExchangeRate);
    await oracle.setRate(payroll2.address, erc677Token1.address, erc677Token1ExchangeRate);
    // correct payday
    await payroll2.payday({from: employee1_1});
    // payday called again too early
    return assertRevert(async () => {
      await payroll2.payday({from: employee1_1});
    });
  });

  it("Test EscapeHatch", async () => {
    let totalTxFee = new web3.BigNumber(0);;
    let employerTokenBalances = {};
    let payrollTokenBalances = {};

    const getTxFee = async (transaction) => {
      let tx = await getTransaction(transaction.tx);
      let gasPrice = new web3.BigNumber(tx.gasPrice);
      let txFee = gasPrice.times(transaction.receipt.cumulativeGasUsed);

      return new Promise(resolve => {resolve(txFee);});
    };
    const addInitialBalance = async (token, name="", generate=true) => {
      let txFee = new web3.BigNumber(0);
      // add some tokens to Payroll (it shouldn't happen, but to test it)
      if (generate) {
        const amount = new web3.BigNumber(10**2).times(new web3.BigNumber(10**18));
        let transaction1 = await token.generateTokens(owner, amount);
        txFee = txFee.plus(await getTxFee(transaction1));
        let transaction2 = await token.transfer(payroll2.address, amount, {from: owner});
        txFee = txFee.plus(await getTxFee(transaction2));
      }

      let employerBalance = await token.balanceOf(owner);
      let payrollBalance = await token.balanceOf(payroll2.address);
      employerTokenBalances[token.address] = [employerBalance];
      payrollTokenBalances[token.address] = [payrollBalance];

      return new Promise(resolve => {resolve(txFee);});
    };
    const checkFinalBalance = async (token, name="") => {
      let employerBalance = await token.balanceOf(owner);
      let payrollBalance = await token.balanceOf(payroll2.address);
      assert.equal(employerBalance.toString(), payrollTokenBalances[token.address].toString(), "Funds not recovered for " + name + " (Employer)!");
      assert.equal(payrollBalance.valueOf(), 0, "Funds not recovered for " + name + " (Payroll)!");
    };

    // Initial values
    let ethSpent = web3.toWei(2, 'ether');
    let transaction;
    await payroll2.addFunds({from: owner, to: payroll.address, value: ethSpent});
    let employerInitialBalance = await getBalance(owner);
    let payrollInitialBalance = await getBalance(payroll2.address);
    totalTxFee = totalTxFee.plus(await addInitialBalance(etherToken, "Ether Token", false));
    totalTxFee = totalTxFee.plus(await addInitialBalance(usdToken, "USD Token"));
    totalTxFee = totalTxFee.plus(await addInitialBalance(erc20Token1, "ERC20 Token 1"));
    totalTxFee = totalTxFee.plus(await addInitialBalance(erc20Token2, "ERC20 Token 2"));
    totalTxFee = totalTxFee.plus(await addInitialBalance(erc677Token1, "ERC677 Token 1"));
    totalTxFee = totalTxFee.plus(await addInitialBalance(erc677Token2, "ERC677 Token 2"));
    // Escape Hatch
    transaction = await payroll2.escapeHatch();
    totalTxFee = totalTxFee.plus(await getTxFee(transaction));
    // Final check
    // ETH
    let employerDestructedBalance = await getBalance(owner);
    let payrollDestructedBalance = await getBalance(payroll2.address);
    assert.equal(employerInitialBalance.sub(totalTxFee).add(payrollTokenBalances[etherToken.address]).toString(), employerDestructedBalance.toString(), "Funds not recovered (Employer)!");
    assert.equal(payrollDestructedBalance.valueOf(), 0, "Funds not recovered (Payroll)!");
    // Ether Token
    let employerEtherTokenBalance = await etherToken.balanceOf(owner);
    let payrollEtherTokenBalance = await etherToken.balanceOf(payroll2.address);
    assert.equal(employerTokenBalances[etherToken.address].toString(), employerEtherTokenBalance.toString(), "Funds not recovered for Ether Token (Employer)!");
    assert.equal(payrollEtherTokenBalance.valueOf(), 0, "Funds not recovered for Ether Token (Payroll)!");
    // Other Tokens
    await checkFinalBalance(usdToken, "USD Token");
    await checkFinalBalance(erc20Token1, "ERC20 Token 1");
    await checkFinalBalance(erc20Token2, "ERC20 Token 2");
    await checkFinalBalance(erc677Token1, "ERC677 Token 1");
    await checkFinalBalance(erc677Token2, "ERC677 Token 2");
  });

  it("Test Token allocation, greater than 100", async () => {
    // should throw as total allocation is greater than 100
    return assertRevert(async () => {
      await payroll.determineAllocation([etherToken.address, usdToken.address, erc20Token1.address, erc677Token1.address], [20, 30, 40, 50], {from: employee1});
    });
  });

  it("Test Token allocation, lower than 100", async () => {
    // should throw as total allocation is greater than 100
    return assertRevert(async () => {
      await payroll.determineAllocation([etherToken.address, usdToken.address, erc20Token1.address, erc677Token1.address], [5, 30, 40, 50], {from: employee1});
    });
  });

  it("Test Token allocation, not allowed token", async () => {
    // should throw as it's not an allowed token
    return assertRevert(async () => {
      await payroll.determineAllocation([payroll.address, usdToken.address, erc20Token1.address, erc677Token1.address], [10, 20, 30, 40], {from: employee1});
    });
  });

  it("Test Token allocation, time condition", async () => {
    // correct allocation
    await payroll.determineAllocation([etherToken.address, usdToken.address, erc20Token1.address, erc677Token1.address], [10, 20, 30, 40], {from: employee1});
    // should throw because of time condition
    return assertRevert(async () => {
      await payroll.determineAllocation([etherToken.address, usdToken.address, erc20Token1.address, erc677Token1.address], [20, 10, 30, 40], {from: employee1});
    });
  });

  it("Test payday, WITH Token allocation", async () => {
    let usdTokenAllocation = 50;
    let erc20Token1Allocation = 20;
    let erc677Token1Allocation = 15;
    let ethAllocation = 100 - usdTokenAllocation - erc20Token1Allocation - erc677Token1Allocation;
    let initialEthPayroll;
    let initialUsdTokenPayroll;
    let initialErc20Token1Payroll;
    let initialErc677Token1Payroll;
    let initialEthEmployee2;
    let initialUsdTokenEmployee2;
    let initialErc20Token1Employee2;
    let initialErc677Token1Employee2;

    const setInitialBalances = async () => {
      initialEthPayroll = await etherToken.balanceOf(vault.address);
      initialEthEmployee2 = await getBalance(employee2);
      // Token initial balances
      initialUsdTokenPayroll = await usdToken.balanceOf(vault.address);
      initialErc20Token1Payroll = await erc20Token1.balanceOf(vault.address);
      initialErc677Token1Payroll = await erc677Token1.balanceOf(vault.address);
      initialUsdTokenEmployee2 = await usdToken.balanceOf(employee2);
      initialErc20Token1Employee2 = await erc20Token1.balanceOf(employee2);
      initialErc677Token1Employee2 = await erc677Token1.balanceOf(employee2);
    };

    const logPayroll = function(salary, initialBalancePayroll, initialBalanceEmployee, payed, newBalancePayroll, newBalanceEmployee, expectedPayroll, expectedEmployee, name='') {
      console.log("");
      console.log("Checking " + name);
      console.log("Salary: " + salary);
      console.log("Initial " + name + " Payroll: " + web3.fromWei(initialBalancePayroll, 'ether'));
      console.log("Initial " + name + " Employee: " + web3.fromWei(initialBalanceEmployee, 'ether'));
      console.log("Payed: " + web3.fromWei(payed, 'ether'));
      console.log("new " + name + " payroll: " + web3.fromWei(newBalancePayroll, 'ether'));
      console.log("expected " + name + " payroll: " + web3.fromWei(expectedPayroll, 'ether'));
      console.log("New " + name + " employee: " + web3.fromWei(newBalanceEmployee, 'ether'));
      console.log("Expected " + name + " employee: " + web3.fromWei(expectedEmployee, 'ether'));
      console.log("");
    };

    const checkTokenBalances = async (token, salary, initialBalancePayroll, initialBalanceEmployee, exchangeRate, allocation, name='') => {
      let payed = (new web3.BigNumber(salary)).times(exchangeRate).times(allocation).dividedToIntegerBy(1200);
      let expectedPayroll = initialBalancePayroll.minus(payed);
      let expectedEmployee = initialBalanceEmployee.plus(payed);
      let newBalancePayroll;
      let newBalanceEmployee;
      newBalancePayroll = await token.balanceOf(vault.address);
      newBalanceEmployee = await token.balanceOf(employee2);
      //logPayroll(salary, initialBalancePayroll, initialBalanceEmployee, payed, newBalancePayroll, newBalanceEmployee, expectedPayroll, expectedEmployee, name);
      assert.equal(newBalancePayroll.toString(), expectedPayroll.toString(), "Payroll balance of Token " + name + " doesn't match");
      assert.equal(newBalanceEmployee.toString(), expectedEmployee.toString(), "Employee balance of Token " + name + " doesn't match");
    };

    const checkPayday = async (transaction) => {
      // Check ETH
      let tx = await getTransaction(transaction.tx);
      let gasPrice = new web3.BigNumber(tx.gasPrice);
      let txFee = gasPrice.times(transaction.receipt.cumulativeGasUsed);
      let newEthPayroll = await etherToken.balanceOf(vault.address);
      let newEthEmployee2 = await getBalance(employee2);
      let payed = (new web3.BigNumber(salary2)).times(etherExchangeRate).times(ethAllocation).dividedToIntegerBy(1200);
      let expectedPayroll = initialEthPayroll.minus(payed);
      let expectedEmployee2 = initialEthEmployee2.plus(payed).minus(txFee);
      //logPayroll(salary2, initialEthPayroll, initialEthEmployee2, payed, newEthPayroll, newEthEmployee2, expectedPayroll, expectedEmployee2, "ETH");
      assert.equal(newEthPayroll.toString(), expectedPayroll.toString(), "Payroll Eth Balance doesn't match");
      assert.equal(newEthEmployee2.toString(), expectedEmployee2.toString(), "Employee Eth Balance doesn't match");
      // Check Tokens
      await checkTokenBalances(usdToken, salary2, initialUsdTokenPayroll, initialUsdTokenEmployee2, 100, usdTokenAllocation, "USD");
      await checkTokenBalances(erc20Token1, salary2, initialErc20Token1Payroll, initialErc20Token1Employee2, erc20Token1ExchangeRate, erc20Token1Allocation, "ERC20 1");
      await checkTokenBalances(erc677Token1, salary2, initialErc677Token1Payroll, initialErc677Token1Employee2, erc677Token1ExchangeRate, erc677Token1Allocation, "ERC 677 1");
    };

    // determine allocation
    await payroll.determineAllocation([etherToken.address, usdToken.address, erc20Token1.address, erc677Token1.address], [ethAllocation, usdTokenAllocation, erc20Token1Allocation, erc677Token1Allocation], {from: employee2});
    await setInitialBalances();
    // call payday
    let transaction = await payroll.payday({from: employee2});
    await checkPayday(transaction);

    // check that time restrictions for payday and determineAllocation work in a positive way (i.e. when time has gone by)

    // payday
    // set time forward, 1 month
    let newTime = parseInt(await payroll.getTimestampPublic()) + 2678400; // 31 * 24 * 3600
    await payroll.mock_setTimestamp(newTime); // 31 * 24 * 3600
    await setInitialBalances();
    // call payday again
    let transaction2 = await payroll.payday({from: employee2});
    await checkPayday(transaction2);

    // determineAllocation
    // set time forward, 5 more months
    await payroll.mock_setTimestamp(parseInt(await payroll.getTimestampPublic()) + 13392000); // 5 * 31 * 24 * 3600
    await payroll.determineAllocation([etherToken.address, usdToken.address, erc20Token1.address, erc677Token1.address], [15, 60, 15, 10], {from: employee2});
    assert.equal((await payroll.getAllocation(usdToken.address, {from: employee2})).valueOf(), 60, "USD allocation doesn't match");
    assert.equal((await payroll.getAllocation(erc20Token1.address, {from: employee2})).valueOf(), 15, "ERC 20 Token 1 allocation doesn't match");
    assert.equal((await payroll.getAllocation(erc677Token1.address, {from: employee2})).valueOf(), 10, "ERC 677 Token 1 allocation doesn't match");
  });

});
