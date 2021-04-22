const SIG = '00'.repeat(65) // sig full of 0s

const ETH = '0x0000000000000000000000000000000000000000'
const USD = '0xFFFfFfffffFFFFFFFfffFFFFFffffFfFfFAAaCbB' // USD identifier: https://github.com/aragon/ppf#tickers-and-token-addresses

module.exports = (artifacts, web3) => {
  const { ONE, bn, bigExp } = require('./numbers')(web3)

  const formatRate = n => bn(n.toFixed(18)).times(ONE)

  const ETH_RATE = formatRate(20)   // 1 ETH = 20 USD
  const DAI_RATE = formatRate(1)    // 1 DAI = 1 USD
  const ANT_RATE = formatRate(0.5)  // 1 ANT = 0.5 USD

  function inverseRate(rate) {
    // Mimic EVM truncation
    return ONE.pow(2).div(rate).trunc()
  }

  function exchangedAmount(amount, rate, tokenAllocation) {
    // Invert the rate, as we always set the denomination token as the price feed's quote token
    const inversedRate = inverseRate(rate)
    // Mimic EVM calculation and truncation for token conversion
    return amount.mul(inversedRate).mul(tokenAllocation).div(ONE.mul(100)).trunc()
  }

  const deployANT = async (sender, finance) => deployTokenAndDeposit(sender, finance, 'ANT')
  const deployDAI = async (sender, finance) => deployTokenAndDeposit(sender, finance, 'DAI')

  async function deployTokenAndDeposit(sender, finance, name = 'ERC20Token', decimals = 18) {
    const MiniMeToken = artifacts.require('MiniMeToken')
    const token = await MiniMeToken.new('0x0', '0x0', 0, name, decimals, 'E20', true) // dummy parameters for minime
    const amount = bigExp(1e18, decimals)
    await token.generateTokens(sender, amount)
    await token.approve(finance.address, amount, { from: sender })
    await finance.deposit(token.address, amount, `Initial ${name} deposit`, { from: sender })
    return token
  }

  async function setTokenRate(feed, denominationToken, token, rate, when = undefined) {
    if (!when) when = await feed.getTimestampPublic()

    const base = typeof(token) === 'object' ? token.address : token
    const quote = typeof(denominationToken) === 'object' ? denominationToken.address : denominationToken

    return feed.update(base, quote, rate, when, SIG)
  }

  async function setTokenRates(feed, denominationToken, tokens, rates, when = undefined) {
    if (!when) when = await feed.getTimestampPublic()

    const bases = tokens.map(token => typeof(token) === 'object' ? token.address : token)
    const quotes = tokens.map(() => typeof(denominationToken) === 'object' ? denominationToken.address : denominationToken)
    const whens = tokens.map(() => when)
    const sigs = `0x${SIG.repeat(tokens.length)}`

    return feed.updateMany(bases, quotes, rates, whens, sigs)
  }

  return {
    ETH,
    USD,
    ETH_RATE,
    DAI_RATE,
    ANT_RATE,
    formatRate,
    inverseRate,
    exchangedAmount,
    deployANT,
    deployDAI,
    deployTokenAndDeposit,
    setTokenRate,
    setTokenRates,
  }
}
