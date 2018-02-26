const path = require('path')

const apmMigration = require('@aragon/os/migrations/2_apm')
const daoFactoryMigration = require('@aragon/os/migrations/3_factory')

const DevTemplate = artifacts.require('DevTemplate')
const Voting = artifacts.require('@aragon/apps-voting/contracts/Voting')
const Vault = artifacts.require('@aragon/apps-voting/contracts/Vault')
const MiniMeTokenFactory = artifacts.require('@aragon/os/lib/minime/MiniMeTokenFactory')
const MiniMeToken = artifacts.require('@aragon/os/lib/minime/MiniMeToken')

const votingIpfs = 'ipfs:QmV5sEjshcZ6mu6uFUhJkWM5nTa53wbHfRFDD4Qy2Yx88m'
const vaultIpfs = 'ipfs:QmPhd9aQGGoHJNcVVAmbzudShvhpYmyKxLWgqLoqSGD81G'

const EMPTY_SCRIPT = '0x00000001'

module.exports = async (deployer, network, accounts) => {
  const { apm, ensAddr } = await apmMigration(deployer, network, accounts, artifacts)
  const { daoFact } = await daoFactoryMigration(deployer, network, accounts, artifacts)
  const votingBase = await Voting.new()
  const vaultBase = await Vault.new()

  const minimeFac = await MiniMeTokenFactory.new()
  const template = await DevTemplate.new(daoFact.address, minimeFac.address, apm.address)
  await template.apmInit(votingBase.address, votingIpfs, vaultBase.address, vaultIpfs)

  const receipt = await template.createInstance()

  const daoAddr = receipt.logs.filter(l => l.event == 'DeployInstance')[0].args.dao

  const votingId = await template.votingAppId()
  const vaultId = await template.vaultAppId()
  const installedApps = receipt.logs.filter(l => l.event == 'InstalledApp')
  const votingAddr = installedApps.filter(e => e.args.appId == votingId)[0].args.appProxy
  const vaultAddr = installedApps.filter(e => e.args.appId == vaultId)[0].args.appProxy

  // Create a new vote
  const newVote = (question, from) => Voting.at(votingAddr).newVote(
    EMPTY_SCRIPT,
    question,
    { from }
  )

  // Vote with an account
  const vote = (voteId, account, supports) =>
    Voting.at(votingAddr).vote(voteId, supports, false, { from: account })

  // Assign some tokens so accounts can vote
  const token = await Voting.at(votingAddr).token().then(tokenAddr => {
    const token = MiniMeToken.at(tokenAddr)
    token.generateTokens(accounts[0], 1e19 * 1)
    token.generateTokens(accounts[1], 1e19 * 1.4)
    token.generateTokens(accounts[2], 1e19 * 2)
    token.generateTokens(accounts[3], 1e19 * 5)
    token.generateTokens(accounts[4], 1e19 * 8)
    return token
  })

  const votesIds = await Promise.all([
    newVote('Messaging Platform: shall we move to Rocket.Chat?', accounts[1] ),
    newVote('Do you agree to share lorem ipsum?', accounts[1]),
    newVote('Fusce vehicula dolor arcu, sit amet blandit dolor mollis nec?', accounts[0]),
    newVote('Sed sollicitudin ipsum quis nunc sollicitudin ultrices?', accounts[1]),
  ]).then(receipts => receipts.map(({logs}) => logs[0].args.voteId))

  const votingReceipts = await Promise.all([
    vote(votesIds[0], accounts[2], false),
    vote(votesIds[0], accounts[3], false),
    vote(votesIds[0], accounts[4], true),

    vote(votesIds[2], accounts[0], true),

    vote(votesIds[3], accounts[0], false),
  ])

  console.log('')
  console.log('DAO:', daoAddr)
  console.log('DAO’s voting app:', votingAddr)
  console.log('DAO’s vault app:', vaultAddr)
  console.log('ENS:', ensAddr)
}
