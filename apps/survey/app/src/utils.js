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

export function log(...params) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...params)
  }
}
