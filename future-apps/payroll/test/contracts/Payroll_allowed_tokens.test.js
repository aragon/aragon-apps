const PAYMENT_TYPES = require('../helpers/payment_types')
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { assertEvent } = require('@aragon/test-helpers/assertEvent')(web3)
const { annualSalaryPerSecond } = require('../helpers/salary')(web3)
const { NOW, ONE_MONTH, RATE_EXPIRATION_TIME } = require('../helpers/time')
const { deployContracts, createPayrollAndPriceFeed } = require('../helpers/deploy')(artifacts, web3)
const { USD, deployDAI, deployTokenAndDeposit, setTokenRates, formatRate } = require('../helpers/tokens')(artifacts, web3)

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
            const receipt = await payroll.setAllowedToken(DAI.address, true, { from })
            assertEvent(receipt, 'SetAllowedToken', { token: DAI.address, allowed: true })

            assert(await payroll.isTokenAllowed(DAI.address), 'denomination token should be allowed')
          })

          it('can allow a the zero address', async () => {
            const receipt = await payroll.setAllowedToken(ZERO_ADDRESS, true, { from })
            assertEvent(receipt, 'SetAllowedToken', { token: ZERO_ADDRESS, allowed: true })

            assert(await payroll.isTokenAllowed(ZERO_ADDRESS), 'zero address token should be allowed')
          })

          it('can allow multiple tokens', async () => {
            const erc20Token1 = await deployTokenAndDeposit(owner, finance, 'Token 1', 18)
            const erc20Token2 = await deployTokenAndDeposit(owner, finance, 'Token 2', 16)

            await payroll.setAllowedToken(DAI.address, true, { from })
            await payroll.setAllowedToken(erc20Token1.address, true, { from })
            await payroll.setAllowedToken(erc20Token2.address, true, { from })

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
            await Promise.all(tokenAddresses.map(address => payroll.setAllowedToken(address, true, { from: owner })))

            const rates = tokenAddresses.map(() => formatRate(5))
            await setTokenRates(priceFeed, USD, tokenAddresses, rates)

            await payroll.addEmployee(employee, annualSalaryPerSecond(100000), NOW - ONE_MONTH, 'Boss', { from: owner })
          })

          it('does not run out of gas to payout salary using 20 tokens', async () => {
            const allocations = tokenAddresses.map(() => 100 / MAX_ALLOWED_TOKENS)

            const allocationTx = await payroll.determineAllocation(tokenAddresses, allocations, { from: employee })
            assert.isBelow(allocationTx.receipt.cumulativeGasUsed, MAX_GAS_USED, 'too much gas consumed for allocation')

            const paydayTx = await payroll.payday(PAYMENT_TYPES.PAYROLL, 0, [], { from: employee })
            assert.isBelow(paydayTx.receipt.cumulativeGasUsed, MAX_GAS_USED, 'too much gas consumed for payday')
          })

          it('can not add one more token', async () => {
            const extraToken = await deployTokenAndDeposit(owner, finance, 'Extra token', 18)
            await payroll.setAllowedToken(extraToken.address, true)

            const exceedingTokenAddresses = tokenAddresses.concat(extraToken.address)
            const allocations = exceedingTokenAddresses.map(() => 100 / exceedingTokenAddresses.length)

            await assertRevert(payroll.determineAllocation(exceedingTokenAddresses, allocations, { from: employee }), 'PAYROLL_MAX_ALLOWED_TOKENS')
          })
        })
      })

      context('when the sender does not have permissions', () => {
        const from = anyone

        it('reverts', async () => {
          await assertRevert(payroll.setAllowedToken(DAI.address, true, { from }), 'APP_AUTH_FAILED')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      it('reverts', async () => {
        await assertRevert(payroll.setAllowedToken(DAI.address, true, { from: owner }), 'APP_AUTH_FAILED')
      })
    })
  })

  describe('removeAllowedToken', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app using USD as denomination token', async () => {
        await payroll.initialize(finance.address, USD, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender has permissions', () => {
        const from = owner

        context('when the given token is allowed', () => {
          beforeEach('allow token', async () => {
            await payroll.setAllowedToken(DAI.address, true, { from })
          })

          it('can remove an allowed token', async () => {
            const receipt = await payroll.setAllowedToken(DAI.address, false, { from })
            assertEvent(receipt, 'SetAllowedToken', { token: DAI.address, allowed: false })

            assert.isFalse(await payroll.isTokenAllowed(DAI.address), 'token should not be allowed')
          })

          it('can remove multiple allowed tokens', async () => {
            const erc20Token1 = await deployTokenAndDeposit(owner, finance, 'Token 1', 18)
            await payroll.setAllowedToken(erc20Token1.address, true, { from })
            const erc20Token2 = await deployTokenAndDeposit(owner, finance, 'Token 2', 16)
            await payroll.setAllowedToken(erc20Token2.address, true, { from })

            await payroll.setAllowedToken(DAI.address, false, { from })
            await payroll.setAllowedToken(erc20Token1.address, false, { from })

            assert.isFalse(await payroll.isTokenAllowed(DAI.address), 'token should not be allowed')
            assert.isFalse(await payroll.isTokenAllowed(erc20Token1.address), 'token should be allowed')
            assert.isTrue(await payroll.isTokenAllowed(erc20Token2.address), 'token should not be allowed')
          })
        })

        context('when the given token is not allowed', () => {
          it('reverts', async () => {
            const erc20Token = await deployTokenAndDeposit(owner, finance, 'Some Token', 18)
            await assertRevert(payroll.setAllowedToken(erc20Token.address, false), 'PAYROLL_TOKEN_ALREADY_SET')
          })
        })
      })

      context('when the sender does not have permissions', () => {
        const from = anyone

        it('reverts', async () => {
          await assertRevert(payroll.setAllowedToken(DAI.address, false, { from }), 'APP_AUTH_FAILED')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      it('reverts', async () => {
        await assertRevert(payroll.setAllowedToken(DAI.address, false, { from: owner }), 'APP_AUTH_FAILED')
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
            await payroll.setAllowedToken(DAI.address, true, { from: owner })
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
