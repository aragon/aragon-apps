const voteSettings = [
  ['voteTime', 'voteTime'],
  ['PCT_BASE', 'pctBase'],
  ['supportRequiredPct', 'supportRequiredPct'],
]

export function hasLoadedVoteSettings(state) {
  state = state || {}
  return voteSettings.reduce((loaded, [_, key]) => loaded && !!state[key], true)
}

export default voteSettings
