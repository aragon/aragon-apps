const { getEvent } = require('../helpers/events')
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { deployErc20TokenAndDeposit, redistributeEth, deployContracts, createPayrollInstance, mockTimestamps } = require('../helpers/setup.js')(artifacts, web3)

const MAX_GAS_USED = 6.5e6
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

contract('Payroll allowed tokens,', ([owner, employee, anotherEmployee, anyone]) => {
  let dao, payroll, payrollBase, finance, vault, priceFeed, denominationToken, anotherToken

  const NOW = 1553703809 // random fixed timestamp in seconds
  const ONE_MONTH = 60 * 60 * 24 * 31
  const TWO_MONTHS = ONE_MONTH * 2
  const RATE_EXPIRATION_TIME = TWO_MONTHS

  const DENOMINATION_TOKEN_DECIMALS = 18

  before('setup base apps and tokens', async () => {
    ({ dao, finance, vault, priceFeed, payrollBase } = await deployContracts(owner))
    anotherToken = await deployErc20TokenAndDeposit(owner, finance, vault, 'Another token', 18)
    denominationToken = await deployErc20TokenAndDeposit(owner, finance, vault, 'Denomination Token', DENOMINATION_TOKEN_DECIMALS)
    await redistributeEth(finance)
  })

  beforeEach('setup payroll instance', async () => {
    payroll = await createPayrollInstance(dao, payrollBase, owner)
    await mockTimestamps(payroll, priceFeed, NOW)
  })

  describe('addAllowedToken', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender has permissions', () => {
        const from = owner

        context('when it does not reach the maximum amount allowed', () => {
          it('can allow a token', async () => {
            const receipt = await payroll.addAllowedToken(denominationToken.address, { from })

            const event = getEvent(receipt, 'AddAllowedToken')
            assert.equal(event.token, denominationToken.address, 'denomination token address should match')

            assert.equal(await payroll.getAllowedTokensArrayLength(), 1, 'allowed tokens length does not match')
            assert(await payroll.isTokenAllowed(denominationToken.address), 'denomination token should be allowed')
          })

          it('can allow a the zero address', async () => {
            const receipt = await payroll.addAllowedToken(ZERO_ADDRESS, { from })

            const event = getEvent(receipt, 'AddAllowedToken')
            assert.equal(event.token, ZERO_ADDRESS, 'denomination token address should match')

            assert.equal(await payroll.getAllowedTokensArrayLength(), 1, 'allowed tokens length does not match')
            assert(await payroll.isTokenAllowed(ZERO_ADDRESS), 'zero address token should be allowed')
          })

          it('can allow multiple tokens', async () => {
            const erc20Token1 = await deployErc20TokenAndDeposit(owner, finance, vault, 'Token 1', 18)
            const erc20Token2 = await deployErc20TokenAndDeposit(owner, finance, vault, 'Token 2', 16)

            await payroll.addAllowedToken(denominationToken.address, { from })
            await payroll.addAllowedToken(erc20Token1.address, { from })
            await payroll.addAllowedToken(erc20Token2.address, { from })

            assert.equal(await payroll.getAllowedTokensArrayLength(), 3, 'allowed tokens length does not match')
            assert(await payroll.isTokenAllowed(denominationToken.address), 'denomination token should be allowed')
            assert(await payroll.isTokenAllowed(erc20Token1.address), 'ERC20 token 1 should be allowed')
            assert(await payroll.isTokenAllowed(erc20Token2.address), 'ERC20 token 2 should be allowed')
          })
        })

        context('when it reaches the maximum amount allowed', () => {
          let tokenAddresses = [], MAX_ALLOWED_TOKENS

          before('deploy multiple tokens', async () => {
            MAX_ALLOWED_TOKENS = (await payroll.getMaxAllowedTokens()).valueOf()
            for (let i = 0; i < MAX_ALLOWED_TOKENS; i++) {
              const token = await deployErc20TokenAndDeposit(owner, finance, vault, `Token ${i}`, 18);
              tokenAddresses.push(token.address)
            }
          })

          beforeEach('allow tokens and add employee', async () => {
            await Promise.all(tokenAddresses.map(address => payroll.addAllowedToken(address, { from: owner })))
            assert.equal(await payroll.getAllowedTokensArrayLength(), MAX_ALLOWED_TOKENS, 'amount of allowed tokens does not match')

            await payroll.addEmployee(employee, 100000, 'John Doe', 'Boss', NOW - ONE_MONTH, { from: owner })
          })

          it('can not add one more token', async () => {
            const erc20Token = await deployErc20TokenAndDeposit(owner, finance, vault, 'Extra token', 18)

            await assertRevert(payroll.addAllowedToken(erc20Token.address), 'PAYROLL_MAX_ALLOWED_TOKENS')
          })

          it('does not run out of gas to payout salary', async () => {
            const allocations = tokenAddresses.map(() => 100 / MAX_ALLOWED_TOKENS)

            const allocationTx = await payroll.determineAllocation(tokenAddresses, allocations, { from: employee })
            assert.isBelow(allocationTx.receipt.cumulativeGasUsed, MAX_GAS_USED, 'Too much gas consumed for allocation')

            const paydayTx = await payroll.payday({ from: employee })
            assert.isBelow(paydayTx.receipt.cumulativeGasUsed, MAX_GAS_USED, 'Too much gas consumed for payday')
          })
        })
      })

      context('when the sender does not have permissions', () => {
        const from = anyone

        it('reverts', async () => {
          await assertRevert(payroll.addAllowedToken(denominationToken.address, { from }), 'APP_AUTH_FAILED')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      it('reverts', async () => {
        await assertRevert(payroll.addAllowedToken(denominationToken.address, { from: owner }), 'APP_AUTH_FAILED')
      })
    })
  })

  describe('isTokenAllowed', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the given token is not the zero address', () => {
        context('when the requested token was allowed', () => {
          beforeEach('allow denomination token', async () => {
            await payroll.addAllowedToken(denominationToken.address, { from: owner })
          })

          it('returns true', async () => {
            assert(await payroll.isTokenAllowed(denominationToken.address), 'token should be allowed')
          })
        })

        context('when the requested token was not allowed yet', () => {
          it('returns false', async () => {
            assert.isFalse(await payroll.isTokenAllowed(denominationToken.address), 'token should not be allowed')
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
      it('returns false', async () => {
        assert.isFalse(await payroll.isTokenAllowed(denominationToken.address), 'token should not be allowed')
      })
    })
  })
})
