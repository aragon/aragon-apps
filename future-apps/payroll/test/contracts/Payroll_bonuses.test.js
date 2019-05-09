const PAYMENT_TYPES = require('../helpers/payment_types')
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { getEvents, getEventArgument } = require('../helpers/events')
const { NOW, ONE_MONTH, RATE_EXPIRATION_TIME } = require('../helpers/time')
const { bn, bigExp, annualSalaryPerSecond, ONE, MAX_UINT256 } = require('../helpers/numbers')(web3)
const { deployContracts, createPayrollAndPriceFeed } = require('../helpers/deploy')(artifacts, web3)
const { USD, DAI_RATE, ANT_RATE, inverseRate, exchangedAmount, deployDAI, deployANT, setTokenRates } = require('../helpers/tokens')(artifacts, web3)

contract('Payroll bonuses', ([owner, employee, anyone]) => {
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

  describe('addBonus', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app using USD as denomination token', async () => {
        await payroll.initialize(finance.address, USD, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender has permissions', () => {
        const from = owner

        context('when the given employee exists', () => {
          let employeeId

          beforeEach('add employee', async () => {
            const receipt = await payroll.addEmployee(employee, annualSalaryPerSecond(100000), await payroll.getTimestampPublic(), 'Boss')
            employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
          })

          context('when the given employee is active', () => {

            const itAddsBonusesSuccessfully = amount => {
              it('adds given bonus amount', async () => {
                const previousBonus = (await payroll.getEmployee(employeeId))[3]
                await payroll.addBonus(employeeId, amount, { from })

                const currentBonus = (await payroll.getEmployee(employeeId))[3]
                assert.equal(previousBonus.plus(amount).toString(), currentBonus.toString(), 'bonus amount does not match')
              })

              it('emits an event', async () => {
                const receipt = await payroll.addBonus(employeeId, amount, { from })

                const events = getEvents(receipt, 'AddEmployeeBonus')
                assert.equal(events.length, 1, 'number of AddEmployeeBonus emitted events does not match')
                assert.equal(events[0].args.employeeId.toString(), employeeId, 'employee id does not match')
                assert.equal(events[0].args.amount.toString(), amount, 'bonus amount does not match')
              })
            }

            context('when the given bonus greater than zero', () => {
              const amount = bigExp(1000, 18)

              context('when there was no previous bonus', () => {
                itAddsBonusesSuccessfully(amount)
              })

              context('when there was a previous bonus', () => {
                beforeEach('add bonus', async () => {
                  await payroll.addBonus(employeeId, amount, { from })
                })

                itAddsBonusesSuccessfully(amount)
              })
            })

            context('when the given bonus is zero', () => {
              const amount = bn(0)

              itAddsBonusesSuccessfully(amount)
            })

            context('when the given bonus way greater than zero', () => {
              const amount = MAX_UINT256

              it('reverts', async () => {
                await payroll.addBonus(employeeId, 1, { from })

                await assertRevert(payroll.addBonus(employeeId, amount, { from }), 'MATH_ADD_OVERFLOW')
              })
            })
          })

          context('when the given employee is not active', () => {
            beforeEach('terminate employee', async () => {
              await payroll.terminateEmployee(employeeId, await payroll.getTimestampPublic(), { from: owner })
              await increaseTime(ONE_MONTH)
            })

            it('reverts', async () => {
              await assertRevert(payroll.addBonus(employeeId, bigExp(1000, 18), { from }), 'PAYROLL_NON_ACTIVE_EMPLOYEE')
            })
          })
        })

        context('when the given employee does not exist', async () => {
          const employeeId = 0

          it('reverts', async () => {
            await assertRevert(payroll.addBonus(employeeId, bigExp(1000, 18), { from }), 'PAYROLL_NON_ACTIVE_EMPLOYEE')
          })
        })
      })

      context('when the sender does not have permissions', () => {
        const from = anyone
        const amount = bigExp(1000, 18)
        const employeeId = 0

        it('reverts', async () => {
          await assertRevert(payroll.addBonus(employeeId, amount, { from }), 'APP_AUTH_FAILED')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      const amount = bigExp(1000, 18)
      const employeeId = 0

      it('reverts', async () => {
        await assertRevert(payroll.addBonus(employeeId, amount, { from: owner }), 'APP_AUTH_FAILED')
      })
    })
  })

  describe('bonus payday', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app using USD as denomination token', async () => {
        await payroll.initialize(finance.address, USD, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      beforeEach('set token rates', async () => {
        await setTokenRates(priceFeed, USD, [DAI, ANT], [DAI_RATE, ANT_RATE])
      })

      context('when the sender is an employee', () => {
        const from = employee
        let employeeId, salary = annualSalaryPerSecond(100000)

        beforeEach('add employee and accumulate some salary', async () => {
          const receipt = await payroll.addEmployee(employee, salary, await payroll.getTimestampPublic(), 'Boss')
          employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')

          await increaseTime(ONE_MONTH)
        })

        context('when the employee has already set some token allocations', () => {
          const allocationDAI = 80
          const allocationANT = 20

          beforeEach('set tokens allocation', async () => {
            await payroll.addAllowedToken(ANT.address, { from: owner })
            await payroll.addAllowedToken(DAI.address, { from: owner })
            await payroll.determineAllocation([DAI.address, ANT.address], [allocationDAI, allocationANT], { from })
          })

          context('when the employee has a pending bonus', () => {
            const bonusAmount = bigExp(100, 18)

            beforeEach('add bonus', async () => {
              await payroll.addBonus(employeeId, bonusAmount.div(2), { from: owner })
              await payroll.addBonus(employeeId, bonusAmount.div(2), { from: owner })
            })

            const assertTransferredAmounts = (requestedAmount, expectedRequestedAmount = requestedAmount) => {
              const requestedDAI = exchangedAmount(expectedRequestedAmount, DAI_RATE, allocationDAI)
              const requestedANT = exchangedAmount(expectedRequestedAmount, ANT_RATE, allocationANT)

              it('transfers all the pending bonus', async () => {
                const previousDAI = await DAI.balanceOf(employee)
                const previousANT = await ANT.balanceOf(employee)

                await payroll.payday(PAYMENT_TYPES.BONUS, requestedAmount, { from })

                const currentDAI = await DAI.balanceOf(employee)
                const expectedDAI = previousDAI.plus(requestedDAI)
                assert.equal(currentDAI.toString(), expectedDAI.toString(), 'current DAI balance does not match')

                const currentANT = await ANT.balanceOf(employee)
                const expectedANT = previousANT.plus(requestedANT)
                assert.equal(currentANT.toString(), expectedANT.toString(), 'current ANT balance does not match')
              })

              it('emits one event per allocated token', async () => {
                const receipt = await payroll.payday(PAYMENT_TYPES.BONUS, requestedAmount, { from })

                const events = getEvents(receipt, 'SendPayment')
                assert.equal(events.length, 2, 'should have emitted two events')

                const eventDAI = events.find(e => e.args.token === DAI.address).args
                assert.equal(eventDAI.employeeId.toString(), employeeId.toString(), 'employee id does not match')
                assert.equal(eventDAI.accountAddress, employee, 'employee address does not match')
                assert.equal(eventDAI.token, DAI.address, 'DAI address does not match')
                assert.equal(eventDAI.amount.toString(), requestedDAI, 'payment amount does not match')
                assert.equal(eventDAI.exchangeRate.toString(), inverseRate(DAI_RATE).toString(), 'payment exchange rate does not match')
                assert.equal(eventDAI.paymentReference, 'Employee bonus', 'payment reference does not match')

                const eventANT = events.find(e => e.args.token === ANT.address).args
                assert.equal(eventANT.employeeId.toString(), employeeId.toString(), 'employee id does not match')
                assert.equal(eventANT.accountAddress, employee, 'employee address does not match')
                assert.equal(eventANT.token, ANT.address, 'token address does not match')
                assert.equal(eventANT.amount.toString(), requestedANT, 'payment amount does not match')
                assert.equal(eventANT.exchangeRate.toString(), inverseRate(ANT_RATE).toString(), 'payment exchange rate does not match')
                assert.equal(eventANT.paymentReference, 'Employee bonus', 'payment reference does not match')
              })
            }

            const assertEmployeeIsNotRemoved = (requestedAmount, expectedRequestedAmount = requestedAmount) => {
              it('does not remove the employee and resets the bonus amount', async () => {
                const previousBonus = (await payroll.getEmployee(employeeId))[3]
                await payroll.payday(PAYMENT_TYPES.BONUS, requestedAmount, { from })

                const [address, employeeSalary, , bonus] = await payroll.getEmployee(employeeId)

                assert.equal(address, employee, 'employee address does not match')
                assert.equal(employeeSalary.toString(), salary.toString(), 'employee salary does not match')
                assert.equal(previousBonus.minus(expectedRequestedAmount).toString(), bonus.toString(), 'employee bonus does not match')
              })
            }

            const itHandlesBonusesProperly = (requestedAmount, expectedRequestedAmount = requestedAmount) => {
              context('when exchange rates are not expired', () => {
                assertTransferredAmounts(requestedAmount, expectedRequestedAmount)
                assertEmployeeIsNotRemoved(requestedAmount, expectedRequestedAmount)
              })

              context('when exchange rates are expired', () => {
                beforeEach('expire exchange rates', async () => {
                  const expiredTimestamp = (await payroll.getTimestampPublic()).sub(RATE_EXPIRATION_TIME + 1)
                  await setTokenRates(priceFeed, USD, [DAI, ANT], [DAI_RATE, ANT_RATE], expiredTimestamp)
                })

                it('reverts', async () => {
                  await assertRevert(payroll.payday(PAYMENT_TYPES.BONUS, requestedAmount, { from }), 'PAYROLL_EXCHANGE_RATE_ZERO')
                })
              })
            }

            context('when the requested amount is zero', () => {
              const requestedAmount = bn(0)

              context('when the employee has some pending salary', () => {
                context('when the employee is not terminated', () => {
                  itHandlesBonusesProperly(requestedAmount, bonusAmount)
                })

                context('when the employee is terminated', () => {
                  beforeEach('terminate employee', async () => {
                    await payroll.terminateEmployee(employeeId, await payroll.getTimestampPublic(), { from: owner })
                  })

                  itHandlesBonusesProperly(requestedAmount, bonusAmount)
                })
              })

              context('when the employee does not have pending salary', () => {
                beforeEach('cash out pending salary', async () => {
                  await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from })
                })

                context('when the employee is not terminated', () => {
                  itHandlesBonusesProperly(requestedAmount, bonusAmount)
                })

                context('when the employee is terminated', () => {
                  beforeEach('terminate employee', async () => {
                    await payroll.terminateEmployee(employeeId, await payroll.getTimestampPublic(), { from: owner })
                  })

                  context('when exchange rates are not expired', () => {
                    assertTransferredAmounts(requestedAmount, bonusAmount)

                    it('removes the employee', async () => {
                      await payroll.payday(PAYMENT_TYPES.BONUS, requestedAmount, { from })

                      await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')
                    })
                  })

                  context('when exchange rates are expired', () => {
                    beforeEach('expire exchange rates', async () => {
                      const expiredTimestamp = (await payroll.getTimestampPublic()).sub(RATE_EXPIRATION_TIME + 1)
                      await setTokenRates(priceFeed, USD, [DAI, ANT], [DAI_RATE, ANT_RATE], expiredTimestamp)
                    })

                    it('reverts', async () => {
                      await assertRevert(payroll.payday(PAYMENT_TYPES.BONUS, requestedAmount, { from }), 'PAYROLL_EXCHANGE_RATE_ZERO')
                    })
                  })
                })
              })
            })

            context('when the requested amount is less than the total bonus amount', () => {
              const requestedAmount = bonusAmount.div(2)

              context('when the employee has some pending salary', () => {
                context('when the employee is not terminated', () => {
                  itHandlesBonusesProperly(requestedAmount)
                })

                context('when the employee is terminated', () => {
                  beforeEach('terminate employee', async () => {
                    await payroll.terminateEmployee(employeeId, await payroll.getTimestampPublic(), { from: owner })
                  })

                  itHandlesBonusesProperly(requestedAmount)
                })
              })

              context('when the employee does not have pending salary', () => {
                beforeEach('cash out pending salary', async () => {
                  await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from })
                })

                context('when the employee is not terminated', () => {
                  itHandlesBonusesProperly(requestedAmount)
                })

                context('when the employee is terminated', () => {
                  beforeEach('terminate employee', async () => {
                    await payroll.terminateEmployee(employeeId, await payroll.getTimestampPublic(), { from: owner })
                  })

                  itHandlesBonusesProperly(requestedAmount)
                })
              })
            })

            context('when the requested amount is equal to the total bonus amount', () => {
              const requestedAmount = bonusAmount

              context('when the employee has some pending salary', () => {
                context('when the employee is not terminated', () => {
                  itHandlesBonusesProperly(requestedAmount)
                })

                context('when the employee is terminated', () => {
                  beforeEach('terminate employee', async () => {
                    await payroll.terminateEmployee(employeeId, await payroll.getTimestampPublic(), { from: owner })
                  })

                  itHandlesBonusesProperly(requestedAmount)
                })
              })

              context('when the employee does not have pending salary', () => {
                beforeEach('cash out pending salary', async () => {
                  await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from })
                })

                context('when the employee is not terminated', () => {
                  itHandlesBonusesProperly(requestedAmount)
                })

                context('when the employee is terminated', () => {
                  beforeEach('terminate employee', async () => {
                    await payroll.terminateEmployee(employeeId, await payroll.getTimestampPublic(), { from: owner })
                  })

                  context('when exchange rates are not expired', () => {
                    assertTransferredAmounts(requestedAmount)

                    it('removes the employee', async () => {
                      await payroll.payday(PAYMENT_TYPES.BONUS, requestedAmount, { from })

                      await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')
                    })
                  })

                  context('when exchange rates are expired', () => {
                    beforeEach('expire exchange rates', async () => {
                      const expiredTimestamp = (await payroll.getTimestampPublic()).sub(RATE_EXPIRATION_TIME + 1)
                      await setTokenRates(priceFeed, USD, [DAI, ANT], [DAI_RATE, ANT_RATE], expiredTimestamp)
                    })

                    it('reverts', async () => {
                      await assertRevert(payroll.payday(PAYMENT_TYPES.BONUS, requestedAmount, { from }), 'PAYROLL_EXCHANGE_RATE_ZERO')
                    })
                  })
                })
              })
            })

            context('when the requested amount is greater than the total bonus amount', () => {
              const requestedAmount = bonusAmount.plus(1)

              it('reverts', async () => {
                await assertRevert(payroll.payday(PAYMENT_TYPES.BONUS, requestedAmount, { from }), 'PAYROLL_INVALID_REQUESTED_AMT')
              })
            })
          })

          context('when the employee does not have pending reimbursements', () => {
            context('when the requested amount is greater than zero', () => {
              const requestedAmount = bigExp(100, 18)

              it('reverts', async () => {
                await assertRevert(payroll.payday(PAYMENT_TYPES.BONUS, requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
              })
            })

            context('when the requested amount is zero', () => {
              const requestedAmount = bn(0)

              it('reverts', async () => {
                await assertRevert(payroll.payday(PAYMENT_TYPES.BONUS, requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
              })
            })
          })
        })

        context('when the employee did not set any token allocations yet', () => {
          context('when the employee has a pending bonus', () => {
            const bonusAmount = bigExp(100, 18)

            beforeEach('add bonus', async () => {
              await payroll.addBonus(employeeId, bonusAmount.div(2), { from: owner })
              await payroll.addBonus(employeeId, bonusAmount.div(2), { from: owner })
            })

            context('when the requested amount is zero', () => {
              const requestedAmount = bn(0)

              it('reverts', async () => {
                await assertRevert(payroll.payday(PAYMENT_TYPES.BONUS, requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
              })
            })

            context('when the requested amount is less than the total bonus amount', () => {
              const requestedAmount = bonusAmount.minus(1)

              it('reverts', async () => {
                await assertRevert(payroll.payday(PAYMENT_TYPES.BONUS, requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
              })
            })

            context('when the requested amount is equal to the total bonus amount', () => {
              const requestedAmount = bonusAmount

              it('reverts', async () => {
                await assertRevert(payroll.payday(PAYMENT_TYPES.BONUS, requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
              })
            })

            context('when the requested amount is greater than the total bonus amount', () => {
              const requestedAmount = bonusAmount.plus(1)

              it('reverts', async () => {
                await assertRevert(payroll.payday(PAYMENT_TYPES.BONUS, requestedAmount, { from }), 'PAYROLL_INVALID_REQUESTED_AMT')
              })
            })
          })

          context('when the employee does not have pending reimbursements', () => {
            context('when the requested amount is greater than zero', () => {
              const requestedAmount = bigExp(100, 18)

              it('reverts', async () => {
                await assertRevert(payroll.payday(PAYMENT_TYPES.BONUS, requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
              })
            })

            context('when the requested amount is zero', () => {
              const requestedAmount = bn(0)

              it('reverts', async () => {
                await assertRevert(payroll.payday(PAYMENT_TYPES.BONUS, requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
              })
            })
          })
        })
      })

      context('when the sender is not an employee', () => {
        const from = anyone

        context('when the requested amount is greater than zero', () => {
          const requestedAmount = bigExp(100, 18)

          it('reverts', async () => {
            await assertRevert(payroll.payday(PAYMENT_TYPES.BONUS, requestedAmount, { from }), 'PAYROLL_SENDER_DOES_NOT_MATCH')
          })
        })

        context('when the requested amount is zero', () => {
          const requestedAmount = bn(0)

          it('reverts', async () => {
            await assertRevert(payroll.payday(PAYMENT_TYPES.BONUS, requestedAmount, { from }), 'PAYROLL_SENDER_DOES_NOT_MATCH')
          })
        })
      })
    })

    context('when it has not been initialized yet', function () {
      const requestedAmount = bn(0)

      it('reverts', async () => {
        await assertRevert(payroll.payday(PAYMENT_TYPES.BONUS, requestedAmount, { from: employee }), 'PAYROLL_SENDER_DOES_NOT_MATCH')
      })
    })
  })
})
