const { utf8ToHex } = require('web3-utils')
const { getWeb3 } = require('@aragon/contract-helpers-test/src/config')
const { EMPTY_CALLS_SCRIPT } = require('@aragon/contract-helpers-test/src/aragon-os')
const { bn, getEventArgument } = require('@aragon/contract-helpers-test')

module.exports = async (options = {}) => {
  const { agreement: { app: agreement }, disputableVoting: { app: voting } } = options

  console.log('\nSigning the agreement...')
  const currentSettingId = await agreement.getCurrentSettingId()
  await agreement.sign(currentSettingId)

  console.log('\nCreating non challenged action...')
  await newAction(agreement, voting, 'Context for action 1')

  console.log('\nCreating challenged action...')
  const challengedActionId = await newAction(agreement, voting, 'Context for action 2')
  await challenge(agreement, challengedActionId, 'Challenge context for action 2', options)

  console.log('\nCreating settled action...')
  const settledActionId = await newAction(agreement, voting, 'Context for action 3')
  await challenge(agreement, settledActionId, 'Challenge context for action 3', options)
  await settle(agreement, settledActionId)

  console.log('\nCreating disputed action...')
  const disputedActionId = await newAction(agreement, voting, 'Context for action 4')
  await challenge(agreement, disputedActionId, 'Challenge context for action 4', options)
  await dispute(agreement, disputedActionId, options)
}

async function newAction(agreement, voting, context) {
  console.log('Creating action')
  const receipt = await voting.newVote(EMPTY_CALLS_SCRIPT, utf8ToHex(context))
  const actionId = getEventArgument(receipt, 'ActionSubmitted', 'actionId', { decodeForAbi: agreement.abi })
  console.log(`Created action ID ${actionId}`)
  return actionId
}

async function challenge(agreement, actionId, context, options) {
  console.log('Approving dispute fees from challenger...')
  const { feeToken, arbitrator } = options
  const { feeAmount } = await arbitrator.getDisputeFees()
  const challenger = await getChallenger()
  await approveFeeToken(feeToken, challenger, agreement.address, feeAmount)
  console.log('Challenging action...')
  await agreement.challengeAction(actionId, 0, true, utf8ToHex(context), { from: challenger })
  console.log(`Challenged action ID ${actionId}`)
}

async function settle(agreement, actionId) {
  console.log('Settling action...')
  await agreement.settleAction(actionId)
  console.log(`Settled action ID ${actionId}`)
}

async function dispute(agreement, actionId, options) {
  console.log('Approving dispute fees from submitter...')
  const { feeToken, arbitrator, owner } = options
  const { feeAmount } = await arbitrator.getDisputeFees()
  await approveFeeToken(feeToken, owner, agreement.address, feeAmount)
  await agreement.disputeAction(actionId, true)
  console.log(`Disputing action ID ${actionId}`)
}

async function approveFeeToken(token, from, to, amount) {
  const allowance = await token.allowance(from, to)
  if (allowance.gt(bn(0))) await token.approve(to, 0, { from })
  const newAllowance = amount.add(allowance)
  await token.generateTokens(from, amount)
  return token.approve(to, newAllowance, { from })
}

async function getChallenger() {
  const web3 = getWeb3()
  const accounts = await web3.eth.getAccounts()
  return accounts[1]
}
