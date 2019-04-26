const { SECONDS_IN_A_YEAR } = require('./time')

module.exports = web3 => {
  const bn = x => new web3.BigNumber(x)
  const bigExp = (x, y) => bn(x).mul(bn(10).pow(bn(y)))
  const maxUint = (e) => bn(2).pow(bn(e)).sub(bn(1))
  const annualSalaryPerSecond = (amount, decimals = 18) => bigExp(amount, decimals).dividedToIntegerBy(SECONDS_IN_A_YEAR)

  const ONE = bigExp(1, 18)
  const MAX_UINT64 = maxUint(64)
  const MAX_UINT256 = maxUint(256)

  return {
    bn,
    bigExp,
    annualSalaryPerSecond,
    ONE,
    MAX_UINT64,
    MAX_UINT256,
  }
}
