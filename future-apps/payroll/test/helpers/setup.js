module.exports = (artifacts, web3) => {
  const { bigExp } = require('./numbers')(web3)
  const { getEventArgument } = require('./events')
  const getContract = name => artifacts.require(name)

  const ACL = getContract('ACL')
  const Vault = getContract('Vault')
  const Kernel = getContract('Kernel')
  const Finance = getContract('Finance')
  const Payroll = getContract('PayrollMock')
  const PriceFeed = getContract('PriceFeedMock')
  const DAOFactory = getContract('DAOFactory')
  const EVMScriptRegistryFactory = getContract('EVMScriptRegistryFactory')

  async function deployErc20TokenAndDeposit(sender, finance, vault, name = 'ERC20Token', decimals = 18) {
    const token = await getContract('MiniMeToken').new('0x0', '0x0', 0, name, decimals, 'E20', true) // dummy parameters for minime
    const amount = bigExp(1e18, decimals)
    await token.generateTokens(sender, amount)
    await token.approve(finance.address, amount, { from: sender })
    await finance.deposit(token.address, amount, 'Initial deployment', { from: sender })
    return token
  }

  async function redistributeEth(finance) {
    const split = 4
    const amount = 10
    const accounts = web3.eth.accounts

    // transfer ETH to owner
    for (let i = 1; i < split; i++)
      await web3.eth.sendTransaction({ from: accounts[i], to: accounts[0], value: web3.toWei(amount, 'ether') })

    // transfer ETH to payroll contract
    for (let i = split; i < 10; i++)
      await finance.sendTransaction({ from: accounts[i], value: web3.toWei(amount, 'ether') })
  }

  async function deployContracts(owner) {
    const kernelBase = await Kernel.new(true) // petrify immediately
    const aclBase = await ACL.new()
    const regFact = await EVMScriptRegistryFactory.new()
    const daoFact = await DAOFactory.new(kernelBase.address, aclBase.address, regFact.address)
    const vaultBase = await Vault.new()
    const financeBase = await Finance.new()

    const ANY_ENTITY = await aclBase.ANY_ENTITY()
    const APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()
    const CREATE_PAYMENTS_ROLE = await financeBase.CREATE_PAYMENTS_ROLE()
    const CHANGE_PERIOD_ROLE = await financeBase.CHANGE_PERIOD_ROLE()
    const CHANGE_BUDGETS_ROLE = await financeBase.CHANGE_BUDGETS_ROLE()
    const EXECUTE_PAYMENTS_ROLE = await financeBase.EXECUTE_PAYMENTS_ROLE()
    const MANAGE_PAYMENTS_ROLE = await financeBase.MANAGE_PAYMENTS_ROLE()
    const TRANSFER_ROLE = await vaultBase.TRANSFER_ROLE()

    const kernelReceipt = await daoFact.newDAO(owner)
    const dao = Kernel.at(getEventArgument(kernelReceipt, 'DeployDAO', 'dao'))
    const acl = ACL.at(await dao.acl())

    await acl.createPermission(owner, dao.address, APP_MANAGER_ROLE, owner, { from: owner })

    // finance
    const financeReceipt = await dao.newAppInstance('0x5678', financeBase.address, '0x', false, { from: owner })
    const finance = Finance.at(getEventArgument(financeReceipt, 'NewAppProxy', 'proxy'))

    await acl.createPermission(ANY_ENTITY, finance.address, CREATE_PAYMENTS_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, finance.address, CHANGE_PERIOD_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, finance.address, CHANGE_BUDGETS_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, finance.address, EXECUTE_PAYMENTS_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, finance.address, MANAGE_PAYMENTS_ROLE, owner, { from: owner })

    const vaultReceipt = await dao.newAppInstance('0x1234', vaultBase.address, '0x', false, { from: owner })
    const vault = Vault.at(getEventArgument(vaultReceipt, 'NewAppProxy', 'proxy'))
    await acl.createPermission(finance.address, vault.address, TRANSFER_ROLE, owner, { from: owner })
    await vault.initialize()

    const SECONDS_IN_A_YEAR = 31557600 // 365.25 days
    await finance.initialize(vault.address, SECONDS_IN_A_YEAR) // more than one day

    const priceFeed = await PriceFeed.new()
    const payrollBase = await Payroll.new()

    return { dao, finance, vault, priceFeed, payrollBase }
  }

  async function createPayrollInstance(dao, payrollBase, owner) {
    const receipt = await dao.newAppInstance('0x4321', payrollBase.address, '0x', false, { from: owner })
    const payroll = Payroll.at(getEventArgument(receipt, 'NewAppProxy', 'proxy'))

    const acl = ACL.at(await dao.acl())

    const ADD_EMPLOYEE_ROLE = await payroll.ADD_EMPLOYEE_ROLE()
    const ADD_ACCRUED_VALUE_ROLE = await payroll.ADD_ACCRUED_VALUE_ROLE()
    const CHANGE_PRICE_FEED_ROLE = await payroll.CHANGE_PRICE_FEED_ROLE()
    const MODIFY_RATE_EXPIRY_ROLE = await payroll.MODIFY_RATE_EXPIRY_ROLE()
    const TERMINATE_EMPLOYEE_ROLE = await payroll.TERMINATE_EMPLOYEE_ROLE()
    const SET_EMPLOYEE_SALARY_ROLE = await payroll.SET_EMPLOYEE_SALARY_ROLE()
    const ALLOWED_TOKENS_MANAGER_ROLE = await payroll.ALLOWED_TOKENS_MANAGER_ROLE()

    await acl.createPermission(owner, payroll.address, ADD_EMPLOYEE_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, ADD_ACCRUED_VALUE_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, CHANGE_PRICE_FEED_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, MODIFY_RATE_EXPIRY_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, TERMINATE_EMPLOYEE_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, SET_EMPLOYEE_SALARY_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, ALLOWED_TOKENS_MANAGER_ROLE, owner, { from: owner })

    return payroll
  }

  async function mockTimestamps(payroll, priceFeed, now) {
    await priceFeed.mockSetTimestamp(now)
    await payroll.mockSetTimestamp(now)
  }

  return {
    deployContracts,
    redistributeEth,
    deployErc20TokenAndDeposit,
    createPayrollInstance,
    mockTimestamps
  }
}
