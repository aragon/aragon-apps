const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { getEvents, getEventArgument } = require('../helpers/events')
const { bigExp, maxUint256 } = require('../helpers/numbers')(web3)
const { deployErc20TokenAndDeposit, deployContracts, createPayrollInstance, mockTimestamps } = require('../helpers/setup.js')(artifacts, web3)

contract('Payroll reimbursements', ([owner, employee, anotherEmployee, anyone]) => {
  let dao, payroll, payrollBase, finance, vault, priceFeed, denominationToken, anotherToken

  const NOW = 1553703809 // random fixed timestamp in seconds
  const ONE_MONTH = 60 * 60 * 24 * 31
  const TWO_MONTHS = ONE_MONTH * 2
  const RATE_EXPIRATION_TIME = TWO_MONTHS

  const PCT_ONE = bigExp(1, 18)
  const TOKEN_DECIMALS = 18
  const PAYROLL_PAYMENT_TYPE = 0
  const REIMBURSEMENTS_PAYMENT_TYPE = 1

  before('setup base apps and tokens', async () => {
    ({ dao, finance, vault, priceFeed, payrollBase } = await deployContracts(owner))
    anotherToken = await deployErc20TokenAndDeposit(owner, finance, vault, 'Another token', TOKEN_DECIMALS)
    denominationToken = await deployErc20TokenAndDeposit(owner, finance, vault, 'Denomination Token', TOKEN_DECIMALS)
  })

  beforeEach('setup payroll instance', async () => {
    payroll = await createPayrollInstance(dao, payrollBase, owner)
    await mockTimestamps(payroll, priceFeed, NOW)
  })

  describe('addAccruedValue', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender has permissions', () => {
        const from = owner

        context('when the given employee exists', () => {
          let employeeId

          beforeEach('add employee', async () => {
            const receipt = await payroll.addEmployeeNow(employee, 1000, 'Boss')
            employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
          })

          context('when the given employee is active', () => {

            const itAddsAccruedValueSuccessfully = value => {
              it('adds requested accrued value', async () => {
                await payroll.addAccruedValue(employeeId, value, { from })

                const accruedValue = (await payroll.getEmployee(employeeId))[3]
                assert.equal(accruedValue, value, 'accrued value does not match')
              })

              it('emits an event', async () => {
                const receipt = await payroll.addAccruedValue(employeeId, value, { from })

                const events = getEvents(receipt, 'AddEmployeeAccruedValue')
                assert.equal(events.length, 1, 'number of AddEmployeeAccruedValue emitted events does not match')
                assert.equal(events[0].args.employeeId.toString(), employeeId, 'employee id does not match')
                assert.equal(events[0].args.amount.toString(), value, 'accrued value does not match')
              })
            }

            context('when the given value greater than zero', () => {
              const value = 1000

              itAddsAccruedValueSuccessfully(value)
            })

            context('when the given value is zero', () => {
              const value = 0

              itAddsAccruedValueSuccessfully(value)
            })

            context('when the given value way greater than zero', () => {
              const value = maxUint256()

              it('reverts', async () => {
                await payroll.addAccruedValue(employeeId, 1, { from })

                await assertRevert(payroll.addAccruedValue(employeeId, value, { from }), 'MATH_ADD_OVERFLOW')
              })
            })
          })

          context('when the given employee is not active', () => {
            beforeEach('terminate employee', async () => {
              await payroll.terminateEmployeeNow(employeeId, { from: owner })
              await payroll.mockIncreaseTime(ONE_MONTH)
            })

            it('reverts', async () => {
              await assertRevert(payroll.addAccruedValue(employeeId, 1000, { from }), 'PAYROLL_NON_ACTIVE_EMPLOYEE')
            })
          })
        })

        context('when the given employee does not exist', async () => {
          const employeeId = 0

          it('reverts', async () => {
            await assertRevert(payroll.addAccruedValue(employeeId, 1000, { from }), 'PAYROLL_NON_ACTIVE_EMPLOYEE')
          })
        })
      })

      context('when the sender does not have permissions', () => {
        const from = anyone
        const value = 1000
        const employeeId = 0

        it('reverts', async () => {
          await assertRevert(payroll.addAccruedValue(employeeId, value, { from }), 'APP_AUTH_FAILED')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      const value = 10000
      const employeeId = 0

      it('reverts', async () => {
        await assertRevert(payroll.addAccruedValue(employeeId, value, { from: owner }), 'APP_AUTH_FAILED')
      })
    })
  })

  describe('reimbursements payday', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender is an employee', () => {
        const from = employee
        let employeeId, salary = 1000

        beforeEach('add employee and accumulate some salary', async () => {
          const receipt = await payroll.addEmployeeNow(employee, salary, 'Boss')
          employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')

          await payroll.mockIncreaseTime(ONE_MONTH)
        })

        context('when the employee has already set some token allocations', () => {
          const denominationTokenAllocation = 80
          const anotherTokenAllocation = 20

          beforeEach('set tokens allocation', async () => {
            await payroll.addAllowedToken(anotherToken.address, { from: owner })
            await payroll.addAllowedToken(denominationToken.address, { from: owner })
            await payroll.determineAllocation([denominationToken.address, anotherToken.address], [denominationTokenAllocation, anotherTokenAllocation], { from })
          })

          context('when the employee has some pending reimbursements', () => {
            const accruedValue = 100

            beforeEach('add accrued value', async () => {
              await payroll.addAccruedValue(employeeId, accruedValue / 2, { from: owner })
              await payroll.addAccruedValue(employeeId, accruedValue / 2, { from: owner })
            })

            const assertTransferredAmounts = (requestedAmount, expectedRequestedAmount = requestedAmount) => {
              const requestedDenominationTokenAmount = parseInt(expectedRequestedAmount * denominationTokenAllocation / 100)
              const requestedAnotherTokenAmount = expectedRequestedAmount * anotherTokenAllocation / 100

              it('transfers all the pending reimbursements', async () => {
                const previousDenominationTokenBalance = await denominationToken.balanceOf(employee)
                const previousAnotherTokenBalance = await anotherToken.balanceOf(employee)

                await payroll.payday(REIMBURSEMENTS_PAYMENT_TYPE, requestedAmount, { from })

                const currentDenominationTokenBalance = await denominationToken.balanceOf(employee)
                const expectedDenominationTokenBalance = previousDenominationTokenBalance.plus(requestedDenominationTokenAmount);
                assert.equal(currentDenominationTokenBalance.toString(), expectedDenominationTokenBalance.toString(), 'current denomination token balance does not match')

                const currentAnotherTokenBalance = await anotherToken.balanceOf(employee)
                const anotherTokenRate = (await priceFeed.get(denominationToken.address, anotherToken.address))[0].div(PCT_ONE)
                const expectedAnotherTokenBalance = anotherTokenRate.mul(requestedAnotherTokenAmount).plus(previousAnotherTokenBalance).trunc()
                assert.equal(currentAnotherTokenBalance.toString(), expectedAnotherTokenBalance.toString(), 'current token balance does not match')
              })

              it('emits one event per allocated token', async () => {
                const receipt = await payroll.payday(REIMBURSEMENTS_PAYMENT_TYPE, requestedAmount, { from })

                const events = receipt.logs.filter(l => l.event === 'SendPayment')
                assert.equal(events.length, 2, 'should have emitted two events')

                const denominationTokenEvent = events.find(e => e.args.token === denominationToken.address).args
                assert.equal(denominationTokenEvent.employee, employee, 'employee address does not match')
                assert.equal(denominationTokenEvent.token, denominationToken.address, 'denomination token address does not match')
                assert.equal(denominationTokenEvent.amount.toString(), requestedDenominationTokenAmount, 'payment amount does not match')
                assert.equal(denominationTokenEvent.paymentReference, 'Reimbursement', 'payment reference does not match')

                const anotherTokenRate = (await priceFeed.get(denominationToken.address, anotherToken.address))[0].div(PCT_ONE)
                const anotherTokenEvent = events.find(e => e.args.token === anotherToken.address).args
                assert.equal(anotherTokenEvent.employee, employee, 'employee address does not match')
                assert.equal(anotherTokenEvent.token, anotherToken.address, 'token address does not match')
                assert.equal(anotherTokenEvent.amount.div(anotherTokenRate).trunc().toString(), parseInt(requestedAnotherTokenAmount), 'payment amount does not match')
                assert.equal(anotherTokenEvent.paymentReference, 'Reimbursement', 'payment reference does not match')
              })
            }

            const assertEmployeeIsNotRemoved = (requestedAmount, expectedRequestedAmount = requestedAmount) => {
              it('does not remove the employee and resets the accrued value', async () => {
                const previousAccruedValue = (await payroll.getEmployee(employeeId))[3]
                await payroll.payday(REIMBURSEMENTS_PAYMENT_TYPE, requestedAmount, { from })

                const [address, employeeSalary, _, accruedValue] = await payroll.getEmployee(employeeId)

                assert.equal(address, employee, 'employee address does not match')
                assert.equal(employeeSalary, salary, 'employee salary does not match')
                assert.equal(previousAccruedValue.minus(expectedRequestedAmount).toString(), accruedValue.toString(), 'employee accrued value does not match')
              })
            }

            const itHandlesReimbursementsProperly = (requestedAmount, expectedRequestedAmount = requestedAmount) => {
              context('when exchange rates are not expired', () => {
                assertTransferredAmounts(requestedAmount, expectedRequestedAmount)
                assertEmployeeIsNotRemoved(requestedAmount, expectedRequestedAmount)
              })

              context('when exchange rates are expired', () => {
                beforeEach('expire exchange rates', async () => {
                  await priceFeed.mockSetTimestamp(NOW - TWO_MONTHS)
                })

                it('reverts', async () => {
                  await assertRevert(payroll.payday(REIMBURSEMENTS_PAYMENT_TYPE, requestedAmount, { from }), 'PAYROLL_EXCHANGE_RATE_ZERO')
                })
              })
            }

            context('when the requested amount is zero', () => {
              const requestedAmount = 0

              context('when the employee has some pending salary', () => {
                context('when the employee is not terminated', () => {
                  itHandlesReimbursementsProperly(requestedAmount, accruedValue)
                })

                context('when the employee is terminated', () => {
                  beforeEach('terminate employee', async () => {
                    await payroll.terminateEmployeeNow(employeeId, { from: owner })
                  })

                  itHandlesReimbursementsProperly(requestedAmount, accruedValue)
                })
              })

              context('when the employee does not have pending salary', () => {
                beforeEach('cash out pending salary', async () => {
                  await payroll.payday(PAYROLL_PAYMENT_TYPE, 0, { from })
                })

                context('when the employee is not terminated', () => {
                  itHandlesReimbursementsProperly(requestedAmount, accruedValue)
                })

                context('when the employee is terminated', () => {
                  beforeEach('terminate employee', async () => {
                    await payroll.terminateEmployeeNow(employeeId, { from: owner })
                  })

                  context('when exchange rates are not expired', () => {
                    assertTransferredAmounts(requestedAmount, accruedValue)

                    it('removes the employee', async () => {
                      await payroll.payday(REIMBURSEMENTS_PAYMENT_TYPE, requestedAmount, { from })

                      await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')
                    })
                  })

                  context('when exchange rates are expired', () => {
                    beforeEach('expire exchange rates', async () => {
                      await priceFeed.mockSetTimestamp(NOW - TWO_MONTHS)
                    })

                    it('reverts', async () => {
                      await assertRevert(payroll.payday(REIMBURSEMENTS_PAYMENT_TYPE, requestedAmount, { from }), 'PAYROLL_EXCHANGE_RATE_ZERO')
                    })
                  })
                })
              })
            })

            context('when the requested amount is less than the total accrued value', () => {
              const requestedAmount = accruedValue - 1

              context('when the employee has some pending salary', () => {
                context('when the employee is not terminated', () => {
                  itHandlesReimbursementsProperly(requestedAmount)
                })

                context('when the employee is terminated', () => {
                  beforeEach('terminate employee', async () => {
                    await payroll.terminateEmployeeNow(employeeId, { from: owner })
                  })

                  itHandlesReimbursementsProperly(requestedAmount)
                })
              })

              context('when the employee does not have pending salary', () => {
                beforeEach('cash out pending salary', async () => {
                  await payroll.payday(PAYROLL_PAYMENT_TYPE, 0, { from })
                })

                context('when the employee is not terminated', () => {
                  itHandlesReimbursementsProperly(requestedAmount)
                })

                context('when the employee is terminated', () => {
                  beforeEach('terminate employee', async () => {
                    await payroll.terminateEmployeeNow(employeeId, { from: owner })
                  })

                  itHandlesReimbursementsProperly(requestedAmount)
                })
              })
            })

            context('when the requested amount is equal to the total accrued value', () => {
              const requestedAmount = accruedValue

              context('when the employee has some pending salary', () => {
                context('when the employee is not terminated', () => {
                  itHandlesReimbursementsProperly(requestedAmount)
                })

                context('when the employee is terminated', () => {
                  beforeEach('terminate employee', async () => {
                    await payroll.terminateEmployeeNow(employeeId, { from: owner })
                  })

                  itHandlesReimbursementsProperly(requestedAmount)
                })
              })

              context('when the employee does not have pending salary', () => {
                beforeEach('cash out pending salary', async () => {
                  await payroll.payday(PAYROLL_PAYMENT_TYPE, 0, { from })
                })

                context('when the employee is not terminated', () => {
                  itHandlesReimbursementsProperly(requestedAmount)
                })

                context('when the employee is terminated', () => {
                  beforeEach('terminate employee', async () => {
                    await payroll.terminateEmployeeNow(employeeId, { from: owner })
                  })

                  context('when exchange rates are not expired', () => {
                    assertTransferredAmounts(requestedAmount)

                    it('removes the employee', async () => {
                      await payroll.payday(REIMBURSEMENTS_PAYMENT_TYPE, requestedAmount, { from })

                      await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')
                    })
                  })

                  context('when exchange rates are expired', () => {
                    beforeEach('expire exchange rates', async () => {
                      await priceFeed.mockSetTimestamp(NOW - TWO_MONTHS)
                    })

                    it('reverts', async () => {
                      await assertRevert(payroll.payday(REIMBURSEMENTS_PAYMENT_TYPE, requestedAmount, { from }), 'PAYROLL_EXCHANGE_RATE_ZERO')
                    })
                  })
                })
              })
            })

            context('when the requested amount is greater than the total accrued value', () => {
              const requestedAmount = accruedValue + 1

              it('reverts', async () => {
                await assertRevert(payroll.payday(REIMBURSEMENTS_PAYMENT_TYPE, requestedAmount, { from }), 'PAYROLL_INVALID_REQUESTED_AMT')
              })
            })
          })

          context('when the employee does not have pending reimbursements', () => {
            context('when the requested amount is greater than zero', () => {
              const requestedAmount = 100

              it('reverts', async () => {
                await assertRevert(payroll.payday(REIMBURSEMENTS_PAYMENT_TYPE, requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
              })
            })

            context('when the requested amount is zero', () => {
              const requestedAmount = 0

              it('reverts', async () => {
                await assertRevert(payroll.payday(REIMBURSEMENTS_PAYMENT_TYPE, requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
              })
            })
          })
        })

        context('when the employee did not set any token allocations yet', () => {
          context('when the employee has some pending reimbursements', () => {
            const accruedValue = 100

            beforeEach('add accrued value', async () => {
              await payroll.addAccruedValue(employeeId, accruedValue / 2, { from: owner })
              await payroll.addAccruedValue(employeeId, accruedValue / 2, { from: owner })
            })

            context('when the requested amount is zero', () => {
              const requestedAmount = 0

              it('reverts', async () => {
                await assertRevert(payroll.payday(REIMBURSEMENTS_PAYMENT_TYPE, requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
              })
            })

            context('when the requested amount is less than the total accrued value', () => {
              const requestedAmount = accruedValue - 1

              it('reverts', async () => {
                await assertRevert(payroll.payday(REIMBURSEMENTS_PAYMENT_TYPE, requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
              })
            })

            context('when the requested amount is equal to the total accrued value', () => {
              const requestedAmount = accruedValue

              it('reverts', async () => {
                await assertRevert(payroll.payday(REIMBURSEMENTS_PAYMENT_TYPE, requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
              })
            })

            context('when the requested amount is greater than the total accrued value', () => {
              const requestedAmount = accruedValue + 1

              it('reverts', async () => {
                await assertRevert(payroll.payday(REIMBURSEMENTS_PAYMENT_TYPE, requestedAmount, { from }), 'PAYROLL_INVALID_REQUESTED_AMT')
              })
            })
          })

          context('when the employee does not have pending reimbursements', () => {
            context('when the requested amount is greater than zero', () => {
              const requestedAmount = 100

              it('reverts', async () => {
                await assertRevert(payroll.payday(REIMBURSEMENTS_PAYMENT_TYPE, requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
              })
            })

            context('when the requested amount is zero', () => {
              const requestedAmount = 0

              it('reverts', async () => {
                await assertRevert(payroll.payday(REIMBURSEMENTS_PAYMENT_TYPE, requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
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
            await assertRevert(payroll.payday(REIMBURSEMENTS_PAYMENT_TYPE, requestedAmount, { from }), 'PAYROLL_EMPLOYEE_DOES_NOT_MATCH')
          })
        })

        context('when the requested amount is zero', () => {
          const requestedAmount = 0

          it('reverts', async () => {
            await assertRevert(payroll.payday(REIMBURSEMENTS_PAYMENT_TYPE, requestedAmount, { from }), 'PAYROLL_EMPLOYEE_DOES_NOT_MATCH')
          })
        })
      })
    })

    context('when it has not been initialized yet', function () {
      const requestedAmount = 0

      it('reverts', async () => {
        await assertRevert(payroll.payday(REIMBURSEMENTS_PAYMENT_TYPE, requestedAmount, { from: employee }), 'PAYROLL_EMPLOYEE_DOES_NOT_MATCH')
      })
    })
  })
})
