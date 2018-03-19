const financeSettings = [['vault', 'vaultAddress']]

export function hasLoadedFinanceSettings(state) {
  state = state || {}
  return financeSettings.reduce(
    (loaded, [_, key]) => loaded && !!state[key],
    true
  )
}

export default financeSettings
