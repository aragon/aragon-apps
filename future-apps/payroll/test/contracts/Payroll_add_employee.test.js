const { MAX_UINT64 } = require('@aragon/test-helpers/numbers')(web3)
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { USD, deployDAI } = require('../helpers/tokens')(artifacts, web3)
const { annualSalaryPerSecond } = require('../helpers/salary')(web3)
const { getEvents, getEventArgument } = require('@aragon/test-helpers/events')
const { NOW, TWO_MONTHS, RATE_EXPIRATION_TIME } = require('../helpers/time')
const { deployContracts, createPayrollAndPriceFeed } = require('../helpers/deploy')(artifacts, web3)

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

contract('Payroll employees addition', ([owner, employee, anotherEmployee, anyone]) => {
  let dao, payroll, payrollBase, finance, vault, priceFeed, DAI

  before('deploy base apps and tokens', async () => {
    ({ dao, finance, vault, payrollBase } = await deployContracts(owner))
    DAI = await deployDAI(owner, finance)
  })

  beforeEach('create payroll and price feed instance', async () => {
    ({ payroll, priceFeed } = await createPayrollAndPriceFeed(dao, payrollBase, owner, NOW))
  })

  describe('addEmployee', () => {
    const role = 'Boss'
    const salary = annualSalaryPerSecond(100000)

    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app using USD as denomination token', async () => {
        await payroll.initialize(finance.address, USD, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender has permissions to add employees', () => {
        const from = owner

        context('when the employee has not been added yet', () => {
          let receipt, employeeId

          const itHandlesAddingNewEmployeesProperly = startDate => {
            context('when the employee address is not the zero address', () => {
              const address = employee

              beforeEach('add employee', async () => {
                receipt = await payroll.addEmployee(address, salary, startDate, role, { from })
                employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId').toString()
              })

              it('starts with ID 1', async () => {
                assert.equal(employeeId, 1, 'first employee ID should be 1')
              })

              it('adds a new employee and emits an event', async () => {
                const [address] = await payroll.getEmployee(employeeId)
                assert.equal(address, employee, 'employee address does not match')

                const events = getEvents(receipt, 'AddEmployee');
                assert.equal(events.length, 1, 'number of AddEmployee events does not match')

                const event = events[0].args
                assert.equal(event.employeeId, employeeId, 'employee id does not match')
                assert.equal(event.accountAddress, employee, 'employee address does not match')
                assert.equal(event.initialDenominationSalary.toString(), salary.toString(), 'employee salary does not match')
                assert.equal(event.startDate.toString(), startDate, 'employee start date does not match')
                assert.equal(event.role, role, 'employee role does not match')
              })

              it('can add another employee', async () => {
                const anotherRole = 'Manager'
                const anotherSalary = annualSalaryPerSecond(120000)

                const receipt = await payroll.addEmployee(anotherEmployee, anotherSalary, startDate, anotherRole)
                const anotherEmployeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')

                const events = getEvents(receipt, 'AddEmployee');
                assert.equal(events.length, 1, 'number of AddEmployee events does not match')

                const event = events[0].args
                assert.equal(event.employeeId, anotherEmployeeId, 'employee id does not match')
                assert.equal(event.accountAddress, anotherEmployee, 'employee address does not match')
                assert.equal(event.initialDenominationSalary.toString(), anotherSalary.toString(), 'employee salary does not match')
                assert.equal(event.startDate.toString(), startDate, 'employee start date does not match')
                assert.equal(event.role, anotherRole, 'employee role does not match')

                const [address, employeeSalary, accruedSalary, bonus, reimbursements, lastPayroll, endDate] = await payroll.getEmployee(anotherEmployeeId)
                assert.equal(address, anotherEmployee, 'employee address does not match')
                assert.equal(employeeSalary.toString(), anotherSalary.toString(), 'employee salary does not match')
                assert.equal(accruedSalary.toString(), 0, 'employee accrued salary does not match')
                assert.equal(bonus.toString(), 0, 'employee bonus does not match')
                assert.equal(reimbursements.toString(), 0, 'employee reimbursements does not match')
                assert.equal(lastPayroll.toString(), startDate.toString(), 'employee last payroll does not match')
                assert.equal(endDate.toString(), MAX_UINT64, 'employee end date does not match')
              })
            })

            context('when the employee address is not the zero address', () => {
              const address = ZERO_ADDRESS

              it('reverts', async () => {
                await assertRevert(payroll.addEmployee(address, salary, startDate, role, { from }), 'PAYROLL_EMPLOYEE_NULL_ADDRESS')
              })
            })
          }

          context('when the given end date is in the past ', () => {
            const startDate = NOW - TWO_MONTHS

            itHandlesAddingNewEmployeesProperly(startDate)
          })

          context('when the given end date is in the future', () => {
            const startDate = NOW + TWO_MONTHS

            itHandlesAddingNewEmployeesProperly(startDate)
          })
        })

        context('when the employee has already been added', () => {
          beforeEach('add employee', async () => {
            await payroll.addEmployee(employee, salary, NOW, role, { from })
          })

          context('when the given end date is in the past ', () => {
            const startDate = NOW - TWO_MONTHS

            it('reverts', async () => {
              await assertRevert(payroll.addEmployee(employee, salary, startDate, role, { from }), 'PAYROLL_EMPLOYEE_ALREADY_EXIST')
            })
          })

          context('when the given end date is in the future', () => {
            const startDate = NOW + TWO_MONTHS

            it('reverts', async () => {
              await assertRevert(payroll.addEmployee(employee, salary, startDate, role, { from }), 'PAYROLL_EMPLOYEE_ALREADY_EXIST')
            })
          })
        })
      })

      context('when the sender does not have permissions to add employees', () => {
        const from = anyone

        it('reverts', async () => {
          await assertRevert(payroll.addEmployee(employee, salary, NOW, role, { from }), 'APP_AUTH_FAILED')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      it('reverts', async () => {
        await assertRevert(payroll.addEmployee(employee, salary, NOW, role, { from: owner }), 'APP_AUTH_FAILED')
      })
    })
  })
})
