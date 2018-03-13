const path = require('path')
const fs = require('fs')

const namehash = require('eth-ens-namehash').hash

const daoFactoryMigration = require('@aragon/os/migrations/3_factory')
const MiniMeTokenFactory = artifacts.require('@aragon/os/contracts/lib/minime/MiniMeTokenFactory')
const ENS = artifacts.require('@aragon/os/contracts/lib/ens/ENS.sol')
const EtherToken = artifacts.require('@aragon/os/contracts/common/EtherToken.sol')

const templates = ['DemocracyTemplate', 'MultisigTemplate']

// ensure alphabetic order
const apps = ['finance', 'token-manager', 'vault', 'voting']

const appIds = apps.map(app => namehash(require(`@aragon/apps-${app}/arapp`).appName))

const deployMany = async (cs, params) => {
  const x = await Promise.all(cs.map(c => artifacts.require(c).new(...params)))

  return x.map(c => c.address)
}

const newRepo = async (apm, name, acc, contract) => {
  const c = await artifacts.require(contract).new()
  return await apm.newRepoWithVersion(name, acc, [1, 0, 0], c.address, '0x1245')
}

module.exports = async (deployer, network, accounts) => {
  let indexObj = require('../index.js')
  const ens = ENS.at(process.env.ENS || indexObj.networks[network].ens)

  const apmAddr = await artifacts.require('PublicResolver').at(await ens.resolver(namehash('aragonpm.eth'))).addr(namehash('aragonpm.eth'))

  if (network == 'rpc') { // Useful for testing to avoid manual deploys with aragon-dev-cli
    if (await ens.owner(appIds[0]) == '0x0000000000000000000000000000000000000000') {
      const apm = artifacts.require('APMRegistry').at(apmAddr)

      await newRepo(apm, 'voting', accounts[0], 'Voting')
      await newRepo(apm, 'finance', accounts[0], 'Finance')
      await newRepo(apm, 'token-manager', accounts[0], 'TokenManager')
      await newRepo(apm, 'vault', accounts[0], 'Vault')
    }
  }

  const { daoFact } = await daoFactoryMigration(deployer, network, accounts, artifacts)

  const minimeFac = await MiniMeTokenFactory.new()
  const etherToken = await EtherToken.new()

  const aragonid = await ens.owner(namehash('aragonid.eth'))
  const tmpls = await deployMany(templates, [daoFact.address, minimeFac.address, apmAddr, etherToken.address, aragonid, appIds])

  const ts = tmpls.map((address, i) => ({ name: templates[i], address }) )

  console.log('creating APM packages for templates')

  const apm = artifacts.require('APMRegistry').at(apmAddr)

  await apm.newRepoWithVersion('democracy-template', accounts[0], [1, 0, 0], tmpls[0], 'ipfs:')
  await apm.newRepoWithVersion('multisig-template', accounts[0], [1, 0, 0], tmpls[1], 'ipfs:')

  console.log(ts)

  if (!network == 'rpc' || !network == 'devnet') {
    indexObj[network].templates = ts
    const indexFile = 'module.exports = ' + JSON.stringify(indexObj, null, 2)
    // could also use https://github.com/yeoman/stringify-object if you wanted single quotes
    fs.writeFileSync('index.js', indexFile)

    console.log('Template addresses saved to index.js')
  }
}
