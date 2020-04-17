const AgreementHelper = require('./helper')
const { bigExp } = require('../lib/numbers')
const { NOW, DAY } = require('../lib/time')
const { utf8ToHex } = require('web3-utils')
const { getEventArgument, getNewProxyAddress } = require('@aragon/test-helpers/events')

const ANY_ADDR = '0xffffffffffffffffffffffffffffffffffffffff'

const DEFAULT_INITIALIZE_OPTIONS = {
  title: 'Sample Agreement',
  content: utf8ToHex('ipfs:QmdLu3XXT9uUYxqDKXXsTYG77qNYNPbhzL27ZYT9kErqcZ'),
  delayPeriod: 5 * DAY,                  // 5 days
  settlementPeriod: 2 * DAY,             // 2 days
  challengeLeverage: 200,                // 2x
  currentTimestamp: NOW,                 // fixed timestamp
  collateralAmount: bigExp(100, 18),     // 100 DAI
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

  get agreement() {
    return this.previousDeploy.agreement
  }

  get abi() {
    return this._getContract('Agreement').abi
  }

  async deployAndInitializeWrapper(options = {}) {
    await this.deployAndInitialize(options)
    const [content, collateralAmount, challengeLeverage, arbitratorAddress, delayPeriod, settlementPeriod] = await this.agreement.getCurrentSetting()

    const IArbitrator = this._getContract('IArbitrator')
    const arbitrator = IArbitrator.at(arbitratorAddress)

    const MiniMeToken = this._getContract('MiniMeToken')
    const collateralToken = options.collateralToken ? MiniMeToken.at(options.collateralToken) : this.collateralToken

    const setting = { content, collateralToken, collateralAmount, delayPeriod, settlementPeriod, challengeLeverage, arbitrator }
    return new AgreementHelper(this.artifacts, this.web3, this.agreement, setting)
  }

  async deployAndInitialize(options = {}) {
    await this.deploy(options)

    if (!options.collateralToken && !this.collateralToken) await this.deployCollateralToken(options)
    const collateralToken = options.collateralToken || this.collateralToken

    if (!options.arbitrator && !this.arbitrator) await this.deployArbitrator(options)
    const arbitrator = options.arbitrator || this.arbitrator

    const defaultOptions = { ...DEFAULT_INITIALIZE_OPTIONS, ...options }
    const { title, content, collateralAmount, delayPeriod, settlementPeriod, challengeLeverage } = defaultOptions

    await this.agreement.initialize(title, content, collateralToken.address, collateralAmount, challengeLeverage, arbitrator.address, delayPeriod, settlementPeriod)
    return this.agreement
  }

  async deploy(options = {}) {
    const owner = options.owner || this._getSender()
    if (!this.dao) await this.deployDAO(owner)

    const receipt = await this.dao.newAppInstance('0x4321', this.base.address, '0x', false, { from: owner })
    const Agreement = this._getContract('AgreementMock')
    const agreement = Agreement.at(getNewProxyAddress(receipt))

    const STAKE_ROLE = await agreement.STAKE_ROLE()
    const signers = options.signers || [ANY_ADDR]
    for (const signer of signers) {
      await this.acl.createPermission(signer, agreement.address, STAKE_ROLE, owner, { from: owner })
    }

    const CHALLENGE_ROLE = await agreement.CHALLENGE_ROLE()
    const challengers = options.challengers || [ANY_ADDR]
    for (const challenger of challengers) {
      await this.acl.createPermission(challenger, agreement.address, CHALLENGE_ROLE, owner, { from: owner })
    }

    const CHANGE_AGREEMENT_ROLE = await agreement.CHANGE_AGREEMENT_ROLE()
    await this.acl.createPermission(owner, agreement.address, CHANGE_AGREEMENT_ROLE, owner, { from: owner })

    const { currentTimestamp } = { ...DEFAULT_INITIALIZE_OPTIONS, ...options }
    await agreement.mockSetTimestamp(currentTimestamp)

    this.previousDeploy = { ...this.previousDeploy, agreement }
    return agreement
  }

  async deployCollateralToken(options = {}) {
    const { name, decimals, symbol } = { ...DEFAULT_INITIALIZE_OPTIONS.collateralToken, ...options }
    const collateralToken = await this.deployToken({ name, decimals, symbol })
    this.previousDeploy = { ...this.previousDeploy, collateralToken }
    return collateralToken
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
    const dao = Kernel.at(getEventArgument(kernelReceipt, 'DeployDAO', 'dao'))
    const acl = ACL.at(await dao.acl())

    const APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()
    await acl.createPermission(owner, dao.address, APP_MANAGER_ROLE, owner, { from: owner })

    const Agreement = this._getContract('AgreementMock')
    const base = await Agreement.new()

    this.previousDeploy = { ...this.previousDeploy, dao, acl, base, owner }
    return dao
  }

  async deployToken({ name, decimals, symbol }) {
    const MiniMeToken = this._getContract('MiniMeToken')
    return MiniMeToken.new('0x0', '0x0', 0, name, decimals, symbol, true)
  }

  _getContract(name) {
    return this.artifacts.require(name)
  }

  _getSender() {
    return this.web3.eth.accounts[0]
  }
}

module.exports = (web3, artifacts) => new AgreementDeployer(artifacts, web3)
