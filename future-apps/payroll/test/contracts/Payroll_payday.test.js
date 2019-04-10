const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { getEventArgument } = require('../helpers/events')
const { bn, bigExp, maxUint256 } = require('../helpers/numbers')(web3)
const { deployErc20TokenAndDeposit, deployContracts, createPayrollInstance, mockTimestamps } = require('../helpers/setup.js')(artifacts, web3)

contract('Payroll payday', ([owner, employee, anotherEmployee, anyone]) => {
  let dao, payroll, payrollBase, finance, vault, priceFeed, denominationToken, anotherToken

  const NOW = 1553703809 // random fixed timestamp in seconds
  const ONE_MONTH = 60 * 60 * 24 * 31
  const TWO_MONTHS = ONE_MONTH * 2
  const RATE_EXPIRATION_TIME = TWO_MONTHS

  const PCT_ONE = bigExp(1, 18)
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

  describe('payday', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender is an employee', () => {
        let employeeId
        const from = employee

        context('when the employee has a reasonable salary', () => {
          const salary = 10000

          beforeEach('add employee', async () => {
            const receipt = await payroll.addEmployeeNow(employee, salary, 'Boss')
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
                await payroll.mockIncreaseTime(ONE_MONTH)
              })

              const assertTransferredAmounts = () => {
                const expectedOwedAmount = salary * ONE_MONTH
                const expectedDenominationTokenAmount = Math.round(expectedOwedAmount * denominationTokenAllocation / 100)
                const expectedAnotherTokenAmount = Math.round(expectedOwedAmount * anotherTokenAllocation / 100)

                it('transfers the owed salary', async () => {
                  const previousDenominationTokenBalance = await denominationToken.balanceOf(employee)
                  const previousAnotherTokenBalance = await anotherToken.balanceOf(employee)

                  await payroll.payday({ from })

                  const currentDenominationTokenBalance = await denominationToken.balanceOf(employee)
                  assert.equal(currentDenominationTokenBalance.toString(), previousDenominationTokenBalance.plus(expectedDenominationTokenAmount).toString(), 'current denomination token balance does not match')

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
                  assert.equal(denominationTokenEvent.token, denominationToken.address, 'denomination token address does not match')
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

                  await payroll.mockIncreaseTime(ONE_MONTH)
                  await priceFeed.mockIncreaseTime(ONE_MONTH)
                  await payroll.payday({ from })

                  const currentDenominationTokenBalance = await denominationToken.balanceOf(employee)
                  const expectedDenominationTokenBalance = previousDenominationTokenBalance.plus(expectedDenominationTokenAmount * 2)
                  assert.equal(currentDenominationTokenBalance.toString(), expectedDenominationTokenBalance.toString(), 'current denomination token balance does not match')

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
                  assert.equal(lastPayrollDate.toString(), (await currentTimestamp()).toString(), 'last payroll date does not match')
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
                await payroll.mockIncreaseTime(ONE_MONTH)
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

        const itReverts = reason => {
          it('reverts', async () => {
            await assertRevert(payroll.payday({ from }), reason)
          })
        }

        const itRevertsHandlingExpiredRates = (nonExpiredRatesReason, expiredRatesReason) => {
          context('when exchange rates are not expired', () => {
            itReverts(nonExpiredRatesReason)
          })

          context('when exchange rates are expired', () => {
            beforeEach('expire exchange rates', async () => {
              await priceFeed.mockSetTimestamp(NOW - TWO_MONTHS)
            })

            itReverts(expiredRatesReason)
          })
        }

        const itRevertsToWithdrawPayroll = (nonExpiredRatesReason, expiredRatesReason) => {
          context('when the employee has some pending reimbursements', () => {
            beforeEach('add accrued value', async () => {
              await payroll.addAccruedValue(employeeId, 1000, { from: owner })
            })

            context('when the employee is not terminated', () => {
              itRevertsHandlingExpiredRates(nonExpiredRatesReason, expiredRatesReason)
            })

            context('when the employee is terminated', () => {
              beforeEach('terminate employee', async () => {
                await payroll.terminateEmployeeNow(employeeId, { from: owner })
              })

              itRevertsHandlingExpiredRates(nonExpiredRatesReason, expiredRatesReason)
            })
          })

          context('when the employee does not have pending reimbursements', () => {
            context('when the employee is not terminated', () => {
              itRevertsHandlingExpiredRates(nonExpiredRatesReason, expiredRatesReason)
            })

            context('when the employee is terminated', () => {
              beforeEach('terminate employee', async () => {
                await payroll.terminateEmployeeNow(employeeId, { from: owner })
              })

              itRevertsHandlingExpiredRates(nonExpiredRatesReason, expiredRatesReason)
            })
          })
        }

        const itRevertsAnyAttemptToWithdrawPayroll = (nonExpiredRatesReason, expiredRatesReason) => {
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
                await payroll.mockIncreaseTime(ONE_MONTH)
              })

              itRevertsToWithdrawPayroll(nonExpiredRatesReason, expiredRatesReason)
            })

            context('when the employee does not have pending salary', () => {
              itRevertsToWithdrawPayroll('PAYROLL_NOTHING_PAID', 'PAYROLL_NOTHING_PAID')
            })
          })

          context('when the employee did not set any token allocations yet', () => {
            context('when the employee has some pending salary', () => {
              beforeEach('accumulate some pending salary', async () => {
                await payroll.mockIncreaseTime(ONE_MONTH)
              })

              itRevertsToWithdrawPayroll('PAYROLL_NOTHING_PAID', 'PAYROLL_NOTHING_PAID')
            })

            context('when the employee does not have pending salary', () => {
              itRevertsToWithdrawPayroll('PAYROLL_NOTHING_PAID', 'PAYROLL_NOTHING_PAID')
            })
          })
        }

        context('when the employee has a zero salary', () => {
          const salary = 0

          beforeEach('add employee', async () => {
            const receipt = await payroll.addEmployeeNow(employee, salary, 'Boss')
            employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
          })

          itRevertsAnyAttemptToWithdrawPayroll('PAYROLL_NOTHING_PAID', 'PAYROLL_NOTHING_PAID')
        })

        context('when the employee has a huge salary', () => {
          const salary = maxUint256()

          beforeEach('add employee', async () => {
            const receipt = await payroll.addEmployeeNow(employee, salary, 'Boss')
            employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
          })

          itRevertsAnyAttemptToWithdrawPayroll('MATH_MUL_OVERFLOW', 'PAYROLL_EXCHANGE_RATE_ZERO')
        })
      })

      context('when the sender is not an employee', () => {
        const from = anyone

        it('reverts', async () => {
          await assertRevert(payroll.payday({ from }), 'PAYROLL_EMPLOYEE_DOES_NOT_MATCH')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      it('reverts', async () => {
        await assertRevert(payroll.payday({ from: employee }), 'PAYROLL_EMPLOYEE_DOES_NOT_MATCH')
      })
    })
  })

  describe('partialPayday', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender is an employee', () => {
        let employeeId
        const from = employee

        context('when the employee has a reasonable salary', () => {
          const salary = 100000

          beforeEach('add employee', async () => {
            const receipt = await payroll.addEmployeeNow(employee, salary, 'Boss')
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
              const owedSalary = salary * ONE_MONTH

              beforeEach('accumulate some pending salary', async () => {
                await payroll.mockIncreaseTime(ONE_MONTH)
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
                  assert.equal(currentDenominationTokenBalance.toString(), expectedDenominationTokenBalance.toString(), 'current denomination token balance does not match')

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
                  assert.equal(denominationTokenEvent.token, denominationToken.address, 'denomination token address does not match')
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

                  await payroll.mockIncreaseTime(ONE_MONTH)
                  await priceFeed.mockIncreaseTime(ONE_MONTH)
                  await payroll.partialPayday(requestedAmount, { from })

                  const currentDenominationTokenBalance = await denominationToken.balanceOf(employee)
                  const expectedDenominationTokenBalance = previousDenominationTokenBalance.plus(requestedDenominationTokenAmount * 2)
                  assert.equal(currentDenominationTokenBalance.toString(), expectedDenominationTokenBalance.toString(), 'current denomination token balance does not match')

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
                  await assertRevert(payroll.partialPayday(requestedAmount, { from }), 'PAYROLL_INVALID_REQUESTED_AMT')
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
              const owedSalary = salary * ONE_MONTH

              beforeEach('accumulate some pending salary', async () => {
                await payroll.mockIncreaseTime(ONE_MONTH)
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

        const itReverts = (requestedAmount, reason) => {
          it('reverts', async () => {
            await assertRevert(payroll.partialPayday(requestedAmount, {from}), reason)
          })
        }

        const itRevertsHandlingExpiredRates = (requestedAmount, nonExpiredRatesReason, expiredRatesReason) => {
          context('when exchange rates are not expired', () => {
            itReverts(requestedAmount, nonExpiredRatesReason)
          })

          context('when exchange rates are expired', () => {
            beforeEach('expire exchange rates', async () => {
              await priceFeed.mockSetTimestamp(NOW - TWO_MONTHS)
            })

            itReverts(requestedAmount, expiredRatesReason)
          })
        }

        const itRevertsToWithdrawPartialPayroll = (requestedAmount, nonExpiredRatesReason, expiredRatesReason) => {
          context('when the employee has some pending reimbursements', () => {
            beforeEach('add accrued value', async () => {
              await payroll.addAccruedValue(employeeId, 1000, {from: owner})
            })

            context('when the employee is not terminated', () => {
              itRevertsHandlingExpiredRates(requestedAmount, nonExpiredRatesReason, expiredRatesReason)
            })

            context('when the employee is terminated', () => {
              beforeEach('terminate employee', async () => {
                await payroll.terminateEmployeeNow(employeeId, {from: owner})
              })

              itRevertsHandlingExpiredRates(requestedAmount, nonExpiredRatesReason, expiredRatesReason)
            })
          })

          context('when the employee does not have pending reimbursements', () => {
            context('when the employee is not terminated', () => {
              itRevertsHandlingExpiredRates(requestedAmount, nonExpiredRatesReason, expiredRatesReason)
            })

            context('when the employee is terminated', () => {
              beforeEach('terminate employee', async () => {
                await payroll.terminateEmployeeNow(employeeId, {from: owner})
              })

              itRevertsHandlingExpiredRates(requestedAmount, nonExpiredRatesReason, expiredRatesReason)
            })
          })
        }

        context('when the employee has a zero salary', () => {
          const salary = 0

          beforeEach('add employee', async () => {
            const receipt = await payroll.addEmployeeNow(employee, salary, 'Boss')
            employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
          })

          const itRevertsAnyAttemptToWithdrawPartialPayroll = () => {
            context('when the employee has some pending salary', () => {
              beforeEach('accumulate some pending salary', async () => {
                await payroll.mockIncreaseTime(ONE_MONTH)
              })

              context('when the requested amount is greater than zero', () => {
                const requestedAmount = 10000

                itRevertsToWithdrawPartialPayroll(requestedAmount, 'PAYROLL_NOTHING_PAID', 'PAYROLL_NOTHING_PAID')
              })

              context('when the requested amount is zero', () => {
                const requestedAmount = 0

                itRevertsToWithdrawPartialPayroll(requestedAmount, 'PAYROLL_NOTHING_PAID', 'PAYROLL_NOTHING_PAID')
              })
            })

            context('when the employee does not have pending salary', () => {
              context('when the requested amount is greater than zero', () => {
                const requestedAmount = 1000

                itRevertsToWithdrawPartialPayroll(requestedAmount, 'PAYROLL_NOTHING_PAID', 'PAYROLL_NOTHING_PAID')
              })

              context('when the requested amount is zero', () => {
                const requestedAmount = 0

                itRevertsToWithdrawPartialPayroll(requestedAmount, 'PAYROLL_NOTHING_PAID', 'PAYROLL_NOTHING_PAID')
              })
            })
          }

          context('when the employee has already set some token allocations', () => {
            const denominationTokenAllocation = 80
            const anotherTokenAllocation = 20

            beforeEach('set tokens allocation', async () => {
              await payroll.addAllowedToken(anotherToken.address, {from: owner})
              await payroll.addAllowedToken(denominationToken.address, {from: owner})
              await payroll.determineAllocation([denominationToken.address, anotherToken.address], [denominationTokenAllocation, anotherTokenAllocation], {from})
            })

            itRevertsAnyAttemptToWithdrawPartialPayroll()
          })

          context('when the employee did not set any token allocations yet', () => {
            itRevertsAnyAttemptToWithdrawPartialPayroll()
          })
        })

        context('when the employee has a huge salary', () => {
          const salary = maxUint256()

          beforeEach('add employee', async () => {
            const receipt = await payroll.addEmployeeNow(employee, salary, 'Boss')
            employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
          })

          context('when the employee has already set some token allocations', () => {
            const denominationTokenAllocation = 80
            const anotherTokenAllocation = 20

            beforeEach('set tokens allocation', async () => {
              await payroll.addAllowedToken(anotherToken.address, {from: owner})
              await payroll.addAllowedToken(denominationToken.address, {from: owner})
              await payroll.determineAllocation([denominationToken.address, anotherToken.address], [denominationTokenAllocation, anotherTokenAllocation], {from})
            })

            context('when the employee has some pending salary', () => {
              const owedSalary = maxUint256()

              beforeEach('accumulate some pending salary', async () => {
                await payroll.mockIncreaseTime(ONE_MONTH)
              })

              context('when the requested amount is zero', () => {
                const requestedAmount = 0

                itRevertsToWithdrawPartialPayroll(requestedAmount, 'MATH_MUL_OVERFLOW', 'PAYROLL_EXCHANGE_RATE_ZERO')
              })

              context('when the requested amount is less than the total owed salary', () => {
                const requestedAmount = 10000

                const assertTransferredAmounts = requestedAmount => {
                  const requestedDenominationTokenAmount = Math.round(requestedAmount * denominationTokenAllocation / 100)
                  const requestedAnotherTokenAmount = Math.round(requestedAmount * anotherTokenAllocation / 100)

                  it('transfers the requested salary amount', async () => {
                    const previousDenominationTokenBalance = await denominationToken.balanceOf(employee)
                    const previousAnotherTokenBalance = await anotherToken.balanceOf(employee)

                    await payroll.partialPayday(requestedAmount, { from })

                    const currentDenominationTokenBalance = await denominationToken.balanceOf(employee)
                    const expectedDenominationTokenBalance = previousDenominationTokenBalance.plus(requestedDenominationTokenAmount);
                    assert.equal(currentDenominationTokenBalance.toString(), expectedDenominationTokenBalance.toString(), 'current denomination token balance does not match')

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
                    assert.equal(denominationTokenEvent.token, denominationToken.address, 'denomination token address does not match')
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

                    await payroll.mockIncreaseTime(ONE_MONTH)
                    await priceFeed.mockIncreaseTime(ONE_MONTH)
                    await payroll.partialPayday(requestedAmount, { from })

                    const currentDenominationTokenBalance = await denominationToken.balanceOf(employee)
                    const expectedDenominationTokenBalance = previousDenominationTokenBalance.plus(requestedDenominationTokenAmount * 2)
                    assert.equal(currentDenominationTokenBalance.toString(), expectedDenominationTokenBalance.toString(), 'current denomination token balance does not match')

                    const currentAnotherTokenBalance = await anotherToken.balanceOf(employee)
                    const anotherTokenRate = (await priceFeed.get(denominationToken.address, anotherToken.address))[0].div(PCT_ONE)
                    const expectedAnotherTokenBalance = anotherTokenRate.mul(requestedAnotherTokenAmount * 2).plus(previousAnotherTokenBalance)
                    assert.equal(currentAnotherTokenBalance.toString(), expectedAnotherTokenBalance.toString(), 'current token balance does not match')
                  })
                }

                const assertEmployeeIsUpdated = requestedAmount => {
                  it('updates the last payroll date', async () => {
                    const previousPayrollDate = (await payroll.getEmployee(employeeId))[3]
                    const expectedLastPayrollDate = previousPayrollDate.plus(Math.floor(bn(requestedAmount).div(salary)))

                    await payroll.partialPayday(requestedAmount, { from })

                    const lastPayrollDate = (await payroll.getEmployee(employeeId))[3]
                    assert.equal(lastPayrollDate.toString(), expectedLastPayrollDate.toString(), 'last payroll date does not match')
                  })

                  it('does not remove the employee', async () => {
                    await payroll.partialPayday(requestedAmount, { from })

                    const [address, employeeSalary] = await payroll.getEmployee(employeeId)

                    assert.equal(address, employee, 'employee address does not match')
                    assert.equal(employeeSalary.toString(), salary.toString())
                  })
                }

                const itHandlesPayrollProperly = requestedAmount => {
                  context('when exchange rates are not expired', () => {
                    assertTransferredAmounts(requestedAmount)
                    assertEmployeeIsUpdated(requestedAmount)
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

                itRevertsToWithdrawPartialPayroll(requestedAmount, 'MATH_MUL_OVERFLOW', 'PAYROLL_EXCHANGE_RATE_ZERO')
              })
            })

            context('when the employee does not have pending salary', () => {
              context('when the requested amount is greater than zero', () => {
                const requestedAmount = 100

                itRevertsToWithdrawPartialPayroll(requestedAmount, 'PAYROLL_NOTHING_PAID', 'PAYROLL_NOTHING_PAID')
              })

              context('when the requested amount is zero', () => {
                const requestedAmount = 0

                itRevertsToWithdrawPartialPayroll(requestedAmount, 'PAYROLL_NOTHING_PAID', 'PAYROLL_NOTHING_PAID')
              })
            })
          })

          context('when the employee did not set any token allocations yet', () => {
            context('when the employee has some pending salary', () => {
              const owedSalary = maxUint256()

              beforeEach('accumulate some pending salary', async () => {
                await payroll.mockIncreaseTime(ONE_MONTH)
              })

              context('when the requested amount is zero', () => {
                const requestedAmount = 0

                itRevertsToWithdrawPartialPayroll(requestedAmount, 'PAYROLL_NOTHING_PAID', 'PAYROLL_NOTHING_PAID')
              })

              context('when the requested amount is less than the total owed salary', () => {
                const requestedAmount = 10000

                itRevertsToWithdrawPartialPayroll(requestedAmount, 'PAYROLL_NOTHING_PAID', 'PAYROLL_NOTHING_PAID')
              })

              context('when the requested amount is equal to the total owed salary', () => {
                const requestedAmount = owedSalary

                itRevertsToWithdrawPartialPayroll(requestedAmount, 'PAYROLL_NOTHING_PAID', 'PAYROLL_NOTHING_PAID')
              })
            })

            context('when the employee does not have pending salary', () => {
              context('when the requested amount is greater than zero', () => {
                const requestedAmount = 100

                itRevertsToWithdrawPartialPayroll(requestedAmount, 'PAYROLL_NOTHING_PAID', 'PAYROLL_NOTHING_PAID')
              })

              context('when the requested amount is zero', () => {
                const requestedAmount = 0

                itRevertsToWithdrawPartialPayroll(requestedAmount, 'PAYROLL_NOTHING_PAID', 'PAYROLL_NOTHING_PAID')
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

    context('when it has not been initialized yet', function () {
      const requestedAmount = 0

      it('reverts', async () => {
        await assertRevert(payroll.partialPayday(requestedAmount, { from: employee }), 'PAYROLL_EMPLOYEE_DOES_NOT_MATCH')
      })
    })
  })
})
