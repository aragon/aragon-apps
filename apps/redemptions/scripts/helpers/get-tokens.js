const BN = require('bn.js')

const base = new BN(10).pow(new BN(18))
const tokens = [
  {
    name: 'Aragon',
    symbol: 'ANT',
    amount: new BN(40).mul(base),
  },
  {
    name: 'Dai Token',
    symbol: 'DAI',
    amount: new BN(100).mul(base),
  },
  {
    name: 'Omise Go',
    symbol: 'OMG',
    amount: new BN(14189).mul(base),
  },
]

module.exports = {
  base,
  tokens,
}
