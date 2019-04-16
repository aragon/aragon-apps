const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { annualSalaryPerSecond } = require('../helpers/numbers')(web3)
const { getEvents, getEventArgument } = require('../helpers/events')
const { deployErc20TokenAndDeposit, deployContracts, createPayrollInstance, mockTimestamps } = require('../helpers/setup.js')(artifacts, web3)

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

contract('Payroll employees modification', ([owner, employee, anotherEmployee, anyone]) => {
  let dao, payroll, payrollBase, finance, vault, priceFeed, denominationToken, anotherToken

  const NOW = 1553703809 // random fixed timestamp in seconds
  const ONE_MONTH = 60 * 60 * 24 * 31
  const TWO_MONTHS = ONE_MONTH * 2
  const RATE_EXPIRATION_TIME = TWO_MONTHS

  const TOKEN_DECIMALS = 18

  before('setup base apps and tokens', async () => {
    ({ dao, finance, vault, priceFeed, payrollBase } = await deployContracts(owner))
    anotherToken = await deployErc20TokenAndDeposit(owner, finance, vault, 'Another token', TOKEN_DECIMALS)
    denominationToken = await deployErc20TokenAndDeposit(owner, finance, vault, 'Denomination Token', TOKEN_DECIMALS)
  })

  beforeEach('setup payroll instance', async () => {
    payroll = await createPayrollInstance(dao, payrollBase, owner)
    await mockTimestamps(payroll, priceFeed, NOW)
  })

  describe('setEmployeeSalary', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender has permissions', () => {
        const from = owner

        context('when the given employee exists', () => {
          let employeeId
          const previousSalary = annualSalaryPerSecond(100000, TOKEN_DECIMALS)

          beforeEach('add employee', async () => {
            const receipt = await payroll.addEmployeeNow(employee, previousSalary, 'Boss')
            employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
          })

          context('when the given employee is active', () => {

            const itSetsSalarySuccessfully = newSalary => {
              it('changes the salary of the employee', async () => {
                await payroll.setEmployeeSalary(employeeId, newSalary, { from })

                const salary = (await payroll.getEmployee(employeeId))[1]
                assert.equal(salary.toString(), newSalary, 'accrued salary does not match')
              })

              it('adds previous owed salary to the accrued salary', async () => {
                await payroll.mockIncreaseTime(ONE_MONTH)

                const receipt = await payroll.setEmployeeSalary(employeeId, newSalary, { from })
                await payroll.mockIncreaseTime(ONE_MONTH)

                const accruedSalary = (await payroll.getEmployee(employeeId))[4]
                const expectedAccruedSalary = previousSalary * ONE_MONTH
                assert.equal(accruedSalary.toString(), expectedAccruedSalary, 'accrued salary does not match')

                const events = getEvents(receipt, 'AddEmployeeAccruedSalary')
                assert.equal(events.length, 1, 'number of AddEmployeeAccruedSalary emitted events does not match')
                assert.equal(events[0].args.employeeId.toString(), employeeId, 'employee id does not match')
                assert.equal(events[0].args.amount.toString(), expectedAccruedSalary, 'accrued salary does not match')
              })

              it('accrues all previous owed salary as accrued salary', async () => {
                await payroll.mockIncreaseTime(ONE_MONTH)
                await payroll.setEmployeeSalary(employeeId, newSalary, { from })
                await payroll.mockIncreaseTime(ONE_MONTH)
                await payroll.setEmployeeSalary(employeeId, newSalary * 2, { from })

                const accruedSalary = (await payroll.getEmployee(employeeId))[4]
                const expectedAccruedSalary = previousSalary * ONE_MONTH + newSalary * ONE_MONTH
                assert.equal(accruedSalary.toString(), expectedAccruedSalary, 'accrued salary does not match')
              })

              it('emits a SetEmployeeSalary event', async () => {
                const receipt = await payroll.setEmployeeSalary(employeeId, newSalary, { from })

                const events = getEvents(receipt, 'SetEmployeeSalary')
                assert.equal(events.length, 1, 'number of SetEmployeeSalary emitted events does not match')
                assert.equal(events[0].args.employeeId.toString(), employeeId, 'employee id does not match')
                assert.equal(events[0].args.denominationSalary.toString(), newSalary, 'salary does not match')
              })
            }

            context('when the given value greater than zero', () => {
              const newSalary = 1000

              itSetsSalarySuccessfully(newSalary)
            })

            context('when the given value is zero', () => {
              const newSalary = 0

              itSetsSalarySuccessfully(newSalary)
            })
          })

          context('when the given employee is not active', () => {
            beforeEach('terminate employee', async () => {
              await payroll.terminateEmployeeNow(employeeId, { from: owner })
              await payroll.mockIncreaseTime(ONE_MONTH)
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

    context('when it has not been initialized yet', function () {
      const employeeId = 0
      const salary = 10000

      it('reverts', async () => {
        await assertRevert(payroll.setEmployeeSalary(employeeId, salary, { from: owner }), 'APP_AUTH_FAILED')
      })
    })
  })

  describe('changeAddressByEmployee', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender is an employee', () => {
        const from = employee
        let employeeId

        beforeEach('add employee', async () => {
          const receipt = await payroll.addEmployeeNow(employee, 1000, 'Boss', { from: owner })
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
              await payroll.addEmployeeNow(anotherEmployee, 1000, 'Boss', { from: owner })
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
            await payroll.mockIncreaseTime(ONE_MONTH)
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

    context('when it has not been initialized yet', function () {
      it('reverts', async () => {
        await assertRevert(payroll.changeAddressByEmployee(anotherEmployee, { from: anyone }), 'PAYROLL_EMPLOYEE_DOES_NOT_MATCH')
      })
    })
  })
})
