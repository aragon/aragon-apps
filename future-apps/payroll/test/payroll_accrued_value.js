const { assertRevert } = require('@aragon/test-helpers/assertThrow')

const getContract = name => artifacts.require(name)
const getEvent = (receipt, event, arg) => receipt.logs.find(l => l.event === event).args[arg]

contract('Payroll, accrued value', (accounts) => {
  const DECIMALS = 18
  const NOW = new Date().getTime()
  const ONE_MONTH = 60 * 60 * 24 * 31
  const TWO_MONTHS = ONE_MONTH * 2
  const PCT_ONE = new web3.BigNumber(1e18)

  const [owner, employee, anyone] = accounts
  const {
    deployErc20TokenAndDeposit,
    addAllowedTokens,
    redistributeEth,
    getDaoFinanceVault,
    initializePayroll
  } = require('./helpers.js')(owner)

  let payroll, payrollBase, priceFeed, denominationToken, anotherToken, salary, employeeId, dao, finance, vault

  before(async () => {
    payrollBase = await getContract('PayrollMock').new()

    const daoFinanceVault = await getDaoFinanceVault()
    dao = daoFinanceVault.dao
    finance = daoFinanceVault.finance
    vault = daoFinanceVault.vault

    await redistributeEth(accounts, finance)

    priceFeed = await getContract('PriceFeedMock').new()
    await priceFeed.mockSetTimestamp(NOW)
  })

  beforeEach('initialize payroll, tokens and employee', async () => {
    denominationToken = await deployErc20TokenAndDeposit(owner, finance, vault, "USD", DECIMALS)
    anotherToken = await deployErc20TokenAndDeposit(owner, finance, vault, "ERC20", DECIMALS)

    payroll = await initializePayroll(dao, payrollBase, finance, denominationToken, priceFeed, TWO_MONTHS)
    await payroll.mockSetTimestamp(NOW)
    await addAllowedTokens(payroll, [denominationToken, anotherToken])

    salary = 1000
    const receipt = await payroll.addEmployeeShort(employee, salary, 'Kakaroto', 'Saiyajin')
    employeeId = getEvent(receipt, 'AddEmployee', 'employeeId')
  })

  it('adds accrued value manually', async () => {
    const accruedValue = 50
    await payroll.addAccruedValue(employeeId, accruedValue)
    assert.equal((await payroll.getEmployee(employeeId))[2].toString(), accruedValue, 'Accrued Value should match')
  })

  it('fails adding an accrued value too large', async () => {
    const maxAccruedValue = await payroll.getMaxAccruedValue()
    await payroll.addAccruedValue(employeeId, maxAccruedValue)

    await assertRevert(payroll.addAccruedValue(employeeId, 1))
  })

  it('considers modified salary as accrued value and it can be computed right after the change', async () => {
    const timeDiff = 864000
    await payroll.mockAddTimestamp(timeDiff)

    const salary1_1 = salary * 2
    await payroll.setEmployeeSalary(employeeId, salary1_1)

    await payroll.determineAllocation([denominationToken.address], [100], { from: employee })
    const initialBalance = await denominationToken.balanceOf(employee)
    await payroll.reimburse({ from: employee })

    const finalBalance = await denominationToken.balanceOf(employee)
    const payrollOwed = salary * timeDiff
    assert.equal(finalBalance - initialBalance, payrollOwed, "Payroll payed doesn't match")
  })

  it('considers modified salary as accrued value  and it can be computed some time after the change', async () => {
    const timeDiff = 864000
    await payroll.mockAddTimestamp(timeDiff)

    const salary1_1 = salary * 2
    await payroll.setEmployeeSalary(employeeId, salary1_1)

    await payroll.mockAddTimestamp(timeDiff * 2)

    await payroll.determineAllocation([denominationToken.address], [100], { from: employee })
    const initialBalance = await denominationToken.balanceOf(employee)
    await payroll.reimburse({ from: employee })

    const finalBalance = await denominationToken.balanceOf(employee)
    const payrollOwed = salary * timeDiff
    assert.equal(finalBalance - initialBalance, payrollOwed, "Payroll payed doesn't match")
  })

  describe('reimburse', function () {
    context('when the sender is an employee', () => {
      const from = employee

      beforeEach('mock current timestamp', async () => {
        await payroll.mockAddTimestamp(ONE_MONTH)
      })

      context('when the employee has already set some token allocations', () => {
        beforeEach('set tokens allocation', async () => {
          await payroll.determineAllocation([denominationToken.address, anotherToken.address], [80, 20], { from })
        })

        context('when the employee has some pending reimbursements', () => {
          const accruedValue = 100

          beforeEach('add accrued value', async () => {
            await payroll.addAccruedValue(employeeId, accruedValue / 2, { from: owner })
            await payroll.addAccruedValue(employeeId, accruedValue / 2, { from: owner })
          })

          const assertTransferredAmounts = () => {
            it('transfers all the pending reimbursements', async () => {
              const previousDenominationTokenBalance = await denominationToken.balanceOf(employee)
              const previousAnotherTokenBalance = await anotherToken.balanceOf(employee)

              await payroll.reimburse({ from })

              const currentDenominationTokenBalance = await denominationToken.balanceOf(employee)
              assert.equal(currentDenominationTokenBalance.toString(), previousDenominationTokenBalance.plus(80).toString(), 'current USD token balance does not match')

              const currentAnotherTokenBalance = await anotherToken.balanceOf(employee)
              const anotherTokenRate = (await priceFeed.get(denominationToken.address, anotherToken.address))[0].div(PCT_ONE)
              const expectedAnotherTokenBalance = anotherTokenRate.mul(20).plus(previousAnotherTokenBalance)
              assert.equal(currentAnotherTokenBalance.toString(), expectedAnotherTokenBalance.toString(), 'current token balance does not match')
            })

            it('emits one event per allocated token', async () => {
              const receipt = await payroll.reimburse({ from })

              const events = receipt.logs.filter(l => l.event === 'SendPayment')
              assert.equal(events.length, 2, 'should have emitted two events')

              const denominationTokenEvent = events.find(e => e.args.token === denominationToken.address).args
              assert.equal(denominationTokenEvent.employee, employee, 'employee address does not match')
              assert.equal(denominationTokenEvent.token, denominationToken.address, 'usd token address does not match')
              assert.equal(denominationTokenEvent.amount.toString(), 80, 'payment amount does not match')
              assert.equal(denominationTokenEvent.reference, 'Reimbursement', 'payment reference does not match')

              const anotherTokenRate = (await priceFeed.get(denominationToken.address, anotherToken.address))[0].div(PCT_ONE)
              const anotherTokenEvent = events.find(e => e.args.token === anotherToken.address).args
              assert.equal(anotherTokenEvent.employee, employee, 'employee address does not match')
              assert.equal(anotherTokenEvent.token, anotherToken.address, 'token address does not match')
              assert.equal(anotherTokenEvent.amount.div(anotherTokenRate).toString(), 20, 'payment amount does not match')
              assert.equal(anotherTokenEvent.reference, 'Reimbursement', 'payment reference does not match')
            })
          }

          const assertEmployeeIsNotRemoved = () => {
            it('does not remove the employee and resets the accrued value', async () => {
              await payroll.reimburse({ from })

              const [address, employeeSalary, accruedValue] = await payroll.getEmployee(employeeId)

              assert.equal(address, employee, 'employee address does not match')
              assert.equal(employeeSalary, salary, 'employee salary does not match')
              assert.equal(accruedValue, 0, 'accrued value should be zero')
            })
          }

          context('when the employee has some pending salary', () => {
            assertTransferredAmounts()
            assertEmployeeIsNotRemoved()
          })

          context('when the employee does not have pending salary', () => {
            beforeEach('cash out pending salary', async () => {
              await payroll.payday({ from })
            })

            context('when the employee is not terminated', () => {
              assertTransferredAmounts()
              assertEmployeeIsNotRemoved()
            })

            context('when the employee is terminated', () => {
              beforeEach('terminate employee', async () => {
                await payroll.terminateEmployeeNow(employeeId, { from: owner })
              })

              assertTransferredAmounts()

              it('removes the employee', async () => {
                await payroll.reimburse({ from })

                const [address, employeeSalary, accruedValue, payrollTimestamp] = await payroll.getEmployee(employeeId)

                assert.equal(address, 0, 'employee address does not match')
                assert.equal(employeeSalary, 0, 'employee salary does not match')
                assert.equal(accruedValue, 0, 'accrued value should be zero')
                assert.equal(payrollTimestamp, 0, 'accrued value should be zero')
              })
            })
          })
        })

        context('when the employee does not have pending reimbursements', () => {
          it('reverts', async () => {
            await assertRevert(payroll.reimburse({ from }), 'PAYROLL_NOTHING_PAID')
          })
        })
      })

      context('when the employee did not set any token allocations yet', () => {
        context('when the employee has some pending reimbursements', () => {
          const accruedValue = 50

          beforeEach('add accrued value', async () => {
            await payroll.addAccruedValue(employeeId, accruedValue / 2, { from: owner })
            await payroll.addAccruedValue(employeeId, accruedValue / 2, { from: owner })
          })

          it('reverts', async () => {
            await assertRevert(payroll.reimburse({ from }), 'PAYROLL_NOTHING_PAID')
          })
        })

        context('when the employee does not have pending reimbursements', () => {
          it('reverts', async () => {
            await assertRevert(payroll.reimburse({ from }), 'PAYROLL_NOTHING_PAID')
          })
        })
      })
    })

    context('when the sender is not an employee', () => {
      const from = anyone

      it('reverts', async () => {
        await assertRevert(payroll.reimburse({ from }), 'PAYROLL_EMPLOYEE_DOES_NOT_MATCH')
      })
    })
  })

  describe('partialReimburse', function () {
    context('when the sender is an employee', () => {
      const from = employee

      beforeEach('mock current timestamp', async () => {
        await payroll.mockAddTimestamp(ONE_MONTH)
      })

      context('when the employee has already set some token allocations', () => {
        const denominationTokenAllocation = 80
        const anotherTokenAllocation = 20

        beforeEach('set tokens allocation', async () => {
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

              await payroll.partialReimburse(requestedAmount, { from })

              const currentDenominationTokenBalance = await denominationToken.balanceOf(employee)
              const expectedDenominationTokenBalance = previousDenominationTokenBalance.plus(requestedDenominationTokenAmount);
              assert.equal(currentDenominationTokenBalance.toString(), expectedDenominationTokenBalance.toString(), 'current USD token balance does not match')

              const currentAnotherTokenBalance = await anotherToken.balanceOf(employee)
              const anotherTokenRate = (await priceFeed.get(denominationToken.address, anotherToken.address))[0].div(PCT_ONE)
              const expectedAnotherTokenBalance = anotherTokenRate.mul(requestedAnotherTokenAmount).plus(previousAnotherTokenBalance).trunc()
              assert.equal(currentAnotherTokenBalance.toString(), expectedAnotherTokenBalance.toString(), 'current token balance does not match')
            })

            it('emits one event per allocated token', async () => {
              const receipt = await payroll.partialReimburse(requestedAmount, { from })

              const events = receipt.logs.filter(l => l.event === 'SendPayment')
              assert.equal(events.length, 2, 'should have emitted two events')

              const denominationTokenEvent = events.find(e => e.args.token === denominationToken.address).args
              assert.equal(denominationTokenEvent.employee, employee, 'employee address does not match')
              assert.equal(denominationTokenEvent.token, denominationToken.address, 'usd token address does not match')
              assert.equal(denominationTokenEvent.amount.toString(), requestedDenominationTokenAmount, 'payment amount does not match')
              assert.equal(denominationTokenEvent.reference, 'Reimbursement', 'payment reference does not match')

              const anotherTokenRate = (await priceFeed.get(denominationToken.address, anotherToken.address))[0].div(PCT_ONE)
              const anotherTokenEvent = events.find(e => e.args.token === anotherToken.address).args
              assert.equal(anotherTokenEvent.employee, employee, 'employee address does not match')
              assert.equal(anotherTokenEvent.token, anotherToken.address, 'token address does not match')
              assert.equal(anotherTokenEvent.amount.div(anotherTokenRate).trunc().toString(), parseInt(requestedAnotherTokenAmount), 'payment amount does not match')
              assert.equal(anotherTokenEvent.reference, 'Reimbursement', 'payment reference does not match')
            })
          }

          const assertEmployeeIsNotRemoved = (requestedAmount, expectedRequestedAmount = requestedAmount) => {
            it('does not remove the employee and resets the accrued value', async () => {
              const currentAccruedValue = (await payroll.getEmployee(employeeId))[2]
              await payroll.partialReimburse(requestedAmount, { from })

              const [address, employeeSalary, accruedValue] = await payroll.getEmployee(employeeId)

              assert.equal(address, employee, 'employee address does not match')
              assert.equal(employeeSalary, salary, 'employee salary does not match')
              assert.equal(currentAccruedValue.minus(expectedRequestedAmount).toString(), accruedValue.toString(), 'accrued value does not match')
            })
          }

          context('when the requested amount is zero', () => {
            const requestedAmount = 0

            context('when the employee has some pending salary', () => {
              assertTransferredAmounts(requestedAmount, accruedValue)
              assertEmployeeIsNotRemoved(requestedAmount, accruedValue)
            })

            context('when the employee does not have pending salary', () => {
              beforeEach('cash out pending salary', async () => {
                await payroll.payday({ from })
              })

              context('when the employee is not terminated', () => {
                assertTransferredAmounts(requestedAmount, accruedValue)
                assertEmployeeIsNotRemoved(requestedAmount, accruedValue)
              })

              context('when the employee is terminated', () => {
                beforeEach('terminate employee', async () => {
                  await payroll.terminateEmployeeNow(employeeId, { from: owner })
                })

                assertTransferredAmounts(requestedAmount, accruedValue)

                it('removes the employee', async () => {
                  await payroll.partialReimburse(requestedAmount, { from })

                  const [address, employeeSalary, accruedValue, payrollTimestamp] = await payroll.getEmployee(employeeId)

                  assert.equal(address, 0, 'employee address does not match')
                  assert.equal(employeeSalary, 0, 'employee salary does not match')
                  assert.equal(accruedValue, 0, 'accrued value should be zero')
                  assert.equal(payrollTimestamp, 0, 'accrued value should be zero')
                })
              })
            })
          })

          context('when the requested amount is less than the total accrued value', () => {
              const requestedAmount = accruedValue - 1

            context('when the employee has some pending salary', () => {
              assertTransferredAmounts(requestedAmount)
              assertEmployeeIsNotRemoved(requestedAmount)
            })

            context('when the employee does not have pending salary', () => {
              beforeEach('cash out pending salary', async () => {
                await payroll.payday({ from })
              })

              context('when the employee is not terminated', () => {
                assertTransferredAmounts(requestedAmount)
                assertEmployeeIsNotRemoved(requestedAmount)
              })

              context('when the employee is terminated', () => {
                beforeEach('terminate employee', async () => {
                  await payroll.terminateEmployeeNow(employeeId, { from: owner })
                })

                assertTransferredAmounts(requestedAmount)
                assertEmployeeIsNotRemoved(requestedAmount)
              })
            })
          })

          context('when the requested amount is equal to the total accrued value', () => {
            const requestedAmount = accruedValue

            context('when the employee has some pending salary', () => {
              assertTransferredAmounts(requestedAmount)
              assertEmployeeIsNotRemoved(requestedAmount)
            })

            context('when the employee does not have pending salary', () => {
              beforeEach('cash out pending salary', async () => {
                await payroll.payday({ from })
              })

              context('when the employee is not terminated', () => {
                assertTransferredAmounts(requestedAmount)
                assertEmployeeIsNotRemoved(requestedAmount)
              })

              context('when the employee is terminated', () => {
                beforeEach('terminate employee', async () => {
                  await payroll.terminateEmployeeNow(employeeId, { from: owner })
                })

                assertTransferredAmounts(requestedAmount)

                it('removes the employee', async () => {
                  await payroll.partialReimburse(requestedAmount, { from })

                  const [address, employeeSalary, accruedValue, payrollTimestamp] = await payroll.getEmployee(employeeId)

                  assert.equal(address, 0, 'employee address does not match')
                  assert.equal(employeeSalary, 0, 'employee salary does not match')
                  assert.equal(accruedValue, 0, 'accrued value should be zero')
                  assert.equal(payrollTimestamp, 0, 'accrued value should be zero')
                })
              })
            })
          })

          context('when the requested amount is greater than the total accrued value', () => {
            const requestedAmount = accruedValue + 1

            it('reverts', async () => {
              await assertRevert(payroll.partialReimburse(requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
            })
          })
        })

        context('when the employee does not have pending reimbursements', () => {
          context('when the requested amount is greater than zero', () => {
            const requestedAmount = 100

            it('reverts', async () => {
              await assertRevert(payroll.partialReimburse(requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
            })
          })

          context('when the requested amount is zero', () => {
            const requestedAmount = 0

            it('reverts', async () => {
              await assertRevert(payroll.partialReimburse(requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
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

          context('when the requested amount is less than the total accrued value', () => {
            const requestedAmount = accruedValue - 1

            it('reverts', async () => {
              await assertRevert(payroll.partialReimburse(requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
            })
          })

          context('when the requested amount is equal to the total accrued value', () => {
            const requestedAmount = accruedValue

            it('reverts', async () => {
              await assertRevert(payroll.partialReimburse(requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
            })
          })
        })

        context('when the employee does not have pending reimbursements', () => {
          context('when the requested amount is greater than zero', () => {
            const requestedAmount = 100

            it('reverts', async () => {
              await assertRevert(payroll.partialReimburse(requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
            })
          })

          context('when the requested amount is zero', () => {
            const requestedAmount = 0

            it('reverts', async () => {
              await assertRevert(payroll.partialReimburse(requestedAmount, { from }), 'PAYROLL_NOTHING_PAID')
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
          await assertRevert(payroll.partialReimburse(requestedAmount, { from }), 'PAYROLL_EMPLOYEE_DOES_NOT_MATCH')
        })
      })

      context('when the requested amount is zero', () => {
        const requestedAmount = 0

        it('reverts', async () => {
          await assertRevert(payroll.partialReimburse(requestedAmount, { from }), 'PAYROLL_EMPLOYEE_DOES_NOT_MATCH')
        })
      })
    })
  })
})
