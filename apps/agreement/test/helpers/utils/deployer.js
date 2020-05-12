const DelayWrapper = require('../wrappers/delay')
const DisputableWrapper = require('../wrappers/disputable')
const AgreementWrapper = require('../wrappers/agreement')

const { NOW, DAY } = require('../lib/time')
const { utf8ToHex } = require('web3-utils')
const { bn, bigExp } = require('../lib/numbers')
const { getEventArgument, getNewProxyAddress } = require('@aragon/contract-test-helpers/events')

const ANY_ADDR = '0xffffffffffffffffffffffffffffffffffffffff'
const ZERO_ADDR = '0x0000000000000000000000000000000000000000'

const DEFAULT_AGREEMENT_INITIALIZATION_PARAMS = {
  appId: '0xcafe1234cafe1234cafe1234cafe1234cafe1234cafe1234cafe1234cafe1234',
  currentTimestamp: NOW,

  title: 'Sample Agreement',
  content: utf8ToHex('ipfs:QmdLu3XXT9uUYxqDKXXsTYG77qNYNPbhzL27ZYT9kErqcZ'),
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

  challengeDuration: 2 * DAY,            // 2 days
  actionCollateral: bigExp(100, 18),     // 100 DAI
  challengeCollateral: bigExp(200, 18),  // 200 DAI
  collateralToken: {
    symbol: 'DAI',
    decimals: 18,
    name: 'Sample DAI'
  },
}

const DEFAULT_DELAY_INITIALIZATION_PARAMS = {
  ...DEFAULT_DISPUTABLE_INITIALIZATION_PARAMS,
  appId: '0xfeca7890feca7890feca7890feca7890feca7890feca7890feca7890feca7890',

  delayPeriod: 5 * DAY,                  // 5 days
  tokenBalancePermission: {
    balance: bigExp(58, 18),             // 58 ANT
    token: {
      symbol: 'ANT',
      decimals: 18,
      name: 'Sample ANT'
    },
  }
}

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

  get submitPermissionToken() {
    return this.previousDeploy.submitPermissionToken
  }

  get challengePermissionToken() {
    return this.previousDeploy.challengePermissionToken
  }

  get clockMock() {
    return this.previousDeploy.clockMock
  }

  get abi() {
    return this.base.abi
  }

  async deployAndInitializeWrapperWithDisputable(options = {}) {
    await this.deployAndInitialize(options)

    options.disputableType = options.delay ? 'DelayMock' : 'DisputableAppMock'
    if (!options.disputable) await this.installDisputable(options)

    const disputable = options.disputable || this.disputable
    const arbitrator = options.arbitrator || this.arbitrator
    const stakingFactory = options.stakingFactory || this.stakingFactory
    const collateralToken = options.collateralToken || this.collateralToken

    const { actionAmount, challengeAmount, challengeDuration } = await this.disputable.getCollateralRequirement(0, 0)
    const collateralRequirement = { collateralToken, actionAmount, challengeAmount, challengeDuration }

    const Wrapper = options.delay ? DelayWrapper : DisputableWrapper
    return new Wrapper(this.artifacts, this.web3, this.agreement, arbitrator, stakingFactory, disputable, collateralRequirement)
  }

  async deployAndInitializeWrapper(options = {}) {
    await this.deployAndInitialize(options)
    const arbitrator = options.arbitrator || this.arbitrator
    const stakingFactory = options.stakingFactory || this.stakingFactory
    return new AgreementWrapper(this.artifacts, this.web3, this.agreement, arbitrator, stakingFactory)
  }

  async deployAndInitialize(options = {}) {
    await this.deploy(options)

    if (!options.arbitrator && !this.arbitrator) await this.deployArbitrator(options)
    const arbitrator = options.arbitrator || this.arbitrator

    if (!options.stakingFactory && !this.stakingFactory) await this.deployStakingFactory()
    const stakingFactory = options.stakingFactory || this.stakingFactory

    const defaultOptions = { ...DEFAULT_AGREEMENT_INITIALIZATION_PARAMS, ...options }
    const { title, content } = defaultOptions

    await this.agreement.initialize(title, content, arbitrator.address, stakingFactory.address)
    return this.agreement
  }

  async deploy(options = {}) {
    const owner = options.owner || await this._getSender()
    if (!this.dao) await this.deployDAO(owner)
    if (!this.base) await this.deployBase()

    const { appId, currentTimestamp } = { ...DEFAULT_AGREEMENT_INITIALIZATION_PARAMS, ...options }
    const receipt = await this.dao.newAppInstance(appId, this.base.address, '0x', false, { from: owner })
    const agreement = await this.base.constructor.at(getNewProxyAddress(receipt))

    const CHANGE_CONTENT_ROLE = await agreement.CHANGE_CONTENT_ROLE()
    await this.acl.createPermission(owner, agreement.address, CHANGE_CONTENT_ROLE, owner, { from: owner })

    if (currentTimestamp) await this.mockTime(agreement, currentTimestamp)
    this.previousDeploy = { ...this.previousDeploy, agreement }
    return agreement
  }

  async installDisputable(options = {}) {
    const owner = options.owner || await this._getSender()

    const { disputableType } = options
    if (!this.baseDisputable || this.baseDisputable.constructor.contractName !== disputableType) await this.deployBaseDisputable(disputableType)

    const { appId, currentTimestamp } = { ...DEFAULT_DISPUTABLE_INITIALIZATION_PARAMS, ...options }
    const receipt = await this.dao.newAppInstance(appId, this.baseDisputable.address, '0x', false, { from: owner })
    const disputable = await this.baseDisputable.constructor.at(getNewProxyAddress(receipt))

    await this._grantDisputablePermissions(disputable, owner)

    if (!options.collateralToken && !this.collateralToken) await this.deployCollateralToken(options)
    const collateralToken = options.collateralToken || this.collateralToken

    if (options.delay) {
      const CHANGE_DELAY_PERIOD_ROLE = await disputable.CHANGE_DELAY_PERIOD_ROLE()
      await this.acl.createPermission(owner, disputable.address, CHANGE_DELAY_PERIOD_ROLE, owner, { from: owner })

      const CHANGE_TOKEN_BALANCE_PERMISSION_ROLE = await disputable.CHANGE_TOKEN_BALANCE_PERMISSION_ROLE()
      await this.acl.createPermission(owner, disputable.address, CHANGE_TOKEN_BALANCE_PERMISSION_ROLE, owner, { from: owner })

      const submitPermissionToken = options.submitPermissionToken || this.submitPermissionToken || { address: ZERO_ADDR }
      const submitPermissionBalance = submitPermissionToken.address === ZERO_ADDR ? bn(0) : (options.submitPermissionBalance || DEFAULT_DELAY_INITIALIZATION_PARAMS.tokenBalancePermission.balance)

      if (submitPermissionBalance.gt(bn(0)))  {
        const submitters = options.submitters || []
        for (const submitter of submitters) await submitPermissionToken.generateTokens(submitter, submitPermissionBalance)
      } else {
        const SUBMIT_ROLE = await disputable.SUBMIT_ROLE()
        await this._grantPermissions(disputable, SUBMIT_ROLE, options.submitters, owner)
      }

      const challengePermissionToken = options.challengePermissionToken || this.challengePermissionToken || { address: ZERO_ADDR }
      const challengePermissionBalance = challengePermissionToken.address === ZERO_ADDR ? bn(0) : (options.challengePermissionBalance || DEFAULT_DELAY_INITIALIZATION_PARAMS.tokenBalancePermission.balance)

      if (challengePermissionBalance.gt(bn(0))) {
        const challengers = options.challengers || []
        for (const challenger of challengers) await challengePermissionToken.generateTokens(challenger, challengePermissionBalance)
      } else {
        const CHALLENGE_ROLE = await disputable.CHALLENGE_ROLE()
        await this._grantPermissions(disputable, CHALLENGE_ROLE, options.challengers, owner)
      }

      const { actionCollateral, challengeCollateral, challengeDuration, delayPeriod } = { ...DEFAULT_DELAY_INITIALIZATION_PARAMS, ...options }
      await disputable.initialize(delayPeriod, this.agreement.address, collateralToken.address, actionCollateral, challengeCollateral, challengeDuration, submitPermissionToken.address, submitPermissionBalance, challengePermissionToken.address, challengePermissionBalance)
    } else {
      const SUBMIT_ROLE = await disputable.SUBMIT_ROLE()
      await this._grantPermissions(disputable, SUBMIT_ROLE, options.submitters, owner)

      const CHALLENGE_ROLE = await disputable.CHALLENGE_ROLE()
      await this._grantPermissions(disputable, CHALLENGE_ROLE, options.challengers, owner)

      const { actionCollateral, challengeCollateral, challengeDuration } = { ...DEFAULT_DISPUTABLE_INITIALIZATION_PARAMS, ...options }
      await disputable.initialize(this.agreement.address, collateralToken.address, actionCollateral, challengeCollateral, challengeDuration)
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

  async deployStakingInstance(token) {
    if (!this.stakingFactory) await this.deployStakingFactory()
    let stakingAddress = await this.stakingFactory.getInstance(token.address)
    if (stakingAddress === ZERO_ADDR) {
      const receipt = await this.stakingFactory.getOrCreateInstance(token.address)
      stakingAddress = getEventArgument(receipt, 'NewStaking', 'instance')
    }
    const Staking = artifacts.require('Staking')
    return Staking.at(stakingAddress)
  }

  async deployCollateralToken(options = {}) {
    const collateralToken = await this.deployToken(options)
    this.previousDeploy = { ...this.previousDeploy, collateralToken }
    return collateralToken
  }

  async deploySubmitPermissionToken(options = {}) {
    const { name, decimals, symbol } = { ...DEFAULT_DELAY_INITIALIZATION_PARAMS.tokenBalancePermission.token, ...options.submitPermissionToken }
    const submitPermissionToken = await this.deployToken({ name, decimals, symbol })
    this.previousDeploy = { ...this.previousDeploy, submitPermissionToken }
    return submitPermissionToken
  }

  async deployChallengePermissionToken(options = {}) {
    const { name, decimals, symbol } = { ...DEFAULT_DELAY_INITIALIZATION_PARAMS.tokenBalancePermission.token, ...options.challengePermissionToken }
    const challengePermissionToken = await this.deployToken({ name, decimals, symbol })
    this.previousDeploy = { ...this.previousDeploy, challengePermissionToken }
    return challengePermissionToken
  }

  async deployBase() {
    const Agreement = this._getContract('AgreementMock')
    const base = await Agreement.new()
    this.previousDeploy = { ...this.previousDeploy, base }
    return base
  }

  async deployBaseDisputable(disputableType = 'DisputableAppMock') {
    const Disputable = this._getContract(disputableType)
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
    return MiniMeToken.new(ZERO_ADDR, ZERO_ADDR, 0, name, decimals, symbol, true)
  }

  async mockTime(timeMockable, timestamp) {
    if (!this.clockMock) await this.deployClockMock()
    await timeMockable.setClockMock(this.clockMock.address)
    return this.clockMock.mockSetTimestamp(timestamp)
  }

  async deployClockMock() {
    const ClockMock = this._getContract('ClockMock')
    const clockMock = await ClockMock.new()
    this.previousDeploy = { ...this.previousDeploy, clockMock }
    return clockMock
  }

  async _grantDisputablePermissions(disputable, manager) {
    const DISPUTABLE_ROLE = await this.agreement.DISPUTABLE_ROLE()
    await this.acl.createPermission(disputable.address, this.agreement.address, DISPUTABLE_ROLE, manager, { from: manager })

    const disputablePermissions = ['DISPUTABLE_CHALLENGED_ROLE', 'DISPUTABLE_ALLOWED_ROLE', 'DISPUTABLE_REJECTED_ROLE', 'DISPUTABLE_VOIDED_ROLE']
    for (const permissionName of disputablePermissions) {
      const permission = await disputable[permissionName]()
      await this.acl.createPermission(this.agreement.address, disputable.address, permission, manager, { from: manager })
    }

    const SET_AGREEMENT_ROLE = await disputable.SET_AGREEMENT_ROLE()
    await this.acl.createPermission(manager, disputable.address, SET_AGREEMENT_ROLE, manager, { from: manager })

    const CHANGE_COLLATERAL_REQUIREMENTS_ROLE = await disputable.CHANGE_COLLATERAL_REQUIREMENTS_ROLE()
    await this.acl.createPermission(manager, disputable.address, CHANGE_COLLATERAL_REQUIREMENTS_ROLE, manager, { from: manager })
  }

  async _grantPermissions(app, permission, users, manager) {
    if (!users) users = [ANY_ADDR]
    for (const user of users) {
      if (users.indexOf(user) === 0) await this.acl.createPermission(user, app.address, permission, manager, { from: manager })
      else await this.acl.grantPermission(user, app.address, permission, { from: manager })
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

module.exports = (web3, artifacts) => new AgreementDeployer(artifacts, web3)
