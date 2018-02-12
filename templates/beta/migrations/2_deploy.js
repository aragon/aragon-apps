const path = require('path')

const daoFactoryMigration = require('@aragon/os/migrations/3_factory')

const DevTemplate = artifacts.require('DevTemplate')
const MiniMeTokenFactory = artifacts.require('@aragon/os/lib/minime/MiniMeTokenFactory')

// ensure alphabetic order
const apps = ['finance', 'token-manager', 'vault', 'voting']


const appIds = apps.map(app => require(`@aragon/apps-${app}/arapp`).appName)

module.exports = async (deployer, network, accounts) => {
  const { daoFact } = await daoFactoryMigration(deployer, network, accounts, artifacts)
  const votingBase = await Voting.new()
  const vaultBase = await Vault.new()

  const minimeFac = await MiniMeTokenFactory.new()
  const template = await DevTemplate.new(daoFact.address, minimeFac.address, apm.address)
  await template.apmInit(votingBase.address, votingIpfs, vaultBase.address, vaultIpfs)

  const receipt = await template.createInstance()

  const daoAddr = receipt.logs.filter(l => l.event == 'DeployInstance')[0].args.dao
  console.log('DAO:', daoAddr)
  console.log('ENS:', ensAddr)
}
