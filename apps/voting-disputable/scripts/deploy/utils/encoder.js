const abi = require('web3-eth-abi')
const ACL_ABI = require('../abi/ACL.json')
const VOTING_ABI = require('../abi/Voting.json')

const CALLSCRIPT_ID = '0x00000001'

function encodeCallsScript(actions) {
  return actions.reduce((script, { to, data }) => {
    const address = abi.encodeParameter('address', to)
    const dataLength = abi.encodeParameter('uint256', (data.length - 2) / 2).toString('hex')
    return script + address.slice(26) + dataLength.slice(58) + data.slice(2)
  }, CALLSCRIPT_ID)
}

function encodeGrantPermission(entity, app, role) {
  const grantPermissionABI = getFunctionABI(ACL_ABI, 'grantPermission')
  return abi.encodeFunctionCall(grantPermissionABI, [entity, app, role])
}

function encodeNewVote(script, metadata) {
  const newVoteABI = getFunctionABI(VOTING_ABI, 'newVote')
  return abi.encodeFunctionCall(newVoteABI, [script, metadata, true, true])
}

function encodeVote(voteId, supports) {
  const voteABI = getFunctionABI(VOTING_ABI, 'vote')
  return abi.encodeFunctionCall(voteABI, [voteId, supports, true])
}

function encodeForward(script) {
  const forwardABI = getFunctionABI(VOTING_ABI, 'forward')
  return abi.encodeFunctionCall(forwardABI, [script])
}

function getFunctionABI(ABI, functionName) {
  const functionABI = ABI.find(item => item.type === 'function' && item.name === functionName)
  if (!functionABI) throw Error(`Could not find function ABI called ${functionName}`)
  return functionABI
}

module.exports = {
  encodeVote,
  encodeNewVote,
  encodeForward,
  encodeGrantPermission,
  encodeCallsScript,
}
