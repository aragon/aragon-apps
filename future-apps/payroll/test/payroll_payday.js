const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const getBalance = require('@aragon/test-helpers/balance')(web3)
const getTransaction = require('@aragon/test-helpers/transaction')(web3)

const getContract = name => artifacts.require(name)
const getEvent = (receipt, event, arg) => { return receipt.logs.filter(l => l.event == event)[0].args[arg] }

contract('Payroll, allocation and payday,', function(accounts) {
  const USD_DECIMALS = 18
  const USD_PRECISION = 10 ** USD_DECIMALS
  const SECONDS_IN_A_YEAR = 31557600 // 365.25 days
  const ONE = 1e18
  const ETH = "0x0"
  const rateExpiryTime = 1000

  const [owner, employee] = accounts
  const unused_account = accounts[7]
  const {
    deployErc20TokenAndDeposit,
    addAllowedTokens,
    getTimePassed,
    redistributeEth,
    getDaoFinanceVault,
    initializePayroll
  } = require("./helpers.js")(owner)
  let salary = (new web3.BigNumber(10000)).times(USD_PRECISION).dividedToIntegerBy(SECONDS_IN_A_YEAR)

  let usdToken
  let erc20Token1
  let erc20Token1ExchangeRate
  const erc20Token1Decimals = 20
  let erc20Token2;
  const erc20Token2Decimals = 16;
  let etherExchangeRate

  let payroll
  let ayrollBase
  let priceFeed
  let employeeId
  let dao
  let finance
  let vault

  before(async () => {
    payrollBase = await getContract("PayrollMock").new()

    const daoAndFinance = await getDaoFinanceVault()

    dao = daoAndFinance.dao
    finance = daoAndFinance.finance
    vault = daoAndFinance.vault

    usdToken = await deployErc20TokenAndDeposit(owner, finance, vault, "USD", USD_DECIMALS)
    priceFeed = await getContract("PriceFeedMock").new()

    // Deploy ERC 20 Tokens
    erc20Token1 = await deployErc20TokenAndDeposit(owner, finance, vault, "Token 1", erc20Token1Decimals)
    erc20Token2 = await deployErc20TokenAndDeposit(owner, finance, vault, "Token 2", erc20Token2Decimals);

    // make sure owner and Payroll have enough funds
    await redistributeEth(accounts, finance)
  })

  beforeEach(async () => {
    payroll = await initializePayroll(
      dao,
      payrollBase,
      finance,
      usdToken,
      priceFeed,
      rateExpiryTime
    )

    // adds allowed tokens
    await addAllowedTokens(payroll, [usdToken, erc20Token1])

    // add employee
    const r = await payroll.addEmployeeWithNameAndStartDate(employee, salary, "", parseInt(await payroll.getTimestampPublic.call(), 10) - 2628005) // now minus 1/12 year
    employeeId = getEvent(r, 'AddEmployee', 'employeeId')
  })

  it("fails on payday with no token allocation", async () => {
    // make sure this payroll has enough funds
    let usdTokenFunds = new web3.BigNumber(10**9).times(USD_PRECISION)
    let erc20Token1Funds = new web3.BigNumber(10**9).times(10**erc20Token1Decimals)

    await usdToken.generateTokens(owner, usdTokenFunds)
    await erc20Token1.generateTokens(owner, erc20Token1Funds)

    // Send funds to Finance
    await usdToken.approve(finance.address, usdTokenFunds, {from: owner})
    await finance.deposit(usdToken.address, usdTokenFunds, "USD payroll", {from: owner})
    await erc20Token1.approve(finance.address, erc20Token1Funds, {from: owner})
    await finance.deposit(erc20Token1.address, erc20Token1Funds, "ERC20 1 payroll", {from: owner})

    // No Token allocation
    return assertRevert(async () => {
      await payroll.payday({from: employee})
    })
  })

  it("fails on payday with a zero exchange rate token", async () => {
    let priceFeedFail = await getContract('PriceFeedFailMock').new()
    await payroll.setPriceFeed(priceFeedFail.address)
    // Allocation
    await payroll.determineAllocation([ETH, usdToken.address, erc20Token1.address], [10, 20, 70], {from: employee})
    // Zero exchange rate
    return assertRevert(async () => {
      await payroll.payday({from: employee})
    })
  })

  it("fails on payday by non-employee", async () => {
    // should throw as caller is not an employee
    return assertRevert(async () => {
      await payroll.payday({from: unused_account})
    })
  })

  it("fails on payday after 0 seconds", async () => {
    // correct priceFeed, make sure rates are correct
    await payroll.setPriceFeed(priceFeed.address)
    // determine allocation
    await payroll.determineAllocation([usdToken.address], [100], {from: employee})
    // correct payday
    await payroll.payday({from: employee})
    // payday called again too early: if 0 seconds have passed, payroll would be 0
    return assertRevert(async () => {
      await payroll.payday({from: employee})
    })
  })

  it("fails on Token allocation if greater than 100", async () => {
    // should throw as total allocation is greater than 100
    return assertRevert(async () => {
      await payroll.determineAllocation([ETH, usdToken.address, erc20Token1.address], [20, 30, 90], {from: employee})
    })
  })

  it("fails on Token allocation because of overflow", async () => {
    // should throw as total allocation overflow
    return assertRevert(async () => {
      await payroll.determineAllocation([ETH, usdToken.address, erc20Token1.address], [120, 100, 90], {from: employee})
    })
  })

  it("fails on Token allocation if lower than 100", async () => {
    // should throw as total allocation is lower than 100
    return assertRevert(async () => {
      await payroll.determineAllocation([ETH, usdToken.address, erc20Token1.address], [5, 30, 40], {from: employee})
    })
  })

  it("fails on Token allocation for not allowed token", async () => {
    // should throw as it's not an allowed token
    return assertRevert(async () => {
      await payroll.determineAllocation([payroll.address, usdToken.address, erc20Token1.address], [10, 20, 70], {from: employee})
    })
  })

  it("fails on Token allocation by non-employee", async () => {
    // should throw as caller is not an employee
    return assertRevert(async () => {
      await payroll.determineAllocation([ETH, usdToken.address, erc20Token1.address], [10, 20, 70], {from: unused_account})
    })
  })

  it("fails on Token allocation if arrays mismatch", async () => {
    // should throw as arrays sizes are different
    return assertRevert(async () => {
      await payroll.determineAllocation([ETH, usdToken.address, erc20Token1.address], [10, 90], {from: employee})
    })
  })

  it("tests payday", async () => {
    let usdTokenAllocation = 50
    let erc20Token1Allocation = 20
    let ethAllocation = 100 - usdTokenAllocation - erc20Token1Allocation
    let initialEthPayroll
    let initialUsdTokenPayroll
    let initialErc20Token1Payroll
    let initialEthEmployee
    let initialUsdTokenEmployee
    let initialErc20Token1Employee

    const setInitialBalances = async () => {
      initialEthPayroll = await getBalance(vault.address)
      initialEthEmployee = await getBalance(employee)
      // Token initial balances
      initialUsdTokenPayroll = await usdToken.balanceOf(vault.address)
      initialErc20Token1Payroll = await erc20Token1.balanceOf(vault.address)
      initialUsdTokenEmployee = await usdToken.balanceOf(employee)
      initialErc20Token1Employee = await erc20Token1.balanceOf(employee)
    }

    const logPayroll = function(salary, initialBalancePayroll, initialBalanceEmployee, payed, newBalancePayroll, newBalanceEmployee, expectedPayroll, expectedEmployee, name='') {
      console.log("")
      console.log("Checking " + name)
      console.log("Salary: " + salary)
      console.log("-------------------")
      console.log("Initial " + name + " Payroll: " + web3.fromWei(initialBalancePayroll, 'ether'))
      console.log("Initial " + name + " Employee: " + web3.fromWei(initialBalanceEmployee, 'ether'))
      console.log("-------------------")
      console.log("Payed: " + web3.fromWei(payed, 'ether'))
      console.log("-------------------")
      console.log("new " + name + " payroll: " + web3.fromWei(newBalancePayroll, 'ether'))
      console.log("expected " + name + " payroll: " + web3.fromWei(expectedPayroll, 'ether'))
      console.log("New " + name + " employee: " + web3.fromWei(newBalanceEmployee, 'ether'))
      console.log("Expected " + name + " employee: " + web3.fromWei(expectedEmployee, 'ether'))
      console.log("-------------------")
      console.log("Real payed: " + web3.fromWei(initialBalancePayroll.minus(newBalancePayroll), 'ether'))
      console.log("Real earned: " + web3.fromWei(newBalanceEmployee.minus(initialBalanceEmployee), 'ether'))
      console.log("")
    }

    const checkTokenBalances = async (token, salary, timePassed, initialBalancePayroll, initialBalanceEmployee, exchangeRate, allocation, name='') => {
      let payed = salary.times(exchangeRate).times(allocation).times(timePassed).dividedToIntegerBy(100).dividedToIntegerBy(ONE)
      let expectedPayroll = initialBalancePayroll.minus(payed)
      let expectedEmployee = initialBalanceEmployee.plus(payed)
      let newBalancePayroll
      let newBalanceEmployee
      newBalancePayroll = await token.balanceOf(vault.address)
      newBalanceEmployee = await token.balanceOf(employee)
      //logPayroll(salary, initialBalancePayroll, initialBalanceEmployee, payed, newBalancePayroll, newBalanceEmployee, expectedPayroll, expectedEmployee, name)
      assert.equal(newBalancePayroll.toString(), expectedPayroll.toString(), "Payroll balance of Token " + name + " doesn't match")
      assert.equal(newBalanceEmployee.toString(), expectedEmployee.toString(), "Employee balance of Token " + name + " doesn't match")
    }

    const checkPayday = async (transaction, timePassed) => {
      // Check ETH
      let tx = await getTransaction(transaction.tx)
      let gasPrice = new web3.BigNumber(tx.gasPrice)
      let txFee = gasPrice.times(transaction.receipt.cumulativeGasUsed)
      let newEthPayroll = await getBalance(vault.address)
      let newEthEmployee = await getBalance(employee)
      let payed = salary.times(etherExchangeRate).times(ethAllocation).times(timePassed).dividedToIntegerBy(100).dividedToIntegerBy(ONE)
      let expectedPayroll = initialEthPayroll.minus(payed)
      let expectedEmployee = initialEthEmployee.plus(payed).minus(txFee)
      //logPayroll(salary, initialEthPayroll, initialEthEmployee, payed, newEthPayroll, newEthEmployee, expectedPayroll, expectedEmployee, "ETH")
      assert.equal(newEthPayroll.toString(), expectedPayroll.toString(), "Payroll Eth Balance doesn't match")
      assert.equal(newEthEmployee.toString(), expectedEmployee.toString(), "Employee Eth Balance doesn't match")
      // Check Tokens
      await checkTokenBalances(usdToken, salary, timePassed, initialUsdTokenPayroll, initialUsdTokenEmployee, ONE, usdTokenAllocation, "USD")
      await checkTokenBalances(erc20Token1, salary, timePassed, initialErc20Token1Payroll, initialErc20Token1Employee, erc20Token1ExchangeRate, erc20Token1Allocation, "ERC20 1")
    }
    // determine allocation
    await payroll.determineAllocation([ETH, usdToken.address, erc20Token1.address], [ethAllocation, usdTokenAllocation, erc20Token1Allocation], {from: employee})
    await setInitialBalances()
    const timePassed = await getTimePassed(payroll, employeeId)
    // call payday
    let transaction = await payroll.payday({from: employee})
    await checkPayday(transaction, timePassed)

    // check that we can call payday again after some time
    // set time forward, 1 month
    const timePassed2 = 2678400
    await payroll.mockAddTimestamp(timePassed2)
    // we need to forward time in price feed, or rate will be obsolete
    await priceFeed.mockAddTimestamp(timePassed2)
    await setInitialBalances()
    // call payday again
    let transaction2 = await payroll.payday({from: employee})
    await checkPayday(transaction2, timePassed2)

    // check that determineAllocation can be called again
    // set time forward, 5 more months
    const timePassed3 = 13392000 // 5 * 31 * 24 * 3600
    await payroll.mockAddTimestamp(timePassed3)
    // we need to forward time in price feed, or rate will be obsolete
    await priceFeed.mockAddTimestamp(timePassed3)
    await payroll.determineAllocation([ETH, usdToken.address, erc20Token1.address], [15, 60, 25], {from: employee})
    assert.equal((await payroll.getAllocation(ETH, {from: employee})).valueOf(), 15, "ETH allocation doesn't match")
    assert.equal((await payroll.getAllocation(usdToken.address, {from: employee})).valueOf(), 60, "USD allocation doesn't match")
    assert.equal((await payroll.getAllocation(erc20Token1.address, {from: employee})).valueOf(), 25, "ERC 20 Token 1 allocation doesn't match")
  })

  it("determining allocation deletes previous entries", async () => {
    await payroll.determineAllocation([ETH], [100], {from: employee})
    await payroll.determineAllocation([usdToken.address], [100], {from: employee})
    const tokens = [usdToken, erc20Token1, erc20Token2]
    const currencies = [ETH].concat(tokens.map(c => c.address))
    let totalAllocation = 0
    for (let tokenAddress of currencies) {
      totalAllocation += parseInt(await payroll.getAllocation(tokenAddress, {from: employee}), 10)
    }
    assert.equal(totalAllocation, 100, "Total allocation should remain 100")
  })

})
