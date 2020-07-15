const voteSettings = [
  ['token', 'tokenAddress'],
  ['voteTime', 'voteTime', 'time'],
  ['PCT_BASE', 'pctBase', 'bignumber'],
]

export function hasLoadedVoteSettings(state) {
  state = state || {}
  return voteSettings.reduce((loaded, [_, key]) => loaded && !!state[key], true)
}

export default voteSettings
