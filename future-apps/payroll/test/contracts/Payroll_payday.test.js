const PAYMENT_TYPES = require('../helpers/payment_types')
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { MAX_UINT256 } = require('../helpers/numbers')(web3)
const { getEventArgument } = require('../helpers/events')
const { NOW, ONE_MONTH, TWO_MONTHS, RATE_EXPIRATION_TIME } = require('../helpers/time')
const { deployContracts, createPayrollAndPriceFeed } = require('../helpers/deploy')(artifacts, web3)
const { USD, deployDAI, deployANT, DAI_RATE, ANT_RATE, setTokenRates } = require('../helpers/tokens.js')(artifacts, web3)

contract('Payroll payday', ([owner, employee, anyone]) => {
  let dao, payroll, payrollBase, finance, vault, priceFeed, DAI, ANT

  const increaseTime = async seconds => {
    await payroll.mockIncreaseTime(seconds)
    await priceFeed.mockIncreaseTime(seconds)
  }

  before('deploy base apps and tokens', async () => {
    ({ dao, finance, vault, payrollBase } = await deployContracts(owner))
    ANT = await deployANT(owner, finance)
    DAI = await deployDAI(owner, finance)
  })

  beforeEach('create payroll and price feed instance', async () => {
    ({ payroll, priceFeed } = await createPayrollAndPriceFeed(dao, payrollBase, owner, NOW))
  })

  describe('payroll payday', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app using USD as denomination token', async () => {
        await payroll.initialize(finance.address, USD, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      beforeEach('set token rates', async () => {
        await setTokenRates(priceFeed, USD, [DAI, ANT], [DAI_RATE, ANT_RATE])
      })

      context('when the sender is an employee', () => {
        let employeeId
        const from = employee

        context('when the employee has a reasonable salary', () => {
          const salary = 100000

          beforeEach('add employee', async () => {
            const receipt = await payroll.addEmployee(employee, salary, 'Boss', await payroll.getTimestampPublic())
            employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
          })

          context('when the employee has already set some token allocations', () => {
            const allocationDAI = 80
            const allocationANT = 20

            beforeEach('set tokens allocation', async () => {
              await payroll.addAllowedToken(ANT.address, { from: owner })
              await payroll.addAllowedToken(DAI.address, { from: owner })
              await payroll.determineAllocation([DAI.address, ANT.address], [allocationDAI, allocationANT], { from })
            })

            const assertTransferredAmounts = (requestedAmount, expectedRequestedAmount = requestedAmount) => {
              const requestedDAI = DAI_RATE.mul(expectedRequestedAmount * allocationDAI / 100).trunc()
              const requestedANT = ANT_RATE.mul(expectedRequestedAmount * allocationANT / 100).trunc()

              it('transfers the requested salary amount', async () => {
                const previousDAI = await DAI.balanceOf(employee)
                const previousANT = await ANT.balanceOf(employee)

                await payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from })

                const currentDAI = await DAI.balanceOf(employee)
                const expectedDAI = previousDAI.plus(requestedDAI);
                assert.equal(currentDAI.toString(), expectedDAI.toString(), 'current DAI balance does not match')

                const currentANT = await ANT.balanceOf(employee)
                const expectedANT = previousANT.plus(requestedANT)
                assert.equal(currentANT.toString(), expectedANT.toString(), 'current ANT balance does not match')
              })

              it('emits one event per allocated token', async () => {
                const receipt = await payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from })

                const events = receipt.logs.filter(l => l.event === 'SendPayment')
                assert.equal(events.length, 2, 'should have emitted two events')

                const eventDAI = events.find(e => e.args.token === DAI.address).args
                assert.equal(eventDAI.employee, employee, 'employee address does not match')
                assert.equal(eventDAI.token, DAI.address, 'DAI address does not match')
                assert.equal(eventDAI.amount.toString(), requestedDAI, 'payment amount does not match')
                assert.equal(eventDAI.paymentReference, 'Payroll', 'payment reference does not match')

                const eventANT = events.find(e => e.args.token === ANT.address).args
                assert.equal(eventANT.employee, employee, 'employee address does not match')
                assert.equal(eventANT.token, ANT.address, 'ANT address does not match')
                assert.equal(eventANT.amount.toString(), requestedANT, 'payment amount does not match')
                assert.equal(eventANT.paymentReference, 'Payroll', 'payment reference does not match')
              })

              it('can be called multiple times between periods of time', async () => {
                // terminate employee in the future to ensure we can request payroll multiple times
                await payroll.terminateEmployee(employeeId, NOW + TWO_MONTHS + TWO_MONTHS, { from: owner })

                const previousDAI = await DAI.balanceOf(employee)
                const previousANT = await ANT.balanceOf(employee)

                await payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from })

                const newOwedAmount = salary * ONE_MONTH
                const newDAIAmount = DAI_RATE.mul(newOwedAmount * allocationDAI / 100).trunc()
                const newANTAmount = ANT_RATE.mul(newOwedAmount * allocationANT / 100).trunc()

                await increaseTime(ONE_MONTH)
                await setTokenRates(priceFeed, USD, [DAI, ANT], [DAI_RATE, ANT_RATE])
                await payroll.payday(PAYMENT_TYPES.PAYROLL, newOwedAmount, { from })

                const currentDAI = await DAI.balanceOf(employee)
                const expectedDAI = previousDAI.plus(requestedDAI).plus(newDAIAmount)
                assert.equal(currentDAI.toString(), expectedDAI.toString(), 'current DAI balance does not match')

                const currentANT = await ANT.balanceOf(employee)
                const expectedANT = previousANT.plus(requestedANT).plus(newANTAmount)
                assert.equal(currentANT.toString(), expectedANT.toString(), 'current ANT balance does not match')
              })
            }

            const assertEmployeeIsUpdatedCorrectly = (requestedAmount, expectedRequestedAmount) => {
              it('updates the accrued salary and the last payroll date', async () => {
                let expectedLastPayrollDate, expectedAccruedSalary
                const [previousAccruedSalary, previousPayrollDate] = (await payroll.getEmployee(employeeId)).slice(4, 6)

                if (expectedRequestedAmount >= previousAccruedSalary) {
                  expectedAccruedSalary = 0
                  const remainder = expectedRequestedAmount - previousAccruedSalary
                  expectedLastPayrollDate = previousPayrollDate.plus(Math.ceil(remainder / salary))
                } else {
                  expectedAccruedSalary = previousAccruedSalary.minus(expectedRequestedAmount).toString()
                  expectedLastPayrollDate = previousPayrollDate
                }

                await payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from })

                const [accruedSalary, lastPayrollDate] = (await payroll.getEmployee(employeeId)).slice(4, 6)
                assert.equal(accruedSalary.toString(), expectedAccruedSalary, 'accrued salary does not match')
                assert.equal(lastPayrollDate.toString(), expectedLastPayrollDate.toString(), 'last payroll date does not match')
              })

              it('does not remove the employee', async () => {
                await payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from })

                const [address, employeeSalary] = await payroll.getEmployee(employeeId)

                assert.equal(address, employee, 'employee address does not match')
                assert.equal(employeeSalary, salary, 'employee salary does not match')
              })
            }

            const itHandlesPayrollProperly = (requestedAmount, expectedRequestedAmount) => {
              context('when exchange rates are not expired', () => {
                assertTransferredAmounts(requestedAmount, expectedRequestedAmount)
                assertEmployeeIsUpdatedCorrectly(requestedAmount, expectedRequestedAmount)
              })

              context('when exchange rates are expired', () => {
                beforeEach('expire exchange rates', async () => {
                  const expiredTimestamp = (await payroll.getTimestampPublic()).sub(RATE_EXPIRATION_TIME + 1)
                  await setTokenRates(priceFeed, USD, [DAI, ANT], [DAI_RATE, ANT_RATE], expiredTimestamp)
                })

                it('reverts', async () => {
                  await assertRevert(payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from }), 'PAYROLL_EXCHANGE_RATE_ZERO')
                })
              })
            }

            const itHandlesPayrollProperlyNeverthelessExtrasOwedAmounts = (requestedAmount, totalOwedAmount) => {
              const expectedRequestedAmount = requestedAmount === 0 ? totalOwedAmount : requestedAmount

              context('when the employee has some pending reimbursements', () => {
                beforeEach('add reimbursement', async () => {
                  await payroll.addReimbursement(employeeId, 1000, { from: owner })
                })

                context('when the employee has a pending bonus', () => {
                  beforeEach('add bonus', async () => {
                    await payroll.addBonus(employeeId, 50000, {from: owner})
                  })

                  context('when the employee is not terminated', () => {
                    itHandlesPayrollProperly(requestedAmount, expectedRequestedAmount)
                  })

                  context('when the employee is terminated', () => {
                    beforeEach('terminate employee', async () => {
                      await payroll.terminateEmployee(employeeId, await payroll.getTimestampPublic(), { from: owner })
                    })

                    itHandlesPayrollProperly(requestedAmount, expectedRequestedAmount)
                  })
                })

                context('when the employee does not have a pending bonus', () => {
                  context('when the employee is not terminated', () => {
                    itHandlesPayrollProperly(requestedAmount, expectedRequestedAmount)
                  })

                  context('when the employee is terminated', () => {
                    beforeEach('terminate employee', async () => {
                      await payroll.terminateEmployee(employeeId, await payroll.getTimestampPublic(), { from: owner })
                    })

                    itHandlesPayrollProperly(requestedAmount, expectedRequestedAmount)
                  })
                })
              })

              context('when the employee does not have pending reimbursements', () => {
                context('when the employee has a pending bonus', () => {
                  beforeEach('add bonus', async () => {
                    await payroll.addBonus(employeeId, 50000, {from: owner})
                  })

                  context('when the employee is not terminated', () => {
                    itHandlesPayrollProperly(requestedAmount, expectedRequestedAmount)
                  })

                  context('when the employee is terminated', () => {
                    beforeEach('terminate employee', async () => {
                      await payroll.terminateEmployee(employeeId, await payroll.getTimestampPublic(), { from: owner })
                    })

                    itHandlesPayrollProperly(requestedAmount, expectedRequestedAmount)
                  })
                })

                context('when the employee does not have a pending bonus', () => {
                  context('when the employee is not terminated', () => {
                    itHandlesPayrollProperly(requestedAmount, expectedRequestedAmount)
                  })

                  context('when the employee is terminated', () => {
                    beforeEach('terminate employee', async () => {
                      await payroll.terminateEmployee(employeeId, await payroll.getTimestampPublic(), { from: owner })
                    })

                    if (requestedAmount === 0 || requestedAmount === totalOwedAmount) {
                      context('when exchange rates are not expired', () => {
                        assertTransferredAmounts(requestedAmount, expectedRequestedAmount)

                        it('removes the employee', async () => {
                          await payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from })

                          await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')
                        })
                      })

                      context('when exchange rates are expired', () => {
                        beforeEach('expire exchange rates', async () => {
                          const expiredTimestamp = (await payroll.getTimestampPublic()).sub(RATE_EXPIRATION_TIME + 1)
                          await setTokenRates(priceFeed, USD, [DAI, ANT], [DAI_RATE, ANT_RATE], expiredTimestamp)
                        })

                        it('reverts', async () => {
                          await assertRevert(payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from }), 'PAYROLL_EXCHANGE_RATE_ZERO')
                        })
                      })
                    }
                    else itHandlesPayrollProperly(requestedAmount, expectedRequestedAmount)
                  })
                })
              })
            }

            context('when the employee does not have accrued salary', () => {
              context('when the employee has some pending salary', () => {
                const currentOwedSalary = salary * ONE_MONTH

                beforeEach('accumulate some pending salary', async () => {
                  await increaseTime(ONE_MONTH)
                })

                context('when the requested amount is zero', () => {
                  const requestedAmount = 0

                  itHandlesPayrollProperlyNeverthelessExtrasOwedAmounts(requestedAmount, currentOwedSalary)
                })

                context('when the requested amount is lower than the total owed salary', () => {
                  context('when the requested amount represents less than a second of the earnings', () => {
                    const requestedAmount = salary / 2

                    it('updates the last payroll date by one second', async () => {
                      const previousLastPayrollDate = (await payroll.getEmployee(employeeId))[5]

                      await payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from })

                      const currentLastPayrollDate = (await payroll.getEmployee(employeeId))[5]
                      assert.equal(currentLastPayrollDate.toString(), previousLastPayrollDate.plus(1).toString(), 'last payroll date does not match')
                    })
                  })

                  context('when the requested amount represents more than a second of the earnings', () => {
                    const requestedAmount = currentOwedSalary / 2

                    itHandlesPayrollProperlyNeverthelessExtrasOwedAmounts(requestedAmount, currentOwedSalary)
                  })
                })

                context('when the requested amount is equal to the total owed salary', () => {
                  const requestedAmount = currentOwedSalary

                  itHandlesPayrollProperlyNeverthelessExtrasOwedAmounts(requestedAmount, currentOwedSalary)
                })

                context('when the requested amount is greater than the total owed salary', () => {
                  const requestedAmount = currentOwedSalary + 1

                  it('reverts', async () => {
                    await assertRevert(payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from }), 'PAYROLL_INVALID_REQUESTED_AMT')
                  })
                })
              })

              context('when the employee does not have pending salary', () => {
                context('when the requested amount is greater than zero', () => {
                  const requestedAmount = 100

                  it('reverts', async () => {
                    await assertRevert(payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
                  })
                })

                context('when the requested amount is zero', () => {
                  const requestedAmount = 0

                  it('reverts', async () => {
                    await assertRevert(payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
                  })
                })
              })
            })

            context('when the employee has some accrued salary', () => {
              const previousSalary = 10
              const previousOwedSalary = ONE_MONTH * previousSalary

              beforeEach('accrue some salary', async () => {
                await payroll.setEmployeeSalary(employeeId, previousSalary, { from: owner })
                await increaseTime(ONE_MONTH)
                await payroll.setEmployeeSalary(employeeId, salary, { from: owner })
              })

              context('when the employee has some pending salary', () => {
                const currentOwedSalary = salary * ONE_MONTH
                const totalOwedSalary = previousOwedSalary + currentOwedSalary

                beforeEach('accumulate some pending salary and renew token rates', async () => {
                  await increaseTime(ONE_MONTH)
                  await setTokenRates(priceFeed, USD, [DAI, ANT], [DAI_RATE, ANT_RATE])
                })

                context('when the requested amount is zero', () => {
                  const requestedAmount = 0

                  itHandlesPayrollProperlyNeverthelessExtrasOwedAmounts(requestedAmount, totalOwedSalary)
                })

                context('when the requested amount is lower than the previous owed salary', () => {
                  const requestedAmount = previousOwedSalary - 10

                  itHandlesPayrollProperlyNeverthelessExtrasOwedAmounts(requestedAmount, totalOwedSalary)
                })

                context('when the requested amount is greater than the previous owed salary but lower than the total owed', () => {
                  const requestedAmount = totalOwedSalary / 2

                  itHandlesPayrollProperlyNeverthelessExtrasOwedAmounts(requestedAmount, totalOwedSalary)
                })

                context('when the requested amount is equal to the total owed salary', () => {
                  const requestedAmount = totalOwedSalary

                  itHandlesPayrollProperlyNeverthelessExtrasOwedAmounts(requestedAmount, totalOwedSalary)
                })

                context('when the requested amount is greater than the total owed salary', () => {
                  const requestedAmount = totalOwedSalary + 1

                  it('reverts', async () => {
                    await assertRevert(payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from }), 'PAYROLL_INVALID_REQUESTED_AMT')
                  })
                })
              })

              context('when the employee does not have pending salary', () => {
                context('when the requested amount is zero', () => {
                  const requestedAmount = 0

                  itHandlesPayrollProperlyNeverthelessExtrasOwedAmounts(requestedAmount, previousOwedSalary)
                })

                context('when the requested amount is lower than the previous owed salary', () => {
                  const requestedAmount = previousOwedSalary - 10

                  itHandlesPayrollProperlyNeverthelessExtrasOwedAmounts(requestedAmount, previousOwedSalary)
                })

                context('when the requested amount is equal to the previous owed salary', () => {
                  const requestedAmount = previousOwedSalary

                  itHandlesPayrollProperlyNeverthelessExtrasOwedAmounts(requestedAmount, previousOwedSalary)
                })

                context('when the requested amount is greater than the previous owed salary', () => {
                  const requestedAmount = previousOwedSalary + 1

                  it('reverts', async () => {
                    await assertRevert(payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from }), 'PAYROLL_INVALID_REQUESTED_AMT')
                  })
                })
              })
            })
          })

          context('when the employee did not set any token allocations yet', () => {
            context('when the employee has some pending salary', () => {
              const owedSalary = salary * ONE_MONTH

              beforeEach('accumulate some pending salary', async () => {
                await increaseTime(ONE_MONTH)
              })

              context('when the requested amount is lower than the total owed salary', () => {
                const requestedAmount = owedSalary - 10

                it('reverts', async () => {
                  await assertRevert(payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
                })
              })

              context('when the requested amount is equal to the total owed salary', () => {
                const requestedAmount = owedSalary

                it('reverts', async () => {
                  await assertRevert(payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
                })
              })
            })

            context('when the employee does not have pending salary', () => {
              context('when the requested amount is greater than zero', () => {
                const requestedAmount = 100

                it('reverts', async () => {
                  await assertRevert(payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
                })
              })

              context('when the requested amount is zero', () => {
                const requestedAmount = 0

                it('reverts', async () => {
                  await assertRevert(payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
                })
              })
            })
          })
        })

        context('when the employee does not have a reasonable salary', () => {
          const itReverts = (requestedAmount, reason) => {
            it('reverts', async () => {
              await assertRevert(payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, {from}), reason)
            })
          }

          const itRevertsHandlingExpiredRates = (requestedAmount, nonExpiredRatesReason, expiredRatesReason) => {
            context('when exchange rates are not expired', () => {
              itReverts(requestedAmount, nonExpiredRatesReason)
            })

            context('when exchange rates are expired', () => {
              beforeEach('expire exchange rates', async () => {
                const expiredTimestamp = (await payroll.getTimestampPublic()).sub(RATE_EXPIRATION_TIME + 1)
                await setTokenRates(priceFeed, USD, [DAI, ANT], [DAI_RATE, ANT_RATE], expiredTimestamp)
              })

              itReverts(requestedAmount, expiredRatesReason)
            })
          }

          const itRevertsToWithdrawPartialPayroll = (requestedAmount, nonExpiredRatesReason, expiredRatesReason) => {
            context('when the employee has some pending reimbursements', () => {
              beforeEach('add reimbursement', async () => {
                await payroll.addReimbursement(employeeId, 1000, {from: owner})
              })

              context('when the employee is not terminated', () => {
                itRevertsHandlingExpiredRates(requestedAmount, nonExpiredRatesReason, expiredRatesReason)
              })

              context('when the employee is terminated', () => {
                beforeEach('terminate employee', async () => {
                  await payroll.terminateEmployee(employeeId, await payroll.getTimestampPublic(), {from: owner})
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
                  await payroll.terminateEmployee(employeeId, await payroll.getTimestampPublic(), {from: owner})
                })

                itRevertsHandlingExpiredRates(requestedAmount, nonExpiredRatesReason, expiredRatesReason)
              })
            })
          }

          context('when the employee has a zero salary', () => {
            const salary = 0

            beforeEach('add employee', async () => {
              const receipt = await payroll.addEmployee(employee, salary, 'Boss', await payroll.getTimestampPublic())
              employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
            })

            const itRevertsAnyAttemptToWithdrawPartialPayroll = () => {
              context('when the employee has some pending salary', () => {
                beforeEach('accumulate some pending salary', async () => {
                  await increaseTime(ONE_MONTH)
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
              const allocationDAI = 80
              const allocationANT = 20

              beforeEach('set tokens allocation', async () => {
                await payroll.addAllowedToken(ANT.address, { from: owner })
                await payroll.addAllowedToken(DAI.address, { from: owner })
                await payroll.determineAllocation([DAI.address, ANT.address], [allocationDAI, allocationANT], { from })
              })

              itRevertsAnyAttemptToWithdrawPartialPayroll()
            })

            context('when the employee did not set any token allocations yet', () => {
              itRevertsAnyAttemptToWithdrawPartialPayroll()
            })
          })

          context('when the employee has a huge salary', () => {
            const salary = MAX_UINT256

            beforeEach('add employee', async () => {
              const receipt = await payroll.addEmployee(employee, salary, 'Boss', await payroll.getTimestampPublic())
              employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
            })

            context('when the employee has already set some token allocations', () => {
              const allocationDAI = 80
              const allocationANT = 20

              beforeEach('set tokens allocation', async () => {
                await payroll.addAllowedToken(ANT.address, { from: owner })
                await payroll.addAllowedToken(DAI.address, { from: owner })
                await payroll.determineAllocation([DAI.address, ANT.address], [allocationDAI, allocationANT], { from })
              })

              context('when the employee has some pending salary', () => {
                const owedSalary = MAX_UINT256

                beforeEach('accumulate some pending salary', async () => {
                  await increaseTime(ONE_MONTH)
                })

                context('when the requested amount is zero', () => {
                  const requestedAmount = 0

                  itRevertsToWithdrawPartialPayroll(requestedAmount, 'MATH_MUL_OVERFLOW', 'PAYROLL_EXCHANGE_RATE_ZERO')
                })

                context('when the requested amount is lower than the total owed salary', () => {
                  const requestedAmount = 10000

                  const assertTransferredAmounts = requestedAmount => {
                    const requestedDAI = DAI_RATE.mul(requestedAmount * allocationDAI / 100).trunc()
                    const requestedANT = ANT_RATE.mul(requestedAmount * allocationANT / 100).trunc()

                    it('transfers the requested salary amount', async () => {
                      const previousDAI = await DAI.balanceOf(employee)
                      const previousANT = await ANT.balanceOf(employee)

                      await payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from })

                      const currentDAI = await DAI.balanceOf(employee)
                      const expectedDAI = previousDAI.plus(requestedDAI)
                      assert.equal(currentDAI.toString(), expectedDAI.toString(), 'current DAI balance does not match')

                      const currentANT = await ANT.balanceOf(employee)
                      const expectedANT = previousANT.plus(requestedANT)
                      assert.equal(currentANT.toString(), expectedANT.toString(), 'current ANT balance does not match')
                    })

                    it('emits one event per allocated token', async () => {
                      const receipt = await payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from })

                      const events = receipt.logs.filter(l => l.event === 'SendPayment')
                      assert.equal(events.length, 2, 'should have emitted two events')

                      const eventDAI = events.find(e => e.args.token === DAI.address).args
                      assert.equal(eventDAI.employee, employee, 'employee address does not match')
                      assert.equal(eventDAI.token, DAI.address, 'DAI address does not match')
                      assert.equal(eventDAI.amount.toString(), requestedDAI, 'payment amount does not match')
                      assert.equal(eventDAI.paymentReference, 'Payroll', 'payment reference does not match')

                      const eventANT = events.find(e => e.args.token === ANT.address).args
                      assert.equal(eventANT.employee, employee, 'employee address does not match')
                      assert.equal(eventANT.token, ANT.address, 'ANT address does not match')
                      assert.equal(eventANT.amount.toString(), requestedANT, 'payment amount does not match')
                      assert.equal(eventANT.paymentReference, 'Payroll', 'payment reference does not match')
                    })

                    it('can be called multiple times between periods of time', async () => {
                      // terminate employee in the future to ensure we can request payroll multiple times
                      await payroll.terminateEmployee(employeeId, NOW + TWO_MONTHS + TWO_MONTHS, { from: owner })

                      const previousDAI = await DAI.balanceOf(employee)
                      const previousANT = await ANT.balanceOf(employee)

                      await payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from })

                      await increaseTime(ONE_MONTH)
                      await setTokenRates(priceFeed, USD, [DAI, ANT], [DAI_RATE, ANT_RATE])
                      await payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from })

                      const currentDAI = await DAI.balanceOf(employee)
                      const expectedDAI = previousDAI.plus(requestedDAI * 2)
                      assert.equal(currentDAI.toString(), expectedDAI.toString(), 'current DAI balance does not match')

                      const currentANT = await ANT.balanceOf(employee)
                      const expectedANT = previousANT.plus(requestedANT * 2)
                      assert.equal(currentANT.toString(), expectedANT.toString(), 'current ANT balance does not match')
                    })
                  }

                  const assertEmployeeIsUpdated = requestedAmount => {
                    it('updates the last payroll date', async () => {
                      const timeDiff = 1 // should be bn(requestedAmount).div(salary).ceil() but BN cannot represent such a small number, hardcoding it to 1
                      const previousPayrollDate = (await payroll.getEmployee(employeeId))[5]
                      const expectedLastPayrollDate = previousPayrollDate.plus(timeDiff)

                      await payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from })

                      const lastPayrollDate = (await payroll.getEmployee(employeeId))[5]
                      assert.equal(lastPayrollDate.toString(), expectedLastPayrollDate.toString(), 'last payroll date does not match')
                    })

                    it('does not remove the employee', async () => {
                      await payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from })

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
                        const expiredTimestamp = (await payroll.getTimestampPublic()).sub(RATE_EXPIRATION_TIME + 1)
                        await setTokenRates(priceFeed, USD, [DAI, ANT], [DAI_RATE, ANT_RATE], expiredTimestamp)
                      })

                      it('reverts', async () => {
                        await assertRevert(payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from }), 'PAYROLL_EXCHANGE_RATE_ZERO')
                      })
                    })
                  }

                  context('when the employee has some pending reimbursements', () => {
                    beforeEach('add reimbursement', async () => {
                      await payroll.addReimbursement(employeeId, 1000, { from: owner })
                    })

                    context('when the employee is not terminated', () => {
                      itHandlesPayrollProperly(requestedAmount)
                    })

                    context('when the employee is terminated', () => {
                      beforeEach('terminate employee', async () => {
                        await payroll.terminateEmployee(employeeId, await payroll.getTimestampPublic(), { from: owner })
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
                        await payroll.terminateEmployee(employeeId, await payroll.getTimestampPublic(), { from: owner })
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
                const owedSalary = MAX_UINT256

                beforeEach('accumulate some pending salary', async () => {
                  await increaseTime(ONE_MONTH)
                })

                context('when the requested amount is zero', () => {
                  const requestedAmount = 0

                  itRevertsToWithdrawPartialPayroll(requestedAmount, 'PAYROLL_NOTHING_PAID', 'PAYROLL_NOTHING_PAID')
                })

                context('when the requested amount is lower than the total owed salary', () => {
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
      })

      context('when the sender is not an employee', () => {
        const from = anyone

        context('when the requested amount is greater than zero', () => {
          const requestedAmount = 100

          it('reverts', async () => {
            await assertRevert(payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from }), 'PAYROLL_EMPLOYEE_DOES_NOT_MATCH')
          })
        })

        context('when the requested amount is zero', () => {
          const requestedAmount = 0

          it('reverts', async () => {
            await assertRevert(payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from }), 'PAYROLL_EMPLOYEE_DOES_NOT_MATCH')
          })
        })
      })
    })

    context('when it has not been initialized yet', function () {
      const requestedAmount = 0

      it('reverts', async () => {
        await assertRevert(payroll.payday(PAYMENT_TYPES.PAYROLL, requestedAmount, { from: employee }), 'PAYROLL_EMPLOYEE_DOES_NOT_MATCH')
      })
    })
  })
})
