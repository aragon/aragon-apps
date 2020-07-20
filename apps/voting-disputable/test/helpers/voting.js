const { decodeEvents } = require('@aragon/contract-helpers-test')
const { getArtifacts, getWeb3 } = require('@aragon/contract-helpers-test/src/config')
const { EMPTY_CALLS_SCRIPT, encodeCallScript } = require('@aragon/contract-helpers-test/src/aragon-os')

const getVoteState = async (voting, id) => {
  const isOpen = await voting.isVoteOpen(id)
  const { executed, startDate, snapshotBlock, supportRequired, minAcceptQuorum, voteOverruleWindow, voteExecutionDelay, earlyExecution, yea, nay, votingPower, script } = await voting.getVote(id)
  return { isOpen, isExecuted: executed, startDate, snapshotBlock, support: supportRequired, quorum: minAcceptQuorum, overruleWindow: voteOverruleWindow, executionDelay: voteExecutionDelay, earlyExecution, yeas: yea, nays: nay, votingPower, script }
}

const voteScript = async (actions = 1) => {
  const artifacts = getArtifacts()
  const ExecutionTarget = artifacts.require('ExecutionTarget')
  const executionTarget = await ExecutionTarget.new()
  const action = { to: executionTarget.address, calldata: executionTarget.contract.methods.execute().encodeABI() }
  const script = encodeCallScript(Array.from(new Array(actions)).map(() => action))
  return { executionTarget, script }
}

const createVote = async ({ voting, script = undefined, voteContext = '0xabcdef', from = undefined }) => {
  if (!from) {
    const web3 = getWeb3()
    from = (await web3.eth.getAccounts())[0]
  }

  if (script === undefined) script = (await voteScript(1)).script
  if (!script) script = EMPTY_CALLS_SCRIPT

  const artifacts = getArtifacts()
  const receipt = await voting.newVote(script, voteContext, { from })
  const events = decodeEvents(receipt, artifacts.require('DisputableVoting').abi, 'StartVote')
  assert.equal(events.length, 1, 'number of StartVote emitted events does not match')
  const { voteId } = events[0].args
  return { voteId, receipt }
}

module.exports = {
  voteScript,
  createVote,
  getVoteState
}
