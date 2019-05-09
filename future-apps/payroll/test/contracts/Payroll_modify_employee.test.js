const { USD } = require('../helpers/tokens')(artifacts, web3)
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { getEvents, getEventArgument } = require('../helpers/events')
const { NOW, ONE_MONTH, RATE_EXPIRATION_TIME } = require('../helpers/time')
const { bn, MAX_UINT256, annualSalaryPerSecond } = require('../helpers/numbers')(web3)
const { deployContracts, createPayrollAndPriceFeed } = require('../helpers/deploy')(artifacts, web3)

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

contract('Payroll employees modification', ([owner, employee, anotherEmployee, anyone]) => {
  let dao, payroll, payrollBase, finance, vault, priceFeed

  const increaseTime = async seconds => {
    await payroll.mockIncreaseTime(seconds)
    await priceFeed.mockIncreaseTime(seconds)
  }

  before('deploy base apps and tokens', async () => {
    ({ dao, finance, vault, payrollBase } = await deployContracts(owner))
  })

  beforeEach('create payroll and price feed instance', async () => {
    ({ payroll, priceFeed } = await createPayrollAndPriceFeed(dao, payrollBase, owner, NOW))
  })

  describe('setEmployeeSalary', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app using USD as denomination token', async () => {
        await payroll.initialize(finance.address, USD, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender has permissions', () => {
        const from = owner

        context('when the given employee exists', () => {
          let employeeId
          const previousSalary = annualSalaryPerSecond(100000)

          beforeEach('add employee', async () => {
            const receipt = await payroll.addEmployee(employee, previousSalary, 'Boss', await payroll.getTimestampPublic())
            employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
          })

          context('when the given employee is active', () => {

            const itSetsSalarySuccessfully = newSalary => {
              it('changes the salary of the employee', async () => {
                await payroll.setEmployeeSalary(employeeId, newSalary, { from })

                const salary = (await payroll.getEmployee(employeeId))[1]
                assert.equal(salary.toString(), newSalary.toString(), 'accrued salary does not match')
              })

              it('adds previous owed salary to the accrued salary', async () => {
                await increaseTime(ONE_MONTH)

                const receipt = await payroll.setEmployeeSalary(employeeId, newSalary, { from })
                await increaseTime(ONE_MONTH)

                const accruedSalary = (await payroll.getEmployee(employeeId))[4]
                const expectedAccruedSalary = previousSalary.mul(ONE_MONTH)
                assert.equal(accruedSalary.toString(), expectedAccruedSalary.toString(), 'accrued salary does not match')

                const events = getEvents(receipt, 'AddEmployeeAccruedSalary')
                assert.equal(events.length, 1, 'number of AddEmployeeAccruedSalary emitted events does not match')
                assert.equal(events[0].args.employeeId.toString(), employeeId, 'employee id does not match')
                assert.equal(events[0].args.amount.toString(), expectedAccruedSalary.toString(), 'accrued salary does not match')
              })

              it('accrues all previous owed salary as accrued salary', async () => {
                await increaseTime(ONE_MONTH)
                await payroll.setEmployeeSalary(employeeId, newSalary, { from })
                await increaseTime(ONE_MONTH)
                await payroll.setEmployeeSalary(employeeId, newSalary.mul(2), { from })

                const accruedSalary = (await payroll.getEmployee(employeeId))[4]
                const expectedAccruedSalary = previousSalary.mul(ONE_MONTH).plus(newSalary.mul(ONE_MONTH))
                assert.equal(accruedSalary.toString(), expectedAccruedSalary.toString(), 'accrued salary does not match')
              })

              it('emits a SetEmployeeSalary event', async () => {
                const receipt = await payroll.setEmployeeSalary(employeeId, newSalary, { from })

                const events = getEvents(receipt, 'SetEmployeeSalary')
                assert.equal(events.length, 1, 'number of SetEmployeeSalary emitted events does not match')
                assert.equal(events[0].args.employeeId.toString(), employeeId, 'employee id does not match')
                assert.equal(events[0].args.denominationSalary.toString(), newSalary.toString(), 'salary does not match')
              })
            }

            context('when the given value greater than zero', () => {
              const newSalary = previousSalary.mul(2)

              context('when the employee is not owed a huge salary amount', () => {
                itSetsSalarySuccessfully(newSalary)
              })

              context('when the employee is owed a huge salary amount', () => {
                beforeEach('accrued a huge salary amount', async () => {
                  await payroll.setEmployeeSalary(employeeId, MAX_UINT256, { from })
                  await increaseTime(ONE_MONTH)
                })

                it('reverts', async () => {
                  await assertRevert(payroll.setEmployeeSalary(employeeId, newSalary, { from }), 'MATH_MUL_OVERFLOW')
                })
              })
            })

            context('when the given value is zero', () => {
              const newSalary = bn(0)

              itSetsSalarySuccessfully(newSalary)
            })
          })

          context('when the given employee is not active', () => {
            beforeEach('terminate employee', async () => {
              await payroll.terminateEmployee(employeeId, await payroll.getTimestampPublic(), { from: owner })
              await increaseTime(ONE_MONTH)
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
      beforeEach('initialize payroll app using USD as denomination token', async () => {
        await payroll.initialize(finance.address, USD, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender is an employee', () => {
        const from = employee
        let employeeId

        beforeEach('add employee', async () => {
          const receipt = await payroll.addEmployee(employee, annualSalaryPerSecond(100000), 'Boss', await payroll.getTimestampPublic(), { from: owner })
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
              assert.equal(events[0].args.newAccountAddress, newAddress, 'new address does not match')
              assert.equal(events[0].args.oldAccountAddress, employee, 'previous address does not match')
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
              await payroll.addEmployee(anotherEmployee, annualSalaryPerSecond(100000), 'Boss', await payroll.getTimestampPublic(), { from: owner })
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
            await payroll.terminateEmployee(employeeId, await payroll.getTimestampPublic(), { from: owner })
            await increaseTime(ONE_MONTH)
          })

          itHandlesChangingEmployeeAddressSuccessfully()
        })
      })

      context('when the sender is not an employee', async () => {
        const from = anyone

        it('reverts', async () => {
          await assertRevert(payroll.changeAddressByEmployee(anotherEmployee, { from }), 'PAYROLL_SENDER_DOES_NOT_MATCH')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      it('reverts', async () => {
        await assertRevert(payroll.changeAddressByEmployee(anotherEmployee, { from: anyone }), 'PAYROLL_SENDER_DOES_NOT_MATCH')
      })
    })
  })
})
