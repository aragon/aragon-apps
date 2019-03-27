const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { encodeCallScript } = require('@aragon/test-helpers/evmScript')

const ACL = artifacts.require('ACL')
const Payroll = artifacts.require('PayrollMock')
const PriceFeed = artifacts.require('PriceFeedMock')
const ExecutionTarget = artifacts.require('ExecutionTarget')

const getEvent = (receipt, event) => receipt.logs.find(l => l.event === event).args
const getEventArgument = (receipt, event, arg) => getEvent(receipt, event)[arg]

contract('PayrollForward', function(accounts) {
  const [owner, employee, anyone] = accounts
  const { deployErc20TokenAndDeposit, redistributeEth, getDaoFinanceVault } = require('./helpers.js')(owner)

  const USD_DECIMALS= 18
  const RATE_EXPIRATION_TIME = 1000

  let dao, acl, payroll, payrollBase, finance, vault, priceFeed, usdToken

  before('setup base apps and tokens', async () => {
    const daoFinanceVault = await getDaoFinanceVault()
    dao = daoFinanceVault.dao
    finance = daoFinanceVault.finance
    vault = daoFinanceVault.vault
    acl = ACL.at(await dao.acl())

    priceFeed = await PriceFeed.new()
    payrollBase = await Payroll.new()
    usdToken = await deployErc20TokenAndDeposit(owner, finance, vault, 'USD', USD_DECIMALS)

    await redistributeEth(accounts, finance)
  })
  
  beforeEach('initialize payroll instance and add employee', async () => {
    const receipt = await dao.newAppInstance('0x4321', payrollBase.address, '0x', false, { from: owner })
    payroll = Payroll.at(getEventArgument(receipt, 'NewAppProxy', 'proxy'))
    await payroll.initialize(finance.address, usdToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
  })
  
  beforeEach('add employee', async () => {
    const ADD_EMPLOYEE_ROLE = await payrollBase.ADD_EMPLOYEE_ROLE()
    await acl.createPermission(owner, payroll.address, ADD_EMPLOYEE_ROLE, owner, { from: owner })
    await payroll.addEmployeeNow(employee, 100000, 'John', 'Boss', { from: owner })
  })

  it('is a forwarder', async () => {
    assert(await payroll.isForwarder(), 'should be a forwarder')
  })

  describe('canForward', () => {
    context('when the sender is an employee', () => {
      const sender = employee

      it('returns true', async () =>  {
        assert(await payroll.canForward(sender, '0x'), 'sender should be able to forward')
      })
    })

    context('when the sender is an employee', () => {
      const sender = anyone

      it('returns false', async () =>  {
        assert.isFalse(await payroll.canForward(sender, '0x'), 'sender should not be able to forward')
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

    context('when the sender is an employee', () => {
      const from = employee

      it('executes the given script', async () =>  {
        await payroll.forward(script, { from })

        assert.equal(await executionTarget.counter(), 1, 'should have received execution calls')
      })
    })

    context('when the sender is an employee', () => {
      const from = anyone

      it('reverts', async () =>  {
        await assertRevert(payroll.forward(script, { from }), 'PAYROLL_NO_FORWARD')

        assert.equal(await executionTarget.counter(), 0, 'should not have received execution calls')
      })
    })
  })
})
