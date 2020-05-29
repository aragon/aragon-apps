const { BN } = require('web3-utils')

const bn = x => new BN(x)
const bigExp = (x, y) => bn(x).mul(bn(10).pow(bn(y)))
const maxUint = (e) => bn(2).pow(bn(e)).sub(bn(1))
const isBigNumber = x => x instanceof BN || (x && x.constructor && x.constructor.name === BN.name)

module.exports = {
  bn,
  bigExp,
  maxUint,
  isBigNumber,
}
