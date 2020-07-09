const { pct } = require('./voting')()
const { NOW, DAY } = require('@aragon/apps-agreement/test/helpers/lib/time')
const { getEventArgument, getNewProxyAddress } = require('@aragon/contract-helpers-test/events')

const ANY_ADDR = '0xffffffffffffffffffffffffffffffffffffffff'
const ZERO_ADDR = '0x0000000000000000000000000000000000000000'

const DEFAULT_VOTING_INITIALIZATION_PARAMS = {
  appId: '0x1234cafe1234cafe1234cafe1234cafe1234cafe1234cafe1234cafe1234cafe',
  currentTimestamp: NOW,
  voteDuration: DAY * 5,
  overruleWindow: DAY,
  requiredSupport: pct(50),
  minimumAcceptanceQuorum: pct(20),
  executionDelay: 0,
  token: {
    symbol: 'AVT',
    decimals: 18,
    name: 'Aragon Voting Token'
  }
}

class VotingDeployer {
  constructor(artifacts, web3) {
    this.web3 = web3
    this.artifacts = artifacts
    this.previousDeploy = {}
  }

  get owner() {
    return this.previousDeploy.owner
  }

  get dao() {
    return this.previousDeploy.dao
  }

  get acl() {
    return this.previousDeploy.acl
  }

  get base() {
    return this.previousDeploy.base
  }

  get voting() {
    return this.previousDeploy.voting
  }

  get token() {
    return this.previousDeploy.token
  }

  get abi() {
    return this.base.abi
  }

  async deployAndInitialize(options = {}) {
    await this.deploy(options)

    if (!options.token && !this.token) await this.deployToken(options)
    const token = options.token || this.token

    const defaultOptions = { ...DEFAULT_VOTING_INITIALIZATION_PARAMS, ...options }
    const { requiredSupport, minimumAcceptanceQuorum, voteDuration, overruleWindow, executionDelay } = defaultOptions

    await this.voting.initialize(token.address, requiredSupport, minimumAcceptanceQuorum, voteDuration, overruleWindow, executionDelay)
    return this.voting
  }

  async deploy(options = {}) {
    const owner = options.owner || await this._getSender()
    if (!this.dao) await this.deployDAO(owner)
    if (!this.base) await this.deployBase(options)

    const { appId, currentTimestamp } = { ...DEFAULT_VOTING_INITIALIZATION_PARAMS, ...options }
    const receipt = await this.dao.newAppInstance(appId, this.base.address, '0x', false, { from: owner })
    const voting = await this.base.constructor.at(getNewProxyAddress(receipt))

    const restrictedPermissions = ['MODIFY_SUPPORT_ROLE', 'MODIFY_QUORUM_ROLE', 'MODIFY_OVERRULE_WINDOW_ROLE', 'MODIFY_EXECUTION_DELAY_ROLE']
    await this._createPermissions(voting, restrictedPermissions, owner)

    const openPermissions = ['CREATE_VOTES_ROLE', 'CHALLENGE_ROLE']
    await this._createPermissions(voting, openPermissions, ANY_ADDR, owner)

    if (currentTimestamp) await voting.mockSetTimestamp(currentTimestamp)
    this.previousDeploy = { ...this.previousDeploy, voting }
    return voting
  }

  async deployBase(options = {}) {
    const agreement = options.agreement || false
    const contractName = `DisputableVoting${agreement ? 'Mock' : 'WithoutAgreementMock'}`
    const Voting = this._getContract(contractName)
    const base = await Voting.new()
    this.previousDeploy = { ...this.previousDeploy, base }
    return base
  }

  async deployDAO(owner) {
    const Kernel = this._getContract('Kernel')
    const kernelBase = await Kernel.new(true)

    const ACL = this._getContract('ACL')
    const aclBase = await ACL.new()

    const EVMScriptRegistryFactory = this._getContract('EVMScriptRegistryFactory')
    const regFact = await EVMScriptRegistryFactory.new()

    const DAOFactory = this._getContract('DAOFactory')
    const daoFact = await DAOFactory.new(kernelBase.address, aclBase.address, regFact.address)

    const kernelReceipt = await daoFact.newDAO(owner)
    const dao = await Kernel.at(getEventArgument(kernelReceipt, 'DeployDAO', 'dao'))
    const acl = await ACL.at(await dao.acl())

    const APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()
    await acl.createPermission(owner, dao.address, APP_MANAGER_ROLE, owner, { from: owner })

    this.previousDeploy = { ...this.previousDeploy, dao, acl, owner }
    return dao
  }

  async deployToken({ name = 'My Sample Token', decimals = 18, symbol = 'MST' }) {
    const MiniMeToken = this._getContract('MiniMeToken')
    const token = await MiniMeToken.new(ZERO_ADDR, ZERO_ADDR, 0, name, decimals, symbol, true)
    this.previousDeploy = { ...this.previousDeploy, token }
    return token
  }

  async _createPermissions(app, permissions, to, manager = to) {
    for (const permission of permissions) {
      const ROLE = await app[permission]()
      await this.acl.createPermission(to, app.address, ROLE, manager, { from: manager })
    }
  }

  _getContract(name) {
    return this.artifacts.require(name)
  }

  async _getSender() {
    const accounts = await this.web3.eth.getAccounts()
    return accounts[0]
  }
}

module.exports = (web3, artifacts) => new VotingDeployer(artifacts, web3)
