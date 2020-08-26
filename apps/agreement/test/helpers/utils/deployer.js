const AgreementWrapper = require('../wrappers/agreement')
const DisputableWrapper = require('../wrappers/disputable')

const { utf8ToHex } = require('web3-utils')
const { ANY_ENTITY, getInstalledApp } = require('@aragon/contract-helpers-test/src/aragon-os')
const { ZERO_ADDRESS, NOW, ONE_DAY, bigExp, bn, getEventArgument } = require('@aragon/contract-helpers-test')


const DEFAULT_AGREEMENT_INITIALIZATION_PARAMS = {
  appId: '0xcafe1234cafe1234cafe1234cafe1234cafe1234cafe1234cafe1234cafe1234',
  currentTimestamp: NOW,

  title: 'Sample Agreement',
  content: utf8ToHex('ipfs:QmdLu3XXT9uUYxqDKXXsTYG77qNYNPbhzL27ZYT9kErqcZ'),
  setCashier: false,
  arbitrator: {
    feeAmount: bigExp(5, 18),            // 5 AFT
    feeToken: {
      symbol: 'AFT',
      decimals: 18,
      name: 'Arbitrator Fee Token'
    }
  },
}

const DEFAULT_DISPUTABLE_INITIALIZATION_PARAMS = {
  appId: '0xdead1234dead1234dead1234dead1234dead1234dead1234dead1234dead1234',
  currentTimestamp: NOW,

  challengeDuration: bn(2 * ONE_DAY),    // 2 days
  actionCollateral: bigExp(100, 18),     // 100 DAI
  challengeCollateral: bigExp(200, 18),  // 200 DAI
  collateralToken: {
    symbol: 'DAI',
    decimals: 18,
    name: 'Sample DAI'
  },
}

const SUBMIT_ROLE = '0x8a8601cc8e9efb544266baca5bffc5cea11aed5de937dc37810fd002b4010eac'
const CHALLENGE_ROLE = '0xef025787d7cd1a96d9014b8dc7b44899b8c1350859fb9e1e05f5a546dd65158d'
const SET_AGREEMENT_ROLE = '0x8dad640ab1b088990c972676ada708447affc660890ec9fc9a5483241c49f036'

class AgreementDeployer {
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

  get baseDisputable() {
    return this.previousDeploy.baseDisputable
  }

  get arbitrator() {
    return this.previousDeploy.arbitrator
  }

  get agreement() {
    return this.previousDeploy.agreement
  }

  get stakingFactory() {
    return this.previousDeploy.stakingFactory
  }

  get disputable() {
    return this.previousDeploy.disputable
  }

  get collateralToken() {
    return this.previousDeploy.collateralToken
  }

  get clockMock() {
    return this.previousDeploy.clockMock
  }

  get abi() {
    return this.base.abi
  }

  async deployAndInitializeDisputableWrapper(options = {}) {
    if (!this.agreement) await this.deployAndInitializeAgreement(options)
    await this.deployDisputable(options)

    const disputable = options.disputable || this.disputable
    const arbitrator = options.arbitrator || this.arbitrator
    const stakingFactory = options.stakingFactory || this.stakingFactory
    const collateralToken = options.collateralToken || this.collateralToken
    const { actionCollateral, challengeCollateral, challengeDuration } = { ...DEFAULT_DISPUTABLE_INITIALIZATION_PARAMS, ...options }

    const collateralRequirement = { collateralToken, actionCollateral, challengeCollateral, challengeDuration }
    return new DisputableWrapper(this.artifacts, this.web3, this.agreement, arbitrator, stakingFactory, this.clockMock, disputable, collateralRequirement)
  }

  async deployAndInitializeAgreementWrapper(options = {}) {
    await this.deployAndInitializeAgreement(options)
    const arbitrator = options.arbitrator || this.arbitrator
    const stakingFactory = options.stakingFactory || this.stakingFactory
    return new AgreementWrapper(this.artifacts, this.web3, this.agreement, arbitrator, stakingFactory, this.clockMock)
  }

  async deployAndInitializeAgreement(options = {}) {
    await this.deploy(options)

    if (!options.arbitrator && !this.arbitrator) await this.deployArbitrator(options)
    const arbitrator = options.arbitrator || this.arbitrator

    if (!options.stakingFactory && !this.stakingFactory) await this.deployStakingFactory()
    const stakingFactory = options.stakingFactory || this.stakingFactory

    const defaultOptions = { ...DEFAULT_AGREEMENT_INITIALIZATION_PARAMS, ...options }
    const { title, content, setCashier } = defaultOptions

    await this.agreement.initialize(arbitrator.address, setCashier, title, content, stakingFactory.address)
    return this.agreement
  }

  async deploy(options = {}) {
    const owner = options.owner || await this._getSender()
    if (!this.dao) await this.deployDAO(owner)
    if (!this.base) await this.deployBase()

    const { appId, currentTimestamp } = { ...DEFAULT_AGREEMENT_INITIALIZATION_PARAMS, ...options }
    const receipt = await this.dao.newAppInstance(appId, this.base.address, '0x', false, { from: owner })
    const agreement = await this.base.constructor.at(getInstalledApp(receipt, appId))

    const permissions = ['CHANGE_AGREEMENT_ROLE', 'MANAGE_DISPUTABLE_ROLE']
    await this._createPermissions(agreement, permissions, owner)

    if (currentTimestamp) await this.mockTime(agreement, currentTimestamp)
    this.previousDeploy = { ...this.previousDeploy, agreement }
    return agreement
  }

  async deployDisputable(options = {}) {
    const owner = options.owner || await this._getSender()
    if (!this.baseDisputable) await this.deployBaseDisputable()

    const { appId, currentTimestamp } = { ...DEFAULT_DISPUTABLE_INITIALIZATION_PARAMS, ...options }
    const receipt = await this.dao.newAppInstance(appId, this.baseDisputable.address, '0x', false, { from: owner })
    const disputable = await this.baseDisputable.constructor.at(getInstalledApp(receipt, appId))

    await this.acl.createPermission(this.agreement.address, disputable.address, SET_AGREEMENT_ROLE, owner, { from: owner })
    await this._grantPermissions(disputable, SUBMIT_ROLE, options.submitters, owner)
    await this._grantPermissions(disputable, CHALLENGE_ROLE, options.challengers, owner)

    if (!options.collateralToken && !this.collateralToken) await this.deployCollateralToken(options)
    await disputable.initialize()

    if (options.activate || options.activate === undefined) {
      const collateralToken = options.collateralToken || this.collateralToken
      const { actionCollateral, challengeCollateral, challengeDuration } = { ...DEFAULT_DISPUTABLE_INITIALIZATION_PARAMS, ...options }
      await this.agreement.activate(disputable.address, collateralToken.address, challengeDuration, actionCollateral, challengeCollateral, { from: owner })
    }

    if (currentTimestamp) await this.mockTime(disputable, currentTimestamp)
    this.previousDeploy = { ...this.previousDeploy, disputable }
    return disputable
  }

  async deployArbitrator(options = {}) {
    let { feeToken, feeAmount } = { ...DEFAULT_AGREEMENT_INITIALIZATION_PARAMS.arbitrator, ...options }
    if (!feeToken.address) feeToken = await this.deployToken(feeToken)

    const Arbitrator = this._getContract('ArbitratorMock')
    const arbitrator = await Arbitrator.new(feeToken.address, feeAmount)
    this.previousDeploy = { ...this.previousDeploy, arbitrator }

    return arbitrator
  }

  async deployStakingFactory() {
    const StakingFactory = this._getContract('StakingFactory')
    const stakingFactory = await StakingFactory.new()
    this.previousDeploy = { ...this.previousDeploy, stakingFactory }
    return stakingFactory
  }

  async deployCollateralToken(options = {}) {
    const collateralToken = await this.deployToken(options)
    this.previousDeploy = { ...this.previousDeploy, collateralToken }
    return collateralToken
  }

  async deployBase() {
    const Agreement = this._getContract('AgreementMock')
    const base = await Agreement.new()
    this.previousDeploy = { ...this.previousDeploy, base }
    return base
  }

  async deployBaseDisputable() {
    const Disputable = this._getContract('DisputableAppMock')
    const baseDisputable = await Disputable.new()
    this.previousDeploy = { ...this.previousDeploy, baseDisputable }
    return baseDisputable
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
    return MiniMeToken.new(ZERO_ADDRESS, ZERO_ADDRESS, 0, name, decimals, symbol, true)
  }

  async mockTime(timeMockable, timestamp) {
    if (!this.clockMock) await this.deployClockMock()
    await timeMockable.setClock(this.clockMock.address)
    return this.clockMock.mockSetTimestamp(timestamp)
  }

  async deployClockMock() {
    const ClockMock = this._getContract('TimeHelpersMock')
    const clockMock = await ClockMock.new()
    this.previousDeploy = { ...this.previousDeploy, clockMock }
    return clockMock
  }

  async _createPermissions(app, permissions, to, manager = to) {
    for (const permission of permissions) {
      const ROLE = await app[permission]()
      await this.acl.createPermission(to, app.address, ROLE, manager, { from: manager })
    }
  }

  async _grantPermissions(app, permission, users, manager) {
    if (!users) users = [ANY_ENTITY]
    for (const user of users) {
      if (users.indexOf(user) === 0) await this.acl.createPermission(user, app.address, permission, manager, { from: manager })
      else await this.acl.grantPermission(user, app.address, permission, { from: manager })
    }
  }

  _getContract(name) {
    return this.artifacts.require(name)
  }

  async _getSender() {
    if (!this.sender) {
      const accounts = await this.web3.eth.getAccounts()
      this.sender = accounts[0]
    }
    return this.sender
  }
}

module.exports = (web3, artifacts) => new AgreementDeployer(artifacts, web3)
