const tokenSettings = [
  ['decimals', 'tokenDecimals', 'number'],
  ['symbol', 'tokenSymbol'],
  ['totalSupply', 'tokenSupply', 'number'],
]

export function hasLoadedTokenSettings(state) {
  state = state || {}
  return tokenSettings.reduce(
    // Use null check as totalSupply may be 0
    (loaded, [_, key]) => loaded && state[key] != null,
    true
  )
}

export default tokenSettings
