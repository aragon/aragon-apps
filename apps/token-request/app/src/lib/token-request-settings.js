const tokenRequestSettings = [['token', 'token'], ['acceptedTokens', 'acceptedTokens']]

export function hasLoadedtokenRequestSettings(state) {
  state = state || {}
  return tokenRequestSettings.reduce((loaded, [_, key]) => loaded && !!state[key], true)
}

export default tokenRequestSettings
