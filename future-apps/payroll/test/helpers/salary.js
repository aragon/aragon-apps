module.exports = web3 => {
  const { SECONDS_IN_A_YEAR } = require('./time')
  const { bigExp } = require('@aragon/test-helpers/numbers')(web3)

  const annualSalaryPerSecond = (amount, decimals = 18) => bigExp(amount, decimals).dividedToIntegerBy(SECONDS_IN_A_YEAR)

  return {
    annualSalaryPerSecond,
  }
}
