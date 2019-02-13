const runSharedVaultTests = require('./vault_shared.js')

contract('Vault', (accounts) => {
  runSharedVaultTests('Vault', { accounts, artifacts, web3 })
})
