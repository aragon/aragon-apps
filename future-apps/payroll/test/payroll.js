const { assertRevert, assertInvalidOpcode } = require('@aragon/test-helpers/assertThrow');
const getBalance = require('@aragon/test-helpers/balance')(web3);
const getTransaction = require('@aragon/test-helpers/transaction')(web3);
const MiniMeToken = artifacts.require('@aragon/os/contracts/common/MiniMeToken');
const Vault = artifacts.require('Vault');
const Finance = artifacts.require('Finance');
const Payroll = artifacts.require("PayrollMock");
const OracleMock = artifacts.require("./oracle/OracleMock.sol");
const OracleFailMock = artifacts.require("./oracle/OracleFailMock.sol");
const Zombie = artifacts.require("Zombie.sol");

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
  let unused_account = accounts[7];
  let total_salary = 0;
  let salary1_1 = 100000;
  let salary1_2 = 110000;
  let salary1 = salary1_1;
  let salary2_1 = 120000;
  let salary2_2 = 125000;
  let salary2 = salary2_1;
  let usdToken;
  let erc20Token1;
  let erc20Token2;
  let erc20Token1ExchangeRate = web3.toWei(5, 'gwei');
  let erc20Token2ExchangeRate = web3.toWei(300, 'mwei');
  let etherExchangeRate = web3.toWei(1, 'mwei')
  const USD_PRECISION = 10**9;
  const SECONDS_IN_A_YEAR = 31557600; // 365.25 days
  const ETH = '0x0'

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

  const addAllowedTokens = async(payroll, tokens) => {
    const currencies = [ETH].concat(tokens.map(c => c.address))
    await Promise.all(currencies.map(token => payroll.addAllowedToken(token)))
  }

  const getTimePassed = async (employeeId) => {
    let employee = await payroll.getEmployee(employeeId);
    let currentTime = await payroll.getTimestampPublic();
    let timePassed = currentTime - employee[3];
    return new Promise(resolve => {resolve(timePassed);});
  };

  it("deploys and initializes contract", async () => {

    vault = await Vault.new();
    await vault.initializeWithBase(vault.address)
    finance = await Finance.new();
    await finance.initialize(vault.address, 100);
    payroll = await Payroll.new();
    usdToken = await deployErc20Token("USD");
    oracle = await OracleMock.new();
    await payroll.initialize(finance.address, usdToken.address);
    // transfer ETH to Payroll contract
    for (let i = 1; i < 9; i++)
      await finance.sendTransaction({ from: accounts[i], value: web3.toWei(90, 'ether') });
  });

  it('fails on reinitialization', async () => {
    return assertRevert(async () => {
      await payroll.initialize(finance.address, usdToken.address);
    });
  });

  it("checks that initial values match", async () => {
    let tmpFinance = await payroll.finance();
    assert.equal(tmpFinance.valueOf(), finance.address, "Finance address is wrong");
    let tmpUsd = await payroll.denominationToken();
    assert.equal(tmpUsd.valueOf(), usdToken.address, "USD Token address is wrong");
  });

  it("deploys tokens", async () => {
    let totalSupply;

    const setAndCheckRate = async (payroll, token, exchangeRate, name='') => {
      await oracle.setRate(payroll.address, token.address, exchangeRate);
      let result = await payroll.getExchangeRate(token.address);
      assert.equal(result.toString(), exchangeRate.toString(), "Exchange rate for " + name + " doesn't match!");
    };

    // ERC 20 Tokens
    erc20Token1 = await deployErc20Token();
    erc20Token2 = await deployErc20Token();

    // add them to payroll allowed tokens
    await addAllowedTokens(payroll, [usdToken, erc20Token1, erc20Token2])

    // finally set exchange rates
    await oracle.setRate(payroll.address, ETH, etherExchangeRate);
    let tmpEthExchange = await payroll.getExchangeRate(ETH);
    assert.equal(tmpEthExchange.toString(), etherExchangeRate.toString(), "Exchange rate for Ether doesn't match!");
    let tmpUsdExchange = await payroll.getExchangeRate(usdToken.address);
    // Denomination Token (USD in this test) rate should be always 1
    assert.equal(tmpUsdExchange.valueOf(), 1, "Exchange rate for USD Token doesn't match!");
    await setAndCheckRate(payroll, erc20Token1, erc20Token1ExchangeRate, "ERC20 Token 1");
    await setAndCheckRate(payroll, erc20Token2, erc20Token2ExchangeRate, "ERC 20 Token 2");
  });

  it("fails trying to add an already allowed token", async () => {
    return assertRevert(async () => {
      await payroll.addAllowedToken(usdToken.address);
    });
  });

  it("fails trying to set rate of denomination token", async () => {
    return assertRevert(async () => {
      await oracle.setRate(payroll.address, usdToken.address, 999);
    });
  });

  const convertAndRoundSalary = function (a) {
    return Math.floor(Math.floor(a * USD_PRECISION / SECONDS_IN_A_YEAR) * SECONDS_IN_A_YEAR / USD_PRECISION);
  };

  it("adds employee", async () => {
    let name = '';
    let employeeId = 1;
    await payroll.addEmployee(employee1_1, salary1_1);
    salary1 = salary1_1;
    let employee = await payroll.getEmployee(employeeId);
    assert.equal(employee[0], employee1_1, "Employee account doesn't match");
    assert.equal(employee[1].toString(), convertAndRoundSalary(salary1_1), "Employee salary doesn't match");
    assert.equal(employee[2], name, "Employee name doesn't match");
  });

  it("fails adding again same employee", async () => {
    return assertRevert(async () => {
      await payroll.addEmployee(employee1_1, salary1_1);
    });
  });

  it("adds employee with name", async () => {
    let name = 'Joe';
    let employeeId = 2;
    await payroll.addEmployeeWithName(employee2, salary2_1, name);
    salary2 = salary2_1;
    let employee = await payroll.getEmployee(employeeId);
    assert.equal(employee[0], employee2, "Employee account doesn't match");
    assert.equal(employee[1].toString(), convertAndRoundSalary(salary2_1), "Employee salary doesn't match");
    assert.equal(employee[2], name, "Employee name doesn't match");
  });

  it("removes employee (no time passed since 'last allocation')", async () => {
    // therefore, no salary owed
    let employeeId = 2;
    await payroll.determineAllocation([usdToken.address], [100], {from: employee2});
    let initialBalance = await usdToken.balanceOf(employee2);
    await payroll.removeEmployee(employeeId);
    salary2 = 0;
    let finalBalance = await usdToken.balanceOf(employee2);
    assert.equal(finalBalance.toString(), initialBalance.toString());
    let employee = await payroll.getEmployee(employeeId);
    assert.equal(parseInt(employee[0], 16), 0, "Employee not properly removed");
  });

  it("adds employee again with name and start date", async () => {
    let name = 'Joe';
    let employeeId = 3;
    await payroll.addEmployeeWithNameAndStartDate(employee2, salary2_1, name, Math.floor((new Date()).getTime() / 1000) - 2628600);
    salary2 = salary2_1;
    let employee = await payroll.getEmployee(employeeId);
    assert.equal(employee[0], employee2, "Employee account doesn't match");
    assert.equal(employee[1].toString(), convertAndRoundSalary(salary2_1), "Employee salary doesn't match");
    assert.equal(employee[2], name, "Employee name doesn't match");
  });

  it("removes employee with remaining payroll", async () => {
    let employeeId = 3;
    await payroll.determineAllocation([usdToken.address], [100], {from: employee2});
    let initialBalance = await usdToken.balanceOf(employee2);
    let timePassed = await getTimePassed(employeeId);
    let owed = (new web3.BigNumber(salary2)).times(USD_PRECISION).dividedToIntegerBy(SECONDS_IN_A_YEAR).times(100).dividedToIntegerBy(100).times(timePassed);
    await payroll.removeEmployee(employeeId);
    salary2 = 0;
    let finalBalance = await usdToken.balanceOf(employee2);
    assert.equal(finalBalance.toString(), initialBalance.add(owed).toString());
  });

  it("fails on removing non-existent employee", async () => {
    let employeeId = 1;
    return assertRevert(async () => {
      await payroll.removeEmployee(10);
    });
  });

  it("adds removed employee again (with name and start date)", async () => {
    let name = 'John';
    let employeeId = 4;
    let transaction = await payroll.addEmployeeWithNameAndStartDate(employee2, salary2_2, name, Math.floor((new Date()).getTime() / 1000) - 2628600);
    let employee = await payroll.getEmployee(employeeId);
    assert.equal(employee[0], employee2, "Employee account doesn't match");
    assert.equal(employee[1].toString(), convertAndRoundSalary(salary2_2), "Employee salary doesn't match");
    assert.equal(employee[2], name, "Employee name doesn't match");
    salary2 = salary2_2;
  });

  it("modifies employee salary", async () => {
    let employeeId = 1;
    await payroll.setEmployeeSalary(employeeId, salary1_2);
    salary1 = salary1_2;
    let employee = await payroll.getEmployee(employeeId);
    assert.equal(employee[1].toString(), convertAndRoundSalary(salary1_2), "Salary doesn't match");
  });

  it("fails modifying non-existent employee salary", async () => {
    let employeeId = 1;
    return assertRevert(async () => {
      await payroll.setEmployeeSalary(10, salary1_2);
    });
  });

  it("fails modifying employee account address by Employee, for already existent account", async () => {
    let account_old = employee1;
    let account_new = employee2;
    return assertRevert(async () => {
      await payroll.changeAddressByEmployee(account_new, {from: account_old});
    });
  });

  it("fails modifying employee account address by Employee, for null account", async () => {
    let account_old = employee1;
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
    employee1 = employee1_2;
  });

  it("sends tokens using approveAndCall and transferAndCall", async () => {
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

  });

  it("fails on payday with no token allocation", async () => {
    payroll2 = await Payroll.new();
    await payroll2.initialize(finance.address, usdToken.address);
    // add allowed tokens
    await addAllowedTokens(payroll2, [usdToken, erc20Token1])
    // make sure this payroll has enough funds
    let etherFunds = new web3.BigNumber(90).times(10**18);
    let usdTokenFunds = new web3.BigNumber(10**9).times(USD_PRECISION);
    let erc20Token1Funds = new web3.BigNumber(10**9).times(10**18);
    await usdToken.generateTokens(owner, usdTokenFunds);
    await erc20Token1.generateTokens(owner, erc20Token1Funds);
    // Send funds to Finance
    await finance.sendTransaction( {from: owner, value: etherFunds} );
    await usdToken.approve(finance.address, usdTokenFunds, {from: owner});
    await finance.deposit(usdToken.address, usdTokenFunds, "USD payroll", {from: owner});
    await erc20Token1.approve(finance.address, erc20Token1Funds, {from: owner});
    await finance.deposit(erc20Token1.address, erc20Token1Funds, "ERC20 1 payroll", {from: owner});
    // Add employee
    await payroll2.addEmployeeWithNameAndStartDate(employee1_1, salary1_1, "", Math.floor((new Date()).getTime() / 1000) - 2628005); // now minus 1/12 year
    // No Token allocation
    return assertRevert(async () => {
      await payroll2.payday({from: employee1_1});
    });
  });

  it("fails on payday with a zero exchange rate token", async () => {
    let oracleFail = await OracleFailMock.new();
    // Allocation
    await payroll2.determineAllocation([ETH, usdToken.address, erc20Token1.address], [10, 20, 70], {from: employee1_1});
    await oracleFail.setRate(payroll2.address, ETH, 0);
    // Zero exchange rate
    return assertRevert(async () => {
      await payroll2.payday({from: employee1_1});
    });
  });

  it("fails on payday by non-employee", async () => {
    // should throw as caller is not an employee
    return assertRevert(async () => {
      await payroll2.payday({from: unused_account});
    });
  });

  it("fails on payday after 0 seconds", async () => {
    // correct oracle, make sure rates are correct
    await oracle.setRate(payroll2.address, ETH, etherExchangeRate);
    await oracle.setRate(payroll2.address, erc20Token1.address, erc20Token1ExchangeRate);
    // correct payday
    await payroll2.payday({from: employee1_1});
    // payday called again too early: if 0 seconds have passed, payroll would be 0
    return assertRevert(async () => {
      await payroll2.payday({from: employee1_1});
    });
  });

  it("sends funds to Finance", async () => {
    let totalTxFee = new web3.BigNumber(0);;
    let vaultTokenBalances = {};
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

      let vaultBalance = await token.balanceOf(vault.address);
      let payrollBalance = await token.balanceOf(payroll2.address);
      vaultTokenBalances[token.address] = vaultBalance;
      payrollTokenBalances[token.address] = payrollBalance;

      return new Promise(resolve => {resolve(txFee);});
    };
    const checkFinalBalance = async (token, name="") => {
      let vaultBalance = await token.balanceOf(vault.address);
      let payrollBalance = await token.balanceOf(payroll2.address);
      assert.equal(vaultBalance.toString(), vaultTokenBalances[token.address].add(payrollTokenBalances[token.address]).toString(), "Funds not recovered for " + name + " (Vault)!");
      assert.equal(payrollBalance.valueOf(), 0, "Funds not recovered for " + name + " (Payroll)!");
    };

    // Initial values
    let transaction;
    let vaultInitialBalance = await getBalance(vault.address);
    totalTxFee = totalTxFee.plus(await addInitialBalance(usdToken, "USD Token"));
    totalTxFee = totalTxFee.plus(await addInitialBalance(erc20Token1, "ERC20 Token 1"));
    // Escape Hatch
    transaction = await payroll2.depositToFinance(usdToken.address);
    totalTxFee = totalTxFee.plus(await getTxFee(transaction));
    transaction = await payroll2.depositToFinance(erc20Token1.address);
    totalTxFee = totalTxFee.plus(await getTxFee(transaction));
    // Final check
    await checkFinalBalance(usdToken, "USD Token");
    await checkFinalBalance(erc20Token1, "ERC20 Token 1");
    // call again to make sure we test value == 0 condition
    await payroll2.depositToFinance(usdToken.address);
  });

  it("fails on sending ETH funds to Payroll", async () => {
    return assertRevert(async () => {
      await payroll2.sendTransaction({ from: owner, value: web3.toWei(200, 'wei') });
    });
  });

  it("escapes hatch, recovers ETH", async () => {
    // Payroll doesn't accept ETH funds, so we use a self destructing contract
    // as a trick to be able to send ETH to it.
    let zombie = await Zombie.new(payroll2.address);
    await zombie.sendTransaction({ from: owner, value: web3.toWei(200, 'wei') });
    await zombie.escapeHatch();
    let vaultInitialBalance = await getBalance(vault.address);
    let payrollInitialBalance = await getBalance(payroll2.address);
    await payroll2.escapeHatch();
    let vaultFinalBalance = await getBalance(vault.address);
    let payrollFinalBalance = await getBalance(payroll2.address);
    assert.equal(payrollFinalBalance.valueOf(), 0, "Funds not recovered (Payroll)!");
    assert.equal(vaultFinalBalance.toString(), vaultInitialBalance.add(payrollInitialBalance).toString(), "Funds not recovered (Vault)!");
  });

  it("fails on Token allocation if greater than 100", async () => {
    // should throw as total allocation is greater than 100
    return assertRevert(async () => {
      await payroll.determineAllocation([ETH, usdToken.address, erc20Token1.address], [20, 30, 90], {from: employee1});
    });
  });

  it("fails on Token allocation because of overflow", async () => {
    // should throw as total allocation overflow
    return assertRevert(async () => {
      await payroll.determineAllocation([ETH, usdToken.address, erc20Token1.address], [120, 100, 90], {from: employee1});
    });
  });

  it("fails on Token allocation if lower than 100", async () => {
    // should throw as total allocation is lower than 100
    return assertRevert(async () => {
      await payroll.determineAllocation([ETH, usdToken.address, erc20Token1.address], [5, 30, 40], {from: employee1});
    });
  });

  it("fails on Token allocation for not allowed token", async () => {
    // should throw as it's not an allowed token
    return assertRevert(async () => {
      await payroll.determineAllocation([payroll.address, usdToken.address, erc20Token1.address], [10, 20, 70], {from: employee1});
    });
  });

  it("fails on Token allocation by non-employee", async () => {
    // should throw as caller is not an employee
    return assertRevert(async () => {
      await payroll.determineAllocation([ETH, usdToken.address, erc20Token1.address], [10, 20, 70], {from: unused_account});
    });
  });

  it("fails on Token allocation if arrays mismatch", async () => {
    // should throw as arrays sizes are different
    return assertRevert(async () => {
      await payroll.determineAllocation([ETH, usdToken.address, erc20Token1.address], [10, 90], {from: employee1});
    });
  });

  it("tests payday", async () => {
    let usdTokenAllocation = 50;
    let erc20Token1Allocation = 20;
    let ethAllocation = 100 - usdTokenAllocation - erc20Token1Allocation;
    let initialEthPayroll;
    let initialUsdTokenPayroll;
    let initialErc20Token1Payroll;
    let initialEthEmployee2;
    let initialUsdTokenEmployee2;
    let initialErc20Token1Employee2;

    const setInitialBalances = async () => {
      initialEthPayroll = await getBalance(vault.address);
      initialEthEmployee2 = await getBalance(employee2);
      // Token initial balances
      initialUsdTokenPayroll = await usdToken.balanceOf(vault.address);
      initialErc20Token1Payroll = await erc20Token1.balanceOf(vault.address);
      initialUsdTokenEmployee2 = await usdToken.balanceOf(employee2);
      initialErc20Token1Employee2 = await erc20Token1.balanceOf(employee2);
    };

    const logPayroll = function(salary, initialBalancePayroll, initialBalanceEmployee, payed, newBalancePayroll, newBalanceEmployee, expectedPayroll, expectedEmployee, name='') {
      console.log("");
      console.log("Checking " + name);
      console.log("Salary: " + salary);
      console.log("-------------------")
      console.log("Initial " + name + " Payroll: " + web3.fromWei(initialBalancePayroll, 'ether'));
      console.log("Initial " + name + " Employee: " + web3.fromWei(initialBalanceEmployee, 'ether'));
      console.log("-------------------")
      console.log("Payed: " + web3.fromWei(payed, 'ether'));
      console.log("-------------------")
      console.log("new " + name + " payroll: " + web3.fromWei(newBalancePayroll, 'ether'));
      console.log("expected " + name + " payroll: " + web3.fromWei(expectedPayroll, 'ether'));
      console.log("New " + name + " employee: " + web3.fromWei(newBalanceEmployee, 'ether'));
      console.log("Expected " + name + " employee: " + web3.fromWei(expectedEmployee, 'ether'));
      console.log("-------------------")
      console.log("Real payed: " + web3.fromWei(initialBalancePayroll.minus(newBalancePayroll), 'ether'))
      console.log("Real earned: " + web3.fromWei(newBalanceEmployee.minus(initialBalanceEmployee), 'ether'))
      console.log("");
    };

    const checkTokenBalances = async (token, salary, timePassed, initialBalancePayroll, initialBalanceEmployee, exchangeRate, allocation, name='') => {
      let payed = (new web3.BigNumber(salary)).times(USD_PRECISION).dividedToIntegerBy(SECONDS_IN_A_YEAR).times(exchangeRate).times(allocation).dividedToIntegerBy(100).times(timePassed);
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

    const checkPayday = async (transaction, timePassed) => {
      // Check ETH
      let tx = await getTransaction(transaction.tx);
      let gasPrice = new web3.BigNumber(tx.gasPrice);
      let txFee = gasPrice.times(transaction.receipt.cumulativeGasUsed);
      let newEthPayroll = await getBalance(vault.address);
      let newEthEmployee2 = await getBalance(employee2);
      let payed = (new web3.BigNumber(salary2)).times(USD_PRECISION).dividedToIntegerBy(SECONDS_IN_A_YEAR).times(etherExchangeRate).times(ethAllocation).dividedToIntegerBy(100).times(timePassed);
      let expectedPayroll = initialEthPayroll.minus(payed);
      let expectedEmployee2 = initialEthEmployee2.plus(payed).minus(txFee);
      //logPayroll(salary2, initialEthPayroll, initialEthEmployee2, payed, newEthPayroll, newEthEmployee2, expectedPayroll, expectedEmployee2, "ETH");
      assert.equal(newEthPayroll.toString(), expectedPayroll.toString(), "Payroll Eth Balance doesn't match");
      assert.equal(newEthEmployee2.toString(), expectedEmployee2.toString(), "Employee Eth Balance doesn't match");
      // Check Tokens
      await checkTokenBalances(usdToken, salary2, timePassed, initialUsdTokenPayroll, initialUsdTokenEmployee2, 1, usdTokenAllocation, "USD");
      await checkTokenBalances(erc20Token1, salary2, timePassed, initialErc20Token1Payroll, initialErc20Token1Employee2, erc20Token1ExchangeRate, erc20Token1Allocation, "ERC20 1");
    };

    // determine allocation
    await payroll.determineAllocation([ETH, usdToken.address, erc20Token1.address], [ethAllocation, usdTokenAllocation, erc20Token1Allocation], {from: employee2});
    await setInitialBalances();
    let employeeId = 4;
    let timePassed = await getTimePassed(employeeId); // get employee 2
    // call payday
    let transaction = await payroll.payday({from: employee2});
    await checkPayday(transaction, timePassed);

    // check that time restrictions for payday and determineAllocation work in a positive way (i.e. when time has gone by)

    // payday
    // set time forward, 1 month
    let newTime = parseInt(await payroll.getTimestampPublic()) + 2678400; // 31 * 24 * 3600
    await payroll.mockSetTimestamp(newTime); // 31 * 24 * 3600
    await setInitialBalances();
    timePassed = await getTimePassed(employeeId); // get employee 2
    // call payday again
    let transaction2 = await payroll.payday({from: employee2});
    await checkPayday(transaction2, timePassed);

    // determineAllocation
    // set time forward, 5 more months
    await payroll.mockSetTimestamp(parseInt(await payroll.getTimestampPublic()) + 13392000); // 5 * 31 * 24 * 3600
    await payroll.determineAllocation([ETH, usdToken.address, erc20Token1.address], [15, 60, 25], {from: employee2});
    assert.equal((await payroll.getAllocation(ETH, {from: employee2})).valueOf(), 15, "ETH allocation doesn't match");
    assert.equal((await payroll.getAllocation(usdToken.address, {from: employee2})).valueOf(), 60, "USD allocation doesn't match");
    assert.equal((await payroll.getAllocation(erc20Token1.address, {from: employee2})).valueOf(), 25, "ERC 20 Token 1 allocation doesn't match");
  });

});
