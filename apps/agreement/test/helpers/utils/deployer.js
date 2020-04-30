const AgreementHelper = require('./helper')
const { NOW, DAY } = require('../lib/time')
const { utf8ToHex } = require('web3-utils')
const { bigExp, bn } = require('../lib/numbers')
const { getEventArgument, getNewProxyAddress } = require('@aragon/contract-test-helpers/events')

const ANY_ADDR = '0xffffffffffffffffffffffffffffffffffffffff'
const ZERO_ADDR = '0x0000000000000000000000000000000000000000'

const DEFAULT_INITIALIZE_OPTIONS = {
  appId: '0xcafe1234cafe1234cafe1234cafe1234cafe1234cafe1234cafe1234cafe1234',
  title: 'Sample Agreement',
  content: utf8ToHex('ipfs:QmdLu3XXT9uUYxqDKXXsTYG77qNYNPbhzL27ZYT9kErqcZ'),
  delayPeriod: 5 * DAY,                  // 5 days
  settlementPeriod: 2 * DAY,             // 2 days
  currentTimestamp: NOW,                 // fixed timestamp
  collateralAmount: bigExp(100, 18),     // 100 DAI
  challengeCollateral: bigExp(200, 18),  // 200 DAI
  collateralToken: {
    symbol: 'DAI',
    decimals: 18,
    name: 'Sample DAI'
  },
  arbitrator: {
    feeAmount: bigExp(5, 18),            // 5 AFT
    feeToken: {
      symbol: 'AFT',
      decimals: 18,
      name: 'Arbitrator Fee Token'
    }
  },
  tokenBalancePermission: {
    balance: bigExp(58, 18),            // 58 ANT
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

  get dao() {
    return this.previousDeploy.dao
  }

  get acl() {
    return this.previousDeploy.acl
  }

  get base() {
    return this.previousDeploy.base
  }

  get owner() {
    return this.previousDeploy.owner
  }

  get collateralToken() {
    return this.previousDeploy.collateralToken
  }

  get arbitrator() {
    return this.previousDeploy.arbitrator
  }

  get arbitratorToken() {
    return this.previousDeploy.arbitratorToken
  }

  get signPermissionToken() {
    return this.previousDeploy.signPermissionToken
  }

  get challengePermissionToken() {
    return this.previousDeploy.challengePermissionToken
  }

  get agreement() {
    return this.previousDeploy.agreement
  }

  get abi() {
    return this.base.abi
  }

  async deployAndInitializeWrapper(options = {}) {
    await this.deployAndInitialize(options)

    const arbitrator = options.arbitrator || this.arbitrator
    const collateralToken = options.collateralToken || this.collateralToken

    const { content, delayPeriod, settlementPeriod, collateralAmount, challengeCollateral } = await this.agreement.getSetting(0)
    const initialSetting = { content, delayPeriod, settlementPeriod, collateralAmount, challengeCollateral }

    return new AgreementHelper(this.artifacts, this.web3, this.agreement, arbitrator, collateralToken, initialSetting)
  }

  async deployAndInitialize(options = {}) {
    await this.deploy(options)

    if (!options.collateralToken && !this.collateralToken) await this.deployCollateralToken(options)
    const collateralToken = options.collateralToken || this.collateralToken

    if (!options.arbitrator && !this.arbitrator) await this.deployArbitrator(options)
    const arbitrator = options.arbitrator || this.arbitrator

    const defaultOptions = { ...DEFAULT_INITIALIZE_OPTIONS, ...options }
    const { title, content, collateralAmount, delayPeriod, settlementPeriod, challengeCollateral } = defaultOptions

    const signPermissionToken = options.signPermissionToken || this.signPermissionToken || { address: ZERO_ADDR }
    const signPermissionBalance = signPermissionToken.address === ZERO_ADDR ? bn(0) : (options.signPermissionBalance || DEFAULT_INITIALIZE_OPTIONS.tokenBalancePermission.balance)

    if (signPermissionBalance.gt(bn(0)))  {
      const signers = options.signers || []
      for (const signer of signers) await signPermissionToken.generateTokens(signer, signPermissionBalance)
    }

    const challengePermissionToken = options.challengePermissionToken || this.challengePermissionToken || { address: ZERO_ADDR }
    const challengePermissionBalance = challengePermissionToken.address === ZERO_ADDR ? bn(0) : (options.challengePermissionBalance || DEFAULT_INITIALIZE_OPTIONS.tokenBalancePermission.balance)

    if (challengePermissionBalance.gt(bn(0)))  {
      const challengers = options.challengers || []
      for (const challenger of challengers) await challengePermissionToken.generateTokens(challenger, challengePermissionBalance)
    }

    await this.agreement.initialize(title, content, collateralToken.address, collateralAmount, challengeCollateral, arbitrator.address, delayPeriod, settlementPeriod, signPermissionToken.address, signPermissionBalance, challengePermissionToken.address, challengePermissionBalance)
    return this.agreement
  }

  async deploy(options = {}) {
    const owner = options.owner || await this._getSender()
    if (!this.dao) await this.deployDAO(owner)
    if (!this.base) await this.deployBase()

    const appId = options.appId || DEFAULT_INITIALIZE_OPTIONS.appId
    const receipt = await this.dao.newAppInstance(appId, this.base.address, '0x', false, { from: owner })
    const agreement = await this.base.constructor.at(getNewProxyAddress(receipt))

    if (!this.signPermissionToken) {
      const SIGN_ROLE = await agreement.SIGN_ROLE()
      const signers = options.signers || [ANY_ADDR]
      for (const signer of signers) {
        if (signers.indexOf(signer) === 0) await this.acl.createPermission(signer, agreement.address, SIGN_ROLE, owner, { from: owner })
        else await this.acl.grantPermission(signer, agreement.address, SIGN_ROLE, { from: owner })
      }
    }

    if (!this.challengePermissionToken) {
      const CHALLENGE_ROLE = await agreement.CHALLENGE_ROLE()
      const challengers = options.challengers || [ANY_ADDR]
      for (const challenger of challengers) {
        if (challengers.indexOf(challenger) === 0) await this.acl.createPermission(challenger, agreement.address, CHALLENGE_ROLE, owner, { from: owner })
        else await this.acl.grantPermission(challenger, agreement.address, CHALLENGE_ROLE, { from: owner })
      }
    }

    const CHANGE_AGREEMENT_ROLE = await agreement.CHANGE_AGREEMENT_ROLE()
    await this.acl.createPermission(owner, agreement.address, CHANGE_AGREEMENT_ROLE, owner, { from: owner })

    const CHANGE_TOKEN_BALANCE_PERMISSION_ROLE = await agreement.CHANGE_TOKEN_BALANCE_PERMISSION_ROLE()
    await this.acl.createPermission(owner, agreement.address, CHANGE_TOKEN_BALANCE_PERMISSION_ROLE, owner, { from: owner })

    const { currentTimestamp } = { ...DEFAULT_INITIALIZE_OPTIONS, ...options }
    if (currentTimestamp) await agreement.mockSetTimestamp(currentTimestamp)

    this.previousDeploy = { ...this.previousDeploy, agreement }
    return agreement
  }

  async deployCollateralToken(options = {}) {
    const { name, decimals, symbol } = { ...DEFAULT_INITIALIZE_OPTIONS.collateralToken, ...options.collateralToken }
    const collateralToken = await this.deployToken({ name, decimals, symbol })
    this.previousDeploy = { ...this.previousDeploy, collateralToken }
    return collateralToken
  }

  async deploySignPermissionToken(options = {}) {
    const { name, decimals, symbol } = { ...DEFAULT_INITIALIZE_OPTIONS.tokenBalancePermission.token, ...options.signPermissionToken }
    const signPermissionToken = await this.deployToken({ name, decimals, symbol })
    this.previousDeploy = { ...this.previousDeploy, signPermissionToken }
    return signPermissionToken
  }

  async deployChallengePermissionToken(options = {}) {
    const { name, decimals, symbol } = { ...DEFAULT_INITIALIZE_OPTIONS.tokenBalancePermission.token, ...options.challengePermissionToken }
    const challengePermissionToken = await this.deployToken({ name, decimals, symbol })
    this.previousDeploy = { ...this.previousDeploy, challengePermissionToken }
    return challengePermissionToken
  }

  async deployArbitrator(options = {}) {
    let { feeToken, feeAmount } = { ...DEFAULT_INITIALIZE_OPTIONS.arbitrator, ...options }
    if (!feeToken.address) feeToken = this.arbitratorToken || (await this.deployArbitratorToken(feeToken))

    const Arbitrator = this._getContract('ArbitratorMock')
    const arbitrator = await Arbitrator.new(feeToken.address, feeAmount)
    this.previousDeploy = { ...this.previousDeploy, arbitrator }
    return arbitrator
  }

  async deployArbitratorToken(options = {}) {
    const { name, decimals, symbol } = { ...DEFAULT_INITIALIZE_OPTIONS.arbitrator.feeToken, ...options }
    const arbitratorToken = await this.deployToken({ name, decimals, symbol })
    this.previousDeploy = { ...this.previousDeploy, arbitratorToken }
    return arbitratorToken
  }

  async deployBase() {
    const Agreement = this._getContract('AgreementMock')
    const base = await Agreement.new()
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

  async deployToken({ name, decimals, symbol }) {
    const MiniMeToken = this._getContract('MiniMeToken')
    return MiniMeToken.new(ZERO_ADDR, ZERO_ADDR, 0, name, decimals, symbol, true)
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
