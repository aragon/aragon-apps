const { assertRevert } = require('@aragon/test-helpers/assertThrow')

const ACL = artifacts.require('ACL')
const Payroll = artifacts.require('PayrollMock')
const PriceFeed = artifacts.require('PriceFeedMock')

const getEvent = (receipt, event) => getEvents(receipt, event)[0].args
const getEvents = (receipt, event) => receipt.logs.filter(l => l.event === event)
const getEventArgument = (receipt, event, arg) => getEvent(receipt, event)[arg]

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

contract('Payroll, price feed,', function(accounts) {
  const [owner, employee, anyone] = accounts
  const { deployErc20TokenAndDeposit, redistributeEth, getDaoFinanceVault } = require("./helpers.js")(owner)

  const NOW = Math.floor((new Date()).getTime() / 1000)
  const ONE_MONTH = 60 * 60 * 24
  const USD_DECIMALS = 18
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
    await payroll.initialize(finance.address, usdToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
  })

  beforeEach('grant permissions', async () => {
    const ADD_EMPLOYEE_ROLE = await payrollBase.ADD_EMPLOYEE_ROLE()
    const CHANGE_PRICE_FEED_ROLE = await payrollBase.CHANGE_PRICE_FEED_ROLE()
    const MODIFY_RATE_EXPIRY_ROLE = await payrollBase.MODIFY_RATE_EXPIRY_ROLE()
    const ALLOWED_TOKENS_MANAGER_ROLE = await payrollBase.ALLOWED_TOKENS_MANAGER_ROLE()

    await acl.createPermission(owner, payroll.address, ADD_EMPLOYEE_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, CHANGE_PRICE_FEED_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, MODIFY_RATE_EXPIRY_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, ALLOWED_TOKENS_MANAGER_ROLE, owner, { from: owner })
  })

  it('fails to pay if rates are obsolete', async () => {
    await payroll.mockSetTimestamp(NOW)
    await priceFeed.mockSetTimestamp(NOW)

    const token = await deployErc20TokenAndDeposit(owner, finance, vault, 'Token', 18)
    await payroll.addAllowedToken(token.address, { from: owner })
    await payroll.addEmployeeNow(employee, 1000, 'John', 'Boss', { from: owner })
    await payroll.determineAllocation([token.address], [100], { from: employee })

    await payroll.mockSetTimestamp(NOW + ONE_MONTH)
    await priceFeed.mockSetTimestamp(NOW - ONE_MONTH)
    await assertRevert(payroll.payday({ from: employee }), 'PAYROLL_EXCHANGE_RATE_ZERO')

    await priceFeed.mockSetTimestamp(NOW + ONE_MONTH)
    await payroll.payday({ from: employee })
  })

  describe('setPriceFeed', () => {
    let newFeedAddress

    beforeEach('deploy new feed', async () => {
      newFeedAddress = (await PriceFeed.new()).address
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

  describe('setRateExpiryTime', () => {
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
})
