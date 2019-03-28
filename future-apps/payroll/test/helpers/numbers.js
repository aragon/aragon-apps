module.exports = web3 => {
  const bn = x => new web3.BigNumber(x)
  const bigExp = (x, y) => bn(x).mul(bn(10).pow(bn(y)))

  const maxUint = (e) => bn(2).pow(bn(e)).sub(bn(1))
  const maxUint64 = () => maxUint(64)
  const maxUint256 = () => maxUint(256)

  return {
    bn,
    bigExp,
    maxUint64,
    maxUint256,
  }
}
