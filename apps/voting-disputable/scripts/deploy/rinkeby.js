const { utf8ToHex } = require('web3-utils')
const { injectWeb3, injectArtifacts, pct16, bn, ONE_DAY } = require('@aragon/contract-helpers-test')

const createActions = require('./src/create-actions')
const grantPermissions = require('./src/grant-permissions')
const setupDisputableVoting = require('./src/setup-disputable-voting')

const config = {
  dao:            '0x51A41E43af0774565f0be5cEbC50C693CC19E4eE',   // AN Cash DAO
  voting:         '0xb1fe649911cf8d262216ede5a3d98787c877fc84',   // DAO Voting app
  tokenManager:   '0x563c1099ed70e87e3f4d2efd57570e197c09a715',   // DAO Token Manager app
  arbitrator:     '0x52180af656a1923024d1accf1d827ab85ce48878',   // Aragon Court staging instance
  stakingFactory: '0x07429001eeA415E967C57B8d43484233d57F8b0B',   // Real StakingFactory instance on Rinkeby
  setFeesCashier: false,                                          // None
  feeToken:       '0x3af6b2f907f0c55f279e0ed65751984e6cdc4a42',   // DAI mock token used in Aragon Court staging
  agreement: {
    title:        'Aragon Network Cash Agreement',
    content:      utf8ToHex('ipfs:QmPvfWUNt3WrZ7uaB1ZwEmec3Zr1ABL9CncSDfQypWkmnp'),
    base:         '0x90d878b0C7E5d72D15bDF76B79D1B0C8EacbC38c',   // Agreement v1.0.0-rc.0
    appId:        '0x15a969a0e134d745b604fb43f699bb5c146424792084c198d53050c4d08126d1',
  },
  disputableVoting: {
    token:        '0x9a8eab8a356b8af4fa6ea5be983539ce97a258fb',   // DAO token
    base:         '0xD86fA379469E0b673d3028058e7973f8e9Cf6adB',   // Disputable Voting v1.0.0-rc.0
    appId:        '0x39aa9e500efe56efda203714d12c78959ecbf71223162614ab5b56eaba014145',
    duration:               ONE_DAY * 5,
    support:                pct16(50),
    minQuorum:              pct16(50),
    executionDelay:         0,
    delegatedVotingPeriod:  ONE_DAY * 2,
    quietEndingPeriod:      ONE_DAY,
    quietEndingExtension:   ONE_DAY / 2,
    actionCollateral:       bn(0),
    challengeCollateral:    bn(0),
    challengeDuration:      ONE_DAY * 3,
  },
}

async function deploy() {
  const options = await loadConfig(config)
  await grantPermissions(options)
  const apps = await setupDisputableVoting(options)

  options.agreement.app = apps.agreement
  options.disputableVoting.app = apps.disputableVoting
  await createActions(options)
}

async function loadConfig(config) {
  const options = config
  options.owner = await getSender()
  options.dao = await getInstance('Kernel', options.dao)
  options.acl = await getInstance('ACL', await options.dao.acl())
  options.agreement.base = await getInstance('Agreement', options.agreement.base)
  options.disputableVoting.base = await getInstance('DisputableVoting', options.disputableVoting.base)
  options.feeToken = await getInstance('MiniMeToken', options.feeToken)
  options.arbitrator = await getInstance('IArbitrator', options.arbitrator)
  options.stakingFactory = await getInstance('StakingFactory', options.stakingFactory)
  options.aragonAppFeesCashier = { address: options.appFeesCashier }
  return options
}

async function getSender() {
  const accounts = await web3.eth.getAccounts()
  return accounts[0]
}

async function getInstance(contract, address) {
  return artifacts.require(contract).at(address)
}

injectWeb3(web3)
injectArtifacts(artifacts)

deploy()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
