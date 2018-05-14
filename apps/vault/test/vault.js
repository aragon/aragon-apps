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
    // TODO(BLOCKED): Waiting for aragonOS#281
    it('forwards funds')
    it('fails when attempting to recover assets out of the vault')
  })
})

