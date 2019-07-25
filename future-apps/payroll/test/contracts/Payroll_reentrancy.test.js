const { bigExp } = require('@aragon/test-helpers/numbers')(web3)
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { annualSalaryPerSecond } = require('../helpers/salary')(web3)
const { NOW, ONE_MONTH, RATE_EXPIRATION_TIME } = require('../helpers/time')
const { deployContracts, createPayrollAndPriceFeed } = require('../helpers/deploy')(artifacts, web3)

const MaliciousERC20 = artifacts.require('MaliciousERC20')
const MaliciousEmployee = artifacts.require('MaliciousEmployee')

contract('Payroll reentrancy guards', ([owner]) => {
  let dao, payroll, payrollBase, finance, vault, priceFeed, maliciousToken, employee

  const REENTRANCY_ACTIONS = { PAYDAY: 0, CHANGE_ADDRESS: 1, SET_ALLOCATION: 2 }

  const increaseTime = async seconds => {
    await payroll.mockIncreaseTime(seconds)
    await priceFeed.mockIncreaseTime(seconds)
  }

  before('deploy base apps', async () => {
    ({ dao, finance, vault, payrollBase } = await deployContracts(owner))
  })

  before('allow malicious employee and token', async () => {
    employee = await MaliciousEmployee.new()

    const amount = bigExp(10000, 18)
    maliciousToken = await MaliciousERC20.new(employee.address, amount, { from: owner })
    await maliciousToken.approve(finance.address, amount, { from: owner })
    await finance.deposit(maliciousToken.address, amount, 'Initial deployment', { from: owner })
  })

  beforeEach('create payroll and price feed instances', async () => {
    ({ payroll, priceFeed } = await createPayrollAndPriceFeed(dao, payrollBase, owner, NOW))
    await payroll.initialize(finance.address, maliciousToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
    await payroll.setAllowedToken(maliciousToken.address, true, { from: owner })
  })

  describe('reentrancy guards', () => {

    beforeEach('add malicious employee, set tokens allocations, and accrue some salary', async () => {
      await employee.setPayroll(payroll.address)
      await payroll.addEmployee(employee.address, annualSalaryPerSecond(100000), await payroll.getTimestampPublic(), 'Malicious Boss', { from: owner })

      await employee.determineAllocation([maliciousToken.address], [100])
      await increaseTime(ONE_MONTH)
    })

    describe('determineAllocation', function () {
      beforeEach('set reentrancy action', async () => {
        await employee.setAction(REENTRANCY_ACTIONS.SET_ALLOCATION)
      })

      it('reverts', async () => {
        await assertRevert(employee.payday(), 'REENTRANCY_REENTRANT_CALL')
      })
    })

    describe('changeAddressByEmployee', function () {
      beforeEach('set reentrancy action', async () => {
        await employee.setAction(REENTRANCY_ACTIONS.CHANGE_ADDRESS)
      })

      it('reverts', async () => {
        await assertRevert(employee.payday(), 'REENTRANCY_REENTRANT_CALL')
      })
    })

    describe('payday', function () {
      beforeEach('set reentrancy action', async () => {
        await employee.setAction(REENTRANCY_ACTIONS.PAYDAY)
      })

      it('reverts', async () => {
        await assertRevert(employee.payday(), 'REENTRANCY_REENTRANT_CALL')
      })
    })
  })
})
