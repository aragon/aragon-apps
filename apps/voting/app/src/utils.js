const PLURALIZE_RE = /\$/g

export function pluralize(count, singular, plural, re = PLURALIZE_RE) {
  if (count === 1) {
    return singular.replace(re, count)
  }
  return plural.replace(re, count)
}

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
