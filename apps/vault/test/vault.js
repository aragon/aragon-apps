const { assertRevert, assertInvalidOpcode } = require('@aragon/test-helpers/assertThrow')
const getBalance = require('@aragon/test-helpers/balance')(web3)

const Vault = artifacts.require('Vault')

const SimpleERC20 = artifacts.require('tokens/SimpleERC20')

const getContract = name => artifacts.require(name)

const NULL_ADDRESS = '0x00'

contract('Vault app', (accounts) => {
  let token, token777

  const ETH = '0x0'
  const NO_DATA = '0x'

  let vault

  beforeEach(async () => {
    vault = await Vault.new()
  })

  context('ETH:', async () => {
    it('deposits ETH', async () => {
      await vault.deposit(ETH, accounts[0], 1, [0], { value: 1 })
      assert.equal((await getBalance(vault.address)).toString(), 1, "should hold 1 wei")
      assert.equal((await vault.balance(ETH)).toString(), 1, "should return 1 wei balance")
    })

    it('deposits ETH through callback', async () => {
      await vault.sendTransaction( { value: 1 })
      assert.equal((await getBalance(vault.address)).toString(), 1, "should hold 1 wei")
    })

    it('transfers ETH', async () => {
      await vault.sendTransaction( { value: 100 }) 
      const testAccount = '0xbeef000000000000000000000000000000000000'
      const initialBalance = await getBalance(testAccount)

      await vault.transfer(ETH, testAccount, 10, NO_DATA)

      assert.equal((await getBalance(testAccount)).toString(), initialBalance.add(10).toString(), "should have sent eth")
      assert.equal((await getBalance(vault.address)).toString(), 90, "should have remaining balance")
    })

    it('fails if depositing a different amount of ETH than sent', async () => {
      return assertRevert(async () => {
        await vault.deposit(ETH, accounts[0], 1, [0], { value: 2 })
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
      await vault.deposit(token.address, accounts[0], 5, '')

      assert.equal(await token.balanceOf(vault.address), 5, "token accounting should be correct")
      assert.equal(await vault.balance(token.address), 5, "vault should know its balance")
    })

    it('transfers tokens', async () => {
      const tokenReceiver = accounts[2]
      await token.transfer(vault.address, 10)
      await vault.transfer(token.address, tokenReceiver, 5, '')

      assert.equal(await token.balanceOf(tokenReceiver), 5, "receiver should have correct token balance")
    })

    it('fails if not sufficient token balance available', async () => {
      await token.approve(vault.address, 10)

      return assertRevert(async () => {
          await vault.deposit(token.address, accounts[0], 15, '')
      })
    })
  })

  context('using Vault behind proxy', async () => {
    // TODO(BLOCKED): Waiting for aragonOS#281
    it('forwards funds')
    it('fails when attempting to recover assets out of the vault')
  })
})

