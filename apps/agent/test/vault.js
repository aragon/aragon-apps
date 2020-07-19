// Test that Agent is a fully functioning Vault by running the same tests against the Agent app
const runSharedVaultTests = require('@aragon/apps-vault/test/vault_shared')

contract('Agent app (Vault compatibility)', (accounts) => {
  runSharedVaultTests('Agent', { accounts, artifacts, web3 })
})
