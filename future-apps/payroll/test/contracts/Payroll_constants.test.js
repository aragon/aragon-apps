const Payroll = artifacts.require('Payroll')

contract('Payroll roles', () => {
  let payroll

  beforeEach('create new payroll instance', async () => {
    payroll = await Payroll.new()
  })

  describe('roles', () => {
    it('should implement role constants successfully', async () => {
      assert.equal(await payroll.ADD_EMPLOYEE_ROLE(), web3.sha3('ADD_EMPLOYEE_ROLE'), 'add employee role does not match')
      assert.equal(await payroll.TERMINATE_EMPLOYEE_ROLE(), web3.sha3('TERMINATE_EMPLOYEE_ROLE'), 'terminate employee role does not match')
      assert.equal(await payroll.SET_EMPLOYEE_SALARY_ROLE(), web3.sha3('SET_EMPLOYEE_SALARY_ROLE'), 'set employee salary does not match')
      assert.equal(await payroll.ADD_BONUS_ROLE(), web3.sha3('ADD_BONUS_ROLE'), 'add bonus role does not match')
      assert.equal(await payroll.ADD_REIMBURSEMENT_ROLE(), web3.sha3('ADD_REIMBURSEMENT_ROLE'), 'add reimbursement role does not match')
      assert.equal(await payroll.MODIFY_ALLOWED_TOKENS_ROLE(), web3.sha3('MODIFY_ALLOWED_TOKENS_ROLE'), 'modify allowed tokens role does not match')
      assert.equal(await payroll.MODIFY_PRICE_FEED_ROLE(), web3.sha3('MODIFY_PRICE_FEED_ROLE'), 'modify price feed does not match')
      assert.equal(await payroll.MODIFY_RATE_EXPIRY_ROLE(), web3.sha3('MODIFY_RATE_EXPIRY_ROLE'), 'modify rate expiry role does not match')
    })
  })
})
