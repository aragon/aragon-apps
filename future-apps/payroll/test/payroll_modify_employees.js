const { assertRevert } = require('@aragon/test-helpers/assertThrow')

const ACL = artifacts.require('ACL')
const Payroll = artifacts.require('PayrollMock')
const PriceFeed = artifacts.require('PriceFeedMock')

const getEvent = (receipt, event) => getEvents(receipt, event)[0].args
const getEvents = (receipt, event) => receipt.logs.filter(l => l.event === event)
const getEventArgument = (receipt, event, arg) => getEvent(receipt, event)[arg]

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

contract('Payroll, adding and removing employees,', function(accounts) {
  const [owner, employee, anotherEmployee, anyone] = accounts
  const { deployErc20TokenAndDeposit, getDaoFinanceVault } = require('./helpers.js')(owner)

  const ONE_MONTH = 60 * 60 * 24
  const RATE_EXPIRATION_TIME = 1000

  let acl, payroll, payrollBase, priceFeed, usdToken, dao, finance, vault

  before('setup base apps and tokens', async () => {
    const daoFinanceVault = await getDaoFinanceVault()
    dao = daoFinanceVault.dao
    finance = daoFinanceVault.finance
    vault = daoFinanceVault.vault
    acl = ACL.at(await dao.acl())

    priceFeed = await PriceFeed.new()
    payrollBase = await Payroll.new()
    usdToken = await deployErc20TokenAndDeposit(owner, finance, vault, 'USD', 18)
  })

  beforeEach('create payroll instance and initialize', async () => {
    const receipt = await dao.newAppInstance('0x4321', payrollBase.address, '0x', false, { from: owner })
    payroll = Payroll.at(getEventArgument(receipt, 'NewAppProxy', 'proxy'))
    await payroll.initialize(finance.address, usdToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
  })

  beforeEach('grant permissions', async () => {
    const ADD_EMPLOYEE_ROLE = await payrollBase.ADD_EMPLOYEE_ROLE()
    const TERMINATE_EMPLOYEE_ROLE = await payrollBase.TERMINATE_EMPLOYEE_ROLE()
    const SET_EMPLOYEE_SALARY_ROLE = await payrollBase.SET_EMPLOYEE_SALARY_ROLE()
    const ALLOWED_TOKENS_MANAGER_ROLE = await payrollBase.ALLOWED_TOKENS_MANAGER_ROLE()

    await acl.createPermission(owner, payroll.address, ADD_EMPLOYEE_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, TERMINATE_EMPLOYEE_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, SET_EMPLOYEE_SALARY_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, ALLOWED_TOKENS_MANAGER_ROLE, owner, { from: owner })
  })

  describe('setEmployeeSalary', () => {
    context('when the sender has permissions', () => {
      const from = owner

      context('when the given employee exists', () => {
        let employeeId
        const previousSalary = 1000

        beforeEach('add employee', async () => {
          const receipt = await payroll.addEmployeeNow(employee, previousSalary, 'John', 'Boss')
          employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
        })

        context('when the given employee is active', () => {

          const itSetsSalarySuccessfully = newSalary => {
            it('changes the salary of the employee', async () => {
              await payroll.setEmployeeSalary(employeeId, newSalary, { from })

              const salary = (await payroll.getEmployee(employeeId))[1]
              assert.equal(salary.toString(), newSalary, 'accrued value does not match')
            })

            it('adds previous owed salary to the accrued value', async () => {
              await payroll.mockAddTimestamp(ONE_MONTH)

              await payroll.setEmployeeSalary(employeeId, newSalary, { from })
              await payroll.mockAddTimestamp(ONE_MONTH)

              const accruedValue = (await payroll.getEmployee(employeeId))[2]
              assert.equal(accruedValue.toString(), previousSalary * ONE_MONTH, 'accrued value does not match')
            })

            it('emits an event', async () => {
              const receipt = await payroll.setEmployeeSalary(employeeId, newSalary, { from })

              const events = getEvents(receipt, 'SetEmployeeSalary')
              assert.equal(events.length, 1, 'number of SetEmployeeSalary emitted events does not match')
              assert.equal(events[0].args.employeeId.toString(), employeeId, 'employee id does not match')
              assert.equal(events[0].args.denominationSalary.toString(), newSalary, 'salary does not match')
            })
          }

          context('when the given value greater than zero', () => {
            const value = 1000

            itSetsSalarySuccessfully(value)
          })

          context('when the given value is zero', () => {
            const value = 0

            itSetsSalarySuccessfully(value)
          })
        })

        context('when the given employee is not active', () => {
          beforeEach('terminate employee', async () => {
            await payroll.terminateEmployeeNow(employeeId, { from: owner })
            await payroll.mockAddTimestamp(ONE_MONTH)
          })

          it('reverts', async () => {
            await assertRevert(payroll.setEmployeeSalary(employeeId, 1000, { from }), 'PAYROLL_NON_ACTIVE_EMPLOYEE')
          })
        })
      })

      context('when the given employee does not exist', async () => {
        const employeeId = 0

        it('reverts', async () => {
          await assertRevert(payroll.setEmployeeSalary(employeeId, 1000, { from }), 'PAYROLL_NON_ACTIVE_EMPLOYEE')
        })
      })
    })

    context('when the sender does not have permissions', () => {
      const from = anyone

      it('reverts', async () => {
        await assertRevert(payroll.setEmployeeSalary(0, 1000, { from }), 'APP_AUTH_FAILED')
      })
    })
  })

  describe('changeAddressByEmployee', () => {

    context('when the sender is an employee', () => {
      const from = employee
      let employeeId

      beforeEach('add employee', async () => {
        const receipt = await payroll.addEmployeeNow(employee, 1000, 'John', 'Boss', { from: owner })
        employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
      })

      const itHandlesChangingEmployeeAddressSuccessfully = () => {
        context('when the given address is a plain new address', () => {
          const newAddress = anyone

          it('changes the address of the employee', async () => {
            await payroll.changeAddressByEmployee(newAddress, { from })

            const [address] = await payroll.getEmployee(employeeId)
            assert.equal(address, newAddress, 'employee address does not match')
          })

          it('emits an event', async () => {
            const receipt = await payroll.changeAddressByEmployee(newAddress, { from })

            const events = getEvents(receipt, 'ChangeAddressByEmployee')
            assert.equal(events.length, 1, 'number of ChangeAddressByEmployee emitted events does not match')
            assert.equal(events[0].args.employeeId.toString(), employeeId, 'employee id does not match')
            assert.equal(events[0].args.oldAddress, employee, 'previous address does not match')
            assert.equal(events[0].args.newAddress, newAddress, 'new address does not match')
          })
        })

        context('when the given address is the same address', () => {
          const newAddress = employee

          it('reverts', async () => {
            await assertRevert(payroll.changeAddressByEmployee(newAddress, { from }), 'PAYROLL_EMPLOYEE_ALREADY_EXIST')
          })
        })

        context('when the given address belongs to another employee', () => {
          beforeEach('add another employee', async () => {
            await payroll.addEmployeeNow(anotherEmployee, 1000, 'John', 'Boss', { from: owner })
          })

          it('reverts', async () => {
            await assertRevert(payroll.changeAddressByEmployee(anotherEmployee, { from }), 'PAYROLL_EMPLOYEE_ALREADY_EXIST')
          })
        })

        context('when the given address is the zero address', () => {
          const newAddress = ZERO_ADDRESS

          it('reverts', async () => {
            await assertRevert(payroll.changeAddressByEmployee(newAddress, { from }), 'PAYROLL_EMPLOYEE_NULL_ADDRESS')
          })
        })
      }

      context('when the given employee is active', () => {
        itHandlesChangingEmployeeAddressSuccessfully()
      })

      context('when the given employee is not active', () => {
        beforeEach('terminate employee', async () => {
          await payroll.terminateEmployeeNow(employeeId, { from: owner })
          await payroll.mockAddTimestamp(ONE_MONTH)
        })

        itHandlesChangingEmployeeAddressSuccessfully()
      })
    })

    context('when the sender is not an employee', async () => {
      const from = anyone

      it('reverts', async () => {
        await assertRevert(payroll.changeAddressByEmployee(anotherEmployee, { from }), 'PAYROLL_EMPLOYEE_DOES_NOT_MATCH')
      })
    })
  })
})
