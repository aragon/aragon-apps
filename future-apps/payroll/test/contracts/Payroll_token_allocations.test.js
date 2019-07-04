const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { annualSalaryPerSecond } = require('../helpers/numbers')(web3)
const { getEvents, getEventArgument } = require('@aragon/test-helpers/events')
const { NOW, ONE_MONTH, RATE_EXPIRATION_TIME } = require('../helpers/time')
const { USD, deployDAI, deployTokenAndDeposit } = require('../helpers/tokens')(artifacts, web3)
const { deployContracts, createPayrollAndPriceFeed } = require('../helpers/deploy')(artifacts, web3)

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

contract('Payroll token allocations', ([owner, employee, anyone]) => {
  let dao, payroll, payrollBase, finance, vault, priceFeed, DAI

  before('deploy base apps and tokens', async () => {
    ({ dao, finance, vault, payrollBase } = await deployContracts(owner))
    DAI = await deployDAI(owner, finance)
  })

  beforeEach('create payroll and price feed instance', async () => {
    ({ payroll, priceFeed } = await createPayrollAndPriceFeed(dao, payrollBase, owner, NOW))
  })

  describe('determineAllocation', () => {
    const tokenAddresses = []

    before('deploy some tokens', async () => {
      const token1 = await deployTokenAndDeposit(owner, finance, 'Token 1', 14)
      const token2 = await deployTokenAndDeposit(owner, finance, 'Token 2', 14)
      const token3 = await deployTokenAndDeposit(owner, finance, 'Token 3', 14)
      tokenAddresses.push(token1.address, token2.address, token3.address)
    })

    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app using USD as denomination token', async () => {
        await payroll.initialize(finance.address, USD, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      beforeEach('allow multiple tokens', async () => {
        await Promise.all(tokenAddresses.map(address => payroll.setAllowedToken(address, true, { from: owner })))
      })

      context('when the employee exists', () => {
        const from = employee
        let employeeId

        beforeEach('add employee', async () => {
          const receipt = await payroll.addEmployee(employee, annualSalaryPerSecond(100000), await payroll.getTimestampPublic(), 'Boss', { from: owner })
          employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
        })

        const itShouldHandleAllocationsProperly = () => {
          context('when the amount of tokens, distribution, and rates match', () => {
            context('when the given list is not empty', () => {
              context('when all the given tokens are allowed', () => {
                context('when the distribution adds up to 100', () => {

                  const itDeterminesAllocationsProperly = (distribution, minRates) => {
                    context('when there was no previous allocation', () => {
                      it('persists requested allocation', async () => {
                        const receipt = await payroll.determineAllocation(tokenAddresses, distribution, minRates, { from })

                        const events = getEvents(receipt, 'DetermineAllocation')
                        assert.equal(events.length, 1, 'number of emitted DetermineAllocation events does not match')
                        assert.equal(events[0].args.employeeId.toString(), employeeId, 'employee id should match')

                        for (const tokenAddress of tokenAddresses) {
                          const tokenIndex = tokenAddresses.indexOf(tokenAddress)
                          const expectedAllocation = distribution[tokenIndex]
                          const expectedMinRate = minRates[tokenIndex]

                          const [percentage, minRate] = await payroll.getAllocation(employeeId, tokenAddress);
                          assert.equal(percentage, expectedAllocation, 'allocation percentage does not match')
                          assert.equal(minRate, expectedMinRate, 'allocation min acceptable rate does not match')
                        }

                        const [percentage, minRate] = await payroll.getAllocation(employeeId, anyone);
                        assert.equal(percentage, 0, 'allocation percentage does not match')
                        assert.equal(minRate, 0, 'allocation min acceptable rate does not match')
                      })
                    })

                    context('when there was a previous allocation', () => {
                      let token

                      beforeEach('submit previous allocation', async () => {
                        token = await deployTokenAndDeposit(owner, finance, 'Previous Token', 18)
                        await payroll.setAllowedToken(token.address, true, { from: owner })

                        await payroll.determineAllocation([token.address], [100], [1e18], { from })

                        const [percentage, minRate] = await payroll.getAllocation(employeeId, token.address)
                        assert.equal(percentage.toString(), 100, 'allocation percentage does not match')
                        assert.equal(minRate.toString(), 1e18, 'allocation min acceptable rate does not match')

                        for (const tokenAddress of tokenAddresses) {
                          const [percentage, minRate] = await payroll.getAllocation(employeeId, tokenAddress)
                          assert.equal(percentage.toString(), 0, 'allocation percentage does not match')
                          assert.equal(minRate.toString(), 0, 'allocation min acceptable rate does not match')
                        }
                      })

                      it('replaces previous allocation for the requested one', async () => {
                        await payroll.determineAllocation(tokenAddresses, distribution, minRates, { from })

                        for (const tokenAddress of tokenAddresses) {
                          const tokenIndex = tokenAddresses.indexOf(tokenAddress)
                          const expectedAllocation = distribution[tokenIndex]
                          const expectedMinRate = minRates[tokenIndex]
                          const [percentage, minRate] = await payroll.getAllocation(employeeId, tokenAddress)

                          assert.equal(percentage.toString(), expectedAllocation, 'allocation percentage does not match')
                          assert.equal(minRate.toString(), expectedMinRate, 'allocation min acceptable rate does not match')
                        }

                        const [percentage, minRate] = await payroll.getAllocation(employeeId, token.address)
                        assert.equal(percentage.toString(), 0, 'allocation percentage does not match')
                        assert.equal(minRate.toString(), 0, 'allocation min acceptable rate does not match')
                      })
                    })
                  }

                  context('when the allocation list does not include zero values', () => {
                    const distribution = [10, 20, 70], minRates = [1e18, 5e18, 10e18]

                    itDeterminesAllocationsProperly(distribution, minRates)
                  })

                  context('when the allocation list includes zero values', () => {
                    const distribution = [90, 10, 0], minRates = [1e18, 5e18, 10e18]

                    itDeterminesAllocationsProperly(distribution, minRates)
                  })
                })

                context('when the distribution adds up less than 100', () => {
                  const distribution = [10, 20, 69], minRates = [1e18, 2e18, 5e18]

                  it('reverts', async () => {
                    await assertRevert(payroll.determineAllocation(tokenAddresses, distribution, minRates, { from }), 'PAYROLL_DISTRIBUTION_NOT_FULL')
                  })
                })

                context('when the distribution adds up more than 100', () => {
                  const distribution = [10, 20, 71], minRates = [1e18, 2e18, 5e18]

                  it('reverts', async () => {
                    await assertRevert(payroll.determineAllocation(tokenAddresses, distribution, minRates, { from }), 'PAYROLL_DISTRIBUTION_NOT_FULL')
                  })
                })
              })

              context('when at least one token of the list is not allowed', () => {
                let notAllowedToken

                beforeEach('deploy new token', async () => {
                  notAllowedToken = await deployTokenAndDeposit(owner, finance, 'Not-allowed token', 14)
                })

                it('reverts', async () => {
                  const addresses = [...tokenAddresses, notAllowedToken.address]
                  const distribution = [10, 20, 30, 40], minRates = [1e18, 2e18, 5e18, 10e18]

                  await assertRevert(payroll.determineAllocation(addresses, distribution, minRates, { from }), 'PAYROLL_NOT_ALLOWED_TOKEN')
                })
              })
            })

            context('when the given list is empty', () => {
              const addresses = [], distribution = [], minRates = []

              it('reverts', async () => {
                await assertRevert(payroll.determineAllocation(addresses, distribution, minRates, { from }), 'PAYROLL_DISTRIBUTION_NOT_FULL')
              })
            })
          })

          context('when the amount of tokens and distribution do not match', () => {
            it('reverts', async () => {
              const distribution = [100]
              const addresses = [...tokenAddresses, anyone]
              const minRates = [1e18]

              await assertRevert(payroll.determineAllocation(addresses, distribution, minRates, { from }), 'PAYROLL_TOKEN_ALLOCATION_MISMATCH')
            })
          })

          context('when the amount of tokens and rates do not match', () => {
            it('reverts', async () => {
              const distribution = [100]
              const addresses = [anyone]
              const minRates = [1e18, 2e18]

              await assertRevert(payroll.determineAllocation(addresses, distribution, minRates, { from }), 'PAYROLL_TOKEN_ALLOCATION_MISMATCH')
            })
          })
        }

        context('when the employee is active', () => {
          itShouldHandleAllocationsProperly()
        })

        context('when the employee is not active', () => {
          beforeEach('terminate employee', async () => {
            await payroll.terminateEmployee(employeeId, await payroll.getTimestampPublic(), { from: owner })
            await payroll.mockIncreaseTime(ONE_MONTH)
          })

          itShouldHandleAllocationsProperly()
        })
      })

      context('when the employee does not exist', () => {
        const from = anyone

        it('reverts', async () => {
          await assertRevert(payroll.determineAllocation(tokenAddresses, [100, 0, 0], [0, 0, 0], { from }), 'PAYROLL_SENDER_DOES_NOT_MATCH')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      it('reverts', async () => {
        await assertRevert(payroll.determineAllocation(tokenAddresses, [10, 20, 70], [0, 0, 0], { from: employee }), 'PAYROLL_SENDER_DOES_NOT_MATCH')
      })
    })
  })

  describe('getAllocation', () => {
    context('when it has already been initialized', function () {
      beforeEach('initialize payroll app using USD as denomination token', async () => {
        await payroll.initialize(finance.address, USD, priceFeed.address, RATE_EXPIRATION_TIME, { from: owner })
      })

      context('when the employee exists', () => {
        let employeeId

        beforeEach('add employee', async () => {
          const receipt = await payroll.addEmployee(employee, annualSalaryPerSecond(100000), await payroll.getTimestampPublic(), 'Boss', { from: owner })
          employeeId = getEventArgument(receipt, 'AddEmployee', 'employeeId')
        })

        const itShouldAnswerAllocationsProperly = () => {
          context('when the given token is not the zero address', () => {
            context('when the given token was allowed', () => {
              beforeEach('allow denomination token', async () => {
                await payroll.setAllowedToken(DAI.address, true, { from: owner })
              })

              context('when the given token was picked by the employee', () => {
                beforeEach('determine allocation', async () => {
                  await payroll.determineAllocation([DAI.address], [100], [1e18], { from: employee })
                })

                it('tells its corresponding allocation', async () => {
                  const [percentage, minRate] = await payroll.getAllocation(employeeId, DAI.address)
                  assert.equal(percentage.toString(), 100, 'allocation percentage does not match')
                  assert.equal(minRate.toString(), 1e18, 'allocation min acceptable rate does not match')
                })
              })

              context('when the given token was not picked by the employee', () => {
                it('returns 0', async () => {
                  const [percentage, minRate] = await payroll.getAllocation(employeeId, DAI.address)
                  assert.equal(percentage.toString(), 0, 'allocation percentage does not match')
                  assert.equal(minRate.toString(), 0, 'allocation min acceptable rate does not match')
                })
              })
            })

            context('when the given token was not allowed', () => {
              it('returns 0', async () => {
                const [percentage, minRate] = await payroll.getAllocation(employeeId, DAI.address)
                assert.equal(percentage.toString(), 0, 'allocation percentage does not match')
                assert.equal(minRate.toString(), 0, 'allocation min acceptable rate does not match')
              })
            })
          })

          context('when the given token is the zero address', () => {
            const token = ZERO_ADDRESS

            context('when the given token was allowed', () => {
              beforeEach('allow denomination token', async () => {
                await payroll.setAllowedToken(token, true, { from: owner })
              })

              context('when the given token was picked by the employee', () => {
                beforeEach('determine allocation', async () => {
                  await payroll.determineAllocation([token], [100], [0], { from: employee })
                })

                it('tells its corresponding allocation', async () => {
                  const [percentage, minRate] = await payroll.getAllocation(employeeId, token)
                  assert.equal(percentage.toString(), 100, 'allocation percentage does not match')
                  assert.equal(minRate.toString(), 0, 'allocation min acceptable rate does not match')
                })
              })

              context('when the given token was not picked by the employee', () => {
                it('returns 0', async () => {
                  const [percentage, minRate] = await payroll.getAllocation(employeeId, token)
                  assert.equal(percentage.toString(), 0, 'allocation percentage does not match')
                  assert.equal(minRate.toString(), 0, 'allocation min acceptable rate does not match')
                })
              })
            })

            context('when the given token was not allowed', () => {
              it('returns 0', async () => {
                const [percentage, minRate] = await payroll.getAllocation(employeeId, token)
                assert.equal(percentage.toString(), 0, 'allocation percentage does not match')
                assert.equal(minRate.toString(), 0, 'allocation min acceptable rate does not match')
              })
            })
          })
        }

        context('when the employee is active', () => {
          itShouldAnswerAllocationsProperly()
        })

        context('when the employee is not active', () => {
          beforeEach('terminate employee', async () => {
            await payroll.terminateEmployee(employeeId, await payroll.getTimestampPublic(), { from: owner })
            await payroll.mockIncreaseTime(ONE_MONTH)
          })

          itShouldAnswerAllocationsProperly()
        })
      })

      context('when the employee does not exist', () => {
        const employeeId = 0

        it('reverts', async () => {
          await assertRevert(payroll.getAllocation(employeeId, DAI.address), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')
        })
      })
    })

    context('when it has not been initialized yet', function () {
      const employeeId = 0

      it('reverts', async () => {
        await assertRevert(payroll.getAllocation(employeeId, DAI.address), 'PAYROLL_EMPLOYEE_DOESNT_EXIST')
      })
    })
  })
})
