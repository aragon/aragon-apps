const { bigExp } = require('@aragon/apps-agreement/test/helpers/lib/numbers')
const { encodeCallScript } = require('@aragon/contract-test-helpers/evmScript')
const { decodeEventsOfType } = require('@aragon/apps-agreement/test/helpers/lib/decodeEvent')

const EMPTY_SCRIPT = '0x00000001'

module.exports = (web3, artifacts) => {
  const pct = x => bigExp(x, 16)

  const getVoteState = async (voting, id) => {
    const isOpen = await voting.isVoteOpen(id)
    const { executed, startDate, snapshotBlock, supportRequired, minAcceptQuorum, voteOverruleWindow, earlyExecution, yea, nay, votingPower, script } = await voting.getVote(id)
    return { isOpen, isExecuted: executed, startDate, snapshotBlock, support: supportRequired, quorum: minAcceptQuorum, overruleWindow: voteOverruleWindow, earlyExecution, yeas: yea, nays: nay, votingPower, script }
  }

  const voteScript = async (actions = 1) => {
    const ExecutionTarget = artifacts.require('ExecutionTarget')
    const executionTarget = await ExecutionTarget.new()
    const action = { to: executionTarget.address, calldata: executionTarget.contract.methods.execute().encodeABI() }
    const script = encodeCallScript(Array.from(new Array(actions)).map(() => action))
    return { executionTarget, script }
  }

  const createVote = async ({ voting, script = undefined, voteContext = '0xabcdef', from = undefined }) => {
    if (!from) from = (await web3.eth.getAccounts())[0]

    if (script === undefined) script = (await voteScript(1)).script
    if (!script) script = EMPTY_SCRIPT

    const receipt = await voting.newVote(script, voteContext, { from })
    const events = decodeEventsOfType(receipt, artifacts.require('DisputableVoting').abi, 'StartVote')
    assert.equal(events.length, 1, 'number of StartVote emitted events does not match')
    const { voteId } = events[0].args
    return { voteId, receipt }
  }

  return {
    pct,
    voteScript,
    createVote,
    getVoteState
  }
}
