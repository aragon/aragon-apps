const runSharedAgentTests = require('./agent_shared.js')

contract('Agent', (accounts) => {
  runSharedAgentTests('Agent', { accounts, artifacts, web3 })
})
