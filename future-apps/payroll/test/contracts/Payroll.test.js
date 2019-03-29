const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { encodeCallScript } = require('@aragon/test-helpers/evmScript')
const { getEvent, getEvents, getEventArgument } = require('../helpers/events')
const { bn, bigExp, maxUint64, maxUint256, annualSalary } = require('../helpers/numbers')(web3)
const { deployErc20TokenAndDeposit, redistributeEth, getDaoFinanceVault } = require('../helpers/setup.js')(artifacts, web3)

const ACL = artifacts.require('ACL')
const Payroll = artifacts.require('PayrollMock')
const PriceFeed = artifacts.require('PriceFeedMock')
const ExecutionTarget = artifacts.require('ExecutionTarget')

const MAX_GAS_USED = 6.5e6
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

contract('Payroll, initialization,', ([owner, employee, anotherEmployee, anyone]) => {
  let dao, acl, payroll, payrollBase, finance, vault, priceFeed, denominationToken, anotherToken

  const NOW = 1553703809 // random fixed timestamp in seconds
  const ONE_MONTH = 60 * 60 * 24 * 31
  const TWO_MONTHS = ONE_MONTH * 2
  const RATE_EXPIRATION_TIME = TWO_MONTHS

  const PCT_ONE = bigExp(1, 18)
  const DENOMINATION_TOKEN_DECIMALS = 18

  const currentTimestamp = async () => payroll.getTimestampPublic()

  before('setup base apps and tokens', async () => {
    const contracts = await getDaoFinanceVault(owner)
    dao = contracts.dao
    finance = contracts.finance
    vault = contracts.vault
    acl = ACL.at(await dao.acl())

    priceFeed = await PriceFeed.new()
    payrollBase = await Payroll.new()

    anotherToken = await deployErc20TokenAndDeposit(owner, finance, vault, 'Another token', 18)
    denominationToken = await deployErc20TokenAndDeposit(owner, finance, vault, 'Denomination Token', DENOMINATION_TOKEN_DECIMALS)

    await redistributeEth(finance)
  })

  beforeEach('create payroll instance', async () => {
    const receipt = await dao.newAppInstance('0x4321', payrollBase.address, '0x', false, { from: owner })
    payroll = Payroll.at(getEventArgument(receipt, 'NewAppProxy', 'proxy'))
  })

  beforeEach('set timestamps', async () => {
    await priceFeed.mockSetTimestamp(NOW)
    await payroll.mockSetTimestamp(NOW)
  })

  beforeEach('grant permissions', async () => {
    const ADD_EMPLOYEE_ROLE = await payrollBase.ADD_EMPLOYEE_ROLE()
    const ADD_ACCRUED_VALUE_ROLE = await payrollBase.ADD_ACCRUED_VALUE_ROLE()
    const CHANGE_PRICE_FEED_ROLE = await payrollBase.CHANGE_PRICE_FEED_ROLE()
    const MODIFY_RATE_EXPIRY_ROLE = await payrollBase.MODIFY_RATE_EXPIRY_ROLE()
    const TERMINATE_EMPLOYEE_ROLE = await payrollBase.TERMINATE_EMPLOYEE_ROLE()
    const SET_EMPLOYEE_SALARY_ROLE = await payrollBase.SET_EMPLOYEE_SALARY_ROLE()
    const ALLOWED_TOKENS_MANAGER_ROLE = await payrollBase.ALLOWED_TOKENS_MANAGER_ROLE()

    await acl.createPermission(owner, payroll.address, ADD_EMPLOYEE_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, ADD_ACCRUED_VALUE_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, CHANGE_PRICE_FEED_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, MODIFY_RATE_EXPIRY_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, TERMINATE_EMPLOYEE_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, SET_EMPLOYEE_SALARY_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, ALLOWED_TOKENS_MANAGER_ROLE, owner, { from: owner })
  })

  describe('initialize', function () {
    const from = owner

    it('cannot initialize the base app', async () => {
      assert(await payrollBase.isPetrified(), 'base payroll app should be petrified')
      await assertRevert(payrollBase.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from }), 'INIT_ALREADY_INITIALIZED')
    })

    context('when it has not been initialized yet', function () {
      it('can be initialized with a zero denomination token', async () => {
        payroll.initialize(finance.address, ZERO_ADDRESS, priceFeed.address, RATE_EXPIRATION_TIME, { from })
        assert.equal(await payroll.denominationToken(), ZERO_ADDRESS, 'denomination token does not match')
      })

      it('reverts when passing an expiration time lower than or equal to a minute', async () => {
        const ONE_MINUTE = 60
        await assertRevert(payroll.initialize(finance.address, denominationToken.address, priceFeed.address, ONE_MINUTE, { from }), 'PAYROLL_EXPIRY_TIME_TOO_SHORT')
      })

      it('reverts when passing an invalid finance instance', async () => {
        await assertRevert(payroll.initialize(ZERO_ADDRESS, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from }), 'PAYROLL_FINANCE_NOT_CONTRACT')
      })

      it('reverts when passing an invalid feed instance', async () => {
        await assertRevert(payroll.initialize(finance.address, denominationToken.address, ZERO_ADDRESS, RATE_EXPIRATION_TIME, { from }), 'PAYROLL_FEED_NOT_CONTRACT')
      })
    })

    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from })
      })

      it('cannot be initialized again', async () => {
        await assertRevert(payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from }), 'INIT_ALREADY_INITIALIZED')
      })

      it('has a price feed instance, a finance instance, a denomination token and a rate expiration time', async () => {
        assert.equal(await payroll.feed(), priceFeed.address, 'feed address does not match')
        assert.equal(await payroll.finance(), finance.address, 'finance address should match')
        assert.equal(await payroll.denominationToken(), denominationToken.address, 'denomination token does not match')
        assert.equal(await payroll.rateExpiryTime(), RATE_EXPIRATION_TIME, 'rate expiration time does not match')
      })
    })
  })

  describe('isForwarder', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      it('returns true', async () => {
        assert(await payroll.isForwarder(), 'should be a forwarder')
      })
    })

    context('when it has not been initialized yet', function () {
      it('returns true', async () => {
        assert(await payroll.isForwarder(), 'should be a forwarder')
      })
    })
  })

  describe('canForward', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender is an employee', () => {
        let employeeId
        const sender = employee

        beforeEach('add employee', async () => {
          const receipt = await payroll.addEmployeeNow(employee, 100000, 'John Doe', 'Boss', { from: owner })
          employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId').toString()
        })

        context('when the employee was not terminated', () => {
          it('returns true', async () =>  {
            assert(await payroll.canForward(sender, '0x'), 'sender should be able to forward')
          })
        })

        context('when the employee was already terminated', () => {
          beforeEach('terminate employee', async () => {
            await payroll.terminateEmployeeNow(employeeId, { from: owner })
            await payroll.mockAddTimestamp(ONE_MONTH + 1)
          })

          it('returns true', async () => {
            assert(await payroll.canForward(sender, '0x'), 'sender should be able to forward')
          })
        })
      })

      context('when the sender is not an employee', () => {
        const sender = anyone

        it('returns false', async () =>  {
          assert.isFalse(await payroll.canForward(sender, '0x'), 'sender should not be able to forward')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      it('returns false', async () =>  {
        assert.isFalse(await payroll.canForward(employee, '0x'), 'sender should not be able to forward')
      })
    })
  })

  describe('forward', () => {
    let executionTarget, script

    beforeEach('build script', async () => {
      executionTarget = await ExecutionTarget.new()
      const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
      script = encodeCallScript([action])
    })

    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender is an employee', () => {
        let employeeId
        const from = employee

        beforeEach('add employee', async () => {
          const receipt = await payroll.addEmployeeNow(employee, 100000, 'John Doe', 'Boss', { from: owner })
          employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId').toString()
        })

        context('when the employee was not terminated', () => {
          it('executes the given script', async () =>  {
            await payroll.forward(script, { from })

            assert.equal(await executionTarget.counter(), 1, 'should have received execution calls')
          })
        })

        context('when the employee was already terminated', () => {
          beforeEach('terminate employee', async () => {
            await payroll.terminateEmployeeNow(employeeId, { from: owner })
            await payroll.mockAddTimestamp(ONE_MONTH + 1)
          })

          it('executes the given script', async () =>  {
            await payroll.forward(script, { from })

            assert.equal(await executionTarget.counter(), 1, 'should have received execution calls')
          })
        })
      })

      context('when the sender is not an employee', () => {
        const from = anyone

        it('reverts', async () =>  {
          await assertRevert(payroll.forward(script, { from }), 'PAYROLL_NO_FORWARD')

          assert.equal(await executionTarget.counter(), 0, 'should not have received execution calls')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      it('reverts', async () => {
        await assertRevert(payroll.forward(script, { from: employee }), 'PAYROLL_NO_FORWARD')
      })
    })
  })

  describe('setPriceFeed', () => {
    let newFeedAddress

    beforeEach('deploy new feed', async () => {
      newFeedAddress = (await PriceFeed.new()).address
    })

    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender has permissions', async () => {
        const from = owner

        context('when the given address is a contract', async () => {
          it('updates the feed address', async () => {
            await payroll.setPriceFeed(newFeedAddress, { from })

            assert.equal(await payroll.feed(), newFeedAddress, 'feed address does not match')
          })

          it('emits an event', async () => {
            const receipt = await payroll.setPriceFeed(newFeedAddress, { from })

            const events = getEvents(receipt, 'SetPriceFeed')
            assert.equal(events.length, 1, 'number of SetPriceFeed emitted events does not match')
            assert.equal(events[0].args.feed, newFeedAddress, 'feed address does not match')
          })
        })

        context('when the given address is not a contract', async () => {
          it('reverts', async () => {
            await assertRevert(payroll.setPriceFeed(anyone, { from }), 'PAYROLL_FEED_NOT_CONTRACT')
          })
        })

        context('when the given address is the zero address', async () => {
          it('reverts', async () => {
            await assertRevert(payroll.setPriceFeed(ZERO_ADDRESS, { from }), 'PAYROLL_FEED_NOT_CONTRACT')
          })
        })
      })

      context('when the sender does not have permissions', async () => {
        const from = anyone

        it('reverts', async () => {
          await assertRevert(payroll.setPriceFeed(newFeedAddress, { from }), 'APP_AUTH_FAILED')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      it('reverts', async () => {
        await assertRevert(payroll.setPriceFeed(newFeedAddress, { from: owner }), 'APP_AUTH_FAILED')
      })
    })
  })

  describe('setRateExpiryTime', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender has permissions', async () => {
        const from = owner

        context('when the given time is more than a minute', async () => {
          const expirationTime = 61

          it('updates the expiration time', async () => {
            await payroll.setRateExpiryTime(expirationTime, { from })

            assert.equal((await payroll.rateExpiryTime()).toString(), expirationTime, 'rate expiration time does not match')
          })

          it('emits an event', async () => {
            const receipt = await payroll.setRateExpiryTime(expirationTime, { from })

            const events = getEvents(receipt, 'SetRateExpiryTime')
            assert.equal(events.length, 1, 'number of SetRateExpiryTime emitted events does not match')
            assert.equal(events[0].args.time.toString(), expirationTime, 'rate expiration time does not match')
          })
        })

        context('when the given expiration time is one minute', async () => {
          const expirationTime = 60

          it('reverts', async () => {
            await assertRevert(payroll.setRateExpiryTime(expirationTime, { from }), 'PAYROLL_EXPIRY_TIME_TOO_SHORT')
          })
        })

        context('when the given expiration time is less than a minute', async () => {
          const expirationTime = 40

          it('reverts', async () => {
            await assertRevert(payroll.setRateExpiryTime(expirationTime, { from }), 'PAYROLL_EXPIRY_TIME_TOO_SHORT')
          })
        })
      })

      context('when the sender does not have permissions', async () => {
        const from = anyone

        it('reverts', async () => {
          await assertRevert(payroll.setRateExpiryTime(1000, { from }), 'APP_AUTH_FAILED')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      it('reverts', async () => {
        await assertRevert(payroll.setRateExpiryTime(1000, { from: owner }), 'APP_AUTH_FAILED')
      })
    })
  })

  describe('addEmployeeNow', () => {
    const employeeName = 'John Doe'
    const employeeRole = 'Boss'
    const salary = annualSalary(100000, DENOMINATION_TOKEN_DECIMALS)

    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender has permissions to add employees', () => {
        const from = owner
        let receipt, employeeId

        context('when the employee has not been added yet', () => {
          let receipt, employeeId

          beforeEach('add employee', async () => {
            receipt = await payroll.addEmployeeNow(employee, salary, employeeName, employeeRole, { from })
            employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId').toString()
          })

          it('starts with ID 1', async () => {
            assert.equal(employeeId, 1, 'first employee ID should be 1')
          })

          it('adds a new employee and emits an event', async () => {
            const [address] = await payroll.getEmployee(employeeId)
            assert.equal(address, employee, 'employee address does not match')

            const events = getEvents(receipt, 'AddEmployee');
            assert.equal(events.length, 1, 'number of AddEmployee events does not match')

            const event = events[0].args
            assert.equal(event.employeeId, employeeId, 'employee id does not match')
            assert.equal(event.name, employeeName, 'employee name does not match')
            assert.equal(event.role, employeeRole, 'employee role does not match')
            assert.equal(event.accountAddress, employee, 'employee address does not match')
            assert.equal(event.startDate.toString(), (await currentTimestamp()).toString(), 'employee start date does not match')
            assert.equal(event.initialDenominationSalary.toString(), salary.toString(), 'employee salary does not match')
          })

          it('can add another employee', async () => {
            const anotherEmployeeName = 'Joe'
            const anotherEmployeeRole = 'Boss'
            const anotherSalary = annualSalary(120000, DENOMINATION_TOKEN_DECIMALS)

            const receipt = await payroll.addEmployeeNow(anotherEmployee, anotherSalary, anotherEmployeeName, anotherEmployeeRole)
            const anotherEmployeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')

            const events = getEvents(receipt, 'AddEmployee');
            assert.equal(events.length, 1, 'number of AddEmployee events does not match')

            const event = events[0].args
            assert.equal(event.employeeId, anotherEmployeeId, 'employee id does not match')
            assert.equal(event.name, anotherEmployeeName, 'employee name does not match')
            assert.equal(event.role, anotherEmployeeRole, 'employee role does not match')
            assert.equal(event.accountAddress, anotherEmployee, 'employee address does not match')
            assert.equal(event.startDate.toString(), (await currentTimestamp()).toString(), 'employee start date does not match')
            assert.equal(event.initialDenominationSalary.toString(), anotherSalary.toString(), 'employee salary does not match')

            const [address, employeeSalary, accruedValue, lastPayroll, endDate] = await payroll.getEmployee(anotherEmployeeId)
            assert.equal(address, anotherEmployee, 'Employee account does not match')
            assert.equal(accruedValue, 0, 'Employee accrued value does not match')
            assert.equal(employeeSalary.toString(), anotherSalary.toString(), 'Employee salary does not match')
            assert.equal(lastPayroll.toString(), (await currentTimestamp()).toString(), 'last payroll should match')
            assert.equal(endDate.toString(), maxUint64(), 'last payroll should match')
          })
        })

        context('when the employee has already been added', () => {
          beforeEach('add employee', async () => {
            await payroll.addEmployeeNow(employee, salary, employeeName, employeeRole, { from })
          })

          it('reverts', async () => {
            await assertRevert(payroll.addEmployeeNow(employee, salary, employeeName, employeeRole, { from }), 'PAYROLL_EMPLOYEE_ALREADY_EXIST')
          })
        })
      })

      context('when the sender does not have permissions to add employees', () => {
        const from = anyone

        it('reverts', async () => {
          await assertRevert(payroll.addEmployeeNow(employee, salary, employeeName, employeeRole, { from }), 'APP_AUTH_FAILED')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      it('reverts', async () => {
        await assertRevert(payroll.addEmployeeNow(employee, salary, employeeName, employeeRole, { from: owner }), 'APP_AUTH_FAILED')
      })
    })
  })

  describe('addEmployee', () => {
    const employeeName = 'John Doe'
    const employeeRole = 'Boss'
    const salary = annualSalary(100000, DENOMINATION_TOKEN_DECIMALS)

    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender has permissions to add employees', () => {
        const from = owner
        let receipt, employeeId

        context('when the employee has not been added yet', () => {
          let receipt, employeeId

          const itHandlesAddingNewEmployeesProperly = startDate => {
            beforeEach('add employee', async () => {
              receipt = await payroll.addEmployee(employee, salary, employeeName, employeeRole, startDate, { from })
              employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId').toString()
            })

            it('starts with ID 1', async () => {
              assert.equal(employeeId, 1, 'first employee ID should be 1')
            })

            it('adds a new employee and emits an event', async () => {
              const [address] = await payroll.getEmployee(employeeId)
              assert.equal(address, employee, 'employee address does not match')

              const events = getEvents(receipt, 'AddEmployee');
              assert.equal(events.length, 1, 'number of AddEmployee events does not match')

              const event = events[0].args
              assert.equal(event.employeeId, employeeId, 'employee id does not match')
              assert.equal(event.name, employeeName, 'employee name does not match')
              assert.equal(event.role, employeeRole, 'employee role does not match')
              assert.equal(event.accountAddress, employee, 'employee address does not match')
              assert.equal(event.startDate.toString(), startDate, 'employee start date does not match')
              assert.equal(event.initialDenominationSalary.toString(), salary.toString(), 'employee salary does not match')
            })

            it('can add another employee', async () => {
              const anotherEmployeeName = 'Joe'
              const anotherEmployeeRole = 'Boss'
              const anotherSalary = annualSalary(120000, DENOMINATION_TOKEN_DECIMALS)

              const receipt = await payroll.addEmployee(anotherEmployee, anotherSalary, anotherEmployeeName, anotherEmployeeRole, startDate)
              const anotherEmployeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')

              const events = getEvents(receipt, 'AddEmployee');
              assert.equal(events.length, 1, 'number of AddEmployee events does not match')

              const event = events[0].args
              assert.equal(event.employeeId, anotherEmployeeId, 'employee id does not match')
              assert.equal(event.name, anotherEmployeeName, 'employee name does not match')
              assert.equal(event.role, anotherEmployeeRole, 'employee role does not match')
              assert.equal(event.accountAddress, anotherEmployee, 'employee address does not match')
              assert.equal(event.startDate.toString(), startDate, 'employee start date does not match')
              assert.equal(event.initialDenominationSalary.toString(), anotherSalary.toString(), 'employee salary does not match')

              const [address, employeeSalary, accruedValue, lastPayroll, endDate] = await payroll.getEmployee(anotherEmployeeId)
              assert.equal(address, anotherEmployee, 'Employee account does not match')
              assert.equal(accruedValue, 0, 'Employee accrued value does not match')
              assert.equal(employeeSalary.toString(), anotherSalary.toString(), 'Employee salary does not match')
              assert.equal(lastPayroll.toString(), startDate.toString(), 'last payroll should match')
              assert.equal(endDate.toString(), maxUint64(), 'last payroll should match')
            })
          }

          context('when the given end date is in the past ', () => {
            const startDate = NOW - TWO_MONTHS

            itHandlesAddingNewEmployeesProperly(startDate)
          })

          context('when the given end date is in the future', () => {
            const startDate = NOW + TWO_MONTHS

            itHandlesAddingNewEmployeesProperly(startDate)
          })
        })

        context('when the employee has already been added', () => {
          beforeEach('add employee', async () => {
            await payroll.addEmployee(employee, salary, employeeName, employeeRole, NOW, { from })
          })

          context('when the given end date is in the past ', () => {
            const startDate = NOW - TWO_MONTHS

            it('reverts', async () => {
              await assertRevert(payroll.addEmployee(employee, salary, employeeName, employeeRole, startDate, { from }), 'PAYROLL_EMPLOYEE_ALREADY_EXIST')
            })
          })

          context('when the given end date is in the future', () => {
            const startDate = NOW + TWO_MONTHS

            it('reverts', async () => {
              await assertRevert(payroll.addEmployee(employee, salary, employeeName, employeeRole, startDate, { from }), 'PAYROLL_EMPLOYEE_ALREADY_EXIST')
            })
          })
        })
      })

      context('when the sender does not have permissions to add employees', () => {
        const from = anyone

        it('reverts', async () => {
          await assertRevert(payroll.addEmployee(employee, salary, employeeName, employeeRole, NOW, { from }), 'APP_AUTH_FAILED')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      it('reverts', async () => {
        await assertRevert(payroll.addEmployee(employee, salary, employeeName, employeeRole, NOW, { from: owner }), 'APP_AUTH_FAILED')
      })
    })
  })

  describe('getEmployee', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the given id exists', () => {
        let employeeId

        beforeEach('add employee', async () => {
          const receipt = await payroll.addEmployeeNow(employee, 1000, 'John Doe', 'Boss', { from: owner })
          employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId').toString()
        })

        it('adds a new employee', async () => {
          const [address, salary, accruedValue, lastPayroll, endDate] = await payroll.getEmployee(employeeId)

          assert.equal(address, employee, 'employee address does not match')
          assert.equal(accruedValue, 0, 'Employee accrued value does not match')
          assert.equal(salary.toString(), 1000, 'Employee salary does not match')
          assert.equal(lastPayroll.toString(), (await currentTimestamp()).toString(), 'last payroll should match')
          assert.equal(endDate.toString(), maxUint64(), 'last payroll should match')
        })
      })

      context('when the given id does not exist', () => {
        const employeeId = 0

        it('reverts', async () => {
          await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      const employeeId = 0

      it('reverts', async () => {
        await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')
      })
    })
  })

  describe('getEmployeeByAddress', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the given address exists', () => {
        let employeeId
        const address = employee

        beforeEach('add employee', async () => {
          const receipt = await payroll.addEmployeeNow(employee, 1000, 'John Doe', 'Boss', { from: owner })
          employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
        })

        it('adds a new employee', async () => {
          const [id, salary, accruedValue, lastPayroll, endDate] = await payroll.getEmployeeByAddress(address)

          assert.equal(id.toString(), employeeId.toString(), 'employee id does not match')
          assert.equal(salary.toString(), 1000, 'employee salary does not match')
          assert.equal(accruedValue.toString(), 0, 'employee accrued value does not match')
          assert.equal(lastPayroll.toString(), (await currentTimestamp()).toString(), 'last payroll should match')
          assert.equal(endDate.toString(), maxUint64(), 'last payroll should match')
        })
      })

      context('when the given id does not exist', () => {
        const employeeId = 0

        it('reverts', async () => {
          await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      it('reverts', async () => {
        await assertRevert(payroll.getEmployeeByAddress(employee), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')
      })
    })
  })

  describe('terminateEmployeeNow', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the given employee id exists', () => {
        let employeeId
        const salary = annualSalary(100000, DENOMINATION_TOKEN_DECIMALS)

        beforeEach('add employee', async () => {
          const receipt = await payroll.addEmployeeNow(employee, salary, 'John Doe', 'Boss', { from: owner })
          employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId').toString()
        })

        context('when the sender has permissions to terminate employees', () => {
          const from = owner

          context('when the employee was not terminated', () => {
            beforeEach('allow denomination token', async () => {
              await payroll.addAllowedToken(denominationToken.address, { from: owner })
            })

            it('sets the end date of the employee', async () => {
              await payroll.terminateEmployeeNow(employeeId, { from })

              const endDate = (await payroll.getEmployee(employeeId))[4]
              assert.equal(endDate.toString(), (await currentTimestamp()).toString(), 'employee end date does not match')
            })

            it('emits an event', async () => {
              const receipt = await payroll.terminateEmployeeNow(employeeId, { from })

              const events = getEvents(receipt, 'TerminateEmployee')
              assert.equal(events.length, 1, 'number of TerminateEmployee events does not match')

              const event  = events[0].args
              assert.equal(event.employeeId.toString(), employeeId, 'employee id does not match')
              assert.equal(event.accountAddress, employee, 'employee address does not match')
              assert.equal(event.endDate.toString(), (await currentTimestamp()).toString(), 'employee end date does not match')
            })

            it('does not reset the owed salary nor the accrued value of the employee', async () => {
              const previousBalance = await denominationToken.balanceOf(employee)
              await payroll.determineAllocation([denominationToken.address], [100], { from: employee })

              // Accrue some salary and extras
              await payroll.mockAddTimestamp(ONE_MONTH)
              const owedSalary = salary.mul(ONE_MONTH)
              const accruedValue = 1000
              await payroll.addAccruedValue(employeeId, accruedValue, { from: owner })

              // Terminate employee and travel some time in the future
              await payroll.terminateEmployeeNow(employeeId, { from })
              await payroll.mockAddTimestamp(ONE_MONTH)

              // Request owed money
              await payroll.payday({ from: employee })
              await payroll.reimburse({ from: employee })
              await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')

              const currentBalance = await denominationToken.balanceOf(employee)
              const expectedCurrentBalance = previousBalance.plus(owedSalary).plus(accruedValue)
              assert.equal(currentBalance.toString(), expectedCurrentBalance.toString(), 'current balance does not match')
            })

            it('can re-add a removed employee', async () => {
              await payroll.determineAllocation([denominationToken.address], [100], { from: employee })
              await payroll.mockAddTimestamp(ONE_MONTH)

              // Terminate employee and travel some time in the future
              await payroll.terminateEmployeeNow(employeeId, { from })
              await payroll.mockAddTimestamp(ONE_MONTH)

              // Request owed money
              await payroll.payday({ from: employee })
              await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')

              // Add employee back
              const receipt = await payroll.addEmployeeNow(employee, salary, 'John Doe', 'Boss')
              const newEmployeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')

              const [address, employeeSalary, accruedValue, lastPayroll, endDate] = await payroll.getEmployee(newEmployeeId)
              assert.equal(address, employee, 'Employee account does not match')
              assert.equal(employeeSalary.toString(), salary.toString(), 'employee salary does not match')
              assert.equal(lastPayroll.toString(), (await currentTimestamp()).toString(), 'employee last payroll date does not match')
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
        const employeeId = 0

        it('reverts', async () => {
          await assertRevert(payroll.terminateEmployeeNow(employeeId, { from: owner }), 'PAYROLL_NON_ACTIVE_EMPLOYEE')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      const employeeId = 0

      it('reverts', async () => {
        await assertRevert(payroll.terminateEmployeeNow(employeeId, { from: owner }), 'APP_AUTH_FAILED')
      })
    })
  })

  describe('terminateEmployee', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the given employee id exists', () => {
        let employeeId
        const salary = annualSalary(100000, DENOMINATION_TOKEN_DECIMALS)

        beforeEach('add employee', async () => {
          const receipt = await payroll.addEmployeeNow(employee, salary, 'John Doe', 'Boss', { from: owner })
          employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId').toString()
        })

        context('when the sender has permissions to terminate employees', () => {
          const from = owner

          context('when the employee was not terminated', () => {
            let endDate

            beforeEach('allowed denomination token', async () => {
              await payroll.addAllowedToken(denominationToken.address, { from: owner })
            })

            context('when the given end date is in the future ', () => {
              beforeEach('set future end date', async () => {
                endDate = (await currentTimestamp()).plus(ONE_MONTH)
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
                assert.equal(event.accountAddress, employee, 'employee address does not match')
                assert.equal(event.endDate.toString(), endDate.toString(), 'employee end date does not match')
              })

              it('does not reset the owed salary nor the accrued value of the employee', async () => {
                const previousBalance = await denominationToken.balanceOf(employee)
                await payroll.determineAllocation([denominationToken.address], [100], { from: employee })

                // Accrue some salary and extras
                await payroll.mockAddTimestamp(ONE_MONTH)
                const owedSalary = salary.times(ONE_MONTH)
                const accruedValue = 1000
                await payroll.addAccruedValue(employeeId, accruedValue, { from: owner })

                // Terminate employee and travel some time in the future
                await payroll.terminateEmployee(employeeId, endDate, { from })
                await payroll.mockAddTimestamp(ONE_MONTH)

                // Request owed money
                await payroll.payday({ from: employee })
                await payroll.reimburse({ from: employee })
                await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')

                const currentBalance = await denominationToken.balanceOf(employee)
                const expectedCurrentBalance = previousBalance.plus(owedSalary).plus(accruedValue)
                assert.equal(currentBalance.toString(), expectedCurrentBalance.toString(), 'current balance does not match')
              })

              it('can re-add a removed employee', async () => {
                await payroll.determineAllocation([denominationToken.address], [100], { from: employee })
                await payroll.mockAddTimestamp(ONE_MONTH)

                // Terminate employee and travel some time in the future
                await payroll.terminateEmployee(employeeId, endDate, { from })
                await payroll.mockAddTimestamp(ONE_MONTH)

                // Request owed money
                await payroll.payday({ from: employee })
                await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')

                // Add employee back
                const receipt = await payroll.addEmployeeNow(employee, salary, 'John Doe', 'Boss')
                const newEmployeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')

                const [address, employeeSalary, accruedValue, lastPayroll, date] = await payroll.getEmployee(newEmployeeId)
                assert.equal(address, employee, 'Employee account does not match')
                assert.equal(employeeSalary.toString(), salary.toString(), 'employee salary does not match')
                assert.equal(lastPayroll.toString(), (await currentTimestamp()).toString(), 'employee last payroll date does not match')
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
              await payroll.terminateEmployee(employeeId, (await currentTimestamp()).plus(ONE_MONTH), { from })
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
        const employeeId = 0

        it('reverts', async () => {
          await assertRevert(payroll.terminateEmployee(employeeId, await currentTimestamp(), { from: owner }), 'PAYROLL_NON_ACTIVE_EMPLOYEE')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      const employeeId = 0
      const endDate = NOW + ONE_MONTH

      it('reverts', async () => {
        await assertRevert(payroll.terminateEmployee(employeeId, endDate, { from: owner }), 'APP_AUTH_FAILED')
      })
    })
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
          const previousSalary = annualSalary(100000, DENOMINATION_TOKEN_DECIMALS)

          beforeEach('add employee', async () => {
            const receipt = await payroll.addEmployeeNow(employee, previousSalary, 'John Doe', 'Boss')
            employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
          })

          context('when the given employee is active', () => {

            const itSetsSalarySuccessfully = newSalary => {
              it('changes the salary of the employee', async () => {
                await payroll.setEmployeeSalary(employeeId, newSalary, { from })

                const salary = (await payroll.getEmployee(employeeId))[1]
                assert.equal(salary.toString(), newSalary, 'accrued value does not match')
              })

              it('adds previous owed salary to the accrued value', async () => {
                await payroll.mockAddTimestamp(ONE_MONTH)

                await payroll.setEmployeeSalary(employeeId, newSalary, { from })
                await payroll.mockAddTimestamp(ONE_MONTH)

                const accruedValue = (await payroll.getEmployee(employeeId))[2]
                assert.equal(accruedValue.toString(), previousSalary * ONE_MONTH, 'accrued value does not match')
              })

              it('emits an event', async () => {
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
              await payroll.mockAddTimestamp(ONE_MONTH)
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
          const receipt = await payroll.addEmployeeNow(employee, 1000, 'John Doe', 'Boss', { from: owner })
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
              await payroll.addEmployeeNow(anotherEmployee, 1000, 'John Doe', 'Boss', { from: owner })
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
            await payroll.mockAddTimestamp(ONE_MONTH)
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

  describe('addAllowedToken', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender has permissions', () => {
        const from = owner

        context('when it does not reach the maximum amount allowed', () => {
          it('can allow a token', async () => {
            const receipt = await payroll.addAllowedToken(denominationToken.address, { from })

            const event = getEvent(receipt, 'AddAllowedToken')
            assert.equal(event.token, denominationToken.address, 'denomination token address should match')

            assert.equal(await payroll.getAllowedTokensArrayLength(), 1, 'allowed tokens length does not match')
            assert(await payroll.isTokenAllowed(denominationToken.address), 'denomination token should be allowed')
          })

          it('can allow a the zero address', async () => {
            const receipt = await payroll.addAllowedToken(ZERO_ADDRESS, { from })

            const event = getEvent(receipt, 'AddAllowedToken')
            assert.equal(event.token, ZERO_ADDRESS, 'denomination token address should match')

            assert.equal(await payroll.getAllowedTokensArrayLength(), 1, 'allowed tokens length does not match')
            assert(await payroll.isTokenAllowed(ZERO_ADDRESS), 'zero address token should be allowed')
          })

          it('can allow multiple tokens', async () => {
            const erc20Token1 = await deployErc20TokenAndDeposit(owner, finance, vault, 'Token 1', 18)
            const erc20Token2 = await deployErc20TokenAndDeposit(owner, finance, vault, 'Token 2', 16)

            await payroll.addAllowedToken(denominationToken.address, { from })
            await payroll.addAllowedToken(erc20Token1.address, { from })
            await payroll.addAllowedToken(erc20Token2.address, { from })

            assert.equal(await payroll.getAllowedTokensArrayLength(), 3, 'allowed tokens length does not match')
            assert(await payroll.isTokenAllowed(denominationToken.address), 'denomination token should be allowed')
            assert(await payroll.isTokenAllowed(erc20Token1.address), 'ERC20 token 1 should be allowed')
            assert(await payroll.isTokenAllowed(erc20Token2.address), 'ERC20 token 2 should be allowed')
          })
        })

        context('when it reaches the maximum amount allowed', () => {
          let tokenAddresses = [], MAX_ALLOWED_TOKENS

          before('deploy multiple tokens', async () => {
            MAX_ALLOWED_TOKENS = (await payroll.getMaxAllowedTokens()).valueOf()
            for (let i = 0; i < MAX_ALLOWED_TOKENS; i++) {
              const token = await deployErc20TokenAndDeposit(owner, finance, vault, `Token ${i}`, 18);
              tokenAddresses.push(token.address)
            }
          })

          beforeEach('allow tokens and add employee', async () => {
            await Promise.all(tokenAddresses.map(address => payroll.addAllowedToken(address, { from: owner })))
            assert.equal(await payroll.getAllowedTokensArrayLength(), MAX_ALLOWED_TOKENS, 'amount of allowed tokens does not match')

            await payroll.addEmployee(employee, 100000, 'John Doe', 'Boss', NOW - ONE_MONTH, { from: owner })
          })

          it('can not add one more token', async () => {
            const erc20Token = await deployErc20TokenAndDeposit(owner, finance, vault, 'Extra token', 18)

            await assertRevert(payroll.addAllowedToken(erc20Token.address), 'PAYROLL_MAX_ALLOWED_TOKENS')
          })

          it('does not run out of gas to payout salary', async () => {
            const allocations = tokenAddresses.map(() => 100 / MAX_ALLOWED_TOKENS)

            const allocationTx = await payroll.determineAllocation(tokenAddresses, allocations, { from: employee })
            assert.isBelow(allocationTx.receipt.cumulativeGasUsed, MAX_GAS_USED, 'Too much gas consumed for allocation')

            const paydayTx = await payroll.payday({ from: employee })
            assert.isBelow(paydayTx.receipt.cumulativeGasUsed, MAX_GAS_USED, 'Too much gas consumed for payday')
          })
        })
      })

      context('when the sender does not have permissions', () => {
        const from = anyone

        it('reverts', async () => {
          await assertRevert(payroll.addAllowedToken(denominationToken.address, { from }), 'APP_AUTH_FAILED')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      it('reverts', async () => {
        await assertRevert(payroll.addAllowedToken(denominationToken.address, { from: owner }), 'APP_AUTH_FAILED')
      })
    })
  })

  describe('isTokenAllowed', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the given token is not the zero address', () => {
        context('when the requested token was allowed', () => {
          beforeEach('allow denomination token', async () => {
            await payroll.addAllowedToken(denominationToken.address, { from: owner })
          })

          it('returns true', async () => {
            assert(await payroll.isTokenAllowed(denominationToken.address), 'token should be allowed')
          })
        })

        context('when the requested token was not allowed yet', () => {
          it('returns false', async () => {
            assert.isFalse(await payroll.isTokenAllowed(denominationToken.address), 'token should not be allowed')
          })
        })
      })

      context('when the given token is the zero address', () => {
        it('returns false', async () => {
          assert.isFalse(await payroll.isTokenAllowed(ZERO_ADDRESS), 'token should not be allowed')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      it('returns false', async () => {
        assert.isFalse(await payroll.isTokenAllowed(denominationToken.address), 'token should not be allowed')
      })
    })
  })

  describe('determineAllocation', () => {
    const tokenAddresses = []

    before('deploy some tokens', async () => {
      const token1 = await deployErc20TokenAndDeposit(owner, finance, vault, 'Token 1', 14)
      const token2 = await deployErc20TokenAndDeposit(owner, finance, vault, 'Token 2', 14)
      const token3 = await deployErc20TokenAndDeposit(owner, finance, vault, 'Token 3', 14)
      tokenAddresses.push(token1.address, token2.address, token3.address)
    })

    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      beforeEach('allow multiple tokens', async () => {
        await Promise.all(tokenAddresses.map(address => payroll.addAllowedToken(address, { from: owner })))
      })

      context('when the employee exists', () => {
        const from = employee
        let employeeId

        beforeEach('add employee', async () => {
          const receipt = await payroll.addEmployeeNow(employee, 100000, 'John Doe', 'Boss', { from: owner })
          employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
        })

        const itShouldHandleAllocationsProperly = () => {
          context('when the amount of tokens and allocations match', () => {
            context('when the given list is not empty', () => {
              context('when all the given tokens are allowed', () => {
                context('when the allocations add up to 100', () => {

                  const itDeterminesAllocationsProperly = allocations => {
                    context('when there was no previous allocation', () => {
                      it('persists requested allocation', async () => {
                        const receipt = await payroll.determineAllocation(tokenAddresses, allocations, { from })

                        const events = getEvents(receipt, 'DetermineAllocation')
                        assert.equal(events.length, 1, 'number of emitted DetermineAllocation events does not match')
                        assert.equal(events[0].args.employee, employee, 'employee address should match')
                        assert.equal(events[0].args.employeeId.toString(), employeeId, 'employee id should match')

                        for (const tokenAddress of tokenAddresses) {
                          const expectedAllocation = allocations[tokenAddresses.indexOf(tokenAddress)]
                          assert.equal(await payroll.getAllocation(employeeId, tokenAddress), expectedAllocation, 'token allocation does not match')
                        }

                        assert.equal(await payroll.getAllocation(employeeId, anyone), 0, 'token allocation should be zero')
                      })
                    })

                    context('when there was a previous allocation', () => {
                      let token

                      beforeEach('submit previous allocation', async () => {
                        token = await deployErc20TokenAndDeposit(owner, finance, vault, 'Previous Token', 18)
                        await payroll.addAllowedToken(token.address, { from: owner })

                        await payroll.determineAllocation([token.address], [100], { from })
                        assert.equal(await payroll.getAllocation(employeeId, token.address), 100)

                        for (const tokenAddress of tokenAddresses) {
                          assert.equal(await payroll.getAllocation(employeeId, tokenAddress), 0, 'token allocation does not match')
                        }
                      })

                      it('replaces previous allocation for the requested one', async () => {
                        await payroll.determineAllocation(tokenAddresses, allocations, { from })

                        for (const tokenAddress of tokenAddresses) {
                          const expectedAllocation = allocations[tokenAddresses.indexOf(tokenAddress)]
                          assert.equal(await payroll.getAllocation(employeeId, tokenAddress), expectedAllocation, 'token allocation does not match')
                        }

                        assert.equal(await payroll.getAllocation(employeeId, token.address), 0)
                      })
                    })
                  }

                  context('when the allocation list does not include zero values', () => {
                    const allocations = [10, 20, 70]

                    itDeterminesAllocationsProperly(allocations)
                  })

                  context('when the allocation list includes zero values', () => {
                    const allocations = [90, 10, 0]

                    itDeterminesAllocationsProperly(allocations)
                  })
                })

                context('when the allocations add up less than 100', () => {
                  const allocations = [10, 20, 69]

                  it('reverts', async () => {
                    await assertRevert(payroll.determineAllocation(tokenAddresses, allocations, { from }), 'PAYROLL_DISTRIBUTION_NO_COMPLETE')
                  })
                })

                context('when the allocations add up more than 100', () => {
                  const allocations = [10, 20, 71]

                  it('reverts', async () => {
                    await assertRevert(payroll.determineAllocation(tokenAddresses, allocations, { from }), 'PAYROLL_DISTRIBUTION_NO_COMPLETE')
                  })
                })
              })

              context('when at least one token of the list is not allowed', () => {
                let notAllowedToken

                beforeEach('deploy new token', async () => {
                  notAllowedToken = await deployErc20TokenAndDeposit(owner, finance, vault, 'Not-allowed token', 14)
                })

                it('reverts', async () => {
                  const addresses = [...tokenAddresses, notAllowedToken.address]
                  const allocations = [10, 20, 30, 40]

                  await assertRevert(payroll.determineAllocation(addresses, allocations, { from }), 'PAYROLL_NO_ALLOWED_TOKEN')
                })
              })
            })

            context('when the given list is empty', () => {
              const addresses = [], allocations = []

              it('reverts', async () => {
                await assertRevert(payroll.determineAllocation(addresses, allocations, { from }), 'PAYROLL_DISTRIBUTION_NO_COMPLETE')
              })
            })
          })

          context('when the amount of tokens and allocations do not match', () => {
            it('reverts', async () => {
              const allocations = [100]
              const addresses = [...tokenAddresses, anyone]

              await assertRevert(payroll.determineAllocation(addresses, allocations, { from }), 'PAYROLL_TOKEN_ALLOCATION_MISMATCH')
            })
          })
        }

        context('when the employee is active', () => {
          itShouldHandleAllocationsProperly()
        })

        context('when the employee is not active', () => {
          beforeEach('terminate employee', async () => {
            await payroll.terminateEmployeeNow(employeeId, { from: owner })
            await payroll.mockAddTimestamp(ONE_MONTH)
          })

          itShouldHandleAllocationsProperly()
        })
      })

      context('when the employee does not exist', () => {
        const from = anyone

        it('reverts', async () => {
          await assertRevert(payroll.determineAllocation(tokenAddresses, [100, 0, 0], { from }), 'PAYROLL_EMPLOYEE_DOES_NOT_MATCH')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      it('reverts', async () => {
        await assertRevert(payroll.determineAllocation(tokenAddresses, [10, 20, 70], { from: employee }), 'PAYROLL_EMPLOYEE_DOES_NOT_MATCH')
      })
    })
  })

  describe('getAllocation', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the employee exists', () => {
        let employeeId

        beforeEach('add employee', async () => {
          const receipt = await payroll.addEmployeeNow(employee, 100000, 'John Doe', 'Boss', { from: owner })
          employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
        })

        const itShouldAnswerAllocationsProperly = () => {
          context('when the given token is not the zero address', () => {
            context('when the given token was allowed', () => {
              beforeEach('allow denomination token', async () => {
                await payroll.addAllowedToken(denominationToken.address, { from: owner })
              })

              context('when the given token was picked by the employee', () => {
                beforeEach('determine allocation', async () => {
                  await payroll.determineAllocation([denominationToken.address], [100], { from: employee })
                })

                it('tells its corresponding allocation', async () => {
                  const allocation = await payroll.getAllocation(employeeId, denominationToken.address)
                  assert.equal(allocation.toString(), 100, 'token allocation does not match')
                })
              })

              context('when the given token was not picked by the employee', () => {
                it('returns 0', async () => {
                  const allocation = await payroll.getAllocation(employeeId, denominationToken.address)
                  assert.equal(allocation.toString(), 0, 'token allocation should be zero')
                })
              })
            })

            context('when the given token was not allowed', () => {
              it('returns 0', async () => {
                const allocation = await payroll.getAllocation(employeeId, denominationToken.address)
                assert.equal(allocation.toString(), 0, 'token allocation should be zero')
              })
            })
          })

          context('when the given token is the zero address', () => {
            const token = ZERO_ADDRESS

            context('when the given token was allowed', () => {
              beforeEach('allow denomination token', async () => {
                await payroll.addAllowedToken(token, { from: owner })
              })

              context('when the given token was picked by the employee', () => {
                beforeEach('determine allocation', async () => {
                  await payroll.determineAllocation([token], [100], { from: employee })
                })

                it('tells its corresponding allocation', async () => {
                  const allocation = await payroll.getAllocation(employeeId, token)
                  assert.equal(allocation.toString(), 100, 'token allocation does not match')
                })
              })

              context('when the given token was not picked by the employee', () => {
                it('returns 0', async () => {
                  const allocation = await payroll.getAllocation(employeeId, token)
                  assert.equal(allocation.toString(), 0, 'token allocation should be zero')
                })
              })
            })

            context('when the given token was not allowed', () => {
              it('returns 0', async () => {
                const allocation = await payroll.getAllocation(employeeId, token)
                assert.equal(allocation.toString(), 0, 'token allocation should be zero')
              })
            })
          })
        }

        context('when the employee is active', () => {
          itShouldAnswerAllocationsProperly()
        })

        context('when the employee is not active', () => {
          beforeEach('terminate employee', async () => {
            await payroll.terminateEmployeeNow(employeeId, { from: owner })
            await payroll.mockAddTimestamp(ONE_MONTH)
          })

          itShouldAnswerAllocationsProperly()
        })
      })

      context('when the employee does not exist', () => {
        const employeeId = 0

        it('reverts', async () => {
          await assertRevert(payroll.getAllocation(employeeId, denominationToken.address), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      const employeeId = 0

      it('reverts', async () => {
        await assertRevert(payroll.getAllocation(employeeId, denominationToken.address), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')
      })
    })
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
            const receipt = await payroll.addEmployeeNow(employee, salary, 'John Doe', 'Boss')
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

                  await payroll.mockAddTimestamp(ONE_MONTH)
                  await priceFeed.mockAddTimestamp(ONE_MONTH)
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
                await payroll.mockAddTimestamp(ONE_MONTH)
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
                await payroll.mockAddTimestamp(ONE_MONTH)
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
            const receipt = await payroll.addEmployeeNow(employee, salary, 'John Doe', 'Boss')
            employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
          })

          itRevertsAnyAttemptToWithdrawPayroll('PAYROLL_NOTHING_PAID', 'PAYROLL_NOTHING_PAID')
        })

        context('when the employee has a huge salary', () => {
          const salary = maxUint256()

          beforeEach('add employee', async () => {
            const receipt = await payroll.addEmployeeNow(employee, salary, 'John Doe', 'Boss')
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
            const receipt = await payroll.addEmployeeNow(employee, salary, 'John Doe', 'Boss')
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

                  await payroll.mockAddTimestamp(ONE_MONTH)
                  await priceFeed.mockAddTimestamp(ONE_MONTH)
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
              const owedSalary = salary * ONE_MONTH

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
            const receipt = await payroll.addEmployeeNow(employee, salary, 'John Doe', 'Boss')
            employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
          })

          const itRevertsAnyAttemptToWithdrawPartialPayroll = () => {
            context('when the employee has some pending salary', () => {
              beforeEach('accumulate some pending salary', async () => {
                await payroll.mockAddTimestamp(ONE_MONTH)
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
            const receipt = await payroll.addEmployeeNow(employee, salary, 'John Doe', 'Boss')
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
                await payroll.mockAddTimestamp(ONE_MONTH)
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

                    await payroll.mockAddTimestamp(ONE_MONTH)
                    await priceFeed.mockAddTimestamp(ONE_MONTH)
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
                await payroll.mockAddTimestamp(ONE_MONTH)
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
            const receipt = await payroll.addEmployeeNow(employee, 1000, 'John Doe', 'Boss')
            employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
          })

          context('when the given employee is active', () => {

            const itAddsAccruedValueSuccessfully = value => {
              it('adds requested accrued value', async () => {
                await payroll.addAccruedValue(employeeId, value, { from })

                const accruedValue = (await payroll.getEmployee(employeeId))[2]
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
              await payroll.mockAddTimestamp(ONE_MONTH)
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

  describe('reimburse', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender is an employee', () => {
        const from = employee
        let employeeId, salary = 1000

        beforeEach('add employee and accumulate some salary', async () => {
          const receipt = await payroll.addEmployeeNow(employee, salary, 'John Doe', 'Boss')
          employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')

          await payroll.mockAddTimestamp(ONE_MONTH)
        })

        context('when the employee has already set some token allocations', () => {
          beforeEach('set tokens allocation', async () => {
            await payroll.addAllowedToken(anotherToken.address, { from: owner })
            await payroll.addAllowedToken(denominationToken.address, { from: owner })
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
                assert.equal(currentDenominationTokenBalance.toString(), previousDenominationTokenBalance.plus(80).toString(), 'current denomination token balance does not match')

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
                assert.equal(denominationTokenEvent.token, denominationToken.address, 'denomination token address does not match')
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

            const itHandlesReimbursementsProperly = () => {
              context('when exchange rates are not expired', () => {
                assertTransferredAmounts()
                assertEmployeeIsNotRemoved()
              })

              context('when exchange rates are expired', () => {
                beforeEach('expire exchange rates', async () => {
                  await priceFeed.mockSetTimestamp(NOW - TWO_MONTHS)
                })

                it('reverts', async () => {
                  await assertRevert(payroll.reimburse({ from }), 'PAYROLL_EXCHANGE_RATE_ZERO')
                })
              })
            }

            context('when the employee has some pending salary', () => {
              context('when the employee is not terminated', () => {
                itHandlesReimbursementsProperly()
              })

              context('when the employee is terminated', () => {
                beforeEach('terminate employee', async () => {
                  await payroll.terminateEmployeeNow(employeeId, { from: owner })
                })

                itHandlesReimbursementsProperly()
              })
            })

            context('when the employee does not have pending salary', () => {
              beforeEach('cash out pending salary', async () => {
                await payroll.payday({ from })
              })

              context('when the employee is not terminated', () => {
                itHandlesReimbursementsProperly()
              })

              context('when the employee is terminated', () => {
                beforeEach('terminate employee', async () => {
                  await payroll.terminateEmployeeNow(employeeId, { from: owner })
                })

                context('when exchange rates are not expired', () => {
                  assertTransferredAmounts()

                  it('removes the employee', async () => {
                    await payroll.reimburse({ from })

                    await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')
                  })
                })

                context('when exchange rates are expired', () => {
                  beforeEach('expire exchange rates', async () => {
                    await priceFeed.mockSetTimestamp(NOW - TWO_MONTHS)
                  })

                  it('reverts', async () => {
                    await assertRevert(payroll.reimburse({ from }), 'PAYROLL_EXCHANGE_RATE_ZERO')
                  })
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

    context('when it has not been initialized yet', function () {
      it('reverts', async () => {
        await assertRevert(payroll.reimburse({ from: employee }), 'PAYROLL_EMPLOYEE_DOES_NOT_MATCH')
      })
    })
  })

  describe('partialReimburse', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender is an employee', () => {
        const from = employee
        let employeeId, salary = 1000

        beforeEach('add employee and accumulate some salary', async () => {
          const receipt = await payroll.addEmployeeNow(employee, salary, 'John Doe', 'Boss')
          employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')

          await payroll.mockAddTimestamp(ONE_MONTH)
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

                await payroll.partialReimburse(requestedAmount, { from })

                const currentDenominationTokenBalance = await denominationToken.balanceOf(employee)
                const expectedDenominationTokenBalance = previousDenominationTokenBalance.plus(requestedDenominationTokenAmount);
                assert.equal(currentDenominationTokenBalance.toString(), expectedDenominationTokenBalance.toString(), 'current denomination token balance does not match')

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
                assert.equal(denominationTokenEvent.token, denominationToken.address, 'denomination token address does not match')
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
                  await assertRevert(payroll.partialReimburse(requestedAmount, { from }), 'PAYROLL_EXCHANGE_RATE_ZERO')
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
                  await payroll.payday({ from })
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
                      await payroll.partialReimburse(requestedAmount, { from })

                      await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')
                    })
                  })

                  context('when exchange rates are expired', () => {
                    beforeEach('expire exchange rates', async () => {
                      await priceFeed.mockSetTimestamp(NOW - TWO_MONTHS)
                    })

                    it('reverts', async () => {
                      await assertRevert(payroll.partialReimburse(requestedAmount, { from }), 'PAYROLL_EXCHANGE_RATE_ZERO')
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
                  await payroll.payday({ from })
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
                  await payroll.payday({ from })
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
                      await payroll.partialReimburse(requestedAmount, { from })

                      await assertRevert(payroll.getEmployee(employeeId), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')
                    })
                  })

                  context('when exchange rates are expired', () => {
                    beforeEach('expire exchange rates', async () => {
                      await priceFeed.mockSetTimestamp(NOW - TWO_MONTHS)
                    })

                    it('reverts', async () => {
                      await assertRevert(payroll.partialReimburse(requestedAmount, { from }), 'PAYROLL_EXCHANGE_RATE_ZERO')
                    })
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

    context('when it has not been initialized yet', function () {
      const requestedAmount = 0

      it('reverts', async () => {
        await assertRevert(payroll.partialReimburse(requestedAmount, { from: employee }), 'PAYROLL_EMPLOYEE_DOES_NOT_MATCH')
      })
    })
  })

  describe('gas costs', () => {
    let erc20Token1, erc20Token2

    before('deploy tokens', async () => {
      erc20Token1 = await deployErc20TokenAndDeposit(owner, finance, vault, 'Token 1', 16)
      erc20Token2 = await deployErc20TokenAndDeposit(owner, finance, vault, 'Token 2', 18)
    })

    beforeEach('initialize payroll app', async () => {
      await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      await payroll.mockSetTimestamp(NOW)

      const startDate = NOW - ONE_MONTH
      const salary = annualSalary(100000, DENOMINATION_TOKEN_DECIMALS)
      await payroll.addEmployee(employee, salary, 'John Doe', 'Boss', startDate)
      await payroll.addEmployee(anotherEmployee, salary, 'John Doe Jr.', 'Manager', startDate)
    })

    context('when there are not allowed tokens yet', function () {
      it('expends ~314k gas for a single allowed token', async () => {
        await payroll.addAllowedToken(denominationToken.address)
        await payroll.determineAllocation([denominationToken.address], [100], { from: employee })

        const { receipt: { cumulativeGasUsed } } = await payroll.payday({ from: employee })

        assert.isBelow(cumulativeGasUsed, 317000, 'payout gas cost for a single allowed token should be ~314k')
      })
    })

    context('when there are some allowed tokens', function () {
      beforeEach('allow tokens', async () => {
        await payroll.addAllowedToken(denominationToken.address, { from: owner })
        await payroll.addAllowedToken(erc20Token1.address, { from: owner })
        await payroll.addAllowedToken(erc20Token2.address, { from: owner })
      })

      it('expends ~270k gas per allowed token', async () => {
        await payroll.determineAllocation([denominationToken.address, erc20Token1.address], [60, 40], { from: employee })
        const { receipt: { cumulativeGasUsed: employeePayoutGasUsed } } = await payroll.payday({ from: employee })

        await payroll.determineAllocation([denominationToken.address, erc20Token1.address, erc20Token2.address], [65, 25, 10], { from: anotherEmployee })
        const { receipt: { cumulativeGasUsed: anotherEmployeePayoutGasUsed } } = await payroll.payday({ from: anotherEmployee })

        const gasPerAllowedToken = anotherEmployeePayoutGasUsed - employeePayoutGasUsed
        assert.isBelow(gasPerAllowedToken, 280000, 'payout gas cost increment per allowed token should be ~270k')
      })
    })
  })
})
