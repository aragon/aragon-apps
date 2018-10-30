import { round } from './math-utils'

export const formatTokenAmount = (
  amount,
  isIncoming,
  decimals = 0,
  displaySign = false,
  { rounding = 2 } = {}
) =>
  (displaySign ? (isIncoming ? '+' : '-') : '') +
  Number(round(amount / Math.pow(10, decimals), rounding)).toLocaleString(
    'latn',
    {
      style: 'decimal',
      maximumFractionDigits: 18,
    }
  )

export function makeEtherscanBaseUrl(network) {
  // Don't make etherscan urls if the network isn't one that etherscan supports
  if (
    network === 'main' ||
    network === 'kovan' ||
    network === 'rinkeby' ||
    network === 'ropsten'
  ) {
    return `https://${network === 'main' ? '' : `${network}.`}etherscan.io`
  }
}
