const VOTING_ABI = require('../abi/Voting.json')
const { getWeb3 } = require('@aragon/contract-helpers-test/src/config')
const { getEventArgument } = require('@aragon/contract-helpers-test')
const { encodeNewVote, encodeVote, encodeForward, encodeGrantPermission, encodeCallsScript } = require('../utils/encoder')

module.exports = async (options = {}) => {
  const { dao, acl, owner } = options
  await grantPermission(acl, owner, acl, 'CREATE_PERMISSIONS_ROLE', options)
  await grantPermission(acl, owner, dao, 'APP_MANAGER_ROLE', options)
}

async function grantPermission(acl, to, app, roleName, options = {}) {
  const web3 = getWeb3()
  const { tokenManager, voting, owner } = options

  console.log(`\nGranting ${roleName} to ${to}...`)
  const role = await app[roleName]()
  const grantPermissionData = encodeGrantPermission(to, app.address, role)
  const grantPermissionCallsScript = encodeCallsScript([{ to: acl.address, data: grantPermissionData }])
  const grantPermissionVoteData = encodeNewVote(grantPermissionCallsScript, `Grant ${roleName} to ${to}`)
  const grantPermissionTokenCallsScript = encodeCallsScript([{ to: voting, data: grantPermissionVoteData }])
  const forwardData = encodeForward(grantPermissionTokenCallsScript)
  const grantPermissionTx = { data: forwardData, to: tokenManager, ...app.constructor.class_defaults, from: owner }
  const { transactionHash: grantPermissionTxHash } = await web3.eth.sendTransaction(grantPermissionTx)
  const { logs: grantPermissionRawLogs } = await web3.eth.getTransactionReceipt(grantPermissionTxHash)
  console.log(`Vote submitted to grant ${roleName}: ${grantPermissionTxHash}`)

  const voteId = getEventArgument({ rawLogs: grantPermissionRawLogs }, 'StartVote', 'voteId', { decodeForAbi: VOTING_ABI })
  const voteData = encodeVote(voteId, true)
  const voteTx = { data: voteData, to: voting, ...app.constructor.class_defaults, from: owner }
  const voteReceipt = await web3.eth.sendTransaction(voteTx)
  console.log(`Voted in favor on vote ${voteId}: ${voteReceipt.transactionHash}`)
}
