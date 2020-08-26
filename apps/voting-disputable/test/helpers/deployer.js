const agreementDeployer = require('@aragon/apps-agreement/test/helpers/utils/deployer')(web3, artifacts)
const { ANY_ENTITY, getInstalledApp } = require('@aragon/contract-helpers-test/src/aragon-os')
const { ZERO_ADDRESS, NOW, ONE_DAY, pct16, getEventArgument } = require('@aragon/contract-helpers-test')

const DEFAULT_VOTING_INITIALIZATION_PARAMS = {
  appId: '0x1234cafe1234cafe1234cafe1234cafe1234cafe1234cafe1234cafe1234cafe',
  currentTimestamp: NOW,
  voteDuration: ONE_DAY * 5,
  delegatedVotingPeriod: ONE_DAY,
  requiredSupport: pct16(50),
  minimumAcceptanceQuorum: pct16(20),
  executionDelay: 0,
  quietEndingPeriod: ONE_DAY,
  quietEndingExtension: ONE_DAY / 2,
  token: {
    symbol: 'AVT',
    decimals: 18,
    name: 'Aragon Voting Token'
  },
  collateralToken: {
    symbol: 'DAI',
    decimals: 18,
    name: 'Sample DAI'
  },
  actionCollateral:    0,
  challengeCollateral: 0,
  challengeDuration:   ONE_DAY,
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

  get agreement() {
    return this.previousDeploy.agreement
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
    const { requiredSupport, minimumAcceptanceQuorum, voteDuration, delegatedVotingPeriod, executionDelay, quietEndingPeriod, quietEndingExtension } = defaultOptions

    await this.voting.initialize(token.address, voteDuration, requiredSupport, minimumAcceptanceQuorum, delegatedVotingPeriod, quietEndingPeriod, quietEndingExtension, executionDelay)

    if (options.agreement !== false) {
      const owner = options.owner || await this._getSender()
      let { collateralToken, actionCollateral, challengeCollateral, challengeDuration } = { ...DEFAULT_VOTING_INITIALIZATION_PARAMS, ...options }
      if (!collateralToken.address) collateralToken = await agreementDeployer.deployCollateralToken(collateralToken)

      await this.agreement.activate({ disputable: this.voting, collateralToken, actionCollateral, challengeCollateral, challengeDuration, from: owner })
      this.previousDeploy = { ...this.previousDeploy, collateralToken }
    }

    return this.voting
  }

  async deploy(options = {}) {
    const owner = options.owner || await this._getSender()
    if (!this.dao) await this.deployDAO(owner)
    if (!this.base) await this.deployBase(options)

    const { appId, currentTimestamp } = { ...DEFAULT_VOTING_INITIALIZATION_PARAMS, ...options }
    const receipt = await this.dao.newAppInstance(appId, this.base.address, '0x', false, { from: owner })
    const voting = await this.base.constructor.at(await getInstalledApp(receipt, appId))

    const restrictedPermissions = ['CHANGE_VOTE_TIME_ROLE', 'CHANGE_SUPPORT_ROLE', 'CHANGE_QUORUM_ROLE', 'CHANGE_DELEGATED_VOTING_PERIOD_ROLE', 'CHANGE_EXECUTION_DELAY_ROLE', 'CHANGE_QUIET_ENDING_ROLE']
    await this._createPermissions(voting, restrictedPermissions, owner)

    const openPermissions = ['CREATE_VOTES_ROLE', 'CHALLENGE_ROLE']
    await this._createPermissions(voting, openPermissions, ANY_ENTITY, owner)

    if (!this.agreement) await this.deployAgreement(options)
    await this._createPermissions(voting, ['SET_AGREEMENT_ROLE'], this.agreement.address, owner)

    if (currentTimestamp) await voting.mockSetTimestamp(currentTimestamp)
    this.previousDeploy = { ...this.previousDeploy, voting }
    return voting
  }

  async deployAgreement(options = {}) {
    const owner = options.owner || await this._getSender()
    if (!this.dao) await this.deployDAO(owner)
    if (!this.base) await this.deployBase(options)

    const { currentTimestamp } = { ...DEFAULT_VOTING_INITIALIZATION_PARAMS, ...options }
    agreementDeployer.previousDeploy = { ...agreementDeployer.previousDeploy, dao: this.dao, acl: this.acl, owner }
    const agreement = await agreementDeployer.deployAndInitializeAgreementWrapper({ ...options, owner, currentTimestamp })

    this.previousDeploy = { ...this.previousDeploy, agreement }
    return agreement
  }

  async deployBase() {
    const Voting = this._getContract('DisputableVotingMock')
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
    const token = await MiniMeToken.new(ZERO_ADDRESS, ZERO_ADDRESS, 0, name, decimals, symbol, true)
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
