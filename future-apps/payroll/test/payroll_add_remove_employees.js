const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const getBalance = require('@aragon/test-helpers/balance')(web3)
const getTransaction = require('@aragon/test-helpers/transaction')(web3)

const getContract = name => artifacts.require(name)
const getEvent = (receipt, event, arg) => { return receipt.logs.filter(l => l.event == event)[0].args[arg] }

contract('Payroll, adding and removing employees,', function(accounts) {
  const [owner, employee1, employee2] = accounts
  const {
    deployErc20TokenAndDeposit,
    addAllowedTokens,
    getTimePassed,
    getDaoFinanceVault,
    initializePayroll
  } = require('./helpers.js')(owner)

  const USD_DECIMALS= 18
  const USD_PRECISION = 10**USD_DECIMALS
  const SECONDS_IN_A_YEAR = 31557600 // 365.25 days
  const ONE = 1e18
  const ETH = '0x0'
  const rateExpiryTime = 1000

  const salary1 = (new web3.BigNumber(100000)).times(USD_PRECISION).dividedToIntegerBy(SECONDS_IN_A_YEAR)
  const salary1_2 = (new web3.BigNumber(125000)).times(USD_PRECISION).dividedToIntegerBy(SECONDS_IN_A_YEAR)
  const salary2 = (new web3.BigNumber(120000)).times(USD_PRECISION).dividedToIntegerBy(SECONDS_IN_A_YEAR)
  const erc20Token1Decimals = 18

  let payroll
  let payrollBase
  let priceFeed
  let usdToken
  let erc20Token1
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

    payroll = await initializePayroll(dao, payrollBase, finance, usdToken, priceFeed, rateExpiryTime)

    // adds allowed tokens
    await addAllowedTokens(payroll, [usdToken, erc20Token1])
  })

  context('> Adding employee', () => {
    const employeeName = 'Kakaroto'
    const role = 'Saiyajin'
    let employeeId, payrollTimestamp

    beforeEach(async () => {
      payroll = await initializePayroll(dao, payrollBase, finance, usdToken, priceFeed, rateExpiryTime)

      // adds allowed tokens
      await addAllowedTokens(payroll, [usdToken, erc20Token1])

      payrollTimestamp = (await payroll.getTimestampPublic()).toString()

      // add employee
      const receipt= await payroll.addEmployeeShort(employee1, salary1, employeeName, role)
      employeeId = getEvent(receipt, 'AddEmployee', 'employeeId').toString()
    })

    it('get employee by its Id', async () => {
      const employee = await payroll.getEmployee(employeeId)
      assert.equal(employee[0], employee1, "Employee account doesn't match")
      assert.equal(employee[1].toString(), salary1.toString(), "Employee salary doesn't match")
      assert.equal(employee[2].toString(), 0, "Employee accrued value doesn't match")
      assert.equal(employee[3].toString(), payrollTimestamp, "last payroll should match")
    })

    it('get employee by its address', async () => {
      const employee = await payroll.getEmployeeByAddress(employee1)
      assert.equal(employee[0].toString(), employeeId, "Employee Id doesn't match")
      assert.equal(employee[1].toString(), salary1.toString(), "Employee salary doesn't match")
      assert.equal(employee[2].toString(), 0, "Employee accrued value doesn't match")
      assert.equal(employee[3].toString(), (await payroll.getTimestampPublic()).toString(), "last payroll should match")
    })

    it("adds another employee", async () => {
      const employee2Name = 'Joe'

      const receipt = await payroll.addEmployeeShort(employee2, salary2, employee2Name, role)
      const employee2Id = getEvent(receipt, 'AddEmployee', 'employeeId')

      // Check event
      const addEvent = receipt.logs.filter(l => l.event == 'AddEmployee')[0]
      assert.equal(addEvent.args.employeeId.toString(), employee2Id, "Employee Id doesn't match")
      assert.equal(addEvent.args.accountAddress, employee2, "Employee account doesn't match")
      assert.equal(addEvent.args.initialDenominationSalary.toString(), salary2, "Employee salary doesn't match")
      assert.equal(addEvent.args.name, employee2Name, "Employee name doesn't match")
      assert.equal(addEvent.args.role, role, "Employee role doesn't match")
      assert.equal(addEvent.args.startDate, payrollTimestamp, "Employee startdate doesn't match")

      // Check storage
      const employee = await payroll.getEmployee(employee2Id)
      assert.equal(employee[0], employee2, "Employee account doesn't match")
      assert.equal(employee[1].toString(), salary2.toString(), "Employee salary doesn't match")
      assert.equal(employee[2].toString(), 0, "Employee accrued value doesn't match")
      assert.equal(employee[3].toString(), payrollTimestamp, "last payroll should match")
    })

    it("fails adding again same employee", async () => {
      // Make sure that the employee exists
      const existingEmployee = await payroll.getEmployeeByAddress(employee1)
      assert.equal(existingEmployee[0].toString(), employeeId, "First employee id doesn't match")

      // Now try to add him again
      const name = 'Joe'
      return assertRevert(async () => {
        await payroll.addEmployeeShort(employee1, salary1, name, role)
      })
    })
  })

  context('> Removing employee', () => {
    const role = 'Saiyajin'
    let employeeId

    beforeEach(async () => {
      payroll = await initializePayroll(dao, payrollBase, finance, usdToken, priceFeed, rateExpiryTime)

      // adds allowed tokens
      await addAllowedTokens(payroll, [usdToken, erc20Token1])

      // add employee
      const receipt = await payroll.addEmployeeShort(employee1, salary1, 'Kakaroto', role)
      employeeId = getEvent(receipt, 'AddEmployee', 'employeeId').toString()
    })

    it("terminates employee with remaining payroll", async () => {
      const timePassed = 1000
      const initialBalance = await usdToken.balanceOf(employee1)
      await payroll.determineAllocation([usdToken.address], [100], { from: employee1 })

      // Accrue some salary
      await payroll.mockAddTimestamp(timePassed)
      const owed = salary1.times(timePassed)

      // Terminate employee
      await payroll.terminateEmployeeNow(employeeId)
      await payroll.mockAddTimestamp(timePassed)

      // owed salary is only added to accrued value, employee need to call `payday` again
      let finalBalance = await usdToken.balanceOf(employee1)
      assert.equal(finalBalance.toString(), initialBalance.toString())

      await payroll.payday({ from: employee1 })
      finalBalance = await usdToken.balanceOf(employee1)
      assert.equal(finalBalance.toString(), initialBalance.add(owed).toString())
    })

    it("fails on removing non-existent employee", async () => {
      return assertRevert(async () => {
        await payroll.terminateEmployee(10, await payroll.getTimestampPublic.call())
      })
    })

    it('fails trying to terminate an employee in the past', async () => {
      const nowMock = new Date().getTime()
      const terminationDate = nowMock - 1

      await payroll.mockSetTimestamp(nowMock)

      return assertRevert(async () => {
        await payroll.terminateEmployee(employeeId, terminationDate)
      })
    })

    it('fails trying to re-terminate employee', async () => {
      const timestamp = parseInt(await payroll.getTimestampPublic.call(), 10)
      await payroll.terminateEmployeeNow(employeeId)
      await payroll.mockSetTimestamp(timestamp + 500);
      return assertRevert(async () => {
        await payroll.terminateEmployee(employeeId, timestamp + SECONDS_IN_A_YEAR)
      })
    })

    it("can re-add removed employee with specific start date", async () => {
      // Make sure that the employee exists
      const existingEmployee = await payroll.getEmployeeByAddress(employee1)
      assert.equal(existingEmployee[0].toString(), employeeId, "First employee id doesn't match")

      // Set their allocation so we can pay them out
      await payroll.determineAllocation([usdToken.address], [100], { from: employee1 })

      // Then terminate him and pay them out
      const timestamp = parseInt(await payroll.getTimestampPublic.call(), 10)
      await payroll.mockSetTimestamp(timestamp + 500);
      await payroll.terminateEmployeeNow(employeeId)
      await payroll.payday({ from: employee1 })

      // Now let's add them back
      const name = 'Kakaroto'
      const startDate = Math.floor((new Date()).getTime() / 1000) - 2628600

      const receipt = await payroll.addEmployee(employee1, salary1_2, name, role, startDate)
      const newId = getEvent(receipt, 'AddEmployee', 'employeeId')

      const newEmployee = await payroll.getEmployee(newId)
      assert.equal(newEmployee[0], employee1, "Employee account doesn't match")
      assert.equal(newEmployee[1].toString(), salary1_2.toString(), "Employee salary doesn't match")
      assert.equal(newEmployee[2].toString(), 0, "Employee accrued value doesn't match")
      assert.equal(newEmployee[3].toString(), startDate, "Employee last paydate should match")
    })
  })
})
