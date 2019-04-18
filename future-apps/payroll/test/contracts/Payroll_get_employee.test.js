const { maxUint64 } = require('../helpers/numbers')(web3)
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { getEventArgument } = require('../helpers/events')
const { deployErc20TokenAndDeposit, deployContracts, createPayrollAndPriceFeed } = require('../helpers/deploy.js')(artifacts, web3)

contract('Payroll employee getters', ([owner, employee]) => {
  let dao, payroll, payrollBase, finance, vault, priceFeed, denominationToken

  const NOW = 1553703809 // random fixed timestamp in seconds
  const ONE_MONTH = 60 * 60 * 24 * 31
  const TWO_MONTHS = ONE_MONTH * 2
  const RATE_EXPIRATION_TIME = TWO_MONTHS

  const TOKEN_DECIMALS = 18

  const currentTimestamp = async () => payroll.getTimestampPublic()

  before('deploy base apps and tokens', async () => {
    ({ dao, finance, vault, payrollBase } = await deployContracts(owner))
    denominationToken = await deployErc20TokenAndDeposit(owner, finance, 'Denomination Token', TOKEN_DECIMALS)
  })

  beforeEach('create payroll and price feed instance', async () => {
    ({ payroll, priceFeed } = await createPayrollAndPriceFeed(dao, payrollBase, owner, NOW))
  })

  describe('getEmployee', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the given id exists', () => {
        let employeeId

        beforeEach('add employee', async () => {
          const receipt = await payroll.addEmployee(employee, 1000, 'Boss', await payroll.getTimestampPublic(), { from: owner })
          employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId').toString()
        })

        it('adds a new employee', async () => {
          const [address, salary, bonus, reimbursements, accruedSalary, lastPayroll, endDate] = await payroll.getEmployee(employeeId)

          assert.equal(address, employee, 'employee address does not match')
          assert.equal(bonus.toString(), 0, 'employee bonus does not match')
          assert.equal(reimbursements, 0, 'employee reimbursements does not match')
          assert.equal(accruedSalary, 0, 'employee accrued salary does not match')
          assert.equal(salary.toString(), 1000, 'employee salary does not match')
          assert.equal(lastPayroll.toString(), (await currentTimestamp()).toString(), 'employee last payroll does not match')
          assert.equal(endDate.toString(), maxUint64(), 'employee end date does not match')
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
          const receipt = await payroll.addEmployee(employee, 1000, 'Boss', await payroll.getTimestampPublic(), { from: owner })
          employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
        })

        it('adds a new employee', async () => {
          const [id, salary, bonus, reimbursements, accruedSalary, lastPayroll, endDate] = await payroll.getEmployeeByAddress(address)

          assert.equal(id.toString(), employeeId.toString(), 'employee id does not match')
          assert.equal(salary.toString(), 1000, 'employee salary does not match')
          assert.equal(bonus.toString(), 0, 'employee bonus does not match')
          assert.equal(reimbursements.toString(), 0, 'employee reimbursements does not match')
          assert.equal(accruedSalary.toString(), 0, 'employee accrued salary does not match')
          assert.equal(lastPayroll.toString(), (await currentTimestamp()).toString(), 'employee last payroll does not match')
          assert.equal(endDate.toString(), maxUint64(), 'employee end date does not match')
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
