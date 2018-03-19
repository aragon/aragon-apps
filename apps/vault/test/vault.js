const { assertRevert, assertInvalidOpcode } = require('@aragon/test-helpers/assertThrow')
const getBalance = require('@aragon/test-helpers/balance')(web3)

const Vault = artifacts.require('Vault')
const IVaultConnector = artifacts.require('IVaultConnector')

const getContract = name => artifacts.require(name)

const NULL_ADDRESS = '0x00'

contract('Vault app', (accounts) => {
  let token, token777

  const ETH = '0x0'
  const ERC165 = 165
  const ERC777 = 777
  const NO_DETECTION = 2**32 - 1

  before(async () => {
    token = await getContract('SimpleERC20').new()
    token777 = await getContract('SimpleERC777').new()
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

  context('Standards', async() => {
    let vaultBase, vault, erc20Connector, erc777Connector

    before(async() => {
      vaultBase = await Vault.new()
      vault = await IVaultConnector.at(vaultBase.address)
      await vaultBase.initializeWithBase(vaultBase.address)

      erc20Connector = await getContract('ERC20Connector').new()
      erc777Connector = await getContract('ERC777Connector').new()
      await vaultBase.registerStandard(ERC777, ERC165, ["0x01", "0x02", "0x03", "0x04"], erc777Connector.address)
    })

    it('fails trying to register standard again (ERC20)', async() => {
      return assertRevert(async() => {
        await vaultBase.registerStandard(20, ERC165, ["0x01", "0x02", "0x03", "0x04"], erc20Connector.address)
      })
    })

    it('fails trying to register standard again (ERC777)', async() => {
      return assertRevert(async() => {
        await vaultBase.registerStandard(ERC777, ERC165, ["0x01", "0x02", "0x03", "0x04"], erc777Connector.address)
      })
    })

    it('fails trying to detect standard for ERC20 (no standard)', async() => {
      return assertRevert(async() => {
        let ts = await vaultBase.detectTokenStandard(token.address)
      })
    })

    /* TODO
    it('fails checking ERC20 against ERC165', async() => {
      return assertRevert(async() => {
        await vaultBase.conformsToStandard(token.address, ERC165)
      })
    })
     */

    it('detects standard', async() => {
      let ts = await vaultBase.detectTokenStandard(token777.address)
      assert.equal(ts.toString(), 1, "standard ID should be 1")
    })

    it('token conforms to standard', async() => {
      assert.isTrue(await vaultBase.conformsToStandard(token777.address, 1), "should return false")
    })

    /* TODO
    it('token doesn\'t conform to standard (ERC165)', async() => {
      assert.isFalse(await vaultBase.conformsToStandard(tokenXXX.address, ERC777), "should return false")
    })
     */

    it('token doesn\'t conform to standard (not ERC165)', async() => {
      assert.isFalse(await vaultBase.conformsToStandard(token.address, 0), "should return false")
    })
  })
})
