const voteSettings = [
  ['token', 'tokenAddress'],
  ['voteTime', 'voteTime', 'time'],
  ['PCT_BASE', 'pctBase', 'bignumber'],
]

export function hasLoadedVoteSettings(state) {
  state = state || {}
  return voteSettings.every(([_, key]) => state[key])
}

export default voteSettings
