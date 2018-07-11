const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const getBalance = require('@aragon/test-helpers/balance')(web3)
const getTransaction = require('@aragon/test-helpers/transaction')(web3)
const MiniMeToken = artifacts.require('@aragon/os/contracts/common/MiniMeToken')
const Vault = artifacts.require('Vault')
const Finance = artifacts.require('Finance')
const Payroll = artifacts.require("PayrollMock")
const PriceFeedMock = artifacts.require("./feed/PriceFeedMock.sol")
const PriceFeedFailMock = artifacts.require("./feed/PriceFeedFailMock.sol")
const Zombie = artifacts.require("Zombie.sol")

const { deployErc20TokenAndDeposit, addAllowedTokens, getTimePassed } = require('./helpers.js')

contract('Payroll, initialization,', function(accounts) {
  const rateExpiryTime = 1000
  const USD_DECIMALS= 18
  const USD_PRECISION = 10**USD_DECIMALS
  const SECONDS_IN_A_YEAR = 31557600 // 365.25 days
  const ONE = 1e18
  const ETH = '0x0'
  let payroll
  let finance
  let vault
  let priceFeed
  let owner = accounts[0]
  let usdToken
  let erc20Token1
  let erc20Token2
  const erc20Token1Decimals = 18
  const erc20Token2Decimals = 16

  before(async () => {
    vault = await Vault.new()
    await vault.initializeWithBase(vault.address)
    finance = await Finance.new()
    await finance.initialize(vault.address, SECONDS_IN_A_YEAR) // more than one day

    usdToken = await deployErc20TokenAndDeposit(owner, finance, vault, "USD", USD_DECIMALS)
    priceFeed = await PriceFeedMock.new()
    payroll = await Payroll.new()

    // Deploy ERC 20 Tokens
    erc20Token1 = await deployErc20TokenAndDeposit(owner, finance, vault, "Token 1", erc20Token1Decimals)
    erc20Token2 = await deployErc20TokenAndDeposit(owner, finance, vault, "Token 2", erc20Token2Decimals)
  })

  it("fails to initialize with empty finance", async () => {
    return assertRevert(async () => {
      await payroll.initialize('0x0', usdToken.address, priceFeed.address, rateExpiryTime)
    })
  })

  it("initializes contract and checks that initial values match", async () => {
    await payroll.initialize(finance.address, usdToken.address, priceFeed.address, rateExpiryTime)
    let tmpFinance = await payroll.finance()
    assert.equal(tmpFinance.valueOf(), finance.address, "Finance address is wrong")
    let tmpUsd = await payroll.denominationToken()
    assert.equal(tmpUsd.valueOf(), usdToken.address, "USD Token address is wrong")
  })

  it('fails on reinitialization', async () => {
    return assertRevert(async () => {
      await payroll.initialize(finance.address, usdToken.address, priceFeed.address, rateExpiryTime)
    })
  })

  it("add allowed tokens", async () => {
    // add them to payroll allowed tokens
    await addAllowedTokens(payroll, [usdToken, erc20Token1, erc20Token2])
    assert.isTrue(await payroll.isTokenAllowed(usdToken.address), "USD Token should be allowed")
    assert.isTrue(await payroll.isTokenAllowed(erc20Token1.address), "ERC 20 Token 1 should be allowed")
    assert.isTrue(await payroll.isTokenAllowed(erc20Token2.address), "ERC 20 Token 2 should be allowed")
  })

  it("fails trying to add an already allowed token", async () => {
    return assertRevert(async () => {
      await payroll.addAllowedToken(usdToken.address)
    })
  })
})
