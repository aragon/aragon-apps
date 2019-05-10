const { USD } = require('../helpers/tokens')(artifacts, web3)
const { getEvents } = require('../helpers/events')
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { NOW, ONE_MINUTE, RATE_EXPIRATION_TIME } = require('../helpers/time')
const { deployContracts, createPayrollAndPriceFeed } = require('../helpers/deploy')(artifacts, web3)

const PriceFeed = artifacts.require('PriceFeedMock')
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

contract('Payroll settings', ([owner, anyone]) => {
  let dao, payroll, payrollBase, finance, vault, priceFeed


  before('deploy base apps and tokens', async () => {
    ({ dao, finance, vault, payrollBase } = await deployContracts(owner))
  })

  beforeEach('create payroll and price feed instance', async () => {
    ({ payroll, priceFeed } = await createPayrollAndPriceFeed(dao, payrollBase, owner, NOW))
  })

  describe('setPriceFeed', () => {
    let newFeedAddress

    beforeEach('deploy new feed', async () => {
      newFeedAddress = (await PriceFeed.new()).address
    })

    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app using USD as denomination token', async () => {
        await payroll.initialize(finance.address, USD, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
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
      beforeEach('initialize payroll app using USD as denomination token', async () => {
        await payroll.initialize(finance.address, USD, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the sender has permissions', async () => {
        const from = owner

        for (const expirationTime of [ONE_MINUTE, ONE_MINUTE + 1]) {
          context(`when the given expiration time is ${expirationTime === ONE_MINUTE ? 'one minute' : 'greater than one minute'}`, async () => {
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
        }

        context('when the given expiration time is less than one minute', async () => {
          const expirationTime = ONE_MINUTE - 1

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
