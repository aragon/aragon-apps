const { maxUint64 } = require('../helpers/numbers')(web3)
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { getEventArgument } = require('../helpers/events')
const { deployErc20TokenAndDeposit, redistributeEth, deployContracts, createPayrollInstance, mockTimestamps } = require('../helpers/setup.js')(artifacts, web3)

contract('Payroll employee getters', ([owner, employee]) => {
  let dao, payroll, payrollBase, finance, vault, priceFeed, denominationToken, anotherToken

  const NOW = 1553703809 // random fixed timestamp in seconds
  const ONE_MONTH = 60 * 60 * 24 * 31
  const TWO_MONTHS = ONE_MONTH * 2
  const RATE_EXPIRATION_TIME = TWO_MONTHS

  const DENOMINATION_TOKEN_DECIMALS = 18

  const currentTimestamp = async () => payroll.getTimestampPublic()

  before('setup base apps and tokens', async () => {
    ({ dao, finance, vault, priceFeed, payrollBase } = await deployContracts(owner))
    anotherToken = await deployErc20TokenAndDeposit(owner, finance, vault, 'Another token', 18)
    denominationToken = await deployErc20TokenAndDeposit(owner, finance, vault, 'Denomination Token', DENOMINATION_TOKEN_DECIMALS)
    await redistributeEth(finance)
  })

  beforeEach('setup payroll instance', async () => {
    payroll = await createPayrollInstance(dao, payrollBase, owner)
    await mockTimestamps(payroll, priceFeed, NOW)
  })

  describe('getEmployee', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the given id exists', () => {
        let employeeId

        beforeEach('add employee', async () => {
          const receipt = await payroll.addEmployeeNow(employee, 1000, 'John Doe', 'Boss', { from: owner })
          employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId').toString()
        })

        it('adds a new employee', async () => {
          const [address, salary, accruedValue, lastPayroll, endDate] = await payroll.getEmployee(employeeId)

          assert.equal(address, employee, 'employee address does not match')
          assert.equal(accruedValue, 0, 'Employee accrued value does not match')
          assert.equal(salary.toString(), 1000, 'Employee salary does not match')
          assert.equal(lastPayroll.toString(), (await currentTimestamp()).toString(), 'last payroll should match')
          assert.equal(endDate.toString(), maxUint64(), 'last payroll should match')
        })
      })

      context('when the given id does not exist', () => {
        const employeeId = 0

        it('reverts', async () => {
          await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      const employeeId = 0

      it('reverts', async () => {
        await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')
      })
    })
  })

  describe('getEmployeeByAddress', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the given address exists', () => {
        let employeeId
        const address = employee

        beforeEach('add employee', async () => {
          const receipt = await payroll.addEmployeeNow(employee, 1000, 'John Doe', 'Boss', { from: owner })
          employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
        })

        it('adds a new employee', async () => {
          const [id, salary, accruedValue, lastPayroll, endDate] = await payroll.getEmployeeByAddress(address)

          assert.equal(id.toString(), employeeId.toString(), 'employee id does not match')
          assert.equal(salary.toString(), 1000, 'employee salary does not match')
          assert.equal(accruedValue.toString(), 0, 'employee accrued value does not match')
          assert.equal(lastPayroll.toString(), (await currentTimestamp()).toString(), 'last payroll should match')
          assert.equal(endDate.toString(), maxUint64(), 'last payroll should match')
        })
      })

      context('when the given id does not exist', () => {
        const employeeId = 0

        it('reverts', async () => {
          await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      it('reverts', async () => {
        await assertRevert(payroll.getEmployeeByAddress(employee), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')
      })
    })
  })
})
