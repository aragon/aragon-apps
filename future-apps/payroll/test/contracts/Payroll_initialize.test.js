const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { deployErc20TokenAndDeposit, deployContracts, createPayrollAndPriceFeed } = require('../helpers/deploy.js')(artifacts, web3)

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

contract('Payroll initialization', ([owner]) => {
  let dao, payroll, payrollBase, finance, vault, priceFeed, denominationToken

  const NOW = 1553703809 // random fixed timestamp in seconds
  const ONE_MONTH = 60 * 60 * 24 * 31
  const TWO_MONTHS = ONE_MONTH * 2
  const RATE_EXPIRATION_TIME = TWO_MONTHS

  const TOKEN_DECIMALS = 18

  before('deploy base apps and tokens', async () => {
    ({ dao, finance, vault, payrollBase } = await deployContracts(owner))
    denominationToken = await deployErc20TokenAndDeposit(owner, finance, 'Denomination Token', TOKEN_DECIMALS)
  })

  beforeEach('create payroll and price feed instance', async () => {
    ({ payroll, priceFeed } = await createPayrollAndPriceFeed(dao, payrollBase, owner, NOW))
  })

  describe('initialize', function () {
    const from = owner

    it('cannot initialize the base app', async () => {
      assert(await payrollBase.isPetrified(), 'base payroll app should be petrified')
      await assertRevert(payrollBase.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from }), 'INIT_ALREADY_INITIALIZED')
    })

    context('when it has not been initialized yet', function () {
      it('can be initialized with a zero denomination token', async () => {
        payroll.initialize(finance.address, ZERO_ADDRESS, priceFeed.address, RATE_EXPIRATION_TIME, { from })
        assert.equal(await payroll.denominationToken(), ZERO_ADDRESS, 'denomination token does not match')
      })

      it('reverts when passing an expiration time lower than or equal to a minute', async () => {
        const ONE_MINUTE = 60
        await assertRevert(payroll.initialize(finance.address, denominationToken.address, priceFeed.address, ONE_MINUTE, { from }), 'PAYROLL_EXPIRY_TIME_TOO_SHORT')
      })

      it('reverts when passing an invalid finance instance', async () => {
        await assertRevert(payroll.initialize(ZERO_ADDRESS, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from }), 'PAYROLL_FINANCE_NOT_CONTRACT')
      })

      it('reverts when passing an invalid feed instance', async () => {
        await assertRevert(payroll.initialize(finance.address, denominationToken.address, ZERO_ADDRESS, RATE_EXPIRATION_TIME, { from }), 'PAYROLL_FEED_NOT_CONTRACT')
      })
    })

    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from })
      })

      it('cannot be initialized again', async () => {
        await assertRevert(payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from }), 'INIT_ALREADY_INITIALIZED')
      })

      it('has a price feed instance, a finance instance, a denomination token and a rate expiration time', async () => {
        assert.equal(await payroll.feed(), priceFeed.address, 'feed address does not match')
        assert.equal(await payroll.finance(), finance.address, 'finance address should match')
        assert.equal(await payroll.denominationToken(), denominationToken.address, 'denomination token does not match')
        assert.equal(await payroll.rateExpiryTime(), RATE_EXPIRATION_TIME, 'rate expiration time does not match')
      })
    })
  })
})
