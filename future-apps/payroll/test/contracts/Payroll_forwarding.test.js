const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { encodeCallScript } = require('@aragon/test-helpers/evmScript')
const { getEventArgument } = require('../helpers/events')
const { deployErc20TokenAndDeposit, redistributeEth, deployContracts, createPayrollInstance, mockTimestamps } = require('../helpers/setup.js')(artifacts, web3)

const ExecutionTarget = artifacts.require('ExecutionTarget')

contract('Payroll forwarding,', ([owner, employee, anotherEmployee, anyone]) => {
  let dao, payroll, payrollBase, finance, vault, priceFeed, denominationToken, anotherToken

  const NOW = 1553703809 // random fixed timestamp in seconds
  const ONE_MONTH = 60 * 60 * 24 * 31
  const TWO_MONTHS = ONE_MONTH * 2
  const RATE_EXPIRATION_TIME = TWO_MONTHS

  const DENOMINATION_TOKEN_DECIMALS = 18

  before('setup base apps and tokens', async () => {
    ({ dao, finance, vault, priceFeed, payrollBase } = await deployContracts(owner))
    anotherToken = await deployErc20TokenAndDeposit(owner, finance, vault, 'Another token', 18)
    denominationToken = await deployErc20TokenAndDeposit(owner, finance, vault, 'Denomination Token', DENOMINATION_TOKEN_DECIMALS)
    await redistributeEth(finance)
  })

  beforeEach('setup payroll instance', async () => {
    payroll = await createPayrollInstance(dao, payrollBase, owner)
    await mockTimestamps(payroll, priceFeed, NOW)
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
          const receipt = await payroll.addEmployeeNow(employee, 100000, 'Boss', { from: owner })
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
          const receipt = await payroll.addEmployeeNow(employee, 100000, 'Boss', { from: owner })
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
})
