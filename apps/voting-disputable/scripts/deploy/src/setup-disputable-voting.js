const { ANY_ENTITY, getInstalledApp } = require('@aragon/contract-helpers-test/src/aragon-os')

module.exports = async (options = {}) => {
  const agreement = await installAgreement(options)
  const disputableVoting = await installDisputableVoting(options)
  await activateVoting(agreement, disputableVoting, options)
  return { agreement, disputableVoting }
}

async function activateVoting(agreement, voting, options) {
  console.log(`\nActivating DisputableVoting app with Agreement...`)
  const { owner, acl, feeToken, disputableVoting: { actionCollateral, challengeCollateral, challengeDuration } } = options

  await createPermissions(acl, voting, ['SET_AGREEMENT_ROLE'], agreement.address, owner)
  await agreement.activate(voting.address, feeToken.address, challengeDuration, actionCollateral, challengeCollateral, { from: owner })
  console.log(`DisputableVoting app activated!`)
}

async function installDisputableVoting(options) {
  const { owner, acl, dao, disputableVoting: { token, base, appId, support, minQuorum, duration, delegatedVotingPeriod, quietEndingPeriod, quietEndingExtension, executionDelay, actionCollateral, challengeCollateral, challengeDuration } } = options
  console.log(`\nInstalling DisputableVoting app...`)
  const receipt = await dao.newAppInstance(appId, base.address, '0x', false, { from: owner })
  const voting = await base.constructor.at(await getInstalledApp(receipt, appId))

  console.log(`Creating DisputableVoting permissions...`)
  const openPermissions = ['CREATE_VOTES_ROLE', 'CHALLENGE_ROLE']
  await createPermissions(acl, voting, openPermissions, ANY_ENTITY, owner)
  const restrictedPermissions = ['CHANGE_VOTE_TIME_ROLE', 'CHANGE_SUPPORT_ROLE', 'CHANGE_QUORUM_ROLE', 'CHANGE_DELEGATED_VOTING_PERIOD_ROLE', 'CHANGE_EXECUTION_DELAY_ROLE', 'CHANGE_QUIET_ENDING_ROLE']
  await createPermissions(acl, voting, restrictedPermissions, owner)

  console.log(`Initializing DisputableVoting app...`)
  await voting.initialize(token, duration, support, minQuorum, delegatedVotingPeriod, quietEndingPeriod, quietEndingExtension, executionDelay)
  console.log(`Installed DisputableVoting app at ${voting.address}`)
  return voting
}

async function installAgreement(options) {
  const { owner, acl, dao, agreement: { base, appId, title, content }, arbitrator, stakingFactory, setFeesCashier } = options
  console.log(`\nInstalling Agreement app...`)
  const receipt = await dao.newAppInstance(appId, base.address, '0x', false, { from: owner })
  const agreement = await base.constructor.at(getInstalledApp(receipt, appId))

  console.log(`Creating Agreement permissions...`)
  await createPermissions(acl, agreement, ['CHANGE_AGREEMENT_ROLE', 'MANAGE_DISPUTABLE_ROLE'], owner)

  console.log(`Initializing Agreement app...`)
  await agreement.initialize(arbitrator.address, setFeesCashier, title, content, stakingFactory.address)
  console.log(`Installed Agreement app at ${agreement.address}`)
  return agreement
}

async function createPermissions(acl, app, permissions, to, manager = to) {
  for (const permission of permissions) {
    const ROLE = await app[permission]()
    await acl.createPermission(to, app.address, ROLE, manager, { from: manager })
  }
}
