const path = require('path')

const apmMigration = require('@aragon/os/migrations/2_apm')
const daoFactoryMigration = require('@aragon/os/migrations/3_factory')

const DevTemplate = artifacts.require('DevTemplate')
const Voting = artifacts.require('@aragon/apps-voting/contracts/Voting')

const appURI = appName => 'file:' + path.resolve('../../', 'apps', appName)

module.exports = async (deployer, network, accounts) => {
  const { apm, ensAddr } = await apmMigration(deployer, network, accounts, artifacts)
  const { daoFact } = await daoFactoryMigration(deployer, network, accounts, artifacts)

  const votingBase = await Voting.new()

  const template = await DevTemplate.new(daoFact.address, apm.address, votingBase.address, appURI('voting'))

  const receipt = await template.createInstance()
  const daoAddr = receipt.logs.filter(l => l.event == 'DeployInstance')[0].args.dao

  console.log('DAO:', daoAddr)
  console.log('ENS:', ensAddr)
}
