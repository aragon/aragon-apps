const getContract = name => artifacts.require(name)
const getEvent = (receipt, event, arg) => { return receipt.logs.filter(l => l.event == event)[0].args[arg] }

const ETH = '0x0'
const SECONDS_IN_A_YEAR = 31557600 // 365.25 days

module.exports = (owner) => ({
  async deployErc20TokenAndDeposit (sender, finance, vault, name="ERC20Token", decimals=18) {
    const token = await getContract('MiniMeToken').new("0x0", "0x0", 0, name, decimals, 'E20', true) // dummy parameters for minime
    const amount = new web3.BigNumber(10**18).times(new web3.BigNumber(10**decimals))
    await token.generateTokens(sender, amount)
    await token.approve(finance.address, amount, {from: sender})
    await finance.deposit(token.address, amount, "Initial deployment", {from: sender})
    return token
  },

  async addAllowedTokens (payroll, tokens) {
    const currencies = [ETH].concat(tokens.map(c => c.address))
    await Promise.all(currencies.map(token => payroll.addAllowedToken(token)))
  },

  async getTimePassed (payroll, employeeId) {
    const employee = await payroll.getEmployee.call(employeeId)
    const lastPayroll = employee[3]
    const currentTime = await payroll.getTimestampPublic.call()

    return currentTime - lastPayroll
  },

  async redistributeEth (accounts, finance) {
    const amount = 10
    const split = 4
    // transfer ETH to owner
    for (let i = 1; i < split; i++)
      await web3.eth.sendTransaction({ from: accounts[i], to: accounts[0], value: web3.toWei(amount, 'ether') });
    // transfer ETH to Payroll contract
    for (let i = split; i < 10; i++)
      await finance.sendTransaction({ from: accounts[i], value: web3.toWei(amount, 'ether') });

  },

  async getDaoFinanceVault () {
    const kernelBase = await getContract('Kernel').new(true) // petrify immediately
    const aclBase = await getContract('ACL').new()
    const regFact = await getContract('EVMScriptRegistryFactory').new()
    const daoFact = await getContract('DAOFactory').new(kernelBase.address, aclBase.address, regFact.address)
    const vaultBase = await getContract('Vault').new()
    const financeBase = await getContract('Finance').new()

    const ANY_ENTITY = await aclBase.ANY_ENTITY()
    const APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()
    const CREATE_PAYMENTS_ROLE = await financeBase.CREATE_PAYMENTS_ROLE()
    const CHANGE_PERIOD_ROLE = await financeBase.CHANGE_PERIOD_ROLE()
    const CHANGE_BUDGETS_ROLE = await financeBase.CHANGE_BUDGETS_ROLE()
    const EXECUTE_PAYMENTS_ROLE = await financeBase.EXECUTE_PAYMENTS_ROLE()
    const MANAGE_PAYMENTS_ROLE = await financeBase.MANAGE_PAYMENTS_ROLE()
    const TRANSFER_ROLE = await vaultBase.TRANSFER_ROLE()

    const receipt1 = await daoFact.newDAO(owner)
    const dao = getContract('Kernel').at(getEvent(receipt1, 'DeployDAO', 'dao'))
    const acl = getContract('ACL').at(await dao.acl())

    await acl.createPermission(owner, dao.address, APP_MANAGER_ROLE, owner, { from: owner })

    // finance
    const receipt2 = await dao.newAppInstance('0x5678', financeBase.address, '0x', false, { from: owner })
    const finance = getContract('Finance').at(getEvent(receipt2, 'NewAppProxy', 'proxy'))

    await acl.createPermission(ANY_ENTITY, finance.address, CREATE_PAYMENTS_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, finance.address, CHANGE_PERIOD_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, finance.address, CHANGE_BUDGETS_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, finance.address, EXECUTE_PAYMENTS_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, finance.address, MANAGE_PAYMENTS_ROLE, owner, { from: owner })

    const receipt3 = await dao.newAppInstance('0x1234', vaultBase.address, '0x', false, { from: owner })
    vault = getContract('Vault').at(getEvent(receipt3, 'NewAppProxy', 'proxy'))
    await acl.createPermission(finance.address, vault.address, TRANSFER_ROLE, owner, { from: owner })
    await vault.initialize()

    await finance.initialize(vault.address, SECONDS_IN_A_YEAR) // more than one day

    return { dao, finance, vault }
  },

  async initializePayroll(dao, payrollBase, finance, denominationToken, priceFeed, rateExpiryTime) {
    const ALLOWED_TOKENS_MANAGER_ROLE = await payrollBase.ALLOWED_TOKENS_MANAGER_ROLE()
    const ADD_EMPLOYEE_ROLE = await payrollBase.ADD_EMPLOYEE_ROLE()
    const TERMINATE_EMPLOYEE_ROLE = await payrollBase.TERMINATE_EMPLOYEE_ROLE()
    const SET_EMPLOYEE_SALARY_ROLE = await payrollBase.SET_EMPLOYEE_SALARY_ROLE()
    const ADD_ACCRUED_VALUE_ROLE = await payrollBase.ADD_ACCRUED_VALUE_ROLE()
    const CHANGE_PRICE_FEED_ROLE = await payrollBase.CHANGE_PRICE_FEED_ROLE()
    const MODIFY_RATE_EXPIRY_ROLE = await payrollBase.MODIFY_RATE_EXPIRY_ROLE()

    const receipt = await dao.newAppInstance('0x4321', payrollBase.address, '0x', false, { from: owner })
    const payroll = getContract('PayrollMock').at(getEvent(receipt, 'NewAppProxy', 'proxy'))

    const acl = await getContract('ACL').at(await dao.acl())
    const ANY_ENTITY = await acl.ANY_ENTITY()
    await acl.createPermission(ANY_ENTITY, payroll.address, ALLOWED_TOKENS_MANAGER_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, payroll.address, ADD_EMPLOYEE_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, payroll.address, TERMINATE_EMPLOYEE_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, payroll.address, SET_EMPLOYEE_SALARY_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, payroll.address, ADD_ACCRUED_VALUE_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, payroll.address, CHANGE_PRICE_FEED_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, payroll.address, MODIFY_RATE_EXPIRY_ROLE, owner, { from: owner })

    // inits payroll
    await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, rateExpiryTime)

    return payroll
  }
})
