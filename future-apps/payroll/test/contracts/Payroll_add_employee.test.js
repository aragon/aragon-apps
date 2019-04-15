const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { getEvents, getEventArgument } = require('../helpers/events')
const { maxUint64, annualSalaryPerSecond } = require('../helpers/numbers')(web3)
const { deployErc20TokenAndDeposit, deployContracts, createPayrollInstance, mockTimestamps } = require('../helpers/setup.js')(artifacts, web3)

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

contract('Payroll employees addition', ([owner, employee, anotherEmployee, anyone]) => {
  let dao, payroll, payrollBase, finance, vault, priceFeed, denominationToken, anotherToken

  const NOW = 1553703809 // random fixed timestamp in seconds
  const ONE_MONTH = 60 * 60 * 24 * 31
  const TWO_MONTHS = ONE_MONTH * 2
  const RATE_EXPIRATION_TIME = TWO_MONTHS

  const TOKEN_DECIMALS = 18

  const currentTimestamp = async () => payroll.getTimestampPublic()

  before('setup base apps and tokens', async () => {
    ({ dao, finance, vault, priceFeed, payrollBase } = await deployContracts(owner))
    anotherToken = await deployErc20TokenAndDeposit(owner, finance, vault, 'Another token', TOKEN_DECIMALS)
    denominationToken = await deployErc20TokenAndDeposit(owner, finance, vault, 'Denomination Token', TOKEN_DECIMALS)
  })

  beforeEach('setup payroll instance', async () => {
    payroll = await createPayrollInstance(dao, payrollBase, owner)
    await mockTimestamps(payroll, priceFeed, NOW)
  })

  describe('addEmployeeNow', () => {
    const role = 'Boss'
    const salary = annualSalaryPerSecond(100000, TOKEN_DECIMALS)

    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender has permissions to add employees', () => {
        const from = owner
        let receipt, employeeId

        context('when the employee has not been added yet', () => {
          let receipt, employeeId

          context('when the employee address is not the zero address', () => {
            const address = employee

            beforeEach('add employee', async () => {
              receipt = await payroll.addEmployeeNow(address, salary, role, { from })
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
              assert.equal(event.role, role, 'employee role does not match')
              assert.equal(event.accountAddress, employee, 'employee address does not match')
              assert.equal(event.startDate.toString(), (await currentTimestamp()).toString(), 'employee start date does not match')
              assert.equal(event.initialDenominationSalary.toString(), salary.toString(), 'employee salary does not match')
            })

            it('can add another employee', async () => {
              const anotherRole = 'Manager'
              const anotherSalary = annualSalaryPerSecond(120000, TOKEN_DECIMALS)

              const receipt = await payroll.addEmployeeNow(anotherEmployee, anotherSalary, anotherRole)
              const anotherEmployeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')

              const events = getEvents(receipt, 'AddEmployee');
              assert.equal(events.length, 1, 'number of AddEmployee events does not match')

              const event = events[0].args
              assert.equal(event.employeeId, anotherEmployeeId, 'employee id does not match')
              assert.equal(event.role, anotherRole, 'employee role does not match')
              assert.equal(event.accountAddress, anotherEmployee, 'employee address does not match')
              assert.equal(event.startDate.toString(), (await currentTimestamp()).toString(), 'employee start date does not match')
              assert.equal(event.initialDenominationSalary.toString(), anotherSalary.toString(), 'employee salary does not match')

              const [address, employeeSalary, accruedValue, lastPayroll, endDate] = await payroll.getEmployee(anotherEmployeeId)
              assert.equal(address, anotherEmployee, 'Employee account does not match')
              assert.equal(accruedValue, 0, 'Employee accrued value does not match')
              assert.equal(employeeSalary.toString(), anotherSalary.toString(), 'Employee salary does not match')
              assert.equal(lastPayroll.toString(), (await currentTimestamp()).toString(), 'last payroll should match')
              assert.equal(endDate.toString(), maxUint64(), 'last payroll should match')
            })
          })

          context('when the employee address is not the zero address', () => {
            const address = ZERO_ADDRESS

            it('reverts', async () => {
              await assertRevert(payroll.addEmployeeNow(address, salary, role, { from }), 'PAYROLL_EMPLOYEE_NULL_ADDRESS')
            })
          })
        })

        context('when the employee has already been added', () => {
          beforeEach('add employee', async () => {
            await payroll.addEmployeeNow(employee, salary, role, { from })
          })

          it('reverts', async () => {
            await assertRevert(payroll.addEmployeeNow(employee, salary, role, { from }), 'PAYROLL_EMPLOYEE_ALREADY_EXIST')
          })
        })
      })

      context('when the sender does not have permissions to add employees', () => {
        const from = anyone

        it('reverts', async () => {
          await assertRevert(payroll.addEmployeeNow(employee, salary, role, { from }), 'APP_AUTH_FAILED')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      it('reverts', async () => {
        await assertRevert(payroll.addEmployeeNow(employee, salary, role, { from: owner }), 'APP_AUTH_FAILED')
      })
    })
  })

  describe('addEmployee', () => {
    const role = 'Boss'
    const salary = annualSalaryPerSecond(100000, TOKEN_DECIMALS)

    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender has permissions to add employees', () => {
        const from = owner
        let receipt, employeeId

        context('when the employee has not been added yet', () => {
          let receipt, employeeId

          const itHandlesAddingNewEmployeesProperly = startDate => {
            context('when the employee address is not the zero address', () => {
              const address = employee

              beforeEach('add employee', async () => {
                receipt = await payroll.addEmployee(address, salary, role, startDate, { from })
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
                assert.equal(event.role, role, 'employee role does not match')
                assert.equal(event.accountAddress, employee, 'employee address does not match')
                assert.equal(event.startDate.toString(), startDate, 'employee start date does not match')
                assert.equal(event.initialDenominationSalary.toString(), salary.toString(), 'employee salary does not match')
              })

              it('can add another employee', async () => {
                const anotherRole = 'Manager'
                const anotherSalary = annualSalaryPerSecond(120000, TOKEN_DECIMALS)

                const receipt = await payroll.addEmployee(anotherEmployee, anotherSalary, anotherRole, startDate)
                const anotherEmployeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')

                const events = getEvents(receipt, 'AddEmployee');
                assert.equal(events.length, 1, 'number of AddEmployee events does not match')

                const event = events[0].args
                assert.equal(event.employeeId, anotherEmployeeId, 'employee id does not match')
                assert.equal(event.role, anotherRole, 'employee role does not match')
                assert.equal(event.accountAddress, anotherEmployee, 'employee address does not match')
                assert.equal(event.startDate.toString(), startDate, 'employee start date does not match')
                assert.equal(event.initialDenominationSalary.toString(), anotherSalary.toString(), 'employee salary does not match')

                const [address, employeeSalary, accruedValue, lastPayroll, endDate] = await payroll.getEmployee(anotherEmployeeId)
                assert.equal(address, anotherEmployee, 'Employee account does not match')
                assert.equal(accruedValue, 0, 'Employee accrued value does not match')
                assert.equal(employeeSalary.toString(), anotherSalary.toString(), 'Employee salary does not match')
                assert.equal(lastPayroll.toString(), startDate.toString(), 'last payroll should match')
                assert.equal(endDate.toString(), maxUint64(), 'last payroll should match')
              })
            })

            context('when the employee address is not the zero address', () => {
              const address = ZERO_ADDRESS

              it('reverts', async () => {
                await assertRevert(payroll.addEmployee(address, salary, role, startDate, { from }), 'PAYROLL_EMPLOYEE_NULL_ADDRESS')
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
            await payroll.addEmployee(employee, salary, role, NOW, { from })
          })

          context('when the given end date is in the past ', () => {
            const startDate = NOW - TWO_MONTHS

            it('reverts', async () => {
              await assertRevert(payroll.addEmployee(employee, salary, role, startDate, { from }), 'PAYROLL_EMPLOYEE_ALREADY_EXIST')
            })
          })

          context('when the given end date is in the future', () => {
            const startDate = NOW + TWO_MONTHS

            it('reverts', async () => {
              await assertRevert(payroll.addEmployee(employee, salary, role, startDate, { from }), 'PAYROLL_EMPLOYEE_ALREADY_EXIST')
            })
          })
        })
      })

      context('when the sender does not have permissions to add employees', () => {
        const from = anyone

        it('reverts', async () => {
          await assertRevert(payroll.addEmployee(employee, salary, role, NOW, { from }), 'APP_AUTH_FAILED')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      it('reverts', async () => {
        await assertRevert(payroll.addEmployee(employee, salary, role, NOW, { from: owner }), 'APP_AUTH_FAILED')
      })
    })
  })
})
