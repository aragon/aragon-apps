const { assertRevert } = require('@aragon/test-helpers/assertThrow')

const ACL = artifacts.require('ACL')
const Payroll = artifacts.require('PayrollMock')
const PriceFeed = artifacts.require('PriceFeedMock')

const getEvent = (receipt, event) => getEvents(receipt, event)[0].args
const getEvents = (receipt, event) => receipt.logs.filter(l => l.event === event)
const getEventArgument = (receipt, event, arg) => getEvent(receipt, event)[arg]

contract('Payroll, allowed tokens,', function(accounts) {
  const [owner, employee, anyone] = accounts
  const { deployErc20TokenAndDeposit, redistributeEth, getDaoFinanceVault } = require("./helpers.js")(owner)

  const NOW = Math.floor((new Date()).getTime() / 1000)
  const ONE_MONTH = 60 * 60 * 24
  const USD_DECIMALS = 18
  const MAX_GAS_USED = 6.5e6
  const RATE_EXPIRATION_TIME = 1000

  let dao, acl, payroll, payrollBase, finance, vault, priceFeed, usdToken

  before('setup base apps and tokens', async () => {
    const daoFinanceVault = await getDaoFinanceVault()
    dao = daoFinanceVault.dao
    finance = daoFinanceVault.finance
    vault = daoFinanceVault.vault
    acl = ACL.at(await dao.acl())

    priceFeed = await PriceFeed.new()
    priceFeed.mockSetTimestamp(NOW)

    payrollBase = await Payroll.new()
    usdToken = await deployErc20TokenAndDeposit(owner, finance, vault, 'USD', USD_DECIMALS)

    await redistributeEth(accounts, finance)
  })

  beforeEach('create payroll instance and initialize', async () => {
    const receipt = await dao.newAppInstance('0x4321', payrollBase.address, '0x', false, { from: owner })
    payroll = Payroll.at(getEventArgument(receipt, 'NewAppProxy', 'proxy'))
    await payroll.initialize(finance.address, usdToken.address, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
    await payroll.mockSetTimestamp(NOW)
  })

  beforeEach('grant permissions', async () => {
    const ADD_EMPLOYEE_ROLE = await payrollBase.ADD_EMPLOYEE_ROLE()
    const TERMINATE_EMPLOYEE_ROLE = await payrollBase.TERMINATE_EMPLOYEE_ROLE()
    const ALLOWED_TOKENS_MANAGER_ROLE = await payrollBase.ALLOWED_TOKENS_MANAGER_ROLE()

    await acl.createPermission(owner, payroll.address, ADD_EMPLOYEE_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, TERMINATE_EMPLOYEE_ROLE, owner, { from: owner })
    await acl.createPermission(owner, payroll.address, ALLOWED_TOKENS_MANAGER_ROLE, owner, { from: owner })
  })

  describe('determineAllocation', () => {
    const tokenAddresses = [], allocations = [10, 20, 70]

    before('deploy some tokens', async () => {
      const token1 = await deployErc20TokenAndDeposit(owner, finance, vault, 'Token 1', 14)
      const token2 = await deployErc20TokenAndDeposit(owner, finance, vault, 'Token 2', 14)
      const token3 = await deployErc20TokenAndDeposit(owner, finance, vault, 'Token 3', 14)
      tokenAddresses.push(token1.address, token2.address, token3.address)
    })

    beforeEach('allow multiple tokens', async () => {
      await Promise.all(tokenAddresses.map(address => payroll.addAllowedToken(address, { from: owner })))
    })

    context('when the employee exists', () => {
      const from = employee
      let employeeId

      beforeEach('add employee', async () => {
        const receipt = await payroll.addEmployeeNow(employee, 100000, 'John', 'Doe', { from: owner })
        employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
      })

      const itShouldHandleAllocationsProperly = () => {
        context('when the amount of tokens and allocations match', () => {
          context('when the given list is not empty', () => {
            context('when all the given tokens are allowed', () => {
              it('persists requested allocation', async () => {
                const receipt = await payroll.determineAllocation(tokenAddresses, allocations, { from })

                const events = getEvents(receipt, 'DetermineAllocation')
                assert.equal(events.length, 1, 'number of emitted DetermineAllocation events does not match')
                assert.equal(events[0].args.employee, employee, 'employee address should match')
                assert.equal(events[0].args.employeeId.toString(), employeeId, 'employee id should match')

                for (const tokenAddress of tokenAddresses) {
                  const expectedAllocation = allocations[tokenAddresses.indexOf(tokenAddress)]
                  assert.equal(await payroll.getAllocation(employeeId, tokenAddress), expectedAllocation, 'token allocation does not match')
                }

                assert.equal(await payroll.getAllocation(employeeId, anyone), 0, 'token allocation should be zero')
              })
            })

            context('when at least one token of the list is not allowed', () => {
              let notAllowedToken

              beforeEach('deploy new token', async () => {
                notAllowedToken = await deployErc20TokenAndDeposit(owner, finance, vault, 'Not-allowed token', 14)
              })

              it('reverts', async () => {
                const addresses = [...tokenAddresses, notAllowedToken.address]
                const allocations = [10, 20, 30, 40]

                await assertRevert(payroll.determineAllocation(addresses, allocations, { from }), 'PAYROLL_NO_ALLOWED_TOKEN')
              })
            })
          })

          context('when the given list is empty', () => {
            const addresses = [], allocations = []

            it('reverts', async () => {
              await assertRevert(payroll.determineAllocation(addresses, allocations, { from }), 'PAYROLL_DISTRIBUTION_NO_COMPLETE')
            })
          })
        })

        context('when the amount of tokens and allocations do not match', () => {
          it('reverts', async () => {
            const addresses = [...tokenAddresses, anyone]

            await assertRevert(payroll.determineAllocation(addresses, allocations, { from }), 'PAYROLL_TOKEN_ALLOCATION_MISMATCH')
          })
        })
      }

      context('when the employee is active', () => {
        itShouldHandleAllocationsProperly()
      })

      context('when the employee is not active', () => {
        beforeEach('terminate employee', async () => {
          await payroll.terminateEmployeeNow(employeeId, { from: owner })
          await payroll.mockAddTimestamp(ONE_MONTH)
        })

        itShouldHandleAllocationsProperly()
      })
    })

    context('when the employee does not exist', () => {
      const from = anyone

      it('reverts', async () => {
        await assertRevert(payroll.determineAllocation(tokenAddresses, allocations, { from }), 'PAYROLL_EMPLOYEE_DOES_NOT_MATCH')
      })
    })
  })

  describe('addAllowedToken', () => {
    context('when the sender has permissions', () => {
      const from = owner

      context('when it does not reach the maximum amount allowed', () => {
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

          await payroll.addEmployee(employee, 100000, 'John', 'Doe', NOW - ONE_MONTH, { from: owner })
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
        await assertRevert(payroll.addAllowedToken(usdToken.address, { from }), 'APP_AUTH_FAILED')
      })
    })
  })
})
