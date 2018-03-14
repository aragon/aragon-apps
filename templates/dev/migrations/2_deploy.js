const apmMigration = require('@aragon/os/migrations/2_apm')
const daoFactoryMigration = require('@aragon/os/migrations/3_factory')

const ipfsHashes = require('../ipfs.js')
const tokenManagerIpfs = ipfsHashes.tokenManager
const vaultIpfs = ipfsHashes.vault
const votingIpfs = ipfsHashes.voting

module.exports = async (deployer, network, accounts, arts = null) => {
  if (arts != null) artifacts = arts // allow running outside

  const DevTemplate = artifacts.require('DevTemplate')
  const Voting = artifacts.require('@aragon/apps-voting/contracts/Voting')
  const Vault = artifacts.require('@aragon/apps-vault/contracts/Vault')
  const TokenManager = artifacts.require('@aragon/apps-token-manager/contracts/TokenManager')

  const MiniMeTokenFactory = artifacts.require('@aragon/os/lib/minime/MiniMeTokenFactory')

  const { apm, ensAddr } = await apmMigration(deployer, network, accounts, artifacts)
  const { daoFact } = await daoFactoryMigration(deployer, network, accounts, artifacts)
  const votingBase = await Voting.new()
  const vaultBase = await Vault.new()
  const tokenManagerBase = await TokenManager.new()

  const minimeFac = await MiniMeTokenFactory.new()
  const template = await DevTemplate.new(daoFact.address, minimeFac.address, apm.address)
  await template.apmInit(votingBase.address, votingIpfs, vaultBase.address, vaultIpfs, tokenManagerBase.address, tokenManagerIpfs)

  const receipt = await template.createInstance()

  const daoAddr = receipt.logs.filter(l => l.event == 'DeployInstance')[0].args.dao

  const votingId = await template.votingAppId()
  const vaultId = await template.vaultAppId()
  const tokenManagerId = await template.tokenManagerAppId()
  const installedApps = receipt.logs.filter(l => l.event == 'InstalledApp')
  const votingAddr = installedApps.filter(e => e.args.appId == votingId)[0].args.appProxy
  const vaultAddr = installedApps.filter(e => e.args.appId == vaultId)[0].args.appProxy
  const tokenManagerAddr = installedApps.filter(e => e.args.appId == tokenManagerId)[0].args.appProxy

  console.log('DAO:', daoAddr)
  console.log("DAO's voting app:", votingAddr)
  console.log("DAO's vault app:", vaultAddr)
  console.log("DAO's token manager app:", tokenManagerAddr)
  console.log('ENS:', ensAddr)

  return {
    daoAddr,
    ensAddr,
    tokenManagerAddr,
    vaultAddr,
    votingAddr,
  }
}
