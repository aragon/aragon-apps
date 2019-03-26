const { assertRevert } = require('@aragon/test-helpers/assertThrow')

const ACL = artifacts.require('ACL')
const Payroll = artifacts.require('PayrollMock')
const PriceFeed = artifacts.require('PriceFeedMock')

const getEvent = (receipt, event) => receipt.logs.find(l => l.event === event).args
const getEventArgument = (receipt, event, arg) => getEvent(receipt, event)[arg]

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

contract('Payroll, initialization,', function(accounts) {
  const [owner, anyone] = accounts
  const { deployErc20TokenAndDeposit, redistributeEth, getDaoFinanceVault } = require('./helpers.js')(owner)

  const USD_DECIMALS= 18
  const RATE_EXPIRATION_TIME = 1000

  let dao, acl, payroll, payrollBase, finance, vault, priceFeed, usdToken

  before('setup base apps and tokens', async () => {
    const daoFinanceVault = await getDaoFinanceVault()
    dao = daoFinanceVault.dao
    finance = daoFinanceVault.finance
    vault = daoFinanceVault.vault
    acl = ACL.at(await dao.acl())

    priceFeed = await PriceFeed.new()
    payrollBase = await Payroll.new()
    usdToken = await deployErc20TokenAndDeposit(owner, finance, vault, 'USD', USD_DECIMALS)

    await redistributeEth(accounts, finance)
  })

  beforeEach('create payroll instance', async () => {
    const receipt = await dao.newAppInstance('0x4321', payrollBase.address, '0x', false, { from: owner })
    payroll = Payroll.at(getEventArgument(receipt, 'NewAppProxy', 'proxy'))
  })

  describe('initialize', function () {
    const from = owner

    it('cannot initialize the base app', async () => {
      assert(await payrollBase.isPetrified(), 'base payroll app should be petrified')
      await assertRevert(payrollBase.initialize(finance.address, usdToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from }), 'INIT_ALREADY_INITIALIZED')
    })

    context('when it has not been initialized yet', function () {
      it('can be initialized with a zero denomination token', async () => {
        payroll.initialize(finance.address, ZERO_ADDRESS, priceFeed.address, RATE_EXPIRATION_TIME, { from })
        assert.equal(await payroll.denominationToken(), ZERO_ADDRESS, 'denomination token does not match')
      })

      it('reverts when passing an expiration time lower than or equal to a minute', async () => {
        const ONE_MINUTE = 60
        await assertRevert(payroll.initialize(finance.address, usdToken.address, priceFeed.address, ONE_MINUTE, { from }), 'PAYROLL_EXPIRY_TIME_TOO_SHORT')
      })

      it('reverts when passing an invalid finance instance', async () => {
        await assertRevert(payroll.initialize(ZERO_ADDRESS, usdToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from }), 'PAYROLL_FINANCE_NOT_CONTRACT')
      })

      it('reverts when passing an invalid feed instance', async () => {
        await assertRevert(payroll.initialize(finance.address, usdToken.address, ZERO_ADDRESS, RATE_EXPIRATION_TIME, { from }), 'PAYROLL_FEED_NOT_CONTRACT')
      })
    })

    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, usdToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from })
      })

      it('cannot be initialized again', async () => {
        await assertRevert(payroll.initialize(finance.address, usdToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from }), 'INIT_ALREADY_INITIALIZED')
      })

      it('has a price feed instance, a finance instance, a denomination token and a rate expiration time', async () => {
        assert.equal(await payroll.feed(), priceFeed.address, 'feed address does not match')
        assert.equal(await payroll.finance(), finance.address, 'finance address should match')
        assert.equal(await payroll.denominationToken(), usdToken.address, 'denomination token does not match')
        assert.equal(await payroll.rateExpiryTime(), RATE_EXPIRATION_TIME, 'rate expiration time does not match')
      })
    })
  })

  describe('addAllowedToken', function () {
    beforeEach('initialize payroll app and add permissions', async () => {
      await payroll.initialize(finance.address, usdToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })

      const ALLOWED_TOKENS_MANAGER_ROLE = await payrollBase.ALLOWED_TOKENS_MANAGER_ROLE()
      await acl.createPermission(owner, payroll.address, ALLOWED_TOKENS_MANAGER_ROLE, owner, { from: owner })
    })

    context('when the sender has permissions', () => {
      const from = owner

      it('can allow a token', async () => {
        const receipt = await payroll.addAllowedToken(usdToken.address, { from })

        const event = getEvent(receipt, 'AddAllowedToken')
        assert.equal(event.token, usdToken.address, 'usd token address should match')

        assert.equal(await payroll.getAllowedTokensArrayLength(), 1, 'allowed tokens length does not match')
        assert(await payroll.isTokenAllowed(usdToken.address), 'USD token should be allowed')
      })

      it('can allow multiple tokens', async () => {
        const erc20Token1 = await deployErc20TokenAndDeposit(owner, finance, vault, 'Token 1', 18)
        const erc20Token2 = await deployErc20TokenAndDeposit(owner, finance, vault, 'Token 2', 16)

        await payroll.addAllowedToken(usdToken.address, { from })
        await payroll.addAllowedToken(erc20Token1.address, { from })
        await payroll.addAllowedToken(erc20Token2.address, { from })

        assert.equal(await payroll.getAllowedTokensArrayLength(), 3, 'allowed tokens length does not match')
        assert(await payroll.isTokenAllowed(usdToken.address), 'USD token should be allowed')
        assert(await payroll.isTokenAllowed(erc20Token1.address), 'ERC20 token 1 should be allowed')
        assert(await payroll.isTokenAllowed(erc20Token2.address), 'ERC20 token 2 should be allowed')
      })
    })

    context('when the sender does not have permissions', () => {
      const from = anyone

      it('reverts', async () => {
        await assertRevert(payroll.addAllowedToken(usdToken.address, { from }), 'APP_AUTH_FAILED')
      })
    })
  })
})
