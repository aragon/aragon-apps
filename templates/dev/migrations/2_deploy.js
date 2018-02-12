const path = require('path')

const apmMigration = require('@aragon/os/migrations/2_apm')
const daoFactoryMigration = require('@aragon/os/migrations/3_factory')

const DevTemplate = artifacts.require('DevTemplate')
const Voting = artifacts.require('@aragon/apps-voting/contracts/Voting')
const Vault = artifacts.require('@aragon/apps-voting/contracts/Vault')

const votingIpfs = 'ipfs:QmV5sEjshcZ6mu6uFUhJkWM5nTa53wbHfRFDD4Qy2Yx88m'
const vaultIpfs = 'ipfs:QmPhd9aQGGoHJNcVVAmbzudShvhpYmyKxLWgqLoqSGD81G'

module.exports = async (deployer, network, accounts) => {
  const { apm, ensAddr } = await apmMigration(deployer, network, accounts, artifacts)
  const { daoFact } = await daoFactoryMigration(deployer, network, accounts, artifacts)

  const votingBase = await Voting.new()
  const vaultBase = await Vault.new()
  const template = await DevTemplate.new(daoFact.address, apm.address)
  await template.apmInit(votingBase.address, votingIpfs, vaultBase.address, vaultIpfs)
  const receipt = await template.createInstance()
  const daoAddr = receipt.logs.filter(l => l.event == 'DeployInstance')[0].args.dao

  console.log('DAO:', daoAddr)
  console.log('ENS:', ensAddr)
}
