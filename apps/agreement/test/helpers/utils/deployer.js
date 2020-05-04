const DelayWrapper = require('../wrappers/delay')
const ExecutorWrapper = require('../wrappers/executor')
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

const DEFAULT_EXECUTOR_INITIALIZATION_PARAMS = {
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
  ...DEFAULT_EXECUTOR_INITIALIZATION_PARAMS,
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

  get baseExecutor() {
    return this.previousDeploy.baseExecutor
  }

  get arbitrator() {
    return this.previousDeploy.arbitrator
  }

  get agreement() {
    return this.previousDeploy.agreement
  }

  get executor() {
    return this.previousDeploy.executor
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

  get abi() {
    return this.base.abi
  }

  async deployAndInitializeWrapperWithExecutor(options = {}) {
    await this.deployAndInitialize(options)

    options.executorType = options.delay ? 'DelayMock' : 'AgreementExecutorMock'
    if (!options.executor) await this.installExecutor(options)

    const executor = options.executor || this.executor
    const arbitrator = options.arbitrator || this.arbitrator
    const collateralToken = options.collateralToken || this.collateralToken

    const { actionAmount, challengeAmount, challengeDuration } = await this.executor.getCollateralRequirements()
    const collateralRequirements = { collateralToken, actionAmount, challengeAmount, challengeDuration }

    const Wrapper = options.delay ? DelayWrapper : ExecutorWrapper
    return new Wrapper(this.artifacts, this.web3, this.agreement, arbitrator, executor, collateralRequirements)
  }

  async deployAndInitializeWrapper(options = {}) {
    await this.deployAndInitialize(options)
    const arbitrator = options.arbitrator || this.arbitrator
    return new AgreementWrapper(this.artifacts, this.web3, this.agreement, arbitrator)
  }

  async deployAndInitialize(options = {}) {
    await this.deploy(options)

    if (!options.arbitrator && !this.arbitrator) await this.deployArbitrator(options)
    const arbitrator = options.arbitrator || this.arbitrator

    const defaultOptions = { ...DEFAULT_AGREEMENT_INITIALIZATION_PARAMS, ...options }
    const { title, content } = defaultOptions

    await this.agreement.initialize(title, content, arbitrator.address)
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

    if (currentTimestamp) await agreement.mockSetTimestamp(currentTimestamp)
    this.previousDeploy = { ...this.previousDeploy, agreement }
    return agreement
  }

  async installExecutor(options = {}) {
    const owner = options.owner || await this._getSender()

    const { executorType } = options
    if (!this.baseExecutor || this.baseExecutor.constructor.contractName !== executorType) await this.deployBaseExecutor(executorType)

    const { appId, currentTimestamp } = { ...DEFAULT_EXECUTOR_INITIALIZATION_PARAMS, ...options }
    const receipt = await this.dao.newAppInstance(appId, this.baseExecutor.address, '0x', false, { from: owner })
    const executor = await this.baseExecutor.constructor.at(getNewProxyAddress(receipt))

    await this._grantExecutorPermissions(executor, owner)

    if (!options.collateralToken && !this.collateralToken) await this.deployCollateralToken(options)
    const collateralToken = options.collateralToken || this.collateralToken

    if (options.delay) {
      const CHANGE_DELAY_PERIOD_ROLE = await executor.CHANGE_DELAY_PERIOD_ROLE()
      await this.acl.createPermission(owner, executor.address, CHANGE_DELAY_PERIOD_ROLE, owner, { from: owner })

      const CHANGE_TOKEN_BALANCE_PERMISSION_ROLE = await executor.CHANGE_TOKEN_BALANCE_PERMISSION_ROLE()
      await this.acl.createPermission(owner, executor.address, CHANGE_TOKEN_BALANCE_PERMISSION_ROLE, owner, { from: owner })

      const submitPermissionToken = options.submitPermissionToken || this.submitPermissionToken || { address: ZERO_ADDR }
      const submitPermissionBalance = submitPermissionToken.address === ZERO_ADDR ? bn(0) : (options.submitPermissionBalance || DEFAULT_DELAY_INITIALIZATION_PARAMS.tokenBalancePermission.balance)

      if (submitPermissionBalance.gt(bn(0)))  {
        const submitters = options.submitters || []
        for (const submitter of submitters) await submitPermissionToken.generateTokens(submitter, submitPermissionBalance)
      } else {
        const SUBMIT_ROLE = await executor.SUBMIT_ROLE()
        await this._grantPermissions(executor, SUBMIT_ROLE, options.submitters, owner)
      }

      const challengePermissionToken = options.challengePermissionToken || this.challengePermissionToken || { address: ZERO_ADDR }
      const challengePermissionBalance = challengePermissionToken.address === ZERO_ADDR ? bn(0) : (options.challengePermissionBalance || DEFAULT_DELAY_INITIALIZATION_PARAMS.tokenBalancePermission.balance)

      if (challengePermissionBalance.gt(bn(0))) {
        const challengers = options.challengers || []
        for (const challenger of challengers) await challengePermissionToken.generateTokens(challenger, challengePermissionBalance)
      } else {
        const CHALLENGE_ROLE = await executor.CHALLENGE_ROLE()
        await this._grantPermissions(executor, CHALLENGE_ROLE, options.challengers, owner)
      }

      const { actionCollateral, challengeCollateral, challengeDuration, delayPeriod } = { ...DEFAULT_DELAY_INITIALIZATION_PARAMS, ...options }
      await executor.initialize(delayPeriod, this.agreement.address, collateralToken.address, actionCollateral, challengeCollateral, challengeDuration, submitPermissionToken.address, submitPermissionBalance, challengePermissionToken.address, challengePermissionBalance)
    } else {
      const SUBMIT_ROLE = await executor.SUBMIT_ROLE()
      await this._grantPermissions(executor, SUBMIT_ROLE, options.submitters, owner)

      const CHALLENGE_ROLE = await executor.CHALLENGE_ROLE()
      await this._grantPermissions(executor, CHALLENGE_ROLE, options.challengers, owner)

      const { actionCollateral, challengeCollateral, challengeDuration } = { ...DEFAULT_EXECUTOR_INITIALIZATION_PARAMS, ...options }
      await executor.initialize(this.agreement.address, collateralToken.address, actionCollateral, challengeCollateral, challengeDuration)
    }

    if (currentTimestamp) await executor.mockSetTimestamp(currentTimestamp)
    this.previousDeploy = { ...this.previousDeploy, executor }
    return executor
  }

  async deployArbitrator(options = {}) {
    let { feeToken, feeAmount } = { ...DEFAULT_AGREEMENT_INITIALIZATION_PARAMS.arbitrator, ...options }
    if (!feeToken.address) feeToken = await this.deployToken(feeToken)

    const Arbitrator = this._getContract('ArbitratorMock')
    const arbitrator = await Arbitrator.new(feeToken.address, feeAmount)
    this.previousDeploy = { ...this.previousDeploy, arbitrator }
    return arbitrator
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

  async deployBaseExecutor(executorType = 'AgreementExecutorMock') {
    const Executor = this._getContract(executorType)
    const baseExecutor = await Executor.new()
    this.previousDeploy = { ...this.previousDeploy, baseExecutor }
    return baseExecutor
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

  async _grantExecutorPermissions(executor, manager) {
    const EXECUTOR_ROLE = await this.agreement.EXECUTOR_ROLE()
    await this.acl.createPermission(executor.address, this.agreement.address, EXECUTOR_ROLE, manager, { from: manager })

    const executorPermissions = ['PAUSE_ROLE', 'RESUME_ROLE', 'CANCEL_ROLE', 'VOID_ROLE']
    for (const permissionName of executorPermissions) {
      const permission = await executor[permissionName]()
      await this.acl.createPermission(this.agreement.address, executor.address, permission, manager, { from: manager })
    }

    const CHANGE_COLLATERAL_REQUIREMENTS_ROLE = await executor.CHANGE_COLLATERAL_REQUIREMENTS_ROLE()
    await this.acl.createPermission(manager, executor.address, CHANGE_COLLATERAL_REQUIREMENTS_ROLE, manager, { from: manager })
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
