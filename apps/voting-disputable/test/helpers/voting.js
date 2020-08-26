const { getArtifacts, getWeb3 } = require('@aragon/contract-helpers-test/src/config')
const { ZERO_ADDRESS, bn, decodeEvents } = require('@aragon/contract-helpers-test')
const { EMPTY_CALLS_SCRIPT, encodeCallScript } = require('@aragon/contract-helpers-test/src/aragon-os')

const VOTER_STATE = {
  ABSENT: 0,
  YEA: 1,
  NAY: 2,
}

const VOTE_STATUS = {
  ACTIVE: 0,
  PAUSED: 1,
  CANCELLED: 2,
  EXECUTED: 3,
}

const getVoteState = async (voting, id) => {
  const { yea, nay, votingPower, settingId, actionId, status, startDate, snapshotBlock, pausedAt, pauseDuration, quietEndingExtensionDuration, quietEndingSnapshotSupport, executionScriptHash } = await voting.getVote(id)
  const isOpen = await voting.isVoteOpen(id)
  const isExecuted = status.eq(bn(VOTE_STATUS.EXECUTED))
  return { isOpen, isExecuted, startDate, snapshotBlock, settingId, status, actionId, yeas: yea, nays: nay, votingPower, pausedAt, pauseDuration, quietEndingExtensionDuration, quietEndingSnapshotSupport, executionScriptHash }
}

const getVoteSetting = async (voting, id) => {
  const { settingId } = await voting.getVote(id)
  const { supportRequiredPct, minAcceptQuorumPct, executionDelay, overruleWindow, quietEndingPeriod, quietEndingExtension } = await voting.getSetting(settingId)
  return { supportRequiredPct, minAcceptQuorumPct, executionDelay, overruleWindow, quietEndingPeriod, quietEndingExtension }
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
  const agreementAddress = await voting.getAgreement()
  if (agreementAddress !== ZERO_ADDRESS) {
    const Agreement = artifacts.require('Agreement')
    const agreement = await Agreement.at(agreementAddress)
    let { mustSign } = await agreement.getSigner(from)
    if (mustSign) await agreement.sign(await agreement.getCurrentSettingId(), { from })
  }

  const receipt = await voting.newVote(script, voteContext, { from })
  const events = decodeEvents(receipt, artifacts.require('DisputableVoting').abi, 'StartVote')
  assert.equal(events.length, 1, 'number of StartVote emitted events does not match')
  const { voteId } = events[0].args
  return { voteId, script, receipt }
}

module.exports = {
  VOTER_STATE,
  VOTE_STATUS,
  voteScript,
  createVote,
  getVoteState,
  getVoteSetting
}
