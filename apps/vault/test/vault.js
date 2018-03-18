const { assertRevert, assertInvalidOpcode } = require('@aragon/test-helpers/assertThrow')
const getBalance = require('@aragon/test-helpers/balance')(web3)

const Vault = artifacts.require('Vault')
const IVaultConnector = artifacts.require('IVaultConnector')

const MiniMeToken = artifacts.require('@aragon/os/contracts/lib/minime/MiniMeToken')

const getContract = name => artifacts.require(name)

const NULL_ADDRESS = '0x00'

contract('Vault app', (accounts) => {
  let vaultBase, vault, token, token777

  const ETH = '0x0'
  const ERC165 = 165
  const NO_DETECTION = 2**32 - 1

  before(async () => {
    token = await MiniMeToken.new(NULL_ADDRESS, NULL_ADDRESS, 0, 'N', 0, 'N', true)
    await token.generateTokens(accounts[0], 200)

    token777 = await getContract('ERC777').new(NULL_ADDRESS, NULL_ADDRESS, 0, 'N', 0, 'N', true)
    await token777.generateTokens(accounts[0], 200)
  })

  beforeEach(async () => {
    vaultBase = await Vault.new()
    vault = IVaultConnector.at(vaultBase.address)
    await vaultBase.initializeEmpty()
    await vaultBase.initializeConnectors()
    //
    await vaultBase
  })

  context('Deposits and transfers', async() => {
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
    let erc20Connector, erc777Connector

    before(async() => {
      erc20Connector = await getContract('ERC20Connector').new()
      erc777Connector = await getContract('ERC777Connector').new()
    })

    it('registers standard', async() => {
      await vaultBase.registerStandard(777, ERC165, ["0x01", "0x02", "0x03", "0x04"], erc20Connector.address)
    })

    it('detects standard (no standard)', async() => {
      let ts = await vaultBase.detectTokenStandard(token.address)
      assert.equal(ts.toString(), 0, "standard ID should be 0")
    })

    it('detects standard', async() => {
      let ts = await vaultBase.detectTokenStandard(token777.address)
      assert.equal(ts.toString(), 0, "standard ID should be 1")
    })

    it('fails trying to register standard again', async() => {
      return assertRevert(async() => {
        await vaultBase.registerStandard(20, ERC165, ["0x01", "0x02", "0x03", "0x04"], erc20Connector.address)
      })
    })

    it('token conforms to standard', async() => {
      assert.isTrue(await vaultBase.conformsToStandard(token.address, ERC165), "should return false")
    })

    it('token doesn\'t conform to standard (ERC165)', async() => {
      assert.isFalse(await vaultBase.conformsToStandard(token777.address, 165), "should return false")
    })

    it('fails checking ERC20 against ERC165', async() => {
      return assertRevert(async() => {
        await vaultBase.conformsToStandard(token.address, 165)
      })
    })
    it('token doesn\'t conform to standard (not ERC165)', async() => {
      assert.isFalse(await vaultBase.conformsToStandard(token.address, 0), "should return false")
    })
  })
})
