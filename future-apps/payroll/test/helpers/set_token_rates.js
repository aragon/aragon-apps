const SIG = '00'.repeat(65) // sig full of 0s

module.exports = web3 => {

  function formatRate(n) {
    const { bn, bigExp } = require('./numbers')(web3)
    const ONE = bigExp(1, 18)
    return bn(n.toFixed(18)).times(ONE)
  }

  return async function setTokenRates(feed, denominationToken, tokens, rates, when = undefined) {
    if (!when) when = await feed.getTimestampPublic()

    const quotes = tokens.map(token => typeof(token) === 'object' ? token.address : token)
    const bases = tokens.map(() => typeof(denominationToken) === 'object' ? denominationToken.address : denominationToken)
    const xrts = rates.map(rate => formatRate(rate))
    const whens = tokens.map(() => when)
    const sigs = `0x${SIG.repeat(tokens.length)}`

    return feed.updateMany(bases, quotes, xrts, whens, sigs)
  }

}
