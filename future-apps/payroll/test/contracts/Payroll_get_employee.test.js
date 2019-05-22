const { MAX_UINT64 } = require('../helpers/numbers')(web3)
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { getEventArgument } = require('../helpers/events')
const { NOW, RATE_EXPIRATION_TIME } = require('../helpers/time')
const { annualSalaryPerSecond } = require('../helpers/numbers')(web3)
const { USD, deployDAI } = require('../helpers/tokens')(artifacts, web3)
const { deployContracts, createPayrollAndPriceFeed } = require('../helpers/deploy')(artifacts, web3)

contract('Payroll employee getters', ([owner, employee]) => {
  let dao, payroll, payrollBase, finance, vault, priceFeed, DAI

  const currentTimestamp = async () => payroll.getTimestampPublic()

  before('deploy base apps and tokens', async () => {
    ({ dao, finance, vault, payrollBase } = await deployContracts(owner))
    DAI = await deployDAI(owner, finance)
  })

  beforeEach('create payroll and price feed instance', async () => {
    ({ payroll, priceFeed } = await createPayrollAndPriceFeed(dao, payrollBase, owner, NOW))
  })

  describe('getEmployee', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app using USD as denomination token', async () => {
        await payroll.initialize(finance.address, USD, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the given id exists', () => {
        let employeeId
        const salary = annualSalaryPerSecond(100000)

        beforeEach('add employee', async () => {
          const receipt = await payroll.addEmployee(employee, salary, await payroll.getTimestampPublic(), 'Boss', { from: owner })
          employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId').toString()
        })

        it('adds a new employee', async () => {
          const [address, employeeSalary, accruedSalary, bonus, reimbursements, lastPayroll, endDate] = await payroll.getEmployee(employeeId)

          assert.equal(address, employee, 'employee address does not match')
          assert.equal(employeeSalary.toString(), salary.toString(), 'employee salary does not match')
          assert.equal(accruedSalary.toString(), 0, 'employee accrued salary does not match')
          assert.equal(bonus.toString(), 0, 'employee bonus does not match')
          assert.equal(reimbursements.toString(), 0, 'employee reimbursements does not match')
          assert.equal(lastPayroll.toString(), (await currentTimestamp()).toString(), 'employee last payroll does not match')
          assert.equal(endDate.toString(), MAX_UINT64, 'employee end date does not match')
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
      beforeEach('initialize payroll app using USD as denomination token', async () => {
        await payroll.initialize(finance.address, USD, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the given address exists', () => {
        let employeeId
        const address = employee
        const salary = annualSalaryPerSecond(100000)

        beforeEach('add employee', async () => {
          const receipt = await payroll.addEmployee(employee, salary, await payroll.getTimestampPublic(), 'Boss', { from: owner })
          employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
        })

        it('adds a new employee', async () => {
          const [id, employeeSalary, accruedSalary, bonus, reimbursements, lastPayroll, endDate] = await payroll.getEmployeeByAddress(address)

          assert.equal(id.toString(), employeeId.toString(), 'employee id does not match')
          assert.equal(employeeSalary.toString(), salary.toString(), 'employee salary does not match')
          assert.equal(accruedSalary.toString(), 0, 'employee accrued salary does not match')
          assert.equal(bonus.toString(), 0, 'employee bonus does not match')
          assert.equal(reimbursements.toString(), 0, 'employee reimbursements does not match')
          assert.equal(lastPayroll.toString(), (await currentTimestamp()).toString(), 'employee last payroll does not match')
          assert.equal(endDate.toString(), MAX_UINT64, 'employee end date does not match')
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
