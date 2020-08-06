let vault

module.exports = {
  postDao: async function({ _experimentalAppInstaller, log }, bre) {
    // TODO: deploy off node module once we include the feature on buidler plugin
    vault = await _experimentalAppInstaller('vault')
    log(`> Vault app installed: ${vault.address}`)
  },

  preInit: async function({ proxy, log }, bre) {
    await vault.createPermission('TRANSFER_ROLE', proxy.address)
    log(`> TRANSFER_ROLE assigned to ${proxy.address}`)
  },

  getInitParams: async function({}, bre) {
    const ONE_DAY = 60 * 60 * 24 // One day in seconds
    const PERIOD_DURATION = ONE_DAY

    return [vault.address, PERIOD_DURATION]
  },
}
