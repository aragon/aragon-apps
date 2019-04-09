const { getEvents } = require('../helpers/events')
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { deployErc20TokenAndDeposit, deployContracts, createPayrollInstance, mockTimestamps } = require('../helpers/setup.js')(artifacts, web3)

const PriceFeed = artifacts.require('PriceFeedMock')
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

contract('Payroll settings', ([owner, employee, anotherEmployee, anyone]) => {
  let dao, payroll, payrollBase, finance, vault, priceFeed, denominationToken, anotherToken

  const NOW = 1553703809 // random fixed timestamp in seconds
  const ONE_MONTH = 60 * 60 * 24 * 31
  const TWO_MONTHS = ONE_MONTH * 2
  const RATE_EXPIRATION_TIME = TWO_MONTHS

  const TOKEN_DECIMALS = 18

  before('setup base apps and tokens', async () => {
    ({ dao, finance, vault, priceFeed, payrollBase } = await deployContracts(owner))
    anotherToken = await deployErc20TokenAndDeposit(owner, finance, vault, 'Another token', TOKEN_DECIMALS)
    denominationToken = await deployErc20TokenAndDeposit(owner, finance, vault, 'Denomination Token', TOKEN_DECIMALS)
  })

  beforeEach('setup payroll instance', async () => {
    payroll = await createPayrollInstance(dao, payrollBase, owner)
    await mockTimestamps(payroll, priceFeed, NOW)
  })

  describe('setPriceFeed', () => {
    let newFeedAddress

    beforeEach('deploy new feed', async () => {
      newFeedAddress = (await PriceFeed.new()).address
    })

    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender has permissions', async () => {
        const from = owner

        context('when the given address is a contract', async () => {
          it('updates the feed address', async () => {
            await payroll.setPriceFeed(newFeedAddress, { from })

            assert.equal(await payroll.feed(), newFeedAddress, 'feed address does not match')
          })

          it('emits an event', async () => {
            const receipt = await payroll.setPriceFeed(newFeedAddress, { from })

            const events = getEvents(receipt, 'SetPriceFeed')
            assert.equal(events.length, 1, 'number of SetPriceFeed emitted events does not match')
            assert.equal(events[0].args.feed, newFeedAddress, 'feed address does not match')
          })
        })

        context('when the given address is not a contract', async () => {
          it('reverts', async () => {
            await assertRevert(payroll.setPriceFeed(anyone, { from }), 'PAYROLL_FEED_NOT_CONTRACT')
          })
        })

        context('when the given address is the zero address', async () => {
          it('reverts', async () => {
            await assertRevert(payroll.setPriceFeed(ZERO_ADDRESS, { from }), 'PAYROLL_FEED_NOT_CONTRACT')
          })
        })
      })

      context('when the sender does not have permissions', async () => {
        const from = anyone

        it('reverts', async () => {
          await assertRevert(payroll.setPriceFeed(newFeedAddress, { from }), 'APP_AUTH_FAILED')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      it('reverts', async () => {
        await assertRevert(payroll.setPriceFeed(newFeedAddress, { from: owner }), 'APP_AUTH_FAILED')
      })
    })
  })

  describe('setRateExpiryTime', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app', async () => {
        await payroll.initialize(finance.address, denominationToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender has permissions', async () => {
        const from = owner

        context('when the given time is more than a minute', async () => {
          const expirationTime = 61

          it('updates the expiration time', async () => {
            await payroll.setRateExpiryTime(expirationTime, { from })

            assert.equal((await payroll.rateExpiryTime()).toString(), expirationTime, 'rate expiration time does not match')
          })

          it('emits an event', async () => {
            const receipt = await payroll.setRateExpiryTime(expirationTime, { from })

            const events = getEvents(receipt, 'SetRateExpiryTime')
            assert.equal(events.length, 1, 'number of SetRateExpiryTime emitted events does not match')
            assert.equal(events[0].args.time.toString(), expirationTime, 'rate expiration time does not match')
          })
        })

        context('when the given expiration time is one minute', async () => {
          const expirationTime = 60

          it('reverts', async () => {
            await assertRevert(payroll.setRateExpiryTime(expirationTime, { from }), 'PAYROLL_EXPIRY_TIME_TOO_SHORT')
          })
        })

        context('when the given expiration time is less than a minute', async () => {
          const expirationTime = 40

          it('reverts', async () => {
            await assertRevert(payroll.setRateExpiryTime(expirationTime, { from }), 'PAYROLL_EXPIRY_TIME_TOO_SHORT')
          })
        })
      })

      context('when the sender does not have permissions', async () => {
        const from = anyone

        it('reverts', async () => {
          await assertRevert(payroll.setRateExpiryTime(1000, { from }), 'APP_AUTH_FAILED')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      it('reverts', async () => {
        await assertRevert(payroll.setRateExpiryTime(1000, { from: owner }), 'APP_AUTH_FAILED')
      })
    })
  })
})
