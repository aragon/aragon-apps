const { assertRevert, assertInvalidOpcode } = require('@aragon/test-helpers/assertThrow')
const getBalance = require('@aragon/test-helpers/balance')(web3)

const Vault = artifacts.require('Vault')

const getContract = name => artifacts.require(name)

const NULL_ADDRESS = '0x00'

contract('Vault app', (accounts) => {
  let token

  const ETH = '0x0'

  before(async () => {
    token = await getContract('SimpleERC20').new()
  })

  context('Deposits and transfers', async() => {
    let vaultBase, vault

    beforeEach(async () => {
      vaultBase = await Vault.new()
      vault = IVaultConnector.at(vaultBase.address)
      await vaultBase.initializeWithBase(vaultBase.address)
    })

    it('deposits ETH', async() => {
      await vault.deposit(ETH, accounts[0], 1, [0], { value: 1 })
      assert.equal((await getBalance(vault.address)).toString(), 1, "should hold 1 wei")
      assert.equal((await vault.balance(ETH)).toString(), 1, "should return 1 wei balance")
    })

    it('deposits ETH trhough callback', async() => {
      await vault.sendTransaction( { value: 1 })
      assert.equal((await getBalance(vault.address)).toString(), 1, "should hold 1 wei")
    })
  })
})
