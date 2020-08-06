module.exports = {
  // Called before a dao is deployed.
  preDao: async ({ log }, { web3, artifacts }) => {},

  // Called after the app's proxy is initialized.
  postInit: async (
    { proxy, _experimentalAppInstaller, log },
    { web3, artifacts }
  ) => {},
}
