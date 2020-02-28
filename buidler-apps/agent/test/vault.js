// Test that Agent is a fully functioning Vault by running the same tests against the Agent app
const runSharedVaultTests = require('../../vault/test/vault_shared.js')

contract('Agent app (Vault compatibility)', (accounts) => {
  runSharedVaultTests('Agent', { accounts, artifacts, web3 })
})
