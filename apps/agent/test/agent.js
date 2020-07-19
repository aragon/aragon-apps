const runSharedAgentTests = require('./agent_shared')

contract('Agent', (accounts) => {
  runSharedAgentTests('AgentMock', { accounts, artifacts, web3 })
})
