const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { bn, salary, maxUint64 } = require('./helpers/numbers')(web3)

const ACL = artifacts.require('ACL')
const Payroll = artifacts.require('PayrollMock')
const PriceFeed = artifacts.require('PriceFeedMock')

const getEvent = (receipt, event) => getEvents(receipt, event)[0].args
const getEvents = (receipt, event) => receipt.logs.filter(l => l.event === event)
const getEventArgument = (receipt, event, arg) => getEvent(receipt, event)[arg]

contract('Payroll, adding and removing employees,', function(accounts) {
  const [owner, employeeAddress, anotherEmployeeAddress, anyone] = accounts
  const { deployErc20TokenAndDeposit, getDaoFinanceVault } = require('./helpers.js')(owner)

  const ONE_MONTH = 60 * 60 * 24
  const USD_DECIMALS= 18
  const RATE_EXPIRATION_TIME = 1000

  const employeeSalary = salary(100000, USD_DECIMALS)
  const anotherEmployeeSalary = salary(120000, USD_DECIMALS)

  let acl, payroll, payrollBase, priceFeed, usdToken, dao, finance, vault

  const currentTimestamp = async () => (await payroll.getTimestampPublic()).toString()

  before('setup base apps and tokens', async () => {
    const daoFinanceVault = await getDaoFinanceVault()
    dao = daoFinanceVault.dao
    finance = daoFinanceVault.finance
    vault = daoFinanceVault.vault
    acl = ACL.at(await dao.acl())

    priceFeed = await PriceFeed.new()
    payrollBase = await Payroll.new()
    usdToken = await deployErc20TokenAndDeposit(owner, finance, vault, 'USD', USD_DECIMALS)
  })

  beforeEach('create payroll instance and initialize', async () => {
    const receipt = await dao.newAppInstance('0x4321', payrollBase.address, '0x', false, { from: owner })
    payroll = Payroll.at(getEventArgument(receipt, 'NewAppProxy', 'proxy'))
    await payroll.initialize(finance.address, usdToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
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

  describe('addEmployee', () => {
    const employeeRole = 'Saiyajin'
    const employeeName = 'Kakaroto'

    context('when the sender has permissions to add employees', () => {
      const from = owner
      let receipt, employeeId

      context('when the employee has not been added yet', () => {
        let receipt, employeeId

        beforeEach('add employee', async () => {
          receipt = await payroll.addEmployeeNow(employeeAddress, employeeSalary, employeeName, employeeRole, { from })
          employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId').toString()
        })

        it('adds a new employee and emits an event', async () => {
          const [address] = await payroll.getEmployee(employeeId)
          assert.equal(address, employeeAddress, 'employee address does not match')

          const events = getEvents(receipt, 'AddEmployee');
          assert.equal(events.length, 1, 'number of AddEmployee events does not match')

          const event = events[0].args
          assert.equal(event.employeeId, employeeId, 'employee id does not match')
          assert.equal(event.name, employeeName, 'employee name does not match')
          assert.equal(event.role, employeeRole, 'employee role does not match')
          assert.equal(event.accountAddress, employeeAddress, 'employee address does not match')
          assert.equal(event.startDate.toString(), await currentTimestamp(), 'employee start date does not match')
          assert.equal(event.initialDenominationSalary.toString(), employeeSalary.toString(), 'employee salary does not match')
        })

        it('can add another employee', async () => {
          const anotherEmployeeName = 'Joe'
          const anotherEmployeeRole = 'Boss'

          const receipt = await payroll.addEmployeeNow(anotherEmployeeAddress, anotherEmployeeSalary, anotherEmployeeName, anotherEmployeeRole)
          const anotherEmployeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')

          const events = getEvents(receipt, 'AddEmployee');
          assert.equal(events.length, 1, 'number of AddEmployee events does not match')

          const event = events[0].args
          assert.equal(event.employeeId, anotherEmployeeId, 'employee id does not match')
          assert.equal(event.name, anotherEmployeeName, 'employee name does not match')
          assert.equal(event.role, anotherEmployeeRole, 'employee role does not match')
          assert.equal(event.accountAddress, anotherEmployeeAddress, 'employee address does not match')
          assert.equal(event.startDate.toString(), await currentTimestamp(), 'employee start date does not match')
          assert.equal(event.initialDenominationSalary.toString(), anotherEmployeeSalary.toString(), 'employee salary does not match')

          const [address, salary, accruedValue, lastPayroll, endDate] = await payroll.getEmployee(anotherEmployeeId)
          assert.equal(address, anotherEmployeeAddress, 'Employee account does not match')
          assert.equal(accruedValue, 0, 'Employee accrued value does not match')
          assert.equal(salary.toString(), anotherEmployeeSalary.toString(), 'Employee salary does not match')
          assert.equal(lastPayroll.toString(), await currentTimestamp(), 'last payroll should match')
          assert.equal(endDate.toString(), maxUint64(), 'last payroll should match')
        })
      })

      context('when the employee has already been added', () => {
        beforeEach('add employee', async () => {
          await payroll.addEmployeeNow(employeeAddress, employeeSalary, employeeName, employeeRole, { from })
        })

        it('reverts', async () => {
          await assertRevert(payroll.addEmployeeNow(employeeAddress, employeeSalary, employeeName, employeeRole, { from }), 'PAYROLL_EMPLOYEE_ALREADY_EXIST')
        })
      })
    })

    context('when the sender does not have permissions to add employees', () => {
      const from = anyone

      it('reverts', async () => {
        await assertRevert(payroll.addEmployeeNow(employeeAddress, employeeSalary, employeeName, employeeRole, { from }), 'APP_AUTH_FAILED')
      })
    })
  })

  describe('getEmployee', () => {
    let employeeId

    context('when the given id exists', () => {
      beforeEach('add employee', async () => {
        const receipt = await payroll.addEmployeeNow(employeeAddress, employeeSalary, 'John', 'Boss', { from: owner })
        employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId').toString()
      })

      it('adds a new employee', async () => {
        const [address, salary, accruedValue, lastPayroll, endDate] = await payroll.getEmployee(employeeId)

        assert.equal(address, employeeAddress, 'employee address does not match')
        assert.equal(accruedValue, 0, 'Employee accrued value does not match')
        assert.equal(salary.toString(), employeeSalary.toString(), 'Employee salary does not match')
        assert.equal(lastPayroll.toString(), await currentTimestamp(), 'last payroll should match')
        assert.equal(endDate.toString(), maxUint64(), 'last payroll should match')
      })
    })

    context('when the given id does not exist', () => {
      employeeId = 0

      it('reverts', async () => {
        await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')
      })
    })
  })

  describe('getEmployeeByAddress', () => {
    let employeeId

    context('when the given address exists', () => {
      const address = employeeAddress

      beforeEach('add employee', async () => {
        const receipt = await payroll.addEmployeeNow(employeeAddress, employeeSalary, 'John', 'Boss', { from: owner })
        employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
      })

      it('adds a new employee', async () => {
        const [id, salary, accruedValue, lastPayroll, endDate] = await payroll.getEmployeeByAddress(address)

        assert.equal(id.toString(), employeeId.toString(), 'employee id does not match')
        assert.equal(salary.toString(), employeeSalary.toString(), 'Employee salary does not match')
        assert.equal(accruedValue.toString(), 0, 'Employee accrued value does not match')
        assert.equal(lastPayroll.toString(), await currentTimestamp(), 'last payroll should match')
        assert.equal(endDate.toString(), maxUint64(), 'last payroll should match')
      })
    })

    context('when the given id does not exist', () => {
      employeeId = 0

      it('reverts', async () => {
        await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')
      })
    })
  })

  describe('terminateEmployeeNow', () => {
    let employeeId

    beforeEach('allowed usd token', async () => {
      await payroll.addAllowedToken(usdToken.address, { from: owner })
    })

    context('when the given employee id exists', () => {
      beforeEach('add employee', async () => {
        const receipt = await payroll.addEmployeeNow(employeeAddress, employeeSalary, 'John', 'Boss', { from: owner })
        employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId').toString()
      })

      context('when the sender has permissions to terminate employees', () => {
        const from = owner

        context('when the employee was not terminated', () => {
          it('sets the end date of the employee', async () => {
            await payroll.terminateEmployeeNow(employeeId, { from })

            const endDate = (await payroll.getEmployee(employeeId))[4]
            assert.equal(endDate.toString(), await currentTimestamp(), 'employee end date does not match')
          })

          it('emits an event', async () => {
            const receipt = await payroll.terminateEmployeeNow(employeeId, { from })

            const events = getEvents(receipt, 'TerminateEmployee')
            assert.equal(events.length, 1, 'number of TerminateEmployee events does not match')

            const event  = events[0].args
            assert.equal(event.employeeId.toString(), employeeId, 'employee id does not match')
            assert.equal(event.accountAddress, employeeAddress, 'employee address does not match')
            assert.equal(event.endDate.toString(), await currentTimestamp(), 'employee end date does not match')
          })

          it('does not reset the owed salary nor the accrued value of the employee', async () => {
            const previousBalance = await usdToken.balanceOf(employeeAddress)
            await payroll.determineAllocation([usdToken.address], [100], { from: employeeAddress })

            // Accrue some salary and extras
            await payroll.mockAddTimestamp(ONE_MONTH)
            const owedSalary = employeeSalary.times(ONE_MONTH)
            const accruedValue = 1000
            await payroll.addAccruedValue(employeeId, accruedValue, { from: owner })

            // Terminate employee and travel some time in the future
            await payroll.terminateEmployeeNow(employeeId, { from })
            await payroll.mockAddTimestamp(ONE_MONTH)

            // Request owed money
            await payroll.payday({ from: employeeAddress })
            await payroll.reimburse({ from: employeeAddress })
            await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')

            const currentBalance = await usdToken.balanceOf(employeeAddress)
            const expectedCurrentBalance = previousBalance.plus(owedSalary).plus(accruedValue)
            assert.equal(currentBalance.toString(), expectedCurrentBalance.toString(), 'current balance does not match')
          })

          it('can re-add a removed employee', async () => {
            await payroll.determineAllocation([usdToken.address], [100], { from: employeeAddress })
            await payroll.mockAddTimestamp(ONE_MONTH)

            // Terminate employee and travel some time in the future
            await payroll.terminateEmployeeNow(employeeId, { from })
            await payroll.mockAddTimestamp(ONE_MONTH)

            // Request owed money
            await payroll.payday({ from: employeeAddress })
            await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')

            // Add employee back
            const receipt = await payroll.addEmployeeNow(employeeAddress, employeeSalary, 'John', 'Boss')
            const newEmployeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')

            const [address, salary, accruedValue, lastPayroll, endDate] = await payroll.getEmployee(newEmployeeId)
            assert.equal(address, employeeAddress, 'Employee account does not match')
            assert.equal(salary.toString(), employeeSalary.toString(), 'employee salary does not match')
            assert.equal(lastPayroll.toString(), await currentTimestamp(), 'employee last payroll date does not match')
            assert.equal(accruedValue.toString(), 0, 'employee accrued value does not match')
            assert.equal(endDate.toString(), maxUint64(), 'employee end date does not match')
          })
        })

        context('when the employee was already terminated', () => {
          beforeEach('terminate employee', async () => {
            await payroll.terminateEmployeeNow(employeeId, { from })
            await payroll.mockAddTimestamp(ONE_MONTH + 1)
          })

          it('reverts', async () => {
            await assertRevert(payroll.terminateEmployeeNow(employeeId, { from }), 'PAYROLL_NON_ACTIVE_EMPLOYEE')
          })
        })
      })

      context('when the sender does not have permissions to terminate employees', () => {
        const from = anyone

        it('reverts', async () => {
          await assertRevert(payroll.terminateEmployeeNow(employeeId, { from }), 'APP_AUTH_FAILED')
        })
      })
    })

    context('when the given employee id does not exist', () => {
      employeeId = 0

      it('reverts', async () => {
        await assertRevert(payroll.terminateEmployeeNow(employeeId, { from: owner }), 'PAYROLL_NON_ACTIVE_EMPLOYEE')
      })
    })
  })

  describe('terminateEmployee', () => {
    let employeeId

    beforeEach('allowed usd token', async () => {
      await payroll.addAllowedToken(usdToken.address, { from: owner })
    })

    context('when the given employee id exists', () => {
      beforeEach('add employee', async () => {
        const receipt = await payroll.addEmployeeNow(employeeAddress, employeeSalary, 'John', 'Boss', { from: owner })
        employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId').toString()
      })

      context('when the sender has permissions to terminate employees', () => {
        const from = owner

        context('when the employee was not terminated', () => {
          let endDate

          context('when the given end date is in the future ', () => {
            beforeEach('set future end date', async () => {
              endDate = bn(await currentTimestamp()).plus(ONE_MONTH)
            })

            it('sets the end date of the employee', async () => {
              await payroll.terminateEmployee(employeeId, endDate, { from })

              const date = (await payroll.getEmployee(employeeId))[4]
              assert.equal(date.toString(), endDate.toString(), 'employee end date does not match')
            })

            it('emits an event', async () => {
              const receipt = await payroll.terminateEmployee(employeeId, endDate, { from })

              const events = getEvents(receipt, 'TerminateEmployee')
              assert.equal(events.length, 1, 'number of TerminateEmployee events does not match')

              const event  = events[0].args
              assert.equal(event.employeeId.toString(), employeeId, 'employee id does not match')
              assert.equal(event.accountAddress, employeeAddress, 'employee address does not match')
              assert.equal(event.endDate.toString(), endDate.toString(), 'employee end date does not match')
            })

            it('does not reset the owed salary nor the accrued value of the employee', async () => {
              const previousBalance = await usdToken.balanceOf(employeeAddress)
              await payroll.determineAllocation([usdToken.address], [100], { from: employeeAddress })

              // Accrue some salary and extras
              await payroll.mockAddTimestamp(ONE_MONTH)
              const owedSalary = employeeSalary.times(ONE_MONTH)
              const accruedValue = 1000
              await payroll.addAccruedValue(employeeId, accruedValue, { from: owner })

              // Terminate employee and travel some time in the future
              await payroll.terminateEmployee(employeeId, endDate, { from })
              await payroll.mockAddTimestamp(ONE_MONTH)

              // Request owed money
              await payroll.payday({ from: employeeAddress })
              await payroll.reimburse({ from: employeeAddress })
              await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')

              const currentBalance = await usdToken.balanceOf(employeeAddress)
              const expectedCurrentBalance = previousBalance.plus(owedSalary).plus(accruedValue)
              assert.equal(currentBalance.toString(), expectedCurrentBalance.toString(), 'current balance does not match')
            })

            it('can re-add a removed employee', async () => {
              await payroll.determineAllocation([usdToken.address], [100], { from: employeeAddress })
              await payroll.mockAddTimestamp(ONE_MONTH)

              // Terminate employee and travel some time in the future
              await payroll.terminateEmployee(employeeId, endDate, { from })
              await payroll.mockAddTimestamp(ONE_MONTH)

              // Request owed money
              await payroll.payday({ from: employeeAddress })
              await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')

              // Add employee back
              const receipt = await payroll.addEmployeeNow(employeeAddress, employeeSalary, 'John', 'Boss')
              const newEmployeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')

              const [address, salary, accruedValue, lastPayroll, date] = await payroll.getEmployee(newEmployeeId)
              assert.equal(address, employeeAddress, 'Employee account does not match')
              assert.equal(salary.toString(), employeeSalary.toString(), 'employee salary does not match')
              assert.equal(lastPayroll.toString(), await currentTimestamp(), 'employee last payroll date does not match')
              assert.equal(accruedValue.toString(), 0, 'employee accrued value does not match')
              assert.equal(date.toString(), maxUint64(), 'employee end date does not match')
            })
          })

          context('when the given end date is in the past', () => {
            beforeEach('set future end date', async () => {
              endDate = await currentTimestamp()
              await payroll.mockAddTimestamp(ONE_MONTH + 1)
            })

            it('reverts', async () => {
              await assertRevert(payroll.terminateEmployee(employeeId, endDate, { from }), 'PAYROLL_PAST_TERMINATION_DATE')
            })
          })
        })

        context('when the employee end date was already set', () => {
          beforeEach('terminate employee', async () => {
            await payroll.terminateEmployee(employeeId, await currentTimestamp() + ONE_MONTH, { from })
          })

          context('when the previous end date was not reached yet', () => {
            it('changes the employee end date', async () => {
              const newEndDate = bn(await currentTimestamp()).plus(ONE_MONTH * 2)
              await payroll.terminateEmployee(employeeId, newEndDate, { from })

              const endDate = (await payroll.getEmployee(employeeId))[4]
              assert.equal(endDate.toString(), newEndDate.toString(), 'employee end date does not match')
            })
          })

          context('when the previous end date was reached', () => {
            beforeEach('travel in the future', async () => {
              await payroll.mockAddTimestamp(ONE_MONTH + 1)
            })

            it('reverts', async () => {
              await assertRevert(payroll.terminateEmployee(employeeId, await currentTimestamp(), { from }), 'PAYROLL_NON_ACTIVE_EMPLOYEE')
            })
          })
        })
      })

      context('when the sender does not have permissions to terminate employees', () => {
        const from = anyone

        it('reverts', async () => {
          await assertRevert(payroll.terminateEmployee(employeeId, await currentTimestamp(), { from }), 'APP_AUTH_FAILED')
        })
      })
    })

    context('when the given employee id does not exist', () => {
      employeeId = 0

      it('reverts', async () => {
        await assertRevert(payroll.terminateEmployee(employeeId, await currentTimestamp(), { from: owner }), 'PAYROLL_NON_ACTIVE_EMPLOYEE')
      })
    })
  })
})
