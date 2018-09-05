const { assertRevert, assertInvalidOpcode } = require('@aragon/test-helpers/assertThrow')
const { hash } = require('eth-ens-namehash')
const getBalance = require('@aragon/test-helpers/balance')(web3)
const getEvent = (receipt, event, arg) => { return receipt.logs.filter(l => l.event == event)[0].args[arg] }

const ACL = artifacts.require('ACL')
const AppProxyUpgradeable = artifacts.require('AppProxyUpgradeable')
const DAOFactory = artifacts.require('DAOFactory')
const Kernel = artifacts.require('Kernel')
const KernelProxy = artifacts.require('KernelProxy')

const Vault = artifacts.require('Vault')

const SimpleERC20 = artifacts.require('tokens/SimpleERC20')

const getContract = name => artifacts.require(name)

const NULL_ADDRESS = '0x00'

contract('Vault app', (accounts) => {
  let daoFact, vaultBase, vault

  let ETH, ANY_ENTITY, APP_MANAGER_ROLE, TRANSFER_ROLE

  const root = accounts[0]
  const NO_DATA = '0x'

  before(async () => {
    const kernelBase = await getContract('Kernel').new(true) // petrify immediately
    const aclBase = await getContract('ACL').new()
    const regFact = await getContract('EVMScriptRegistryFactory').new()
    daoFact = await getContract('DAOFactory').new(kernelBase.address, aclBase.address, regFact.address)
    vaultBase = await getContract('Vault').new()

    // Setup constants
    ETH = await vaultBase.ETH()
    ANY_ENTITY = await aclBase.ANY_ENTITY()
    APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()
    TRANSFER_ROLE = await vaultBase.TRANSFER_ROLE()
  })

  beforeEach(async () => {
    const r = await daoFact.newDAO(root)
    const dao = getContract('Kernel').at(r.logs.filter(l => l.event == 'DeployDAO')[0].args.dao)
    const acl = getContract('ACL').at(await dao.acl())

    await acl.createPermission(root, dao.address, APP_MANAGER_ROLE, root, { from: root })

    // vault
    const receipt = await dao.newAppInstance('0x1234', vaultBase.address, { from: root })
    vault = getContract('Vault').at(receipt.logs.filter(l => l.event == 'NewAppProxy')[0].args.proxy)

    await acl.createPermission(ANY_ENTITY, vault.address, TRANSFER_ROLE, root, { from: root })

    await vault.initialize()
  })

  context('ETH:', async () => {
    it('cannot initialize base app', async () => {
      const newVault = await Vault.new()
      assert.isTrue(await newVault.isPetrified())
      return assertRevert(async () => {
        await newVault.initialize()
      })
    })

    it('deposits ETH', async () => {
      const value = 1

      // Deposit without data param
      await vault.deposit(ETH, accounts[0], value, { value })
      assert.equal((await getBalance(vault.address)).toString(), value, `should hold ${value} wei`)
      assert.equal((await vault.balance(ETH)).toString(), value, `should return ${value} wei balance`)

      // Deposit with data param
      /* Waiting for truffle to get overloading...
      await vault.deposit(ETH, accounts[0], value, [0], { value })
      assert.equal((await getBalance(vault.address)).toString(), value * 2, `should hold ${value * 2} wei`)
      assert.equal((await vault.balance(ETH)).toString(), value * 2, `should return ${value * 2} wei balance`)
      */
    })

    it('deposits ETH through callback', async () => {
      await vault.sendTransaction( { value: 1 })
      assert.equal((await getBalance(vault.address)).toString(), 1, "should hold 1 wei")
    })

    it('transfers ETH', async () => {
      const depositValue = 100
      const transferValue = 10

      await vault.sendTransaction( { value: depositValue })
      const testAccount = '0xbeef000000000000000000000000000000000000'
      const initialBalance = await getBalance(testAccount)

      // Transfer with data param
      await vault.transfer(ETH, testAccount, transferValue, NO_DATA)

      assert.equal((await getBalance(testAccount)).toString(), initialBalance.add(transferValue).toString(), "should have sent eth")
      assert.equal((await getBalance(vault.address)).toString(), depositValue - transferValue, "should have remaining balance")

      // Transfer without data param
      /* Waiting for truffle to get overloading...
      await vault.transfer(ETH, testAccount, transferValue)

      assert.equal((await getBalance(testAccount)).toString(), initialBalance.add(transferValue * 2).toString(), "should have sent eth")
      assert.equal((await getBalance(vault.address)).toString(), depositValue - transferValue * 2, "should have remaining balance")
      */
    })

    it('fails if depositing a different amount of ETH than sent', async () => {
      const value = 1

      return assertRevert(async () => {
        await vault.deposit(ETH, accounts[0], value, { value: value * 2 })
      })
    })
  })

  context('ERC20:', async () => {
    let token

    beforeEach(async () => {
      token = await SimpleERC20.new()
    })

    it('deposits ERC20s', async () => {
      await token.approve(vault.address, 10)

      // Deposit half without data param
      await vault.deposit(token.address, accounts[0], 5)

      assert.equal(await token.balanceOf(vault.address), 5, "token accounting should be correct")
      assert.equal(await vault.balance(token.address), 5, "vault should know its balance")

      // Deposit half with data param
      /* Waiting for truffle to get overloading...
      await vault.deposit(token.address, accounts[0], 5, '')

      assert.equal(await token.balanceOf(vault.address), 10, "token accounting should be correct")
      assert.equal(await vault.balance(token.address), 10, "vault should know its balance")
      */
    })

    it('transfers tokens', async () => {
      const tokenReceiver = accounts[2]
      await token.transfer(vault.address, 10)

      // Transfer half with data param
      await vault.transfer(token.address, tokenReceiver, 5, '')

      assert.equal(await token.balanceOf(tokenReceiver), 5, "receiver should have correct token balance")

      // Transfer half without data param
      /* Waiting for truffle to get overloading...
      await vault.transfer(token.address, tokenReceiver, 5)

      assert.equal(await token.balanceOf(tokenReceiver), 10, "receiver should have correct token balance")
      */
    })

    it('fails if not sufficient token balance available', async () => {
      const approvedAmount = 10
      await token.approve(vault.address, approvedAmount)

      return assertRevert(async () => {
          await vault.deposit(token.address, accounts[0], approvedAmount * 2)
      })
    })
  })

  context('using Vault behind proxy', async () => {
    let kernel, token, vault, vaultBase, vaultId

    beforeEach(async () => {
      const permissionsRoot = accounts[0]
      token = await SimpleERC20.new()

      const kernelBase = await getContract('Kernel').new(true) // petrify immediately
      const aclBase = await getContract('ACL').new()
      const factory = await DAOFactory.new(kernelBase.address, aclBase.address, NULL_ADDRESS)

      const receipt = await factory.newDAO(permissionsRoot)
      const kernelAddress = getEvent(receipt, 'DeployDAO', 'dao')

      kernel = Kernel.at(kernelAddress)
      const acl = ACL.at(await kernel.acl())

      const r = await kernel.APP_MANAGER_ROLE()
      await acl.createPermission(permissionsRoot, kernel.address, r, permissionsRoot)

      // Install the vault app to the kernel
      vaultBase = await Vault.new()

      vaultId = hash('vault.aragonpm.test')
      const APP_BASE_NAMESPACE = await kernelBase.APP_BASES_NAMESPACE()

      const vaultReceipt = await kernel.newAppInstance(vaultId, vaultBase.address)
      const vaultProxyAddress = getEvent(vaultReceipt, 'NewAppProxy', 'proxy')
      vault = Vault.at(vaultProxyAddress)
    })

    context('disallows recovering assets', async () => {
      let defaultVault

      beforeEach(async () => {
        const APP_ADDR_NAMESPACE = await kernel.APP_ADDR_NAMESPACE()
        const ETH = await kernel.ETH()

        // Create a new vault
        const defaultVaultReceipt = await kernel.newAppInstance(vaultId, vaultBase.address)
        const defaultVaultAddress = getEvent(defaultVaultReceipt, 'NewAppProxy', 'proxy')
        defaultVault = Vault.at(defaultVaultAddress)

        // Set that vault as the default vault in the kernel
        await kernel.setApp(APP_ADDR_NAMESPACE, vaultId, defaultVault.address)
        await kernel.setRecoveryVaultAppId(vaultId)
      })

      it('set up the default vault correctly to recover ETH from the kernel', async () => {
        await kernel.sendTransaction({ value: 1, gas: 31000 })
        assert.equal((await getBalance(kernel.address)).valueOf(), 1, 'kernel should have 1 balance')

        await kernel.transferToVault(ETH)
        assert.equal((await getBalance(kernel.address)).valueOf(), 0, 'kernel should have 0 balance')
        assert.equal((await getBalance(defaultVault.address)).valueOf(), 1, 'default value should have 1 balance')
      })

      it('set up the default vault correctly to recover tokens from the kernel', async () => {
        await token.transfer(kernel.address, 10)
        assert.equal((await token.balanceOf(kernel.address)), 10, 'kernel should have 10 balance')

        await kernel.transferToVault(token.address)
        assert.equal((await token.balanceOf(kernel.address)), 0, 'kernel should have 0 balance')
        assert.equal((await token.balanceOf(defaultVault.address)), 10, 'default value should have 10 balance')
      })

      it('fails when attempting to recover ETH out of the vault', async () => {
        await vault.sendTransaction({ value: 1, gas: 31000 })
        assert.equal((await getBalance(vault.address)).valueOf(), 1, 'vault should have 1 balance')
        await assertRevert(() => vault.transferToVault(ETH))
      })

      it('fails when attempting to recover tokens out of the vault', async () => {
        await token.transfer(vault.address, 10)
        assert.equal((await token.balanceOf(vault.address)), 10, 'vault should have 10 balance')
        await assertRevert(() => vault.transferToVault(ETH))
      })
    })
  })
})
