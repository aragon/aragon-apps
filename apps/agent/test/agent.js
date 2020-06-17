const runSharedAgentTests = require('./agent_shared.js')

contract('Agent', (accounts) => {
  runSharedAgentTests('AgentMock', { accounts, artifacts, web3 })
})
