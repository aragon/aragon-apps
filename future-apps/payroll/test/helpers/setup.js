module.exports = (artifacts, web3) => {
  const { bigExp } = require('./numbers')(web3)
  const { getEventArgument } = require('./events')
  const getContract = name => artifacts.require(name)

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

  async function getDaoFinanceVault(owner) {
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
    const dao = getContract('Kernel').at(getEventArgument(receipt1, 'DeployDAO', 'dao'))
    const acl = getContract('ACL').at(await dao.acl())

    await acl.createPermission(owner, dao.address, APP_MANAGER_ROLE, owner, { from: owner })

    // finance
    const receipt2 = await dao.newAppInstance('0x5678', financeBase.address, '0x', false, { from: owner })
    const finance = getContract('Finance').at(getEventArgument(receipt2, 'NewAppProxy', 'proxy'))

    await acl.createPermission(ANY_ENTITY, finance.address, CREATE_PAYMENTS_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, finance.address, CHANGE_PERIOD_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, finance.address, CHANGE_BUDGETS_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, finance.address, EXECUTE_PAYMENTS_ROLE, owner, { from: owner })
    await acl.createPermission(ANY_ENTITY, finance.address, MANAGE_PAYMENTS_ROLE, owner, { from: owner })

    const receipt3 = await dao.newAppInstance('0x1234', vaultBase.address, '0x', false, { from: owner })
    const vault = getContract('Vault').at(getEventArgument(receipt3, 'NewAppProxy', 'proxy'))
    await acl.createPermission(finance.address, vault.address, TRANSFER_ROLE, owner, { from: owner })
    await vault.initialize()

    const SECONDS_IN_A_YEAR = 31557600 // 365.25 days
    await finance.initialize(vault.address, SECONDS_IN_A_YEAR) // more than one day

    return { dao, finance, vault }
  }

  return {
    getDaoFinanceVault,
    redistributeEth,
    deployErc20TokenAndDeposit,
  }
}
