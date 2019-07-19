module.exports = web3 => {
  const bn = x => new web3.BigNumber(x)
  const bigExp = (x, y) => bn(x).mul(bn(10).pow(bn(y)))
  const pct = x => bigExp(x, 16)

  return {
    bn,
    bigExp,
    pct
  }
}
