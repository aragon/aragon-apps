const PAYMENT_TYPES = require('../helpers/payment_types')
const setTokenRates = require('../helpers/set_token_rates')(web3)
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { bn, maxUint256 } = require('../helpers/numbers')(web3)
const { getEvents, getEventArgument } = require('../helpers/events')
const { deployErc20TokenAndDeposit, deployContracts, createPayrollAndPriceFeed } = require('../helpers/deploy.js')(artifacts, web3)

contract('Payroll reimbursements', ([owner, employee, anyone]) => {
  let dao, payroll, payrollBase, finance, vault, priceFeed, denominationToken, anotherToken, anotherTokenRate

  const NOW = 1553703809 // random fixed timestamp in seconds
  const ONE_MONTH = 60 * 60 * 24 * 31
  const TWO_MONTHS = ONE_MONTH * 2
  const RATE_EXPIRATION_TIME = TWO_MONTHS

  const TOKEN_DECIMALS = 18

  const increaseTime = async seconds => {
    await payroll.mockIncreaseTime(seconds)
    await priceFeed.mockIncreaseTime(seconds)
  }

  before('deploy base apps and tokens', async () => {
    ({ dao, finance, vault, payrollBase } = await deployContracts(owner))
    anotherToken = await deployErc20TokenAndDeposit(owner, finance, 'Another token', TOKEN_DECIMALS)
    denominationToken = await deployErc20TokenAndDeposit(owner, finance, 'Denomination Token', TOKEN_DECIMALS)
  })

  beforeEach('create payroll and price feed instance', async () => {
    ({ payroll, priceFeed } = await createPayrollAndPriceFeed(dao, payrollBase, owner, NOW))
  })

  describe('addReimbursement', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender has permissions', () => {
        const from = owner

        context('when the given employee exists', () => {
          let employeeId

          beforeEach('add employee', async () => {
            const receipt = await payroll.addEmployee(employee, 1000, 'Boss', await payroll.getTimestampPublic())
            employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
          })

          context('when the given employee is active', () => {

            const itAddsReimbursementsSuccessfully = value => {
              it('adds requested reimbursement', async () => {
                await payroll.addReimbursement(employeeId, value, { from })

                const reimbursements = (await payroll.getEmployee(employeeId))[3]
                assert.equal(reimbursements, value, 'reimbursement does not match')
              })

              it('emits an event', async () => {
                const receipt = await payroll.addReimbursement(employeeId, value, { from })

                const events = getEvents(receipt, 'AddEmployeeReimbursement')
                assert.equal(events.length, 1, 'number of AddEmployeeReimbursement emitted events does not match')
                assert.equal(events[0].args.employeeId.toString(), employeeId, 'employee id does not match')
                assert.equal(events[0].args.amount.toString(), value, 'reimbursement does not match')
              })
            }

            context('when the given value greater than zero', () => {
              const value = 1000

              itAddsReimbursementsSuccessfully(value)
            })

            context('when the given value is zero', () => {
              const value = 0

              itAddsReimbursementsSuccessfully(value)
            })

            context('when the given value way greater than zero', () => {
              const value = maxUint256()

              it('reverts', async () => {
                await payroll.addReimbursement(employeeId, 1, { from })

                await assertRevert(payroll.addReimbursement(employeeId, value, { from }), 'MATH_ADD_OVERFLOW')
              })
            })
          })

          context('when the given employee is not active', () => {
            beforeEach('terminate employee', async () => {
              await payroll.terminateEmployee(employeeId, await payroll.getTimestampPublic(), { from: owner })
              await increaseTime(ONE_MONTH)
            })

            it('reverts', async () => {
              await assertRevert(payroll.addReimbursement(employeeId, 1000, { from }), 'PAYROLL_NON_ACTIVE_EMPLOYEE')
            })
          })
        })

        context('when the given employee does not exist', async () => {
          const employeeId = 0

          it('reverts', async () => {
            await assertRevert(payroll.addReimbursement(employeeId, 1000, { from }), 'PAYROLL_NON_ACTIVE_EMPLOYEE')
          })
        })
      })

      context('when the sender does not have permissions', () => {
        const from = anyone
        const value = 1000
        const employeeId = 0

        it('reverts', async () => {
          await assertRevert(payroll.addReimbursement(employeeId, value, { from }), 'APP_AUTH_FAILED')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      const value = 10000
      const employeeId = 0

      it('reverts', async () => {
        await assertRevert(payroll.addReimbursement(employeeId, value, { from: owner }), 'APP_AUTH_FAILED')
      })
    })
  })

  describe('reimbursements payday', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      beforeEach('set token rates', async () => {
        anotherTokenRate = bn(5)
        await setTokenRates(priceFeed, denominationToken, [anotherToken], [anotherTokenRate])
      })

      context('when the sender is an employee', () => {
        const from = employee
        let employeeId, salary = 1000

        beforeEach('add employee and accumulate some salary', async () => {
          const receipt = await payroll.addEmployee(employee, salary, 'Boss', await payroll.getTimestampPublic())
          employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')

          await increaseTime(ONE_MONTH)
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
            const reimbursement = 100

            beforeEach('add reimbursement', async () => {
              await payroll.addReimbursement(employeeId, reimbursement / 2, { from: owner })
              await payroll.addReimbursement(employeeId, reimbursement / 2, { from: owner })
            })

            const assertTransferredAmounts = (requestedAmount, expectedRequestedAmount = requestedAmount) => {
              const requestedDenominationTokenAmount = parseInt(expectedRequestedAmount * denominationTokenAllocation / 100)
              const requestedAnotherTokenAmount = expectedRequestedAmount * anotherTokenAllocation / 100

              it('transfers all the pending reimbursements', async () => {
                const previousDenominationTokenBalance = await denominationToken.balanceOf(employee)
                const previousAnotherTokenBalance = await anotherToken.balanceOf(employee)

                await payroll.payday(PAYMENT_TYPES.REIMBURSEMENT, requestedAmount, { from })

                const currentDenominationTokenBalance = await denominationToken.balanceOf(employee)
                const expectedDenominationTokenBalance = previousDenominationTokenBalance.plus(requestedDenominationTokenAmount);
                assert.equal(currentDenominationTokenBalance.toString(), expectedDenominationTokenBalance.toString(), 'current denomination token balance does not match')

                const currentAnotherTokenBalance = await anotherToken.balanceOf(employee)
                const expectedAnotherTokenBalance = anotherTokenRate.mul(requestedAnotherTokenAmount).plus(previousAnotherTokenBalance).trunc()
                assert.equal(currentAnotherTokenBalance.toString(), expectedAnotherTokenBalance.toString(), 'current token balance does not match')
              })

              it('emits one event per allocated token', async () => {
                const receipt = await payroll.payday(PAYMENT_TYPES.REIMBURSEMENT, requestedAmount, { from })

                const events = receipt.logs.filter(l => l.event === 'SendPayment')
                assert.equal(events.length, 2, 'should have emitted two events')

                const denominationTokenEvent = events.find(e => e.args.token === denominationToken.address).args
                assert.equal(denominationTokenEvent.employee, employee, 'employee address does not match')
                assert.equal(denominationTokenEvent.token, denominationToken.address, 'denomination token address does not match')
                assert.equal(denominationTokenEvent.amount.toString(), requestedDenominationTokenAmount, 'payment amount does not match')
                assert.equal(denominationTokenEvent.paymentReference, 'Reimbursement', 'payment reference does not match')

                const anotherTokenEvent = events.find(e => e.args.token === anotherToken.address).args
                assert.equal(anotherTokenEvent.employee, employee, 'employee address does not match')
                assert.equal(anotherTokenEvent.token, anotherToken.address, 'token address does not match')
                assert.equal(anotherTokenEvent.amount.div(anotherTokenRate).trunc().toString(), parseInt(requestedAnotherTokenAmount), 'payment amount does not match')
                assert.equal(anotherTokenEvent.paymentReference, 'Reimbursement', 'payment reference does not match')
              })
            }

            const assertEmployeeIsNotRemoved = (requestedAmount, expectedRequestedAmount = requestedAmount) => {
              it('does not remove the employee and resets the reimbursements', async () => {
                const previousReimbursements = (await payroll.getEmployee(employeeId))[3]
                await payroll.payday(PAYMENT_TYPES.REIMBURSEMENT, requestedAmount, { from })

                const [address, employeeSalary, _, reimbursements] = await payroll.getEmployee(employeeId)

                assert.equal(address, employee, 'employee address does not match')
                assert.equal(employeeSalary, salary, 'employee salary does not match')
                assert.equal(previousReimbursements.minus(expectedRequestedAmount).toString(), reimbursements.toString(), 'employee reimbursements does not match')
              })
            }

            const itHandlesReimbursementsProperly = (requestedAmount, expectedRequestedAmount = requestedAmount) => {
              context('when exchange rates are not expired', () => {
                assertTransferredAmounts(requestedAmount, expectedRequestedAmount)
                assertEmployeeIsNotRemoved(requestedAmount, expectedRequestedAmount)
              })

              context('when exchange rates are expired', () => {
                beforeEach('expire exchange rates', async () => {
                  const expiredTimestamp = (await payroll.getTimestampPublic()).sub(RATE_EXPIRATION_TIME + 1)
                  await setTokenRates(priceFeed, denominationToken, [anotherToken], [anotherTokenRate], expiredTimestamp)
                })

                it('reverts', async () => {
                  await assertRevert(payroll.payday(PAYMENT_TYPES.REIMBURSEMENT, requestedAmount, { from }), 'PAYROLL_EXCHANGE_RATE_ZERO')
                })
              })
            }

            context('when the requested amount is zero', () => {
              const requestedAmount = 0

              context('when the employee has some pending salary', () => {
                context('when the employee is not terminated', () => {
                  itHandlesReimbursementsProperly(requestedAmount, reimbursement)
                })

                context('when the employee is terminated', () => {
                  beforeEach('terminate employee', async () => {
                    await payroll.terminateEmployee(employeeId, await payroll.getTimestampPublic(), { from: owner })
                  })

                  itHandlesReimbursementsProperly(requestedAmount, reimbursement)
                })
              })

              context('when the employee does not have pending salary', () => {
                beforeEach('cash out pending salary', async () => {
                  await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from })
                })

                context('when the employee is not terminated', () => {
                  itHandlesReimbursementsProperly(requestedAmount, reimbursement)
                })

                context('when the employee is terminated', () => {
                  beforeEach('terminate employee', async () => {
                    await payroll.terminateEmployee(employeeId, await payroll.getTimestampPublic(), { from: owner })
                  })

                  context('when exchange rates are not expired', () => {
                    assertTransferredAmounts(requestedAmount, reimbursement)

                    it('removes the employee', async () => {
                      await payroll.payday(PAYMENT_TYPES.REIMBURSEMENT, requestedAmount, { from })

                      await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')
                    })
                  })

                  context('when exchange rates are expired', () => {
                    beforeEach('expire exchange rates', async () => {
                      const expiredTimestamp = (await payroll.getTimestampPublic()).sub(RATE_EXPIRATION_TIME + 1)
                      await setTokenRates(priceFeed, denominationToken, [anotherToken], [anotherTokenRate], expiredTimestamp)
                    })

                    it('reverts', async () => {
                      await assertRevert(payroll.payday(PAYMENT_TYPES.REIMBURSEMENT, requestedAmount, { from }), 'PAYROLL_EXCHANGE_RATE_ZERO')
                    })
                  })
                })
              })
            })

            context('when the requested amount is less than the total reimbursements amount', () => {
              const requestedAmount = reimbursement - 1

              context('when the employee has some pending salary', () => {
                context('when the employee is not terminated', () => {
                  itHandlesReimbursementsProperly(requestedAmount)
                })

                context('when the employee is terminated', () => {
                  beforeEach('terminate employee', async () => {
                    await payroll.terminateEmployee(employeeId, await payroll.getTimestampPublic(), { from: owner })
                  })

                  itHandlesReimbursementsProperly(requestedAmount)
                })
              })

              context('when the employee does not have pending salary', () => {
                beforeEach('cash out pending salary', async () => {
                  await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from })
                })

                context('when the employee is not terminated', () => {
                  itHandlesReimbursementsProperly(requestedAmount)
                })

                context('when the employee is terminated', () => {
                  beforeEach('terminate employee', async () => {
                    await payroll.terminateEmployee(employeeId, await payroll.getTimestampPublic(), { from: owner })
                  })

                  itHandlesReimbursementsProperly(requestedAmount)
                })
              })
            })

            context('when the requested amount is equal to the total reimbursements amount', () => {
              const requestedAmount = reimbursement

              context('when the employee has some pending salary', () => {
                context('when the employee is not terminated', () => {
                  itHandlesReimbursementsProperly(requestedAmount)
                })

                context('when the employee is terminated', () => {
                  beforeEach('terminate employee', async () => {
                    await payroll.terminateEmployee(employeeId, await payroll.getTimestampPublic(), { from: owner })
                  })

                  itHandlesReimbursementsProperly(requestedAmount)
                })
              })

              context('when the employee does not have pending salary', () => {
                beforeEach('cash out pending salary', async () => {
                  await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from })
                })

                context('when the employee is not terminated', () => {
                  itHandlesReimbursementsProperly(requestedAmount)
                })

                context('when the employee is terminated', () => {
                  beforeEach('terminate employee', async () => {
                    await payroll.terminateEmployee(employeeId, await payroll.getTimestampPublic(), { from: owner })
                  })

                  context('when exchange rates are not expired', () => {
                    assertTransferredAmounts(requestedAmount)

                    it('removes the employee', async () => {
                      await payroll.payday(PAYMENT_TYPES.REIMBURSEMENT, requestedAmount, { from })

                      await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')
                    })
                  })

                  context('when exchange rates are expired', () => {
                    beforeEach('expire exchange rates', async () => {
                      const expiredTimestamp = (await payroll.getTimestampPublic()).sub(RATE_EXPIRATION_TIME + 1)
                      await setTokenRates(priceFeed, denominationToken, [anotherToken], [anotherTokenRate], expiredTimestamp)
                    })

                    it('reverts', async () => {
                      await assertRevert(payroll.payday(PAYMENT_TYPES.REIMBURSEMENT, requestedAmount, { from }), 'PAYROLL_EXCHANGE_RATE_ZERO')
                    })
                  })
                })
              })
            })

            context('when the requested amount is greater than the total reimbursements amount', () => {
              const requestedAmount = reimbursement + 1

              it('reverts', async () => {
                await assertRevert(payroll.payday(PAYMENT_TYPES.REIMBURSEMENT, requestedAmount, { from }), 'PAYROLL_INVALID_REQUESTED_AMT')
              })
            })
          })

          context('when the employee does not have pending reimbursements', () => {
            context('when the requested amount is greater than zero', () => {
              const requestedAmount = 100

              it('reverts', async () => {
                await assertRevert(payroll.payday(PAYMENT_TYPES.REIMBURSEMENT, requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
              })
            })

            context('when the requested amount is zero', () => {
              const requestedAmount = 0

              it('reverts', async () => {
                await assertRevert(payroll.payday(PAYMENT_TYPES.REIMBURSEMENT, requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
              })
            })
          })
        })

        context('when the employee did not set any token allocations yet', () => {
          context('when the employee has some pending reimbursements', () => {
            const reimbursement = 100

            beforeEach('add reimbursement', async () => {
              await payroll.addReimbursement(employeeId, reimbursement / 2, { from: owner })
              await payroll.addReimbursement(employeeId, reimbursement / 2, { from: owner })
            })

            context('when the requested amount is zero', () => {
              const requestedAmount = 0

              it('reverts', async () => {
                await assertRevert(payroll.payday(PAYMENT_TYPES.REIMBURSEMENT, requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
              })
            })

            context('when the requested amount is less than the total reimbursements amount', () => {
              const requestedAmount = reimbursement - 1

              it('reverts', async () => {
                await assertRevert(payroll.payday(PAYMENT_TYPES.REIMBURSEMENT, requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
              })
            })

            context('when the requested amount is equal to the total reimbursements amount', () => {
              const requestedAmount = reimbursement

              it('reverts', async () => {
                await assertRevert(payroll.payday(PAYMENT_TYPES.REIMBURSEMENT, requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
              })
            })

            context('when the requested amount is greater than the total reimbursements amount', () => {
              const requestedAmount = reimbursement + 1

              it('reverts', async () => {
                await assertRevert(payroll.payday(PAYMENT_TYPES.REIMBURSEMENT, requestedAmount, { from }), 'PAYROLL_INVALID_REQUESTED_AMT')
              })
            })
          })

          context('when the employee does not have pending reimbursements', () => {
            context('when the requested amount is greater than zero', () => {
              const requestedAmount = 100

              it('reverts', async () => {
                await assertRevert(payroll.payday(PAYMENT_TYPES.REIMBURSEMENT, requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
              })
            })

            context('when the requested amount is zero', () => {
              const requestedAmount = 0

              it('reverts', async () => {
                await assertRevert(payroll.payday(PAYMENT_TYPES.REIMBURSEMENT, requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
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
            await assertRevert(payroll.payday(PAYMENT_TYPES.REIMBURSEMENT, requestedAmount, { from }), 'PAYROLL_EMPLOYEE_DOES_NOT_MATCH')
          })
        })

        context('when the requested amount is zero', () => {
          const requestedAmount = 0

          it('reverts', async () => {
            await assertRevert(payroll.payday(PAYMENT_TYPES.REIMBURSEMENT, requestedAmount, { from }), 'PAYROLL_EMPLOYEE_DOES_NOT_MATCH')
          })
        })
      })
    })

    context('when it has not been initialized yet', function () {
      const requestedAmount = 0

      it('reverts', async () => {
        await assertRevert(payroll.payday(PAYMENT_TYPES.REIMBURSEMENT, requestedAmount, { from: employee }), 'PAYROLL_EMPLOYEE_DOES_NOT_MATCH')
      })
    })
  })
})
