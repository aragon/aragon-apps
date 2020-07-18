const runSharedVaultTests = require('./vault_shared')

contract('Vault', (accounts) => {
  runSharedVaultTests('Vault', { accounts, artifacts, web3 })
})
