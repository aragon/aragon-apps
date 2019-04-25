const PAYMENT_TYPES = require('../helpers/payment_types')
const { getEvent } = require('../helpers/events')
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { NOW, ONE_MONTH, RATE_EXPIRATION_TIME } = require('../helpers/time')
const { deployContracts, createPayrollAndPriceFeed } = require('../helpers/deploy')(artifacts, web3)
const { USD, deployDAI, deployTokenAndDeposit, setTokenRates } = require('../helpers/tokens.js')(artifacts, web3)

const MAX_GAS_USED = 6.5e6
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

contract('Payroll allowed tokens,', ([owner, employee, anyone]) => {
  let dao, payroll, payrollBase, finance, vault, priceFeed, DAI

  before('deploy base apps and tokens', async () => {
    ({ dao, finance, vault, payrollBase } = await deployContracts(owner))
    DAI = await deployDAI(owner, finance)
  })

  beforeEach('create payroll and price feed instance', async () => {
    ({ payroll, priceFeed } = await createPayrollAndPriceFeed(dao, payrollBase, owner, NOW))
  })

  describe('addAllowedToken', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app using USD as denomination token', async () => {
        await payroll.initialize(finance.address, USD, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender has permissions', () => {
        const from = owner

        context('when it does not reach the maximum amount allowed', () => {
          it('can allow a token', async () => {
            const receipt = await payroll.addAllowedToken(DAI.address, { from })

            const event = getEvent(receipt, 'AddAllowedToken')
            assert.equal(event.token, DAI.address, 'denomination token address should match')

            assert.equal(await payroll.getAllowedTokensArrayLength(), 1, 'allowed tokens length does not match')
            assert(await payroll.isTokenAllowed(DAI.address), 'denomination token should be allowed')
          })

          it('can allow a the zero address', async () => {
            const receipt = await payroll.addAllowedToken(ZERO_ADDRESS, { from })

            const event = getEvent(receipt, 'AddAllowedToken')
            assert.equal(event.token, ZERO_ADDRESS, 'denomination token address should match')

            assert.equal(await payroll.getAllowedTokensArrayLength(), 1, 'allowed tokens length does not match')
            assert(await payroll.isTokenAllowed(ZERO_ADDRESS), 'zero address token should be allowed')
          })

          it('can allow multiple tokens', async () => {
            const erc20Token1 = await deployTokenAndDeposit(owner, finance, 'Token 1', 18)
            const erc20Token2 = await deployTokenAndDeposit(owner, finance, 'Token 2', 16)

            await payroll.addAllowedToken(DAI.address, { from })
            await payroll.addAllowedToken(erc20Token1.address, { from })
            await payroll.addAllowedToken(erc20Token2.address, { from })

            assert.equal(await payroll.getAllowedTokensArrayLength(), 3, 'allowed tokens length does not match')
            assert(await payroll.isTokenAllowed(DAI.address), 'denomination token should be allowed')
            assert(await payroll.isTokenAllowed(erc20Token1.address), 'ERC20 token 1 should be allowed')
            assert(await payroll.isTokenAllowed(erc20Token2.address), 'ERC20 token 2 should be allowed')
          })
        })

        context('when it reaches the maximum amount allowed', () => {
          let tokenAddresses = [], MAX_ALLOWED_TOKENS

          before('deploy multiple tokens and set rates', async () => {
            MAX_ALLOWED_TOKENS = (await payrollBase.getMaxAllowedTokens()).valueOf()
            for (let i = 0; i < MAX_ALLOWED_TOKENS; i++) {
              const token = await deployTokenAndDeposit(owner, finance, `Token ${i}`, 18);
              tokenAddresses.push(token.address)
            }
          })

          beforeEach('allow tokens, set rates, and add employee', async () => {
            await Promise.all(tokenAddresses.map(address => payroll.addAllowedToken(address, { from: owner })))
            assert.equal(await payroll.getAllowedTokensArrayLength(), MAX_ALLOWED_TOKENS, 'amount of allowed tokens does not match')

            const rates = tokenAddresses.map(() => 5)
            await setTokenRates(priceFeed, USD, tokenAddresses, rates)

            await payroll.addEmployee(employee, 100000, 'Boss', NOW - ONE_MONTH, { from: owner })
          })

          it('can not add one more token', async () => {
            const erc20Token = await deployTokenAndDeposit(owner, finance, 'Extra token', 18)

            await assertRevert(payroll.addAllowedToken(erc20Token.address), 'PAYROLL_MAX_ALLOWED_TOKENS')
          })

          it('does not run out of gas to payout salary', async () => {
            const allocations = tokenAddresses.map(() => 100 / MAX_ALLOWED_TOKENS)

            const allocationTx = await payroll.determineAllocation(tokenAddresses, allocations, { from: employee })
            assert.isBelow(allocationTx.receipt.cumulativeGasUsed, MAX_GAS_USED, 'too much gas consumed for allocation')

            const paydayTx = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, { from: employee })
            assert.isBelow(paydayTx.receipt.cumulativeGasUsed, MAX_GAS_USED, 'too much gas consumed for payday')
          })
        })
      })

      context('when the sender does not have permissions', () => {
        const from = anyone

        it('reverts', async () => {
          await assertRevert(payroll.addAllowedToken(DAI.address, { from }), 'APP_AUTH_FAILED')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      it('reverts', async () => {
        await assertRevert(payroll.addAllowedToken(DAI.address, { from: owner }), 'APP_AUTH_FAILED')
      })
    })
  })

  describe('isTokenAllowed', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app using USD as denomination token', async () => {
        await payroll.initialize(finance.address, USD, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the given token is not the zero address', () => {
        context('when the requested token was allowed', () => {
          beforeEach('allow denomination token', async () => {
            await payroll.addAllowedToken(DAI.address, { from: owner })
          })

          it('returns true', async () => {
            assert(await payroll.isTokenAllowed(DAI.address), 'token should be allowed')
          })
        })

        context('when the requested token was not allowed yet', () => {
          it('returns false', async () => {
            assert.isFalse(await payroll.isTokenAllowed(DAI.address), 'token should not be allowed')
          })
        })
      })

      context('when the given token is the zero address', () => {
        it('returns false', async () => {
          assert.isFalse(await payroll.isTokenAllowed(ZERO_ADDRESS), 'token should not be allowed')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      it('reverts', async () => {
        await assertRevert(payroll.isTokenAllowed(DAI.address), 'INIT_NOT_INITIALIZED')
      })
    })
  })
})
