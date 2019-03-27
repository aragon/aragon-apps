const { bigExp } = require('./helpers/numbers')(web3)
const { assertRevert } = require('@aragon/test-helpers/assertThrow')

const ACL = artifacts.require('ACL')
const Payroll = artifacts.require('PayrollMock')
const PriceFeed = artifacts.require('PriceFeedMock')

const getEvent = (receipt, event) => getEvents(receipt, event)[0].args
const getEvents = (receipt, event) => receipt.logs.filter(l => l.event === event)
const getEventArgument = (receipt, event, arg) => getEvent(receipt, event)[arg]

contract('Payroll, allocation and payday,', function(accounts) {
  const [owner, employee, anyone] = accounts
  const { deployErc20TokenAndDeposit, redistributeEth, getDaoFinanceVault } = require("./helpers.js")(owner)

  const NOW = 1553703809 // random fixed timestamp in seconds
  const ONE_MONTH = 60 * 60 * 24 * 31
  const TWO_MONTHS = ONE_MONTH * 2
  const RATE_EXPIRATION_TIME = TWO_MONTHS

  const PCT_ONE = bigExp(1, 18)

  let dao, acl, payroll, payrollBase, finance, vault, priceFeed, denominationToken, anotherToken

  before('setup base apps and tokens', async () => {
    const daoFinanceVault = await getDaoFinanceVault()
    dao = daoFinanceVault.dao
    finance = daoFinanceVault.finance
    vault = daoFinanceVault.vault
    acl = ACL.at(await dao.acl())

    priceFeed = await PriceFeed.new()
    payrollBase = await Payroll.new()

    denominationToken = await deployErc20TokenAndDeposit(owner, finance, vault, 'Denomination token', 18)
    anotherToken = await deployErc20TokenAndDeposit(owner, finance, vault, 'Another token', 18)

    await redistributeEth(accounts, finance)
  })

  beforeEach('create payroll instance and initialize', async () => {
    const receipt = await dao.newAppInstance('0x4321', payrollBase.address, '0x', false, { from: owner })
    payroll = Payroll.at(getEventArgument(receipt, 'NewAppProxy', 'proxy'))
    await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
  })

  beforeEach('set timestamps', async () => {
    await payroll.mockSetTimestamp(NOW)
    await priceFeed.mockSetTimestamp(NOW)
  })

  beforeEach('grant permissions', async () => {
    const ADD_EMPLOYEE_ROLE = await payrollBase.ADD_EMPLOYEE_ROLE()
    const ADD_ACCRUED_VALUE_ROLE = await payrollBase.ADD_ACCRUED_VALUE_ROLE()
    const TERMINATE_EMPLOYEE_ROLE = await payrollBase.TERMINATE_EMPLOYEE_ROLE()
    const ALLOWED_TOKENS_MANAGER_ROLE = await payrollBase.ALLOWED_TOKENS_MANAGER_ROLE()

    await acl.createPermission(owner, payroll.address, ADD_EMPLOYEE_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, ADD_ACCRUED_VALUE_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, TERMINATE_EMPLOYEE_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, ALLOWED_TOKENS_MANAGER_ROLE, owner, { from: owner })
  })

  describe('payday', () => {
    // TODO: add tests to ensure huge owed amounts can be paid

    context('when the sender is an employee', () => {
      const from = employee
      let employeeId, salary = 1000

      beforeEach('add employee', async () => {
        const receipt = await payroll.addEmployeeNow(employee, salary, 'John', 'Doe')
        employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
      })

      context('when the employee has already set some token allocations', () => {
        const denominationTokenAllocation = 80
        const anotherTokenAllocation = 20

        beforeEach('set tokens allocation', async () => {
          await payroll.addAllowedToken(anotherToken.address, { from: owner })
          await payroll.addAllowedToken(denominationToken.address, { from: owner })
          await payroll.determineAllocation([denominationToken.address, anotherToken.address], [denominationTokenAllocation, anotherTokenAllocation], { from })
        })

        context('when the employee has some pending salary', () => {
          beforeEach('accumulate some pending salary', async () => {
            await payroll.mockAddTimestamp(ONE_MONTH)
          })

          const assertTransferredAmounts = () => {
            const expectedOwedAmount = ONE_MONTH * salary
            const expectedDenominationTokenAmount = Math.round(expectedOwedAmount * denominationTokenAllocation / 100)
            const expectedAnotherTokenAmount = Math.round(expectedOwedAmount * anotherTokenAllocation / 100)

            it('transfers the owed salary', async () => {
              const previousDenominationTokenBalance = await denominationToken.balanceOf(employee)
              const previousAnotherTokenBalance = await anotherToken.balanceOf(employee)

              await payroll.payday({ from })

              const currentDenominationTokenBalance = await denominationToken.balanceOf(employee)
              assert.equal(currentDenominationTokenBalance.toString(), previousDenominationTokenBalance.plus(expectedDenominationTokenAmount).toString(), 'current USD token balance does not match')

              const currentAnotherTokenBalance = await anotherToken.balanceOf(employee)
              const anotherTokenRate = (await priceFeed.get(denominationToken.address, anotherToken.address))[0].div(PCT_ONE)
              const expectedAnotherTokenBalance = anotherTokenRate.mul(expectedAnotherTokenAmount).plus(previousAnotherTokenBalance)
              assert.equal(currentAnotherTokenBalance.toString(), expectedAnotherTokenBalance.toString(), 'current token balance does not match')
            })

            it('emits one event per allocated token', async () => {
              const receipt = await payroll.payday({ from })

              const events = receipt.logs.filter(l => l.event === 'SendPayment')
              assert.equal(events.length, 2, 'should have emitted two events')

              const denominationTokenEvent = events.find(e => e.args.token === denominationToken.address).args
              assert.equal(denominationTokenEvent.employee, employee, 'employee address does not match')
              assert.equal(denominationTokenEvent.token, denominationToken.address, 'usd token address does not match')
              assert.equal(denominationTokenEvent.amount.toString(), expectedDenominationTokenAmount, 'payment amount does not match')
              assert.equal(denominationTokenEvent.reference, 'Payroll', 'payment reference does not match')

              const anotherTokenRate = (await priceFeed.get(denominationToken.address, anotherToken.address))[0].div(PCT_ONE)
              const anotherTokenEvent = events.find(e => e.args.token === anotherToken.address).args
              assert.equal(anotherTokenEvent.employee, employee, 'employee address does not match')
              assert.equal(anotherTokenEvent.token, anotherToken.address, 'token address does not match')
              assert.equal(anotherTokenEvent.amount.div(anotherTokenRate).toString(), expectedAnotherTokenAmount, 'payment amount does not match')
              assert.equal(anotherTokenEvent.reference, 'Payroll', 'payment reference does not match')
            })

            it('can be called multiple times between periods of time', async () => {
              // terminate employee in the future to ensure we can request payroll multiple times
              await payroll.terminateEmployee(employeeId, NOW + TWO_MONTHS + TWO_MONTHS, { from: owner })

              const previousDenominationTokenBalance = await denominationToken.balanceOf(employee)
              const previousAnotherTokenBalance = await anotherToken.balanceOf(employee)

              await payroll.payday({ from })

              await payroll.mockAddTimestamp(ONE_MONTH)
              await priceFeed.mockAddTimestamp(ONE_MONTH)
              await payroll.payday({ from })

              const currentDenominationTokenBalance = await denominationToken.balanceOf(employee)
              const expectedDenominationTokenBalance = previousDenominationTokenBalance.plus(expectedDenominationTokenAmount * 2)
              assert.equal(currentDenominationTokenBalance.toString(), expectedDenominationTokenBalance.toString(), 'current USD token balance does not match')

              const currentAnotherTokenBalance = await anotherToken.balanceOf(employee)
              const anotherTokenRate = (await priceFeed.get(denominationToken.address, anotherToken.address))[0].div(PCT_ONE)
              const expectedAnotherTokenBalance = anotherTokenRate.mul(expectedAnotherTokenAmount * 2).plus(previousAnotherTokenBalance)
              assert.equal(currentAnotherTokenBalance.toString(), expectedAnotherTokenBalance.toString(), 'current token balance does not match')
            })
          }

          const assertEmployeeIsUpdated = () => {
            it('updates the last payroll date', async () => {
              await payroll.payday({ from })

              const lastPayrollDate = (await payroll.getEmployee(employeeId))[3]

              const currentTimestamp = await payroll.getTimestampPublic()
              assert.equal(lastPayrollDate.toString(), currentTimestamp.toString(), 'last payroll date does not match')
            })

            it('does not remove the employee', async () => {
              await payroll.payday({ from })

              const [address, employeeSalary] = await payroll.getEmployee(employeeId)

              assert.equal(address, employee, 'employee address does not match')
              assert.equal(employeeSalary, salary, 'employee salary does not match')
            })
          }

          const itHandlesPaydayProperly = () => {
            context('when exchange rates are not expired', () => {
              assertTransferredAmounts()
              assertEmployeeIsUpdated()
            })

            context('when exchange rates are expired', () => {
              beforeEach('expire exchange rates', async () => {
                await priceFeed.mockSetTimestamp(NOW - TWO_MONTHS)
              })

              it('reverts', async () => {
                await assertRevert(payroll.payday({ from }), 'PAYROLL_EXCHANGE_RATE_ZERO')
              })
            })
          }

          context('when the employee has some pending reimbursements', () => {
            beforeEach('add accrued value', async () => {
              await payroll.addAccruedValue(employeeId, 1000, { from: owner })
            })

            context('when the employee is not terminated', () => {
              itHandlesPaydayProperly()
            })

            context('when the employee is terminated', () => {
              beforeEach('terminate employee', async () => {
                await payroll.terminateEmployeeNow(employeeId, { from: owner })
              })

              itHandlesPaydayProperly()
            })
          })

          context('when the employee does not have pending reimbursements', () => {
            context('when the employee is not terminated', () => {
              itHandlesPaydayProperly()
            })

            context('when the employee is terminated', () => {
              beforeEach('terminate employee', async () => {
                await payroll.terminateEmployeeNow(employeeId, { from: owner })
              })

              context('when exchange rates are not expired', () => {
                assertTransferredAmounts()

                it('removes the employee', async () => {
                  await payroll.payday({ from })

                  await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')
                })
              })

              context('when exchange rates are expired', () => {
                beforeEach('expire exchange rates', async () => {
                  await priceFeed.mockSetTimestamp(NOW - TWO_MONTHS)
                })

                it('reverts', async () => {
                  await assertRevert(payroll.payday({ from }), 'PAYROLL_EXCHANGE_RATE_ZERO')
                })
              })
            })
          })
        })

        context('when the employee does not have pending salary', () => {
          it('reverts', async () => {
            await assertRevert(payroll.payday({ from }), 'PAYROLL_NOTHING_PAID')
          })
        })
      })

      context('when the employee did not set any token allocations yet', () => {
        context('when the employee has some pending salary', () => {
          beforeEach('accumulate some pending salary', async () => {
            await payroll.mockAddTimestamp(ONE_MONTH)
          })

          it('reverts', async () => {
            await assertRevert(payroll.payday({ from }), 'PAYROLL_NOTHING_PAID')
          })
        })

        context('when the employee does not have pending salary', () => {
          it('reverts', async () => {
            await assertRevert(payroll.payday({ from }), 'PAYROLL_NOTHING_PAID')
          })
        })
      })
    })

    context('when the sender is not an employee', () => {
      const from = anyone

      it('reverts', async () => {
        await assertRevert(payroll.payday({ from }), 'PAYROLL_EMPLOYEE_DOES_NOT_MATCH')
      })
    })
  })

  describe('partialPayday', () => {
    context('when the sender is an employee', () => {
      const from = employee
      let employeeId, salary = 1000

      beforeEach('add employee', async () => {
        const receipt = await payroll.addEmployeeNow(employee, salary, 'John', 'Boss')
        employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
      })

      context('when the employee has already set some token allocations', () => {
        const denominationTokenAllocation = 80
        const anotherTokenAllocation = 20

        beforeEach('set tokens allocation', async () => {
          await payroll.addAllowedToken(anotherToken.address, { from: owner })
          await payroll.addAllowedToken(denominationToken.address, { from: owner })
          await payroll.determineAllocation([denominationToken.address, anotherToken.address], [denominationTokenAllocation, anotherTokenAllocation], { from })
        })

        context('when the employee has some pending salary', () => {
          const owedSalary = ONE_MONTH * salary

          beforeEach('accumulate some pending salary', async () => {
            await payroll.mockAddTimestamp(ONE_MONTH)
          })

          const assertTransferredAmounts = (requestedAmount, expectedRequestedAmount = requestedAmount) => {
            const requestedDenominationTokenAmount = Math.round(expectedRequestedAmount * denominationTokenAllocation / 100)
            const requestedAnotherTokenAmount = Math.round(expectedRequestedAmount * anotherTokenAllocation / 100)

            it('transfers the requested salary amount', async () => {
              const previousDenominationTokenBalance = await denominationToken.balanceOf(employee)
              const previousAnotherTokenBalance = await anotherToken.balanceOf(employee)

              await payroll.partialPayday(requestedAmount, { from })

              const currentDenominationTokenBalance = await denominationToken.balanceOf(employee)
              const expectedDenominationTokenBalance = previousDenominationTokenBalance.plus(requestedDenominationTokenAmount);
              assert.equal(currentDenominationTokenBalance.toString(), expectedDenominationTokenBalance.toString(), 'current USD token balance does not match')

              const currentAnotherTokenBalance = await anotherToken.balanceOf(employee)
              const anotherTokenRate = (await priceFeed.get(denominationToken.address, anotherToken.address))[0].div(PCT_ONE)
              const expectedAnotherTokenBalance = anotherTokenRate.mul(requestedAnotherTokenAmount).plus(previousAnotherTokenBalance).trunc()
              assert.equal(currentAnotherTokenBalance.toString(), expectedAnotherTokenBalance.toString(), 'current token balance does not match')
            })

            it('emits one event per allocated token', async () => {
              const receipt = await payroll.partialPayday(requestedAmount, { from })

              const events = receipt.logs.filter(l => l.event === 'SendPayment')
              assert.equal(events.length, 2, 'should have emitted two events')

              const denominationTokenEvent = events.find(e => e.args.token === denominationToken.address).args
              assert.equal(denominationTokenEvent.employee, employee, 'employee address does not match')
              assert.equal(denominationTokenEvent.token, denominationToken.address, 'usd token address does not match')
              assert.equal(denominationTokenEvent.amount.toString(), requestedDenominationTokenAmount, 'payment amount does not match')
              assert.equal(denominationTokenEvent.reference, 'Payroll', 'payment reference does not match')

              const anotherTokenRate = (await priceFeed.get(denominationToken.address, anotherToken.address))[0].div(PCT_ONE)
              const anotherTokenEvent = events.find(e => e.args.token === anotherToken.address).args
              assert.equal(anotherTokenEvent.employee, employee, 'employee address does not match')
              assert.equal(anotherTokenEvent.token, anotherToken.address, 'token address does not match')
              assert.equal(anotherTokenEvent.amount.div(anotherTokenRate).trunc().toString(), Math.round(requestedAnotherTokenAmount), 'payment amount does not match')
              assert.equal(anotherTokenEvent.reference, 'Payroll', 'payment reference does not match')
            })

            it('can be called multiple times between periods of time', async () => {
              // terminate employee in the future to ensure we can request payroll multiple times
              await payroll.terminateEmployee(employeeId, NOW + TWO_MONTHS + TWO_MONTHS, { from: owner })

              const previousDenominationTokenBalance = await denominationToken.balanceOf(employee)
              const previousAnotherTokenBalance = await anotherToken.balanceOf(employee)

              await payroll.partialPayday(requestedAmount, { from })

              await payroll.mockAddTimestamp(ONE_MONTH)
              await priceFeed.mockAddTimestamp(ONE_MONTH)
              await payroll.partialPayday(requestedAmount, { from })

              const currentDenominationTokenBalance = await denominationToken.balanceOf(employee)
              const expectedDenominationTokenBalance = previousDenominationTokenBalance.plus(requestedDenominationTokenAmount * 2)
              assert.equal(currentDenominationTokenBalance.toString(), expectedDenominationTokenBalance.toString(), 'current USD token balance does not match')

              const currentAnotherTokenBalance = await anotherToken.balanceOf(employee)
              const anotherTokenRate = (await priceFeed.get(denominationToken.address, anotherToken.address))[0].div(PCT_ONE)
              const expectedAnotherTokenBalance = anotherTokenRate.mul(requestedAnotherTokenAmount * 2).plus(previousAnotherTokenBalance)
              assert.equal(currentAnotherTokenBalance.toString(), expectedAnotherTokenBalance.toString(), 'current token balance does not match')
            })
          }

          const assertEmployeeIsUpdated = (requestedAmount, expectedRequestedAmount) => {
            it('updates the last payroll date', async () => {
              const previousPayrollDate = (await payroll.getEmployee(employeeId))[3]
              const expectedLastPayrollDate = previousPayrollDate.plus(Math.floor(expectedRequestedAmount / salary))

              await payroll.partialPayday(requestedAmount, { from })

              const lastPayrollDate = (await payroll.getEmployee(employeeId))[3]
              assert.equal(lastPayrollDate.toString(), expectedLastPayrollDate.toString(), 'last payroll date does not match')
            })

            it('does not remove the employee', async () => {
              await payroll.partialPayday(requestedAmount, { from })

              const [address, employeeSalary] = await payroll.getEmployee(employeeId)

              assert.equal(address, employee, 'employee address does not match')
              assert.equal(employeeSalary, salary, 'employee salary does not match')
            })
          }

          const itHandlesPayrollProperly = (requestedAmount, expectedRequestedAmount = requestedAmount) => {
            context('when exchange rates are not expired', () => {
              assertTransferredAmounts(requestedAmount, expectedRequestedAmount)
              assertEmployeeIsUpdated(requestedAmount, expectedRequestedAmount)
            })

            context('when exchange rates are expired', () => {
              beforeEach('expire exchange rates', async () => {
                await priceFeed.mockSetTimestamp(NOW - TWO_MONTHS)
              })

              it('reverts', async () => {
                await assertRevert(payroll.partialPayday(requestedAmount, { from }), 'PAYROLL_EXCHANGE_RATE_ZERO')
              })
            })
          }

          context('when the requested amount is zero', () => {
            const requestedAmount = 0

            context('when the employee has some pending reimbursements', () => {
              beforeEach('add accrued value', async () => {
                await payroll.addAccruedValue(employeeId, 1000, { from: owner })
              })

              context('when the employee is not terminated', () => {
                itHandlesPayrollProperly(requestedAmount, owedSalary)
              })

              context('when the employee is terminated', () => {
                beforeEach('terminate employee', async () => {
                  await payroll.terminateEmployeeNow(employeeId, { from: owner })
                })

                itHandlesPayrollProperly(requestedAmount, owedSalary)
              })
            })

            context('when the employee does not have pending reimbursements', () => {
              context('when the employee is not terminated', () => {
                itHandlesPayrollProperly(requestedAmount, owedSalary)
              })

              context('when the employee is terminated', () => {
                beforeEach('terminate employee', async () => {
                  await payroll.terminateEmployeeNow(employeeId, { from: owner })
                })

                context('when exchange rates are not expired', () => {
                  assertTransferredAmounts(requestedAmount, owedSalary)

                  it('removes the employee', async () => {
                    await payroll.partialPayday(requestedAmount, { from })

                    await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')
                  })
                })

                context('when exchange rates are expired', () => {
                  beforeEach('expire exchange rates', async () => {
                    await priceFeed.mockSetTimestamp(NOW - TWO_MONTHS)
                  })

                  it('reverts', async () => {
                    await assertRevert(payroll.partialPayday(requestedAmount, { from }), 'PAYROLL_EXCHANGE_RATE_ZERO')
                  })
                })
              })
            })
          })

          context('when the requested amount is less than the total owed salary', () => {
            const requestedAmount = owedSalary - 10

            context('when the employee has some pending reimbursements', () => {
              beforeEach('add accrued value', async () => {
                await payroll.addAccruedValue(employeeId, 1000, { from: owner })
              })

              context('when the employee is not terminated', () => {
                itHandlesPayrollProperly(requestedAmount)
              })

              context('when the employee is terminated', () => {
                beforeEach('terminate employee', async () => {
                  await payroll.terminateEmployeeNow(employeeId, { from: owner })
                })

                itHandlesPayrollProperly(requestedAmount)
              })
            })

            context('when the employee does not have pending reimbursements', () => {
              context('when the employee is not terminated', () => {
                itHandlesPayrollProperly(requestedAmount)
              })

              context('when the employee is terminated', () => {
                beforeEach('terminate employee', async () => {
                  await payroll.terminateEmployeeNow(employeeId, { from: owner })
                })

                itHandlesPayrollProperly(requestedAmount)
              })
            })
          })

          context('when the requested amount is equal to the total owed salary', () => {
            const requestedAmount = owedSalary

            context('when the employee has some pending reimbursements', () => {
              beforeEach('add accrued value', async () => {
                await payroll.addAccruedValue(employeeId, 1000, { from: owner })
              })

              context('when the employee is not terminated', () => {
                itHandlesPayrollProperly(requestedAmount)
              })

              context('when the employee is terminated', () => {
                beforeEach('terminate employee', async () => {
                  await payroll.terminateEmployeeNow(employeeId, { from: owner })
                })

                itHandlesPayrollProperly(requestedAmount)
              })
            })

            context('when the employee does not have pending reimbursements', () => {
              context('when the employee is not terminated', () => {
                itHandlesPayrollProperly(requestedAmount)
              })

              context('when the employee is terminated', () => {
                beforeEach('terminate employee', async () => {
                  await payroll.terminateEmployeeNow(employeeId, { from: owner })
                })

                context('when exchange rates are not expired', () => {
                  assertTransferredAmounts(requestedAmount)

                  it('removes the employee', async () => {
                    await payroll.partialPayday(requestedAmount, { from })

                    await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')
                  })
                })

                context('when exchange rates are expired', () => {
                  beforeEach('expire exchange rates', async () => {
                    await priceFeed.mockSetTimestamp(NOW - TWO_MONTHS)
                  })

                  it('reverts', async () => {
                    await assertRevert(payroll.partialPayday(requestedAmount, { from }), 'PAYROLL_EXCHANGE_RATE_ZERO')
                  })
                })
              })
            })
          })

          context('when the requested amount is greater than the total owed salary', () => {
            const requestedAmount = owedSalary + 1

            it('reverts', async () => {
              await assertRevert(payroll.partialPayday(requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
            })
          })
        })

        context('when the employee does not have pending salary', () => {
          context('when the requested amount is greater than zero', () => {
            const requestedAmount = 100

            it('reverts', async () => {
              await assertRevert(payroll.partialPayday(requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
            })
          })

          context('when the requested amount is zero', () => {
            const requestedAmount = 0

            it('reverts', async () => {
              await assertRevert(payroll.partialPayday(requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
            })
          })
        })
      })

      context('when the employee did not set any token allocations yet', () => {
        context('when the employee has some pending salary', () => {
          const owedSalary = ONE_MONTH * salary

          beforeEach('accumulate some pending salary', async () => {
            await payroll.mockAddTimestamp(ONE_MONTH)
          })

          context('when the requested amount is less than the total owed salary', () => {
            const requestedAmount = owedSalary - 10

            it('reverts', async () => {
              await assertRevert(payroll.partialPayday(requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
            })
          })

          context('when the requested amount is equal to the total owed salary', () => {
            const requestedAmount = owedSalary

            it('reverts', async () => {
              await assertRevert(payroll.partialPayday(requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
            })
          })
        })

        context('when the employee does not have pending salary', () => {
          context('when the requested amount is greater than zero', () => {
            const requestedAmount = 100

            it('reverts', async () => {
              await assertRevert(payroll.partialPayday(requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
            })
          })

          context('when the requested amount is zero', () => {
            const requestedAmount = 0

            it('reverts', async () => {
              await assertRevert(payroll.partialPayday(requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
            })
          })
        })
      })
    })

    context('when the sender is not an employee', () => {
        const from = anyone

        context('when the requested amount is greater than zero', () => {
          const requestedAmount = 100

          it('reverts', async () => {
            await assertRevert(payroll.partialPayday(requestedAmount, { from }), 'PAYROLL_EMPLOYEE_DOES_NOT_MATCH')
          })
        })

        context('when the requested amount is zero', () => {
          const requestedAmount = 0

          it('reverts', async () => {
            await assertRevert(payroll.partialPayday(requestedAmount, { from }), 'PAYROLL_EMPLOYEE_DOES_NOT_MATCH')
          })
        })
      })
  })
})
