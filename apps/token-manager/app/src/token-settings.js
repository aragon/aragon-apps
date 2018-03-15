const tokenSettings = [
  ['symbol', 'tokenSymbol'],
  ['totalSupply', 'tokenSupply'],
]

export function hasLoadedTokenSettings(state) {
  state = state || {}
  return tokenSettings.reduce(
    (loaded, [_, key]) => loaded && !!state[key],
    true
  )
}

export default tokenSettings
