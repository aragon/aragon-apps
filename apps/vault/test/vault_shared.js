const ERRORS = require('./helpers/errors')
const { hash } = require('eth-ens-namehash')
const { assertRevert, assertBn } = require('@aragon/contract-helpers-test/src/asserts')
const { ZERO_ADDRESS, bn, injectWeb3, injectArtifacts } = require('@aragon/contract-helpers-test')
const { ANY_ENTITY, getInstalledApp, newDao, installNewApp } = require('@aragon/contract-helpers-test/src/aragon-os')

// Allow for sharing this test across other vault implementations and subclasses
module.exports = (vaultName, { accounts, artifacts, web3 }) => {
  injectWeb3(web3)
  injectArtifacts(artifacts)

  // Vault-like instance we're testing
  const VaultLike = artifacts.require(vaultName)

  const ACL = artifacts.require('ACL')
  const KernelProxy = artifacts.require('KernelProxy')
  const KernelDepositableMock = artifacts.require('KernelDepositableMock')

  const TokenMock = artifacts.require('TokenMock')
  const TokenReturnFalseMock = artifacts.require('TokenReturnFalseMock')
  const TokenReturnMissingMock = artifacts.require('TokenReturnMissingMock')
  const DestinationMock = artifacts.require('DestinationMock')

  const ETH = ZERO_ADDRESS
  const root = accounts[0]

  context(`> Shared tests for Vault-like apps`, () => {
    let vaultBase, vault, vaultId, TRANSFER_ROLE

    before('load roles', async () => {
      vaultBase = await VaultLike.new()
      TRANSFER_ROLE = await vaultBase.TRANSFER_ROLE()
    })

    beforeEach('deploy DAO with Vault app', async () => {
      const { dao, acl } = await newDao(root)
      vaultId = hash(`${vaultName.toLowerCase()}.aragonpm.test`)
      vault = await VaultLike.at(await installNewApp(dao, vaultId, vaultBase.address, root))
      await acl.createPermission(ANY_ENTITY, vault.address, TRANSFER_ROLE, root, { from: root })
    })

    it('cannot initialize base app', async () => {
      const newVault = await VaultLike.new()
      assert.isTrue(await newVault.isPetrified())
      await assertRevert(newVault.initialize(), ERRORS.INIT_ALREADY_INITIALIZED)
    })

    context('> Initialized', () => {
      beforeEach(async () => {
        await vault.initialize()
      })

      context('> ETH', () => {
        it('deposits ETH', async () => {
          const value = 1

          await vault.deposit(ETH, value, { value: value })

          const vaultBalance = await web3.eth.getBalance(vault.address)
          assertBn(vaultBalance, value, `vault should hold ${value} wei`)
          assertBn(await vault.balance(ETH), vaultBalance, 'vault should know its balance')
        })

        it('deposits ETH through fallback', async () => {
          await vault.sendTransaction({ value: 1 })
          assertBn(await web3.eth.getBalance(vault.address), 1, 'should hold 1 wei')
        })

        it('fails if depositing a different amount of ETH than sent', async () => {
          const value = 1
          const initialBalance = await web3.eth.getBalance(vault.address)

          await assertRevert(vault.deposit(ETH, value, { value: value * 2 }), ERRORS.VAULT_VALUE_MISMATCH)
          assertBn(await web3.eth.getBalance(vault.address), initialBalance, 'vault should have initial balance')
        })

        it('fails if not depositing any value', async () => {
          const initialBalance = await web3.eth.getBalance(vault.address)

          await assertRevert(vault.deposit(ETH, 0, { value: 0 }), ERRORS.VAULT_DEPOSIT_VALUE_ZERO)
          assertBn(await web3.eth.getBalance(vault.address), initialBalance, 'vault should have initial balance')
        })

        it('fails if depositing through non-registered function', async () => {
          // Send transaction with non-matching function selector
          await assertRevert(vault.sendTransaction({ data: '0xabcd1234', value: 1 }), ERRORS.VAULT_DATA_NON_ZERO)
          assertBn(await web3.eth.getBalance(vault.address), 0, 'vault should have initial balance')
        })

        it('transfers ETH to EOA', async () => {
          const depositValue = 100
          const transferValue = 10

          await vault.sendTransaction({ value: depositValue })
          const testAccount = '0xbeef000000000000000000000000000000000000'
          const initialBalance = await web3.eth.getBalance(testAccount)

          // Transfer
          await vault.transfer(ETH, testAccount, transferValue)

          assertBn(await web3.eth.getBalance(testAccount), bn(initialBalance).add(bn(transferValue)), 'should have sent eth')
          assertBn(await web3.eth.getBalance(vault.address), depositValue - transferValue, 'should have remaining balance')
        })

        it('transfers ETH to contract', async () => {
          const depositValue = 100
          const transferValue = 10

          const destination = await DestinationMock.new(false)
          await vault.sendTransaction( { value: depositValue })
          const initialBalance = await web3.eth.getBalance(destination.address)

          // Transfer
          await vault.transfer(ETH, destination.address, transferValue)

          assertBn(await web3.eth.getBalance(destination.address), bn(initialBalance).add(bn(transferValue)), 'should have sent eth')
          assertBn(await web3.eth.getBalance(vault.address), depositValue - transferValue, 'should have remaining balance')
        })

        it('fails if not transferring any vallue', async () => {
          const ethReceiver = accounts[2]
          const initialBalance = await web3.eth.getBalance(vault.address)

          await assertRevert(vault.transfer(ETH, ethReceiver, 0), ERRORS.VAULT_TRANSFER_VALUE_ZERO)
          assertBn(await web3.eth.getBalance(vault.address), initialBalance, 'vault should have initial balance')
        })

        it('fails transferring ETH if uses more than 2.3k gas', async () => {
          const destination = await DestinationMock.new(true)
          const initialBalance = await web3.eth.getBalance(destination.address)

          const transferValue = 10
          await vault.sendTransaction( { value: transferValue })

          // Transfer
          await assertRevert(vault.transfer(ETH, destination.address, transferValue), ERRORS.VAULT_SEND_REVERTED)
          assertBn(await web3.eth.getBalance(destination.address), initialBalance, 'destination should have initial balance')
        })
      })

      // Tests for different token interfaces
      const tokenTestGroups = [
        {
          title: 'standards compliant, reverting token',
          tokenContract: TokenMock,
        },
        {
          title: 'standards compliant, non-reverting token',
          tokenContract: TokenReturnFalseMock,
        },
        {
          title: 'non-standards compliant, missing return token',
          tokenContract: TokenReturnMissingMock,
        },
      ]
      for (const { title, tokenContract} of tokenTestGroups) {
        context(`> ERC20 (${title})`, () => {
          let token

          beforeEach(async () => {
            token = await tokenContract.new(accounts[0], 10000)
          })

          it('deposits ERC20s', async () => {
            await token.approve(vault.address, 10)

            await vault.deposit(token.address, 5)

            const vaultBalance = await token.balanceOf(vault.address)
            assertBn(vaultBalance, 5, 'token accounting should be correct')
            assertBn(await vault.balance(token.address), vaultBalance, 'vault should know its balance')
          })

          it('transfers tokens', async () => {
            const tokenReceiver = accounts[2]
            await token.transfer(vault.address, 10)

            // Transfer half
            await vault.transfer(token.address, tokenReceiver, 5)

            assert.equal(await token.balanceOf(tokenReceiver), 5, 'receiver should have correct token balance')
          })

          it('fails if not depositing any value', async () => {
            await assertRevert(vault.deposit(token.address, 0), ERRORS.VAULT_DEPOSIT_VALUE_ZERO)
            assert.equal(await vault.balance(token.address), 0, 'vault should have initial token balance')
          })

          it('fails if not transferring any vallue', async () => {
            const tokenReceiver = accounts[2]

            await assertRevert(vault.transfer(token.address, tokenReceiver, 0), ERRORS.VAULT_TRANSFER_VALUE_ZERO)
            assert.equal(await token.balanceOf(tokenReceiver), 0, 'receiver should have no token balance')
          })

          it('fails if not sufficient token balance available', async () => {
            const approvedAmount = 10
            await token.approve(vault.address, approvedAmount)

            await assertRevert(vault.deposit(token.address, approvedAmount * 2), ERRORS.VAULT_TOKEN_TRANSFER_FROM_REVERT)
            assert.equal(await token.balanceOf(vault.address), 0, 'vault should have no token balance')
          })

          it('fails deposits if token transfer not approved', async () => {
            await token.approve(vault.address, 5)

            // Attempt to deposit
            await assertRevert(vault.deposit(token.address, 10), ERRORS.VAULT_TOKEN_TRANSFER_FROM_REVERT)
            assert.equal(await token.balanceOf(vault.address), 0, 'vault should have initial token balance')
          })

          it('fails deposits if token transfer disallowed', async () => {
            await token.approve(vault.address, 10)

            // Disable transfers
            await token.setAllowTransfer(false)

            // Attempt to deposit
            await assertRevert(vault.deposit(token.address, 5), ERRORS.VAULT_TOKEN_TRANSFER_FROM_REVERT)
            assert.equal(await token.balanceOf(vault.address), 0, 'vault should have initial token balance')
          })

          it('fails transfers if token transfer fails', async () => {
            const tokenReceiver = accounts[2]
            await token.transfer(vault.address, 10)

            // Disable transfers
            await token.setAllowTransfer(false)

            // Attempt to transfer
            await assertRevert(vault.transfer(token.address, tokenReceiver, 5), ERRORS.VAULT_TOKEN_TRANSFER_REVERTED)
            assert.equal(await token.balanceOf(tokenReceiver), 0, 'receiver should have initial token balance')
            assert.equal(await token.balanceOf(vault.address), 10, 'vault should have initial token balance')
          })
        })
      }

      context('> Recovering assets', () => {
        let kernelBase, aclBase, kernel, defaultVault, token

        before(async () => {
          kernelBase = await KernelDepositableMock.new(true) // petrify immediately
          aclBase = await ACL.new()
        })

        beforeEach(async () => {
          const kernelProxy = await KernelProxy.new(kernelBase.address)
          kernel = await KernelDepositableMock.at(kernelProxy.address)
          await kernel.initialize(aclBase.address, root)
          await kernel.enableDepositable()
          const acl = await ACL.at(await kernel.acl())
          const APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()
          await acl.createPermission(root, kernel.address, APP_MANAGER_ROLE, root, { from: root })

          // Create a new vault and set that vault as the default vault in the kernel
          const defaultVaultReceipt = await kernel.newAppInstance(vaultId, vaultBase.address, '0x', true)
          defaultVault = await VaultLike.at(getInstalledApp(defaultVaultReceipt, vaultId))
          await defaultVault.initialize()

          await kernel.setRecoveryVaultAppId(vaultId)

          token = await TokenMock.new(accounts[0], 10000)
        })

        // MIGRATION: update to aOS 5.x, `transferToVault` is using `.transfer`, not enough gas being forwarded
        it('set up the default vault correctly to recover ETH from the kernel', async () => {
          await kernel.sendTransaction({ value: 1, gas: 31000 })
          assertBn(await web3.eth.getBalance(kernel.address), 1, 'kernel should have 1 balance')

          await kernel.transferToVault(ETH)
          assertBn(await web3.eth.getBalance(kernel.address), 0, 'kernel should have 0 balance')
          assertBn(await web3.eth.getBalance(defaultVault.address), 1, 'default value should have 1 balance')
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
          assertBn(await web3.eth.getBalance(vault.address), 1, 'vault should have 1 balance')
          await assertRevert(vault.transferToVault(ETH))
        })

        it('fails when attempting to recover tokens out of the vault', async () => {
          await token.transfer(vault.address, 10)
          assert.equal((await token.balanceOf(vault.address)), 10, 'vault should have 10 balance')
          await assertRevert(vault.transferToVault(token.address))
        })
      })
    })

    context('> Uninitialized', () => {
      it('can be initialized', async () => {
        await vault.initialize()
        assert.isTrue(await vault.hasInitialized())
      })

      context('> ETH', () => {
        it('fails to receive ETH deposits through fallback', async () => {
          await assertRevert(vault.sendTransaction( { value: 10 }), ERRORS.INIT_NOT_INITIALIZED)
          assertBn(await web3.eth.getBalance(vault.address), '0', 'vault should have initial balance')
        })

        it('fails to receive ETH deposits', async () => {
          await assertRevert(vault.deposit(ETH, 10, { value: 10 }), ERRORS.INIT_NOT_INITIALIZED)
          assertBn(await web3.eth.getBalance(vault.address), '0', 'vault should have initial balance')
        })

        it('fails to transfer ETH', async () => {
          const ethReceiver = accounts[1]
          const initialBalance = (await web3.eth.getBalance(ethReceiver)).toString()

          await assertRevert(vault.transfer(ETH, ethReceiver, 10), ERRORS.APP_AUTH_FAILED)
          assertBn(await web3.eth.getBalance(ethReceiver), initialBalance, 'receiver should have initial balance')
        })
      })

      context('> ERC20', () => {
        let token

        beforeEach(async () => {
          token = await TokenMock.new(accounts[0], 10000)
        })

        it('fails to receive token deposits', async () => {
          await token.approve(vault.address, 10)

          await assertRevert(vault.deposit(token.address, 5), ERRORS.INIT_NOT_INITIALIZED)
          assert.equal(await token.balanceOf(vault.address), 0, 'vault should have initial balance')
        })

        it('fails to transfer tokens', async () => {
          const tokenReceiver = accounts[1]

          await assertRevert(vault.transfer(token.address, tokenReceiver, 10), ERRORS.APP_AUTH_FAILED)
          assert.equal(await token.balanceOf(tokenReceiver), 0, 'receiver should have initial balance')
        })
      })
    })
  })
}
