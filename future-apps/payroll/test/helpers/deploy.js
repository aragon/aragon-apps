module.exports = (artifacts, web3) => {
  const { bigExp } = require('@aragon/test-helpers/numbers')(web3)
  const { SECONDS_IN_A_YEAR } = require('./time')
  const { getEventArgument, getNewProxyAddress } = require('@aragon/test-helpers/events')

  const getContract = name => artifacts.require(name)

  const ACL = getContract('ACL')
  const Vault = getContract('Vault')
  const Kernel = getContract('Kernel')
  const Finance = getContract('Finance')
  const Payroll = getContract('PayrollMock')
  const PriceFeed = getContract('PriceFeedMock')
  const DAOFactory = getContract('DAOFactory')
  const EVMScriptRegistryFactory = getContract('EVMScriptRegistryFactory')

  async function deployErc20TokenAndDeposit(sender, finance, name = 'ERC20Token', decimals = 18) {
    const token = await getContract('MiniMeToken').new('0x0', '0x0', 0, name, decimals, 'E20', true) // dummy parameters for minime
    const amount = bigExp(1e18, decimals)
    await token.generateTokens(sender, amount)
    await token.approve(finance.address, amount, { from: sender })
    await finance.deposit(token.address, amount, 'Initial deployment', { from: sender })
    return token
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
    const finance = Finance.at(getNewProxyAddress(financeReceipt))

    await acl.createPermission(ANY_ENTITY, finance.address, CREATE_PAYMENTS_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, finance.address, CHANGE_PERIOD_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, finance.address, CHANGE_BUDGETS_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, finance.address, EXECUTE_PAYMENTS_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, finance.address, MANAGE_PAYMENTS_ROLE, owner, { from: owner })

    const vaultReceipt = await dao.newAppInstance('0x1234', vaultBase.address, '0x', false, { from: owner })
    const vault = Vault.at(getNewProxyAddress(vaultReceipt))
    await acl.createPermission(finance.address, vault.address, TRANSFER_ROLE, owner, { from: owner })
    await vault.initialize()

    await finance.initialize(vault.address, SECONDS_IN_A_YEAR) // more than one day

    const payrollBase = await Payroll.new()

    return { dao, finance, vault, payrollBase }
  }

  async function createPayrollAndPriceFeed(dao, payrollBase, owner, currentTimestamp) {
    const receipt = await dao.newAppInstance('0x4321', payrollBase.address, '0x', false, { from: owner })
    const payroll = Payroll.at(getNewProxyAddress(receipt))

    const acl = ACL.at(await dao.acl())

    const ADD_BONUS_ROLE = await payroll.ADD_BONUS_ROLE()
    const ADD_EMPLOYEE_ROLE = await payroll.ADD_EMPLOYEE_ROLE()
    const ADD_REIMBURSEMENT_ROLE = await payroll.ADD_REIMBURSEMENT_ROLE()
    const MODIFY_PRICE_FEED_ROLE = await payroll.MODIFY_PRICE_FEED_ROLE()
    const MODIFY_RATE_EXPIRY_ROLE = await payroll.MODIFY_RATE_EXPIRY_ROLE()
    const TERMINATE_EMPLOYEE_ROLE = await payroll.TERMINATE_EMPLOYEE_ROLE()
    const SET_EMPLOYEE_SALARY_ROLE = await payroll.SET_EMPLOYEE_SALARY_ROLE()
    const MANAGE_ALLOWED_TOKENS_ROLE = await payroll.MANAGE_ALLOWED_TOKENS_ROLE()

    await acl.createPermission(owner, payroll.address, ADD_BONUS_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, ADD_EMPLOYEE_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, ADD_REIMBURSEMENT_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, MODIFY_PRICE_FEED_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, MODIFY_RATE_EXPIRY_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, TERMINATE_EMPLOYEE_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, SET_EMPLOYEE_SALARY_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, MANAGE_ALLOWED_TOKENS_ROLE, owner, { from: owner })

    const priceFeed = await PriceFeed.new()
    await priceFeed.mockSetTimestamp(currentTimestamp)
    await payroll.mockSetTimestamp(currentTimestamp)

    return { payroll, priceFeed }
  }

  return {
    deployContracts,
    deployErc20TokenAndDeposit,
    createPayrollAndPriceFeed
  }
}
