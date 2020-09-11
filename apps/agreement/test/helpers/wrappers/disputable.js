const AgreementWrapper = require('./agreement')
const { AGREEMENT_EVENTS, DISPUTABLE_EVENTS } = require('../utils/events')

const { MAX_UINT192, bn, getEventArgument } = require('@aragon/contract-helpers-test')

class DisputableWrapper extends AgreementWrapper {
  constructor(artifacts, web3, agreement, arbitrator, stakingFactory, clock, disputable, collateralRequirement = {}) {
    super(artifacts, web3, agreement, arbitrator, stakingFactory, clock)
    this.disputable = disputable
    this.collateralRequirement = collateralRequirement
  }

  get disputableAbi() {
    return this.disputable.abi
  }

  get collateralToken() {
    return this.collateralRequirement.collateralToken
  }

  get actionCollateral() {
    return this.collateralRequirement.actionCollateral
  }

  get challengeCollateral() {
    return this.collateralRequirement.challengeCollateral
  }

  get challengeDuration() {
    return this.collateralRequirement.challengeDuration
  }

  async canForward(user) {
    return this.disputable.canForward(user, '0x')
  }

  async getBalance(user) {
    return super.getBalance(this.collateralToken, user)
  }

  async getTotalAvailableBalance(user) {
    return super.getTotalAvailableBalance(this.collateralToken, user)
  }

  async getDisputableInfo() {
    return super.getDisputableInfo(this.disputable)
  }

  async getCurrentCollateralRequirementId() {
    const { currentCollateralRequirementId } = await this.getDisputableInfo()
    return currentCollateralRequirementId
  }

  async getCollateralRequirement(id = undefined) {
    if (id === undefined) id = await this.getCurrentCollateralRequirementId()
    return super.getCollateralRequirement(this.disputable, id)
  }

  async getStakingAddress(token = undefined) {
    if (token === undefined) token = this.collateralToken
    return super.getStakingAddress(token)
  }

  async getStaking(token = undefined) {
    if (token === undefined) token = this.collateralToken
    return super.getStaking(token)
  }

  async appId() {
    return this.disputable.appId()
  }

  async activate(options = {}) {
    const { disputable, collateralToken, actionCollateral, challengeCollateral, challengeDuration } = this
    return super.activate({ disputable, collateralToken, challengeDuration, actionCollateral, challengeCollateral, ...options })
  }

  async deactivate(options = {}) {
    return super.deactivate({ disputable: this.disputable, ...options })
  }

  async forward({ script = '0x', context = '0x1234', value = bn(0), from = undefined }) {
    if (!from) from = await this._getSender()

    const receipt = await this.disputable.forward(script, context, { from, value })
    const actionId = getEventArgument(receipt, AGREEMENT_EVENTS.ACTION_SUBMITTED, 'actionId', { decodeForAbi: this.abi })

    const disputableActionId = getEventArgument(receipt, DISPUTABLE_EVENTS.SUBMITTED, 'id')
    return { receipt, actionId, disputableActionId }
  }

  async newAction({ submitter = undefined, actionContext = '0x1234', sign = undefined, stake = undefined, value = bn(0) }) {
    if (!submitter) submitter = await this._getSender()

    if (stake === undefined) stake = this.actionCollateral
    if (stake) await this.approveAndCall({ amount: stake, from: submitter })

    if (sign === undefined && (await this.getSigner(submitter)).mustSign) {
      await this.sign({ from: submitter })
      await this.allowManager({ user: submitter })
    }

    return this.forward({ context: actionContext, from: submitter, value })
  }

  async close(id, fromDisputable = false) {
    return fromDisputable ? this.disputable.closeAction(id) : super.close(id)
  }

  async challenge(options = {}) {
    if (options.stake === undefined) options.stake = this.challengeCollateral
    if (options.stake) await this.approve({ amount: options.stake, from: options.challenger })
    return super.challenge(options)
  }

  async changeCollateralRequirement(options = {}) {
    return super.changeCollateralRequirement({ disputable: this.disputable, ...options })
  }

  async approve(options = {}) {
    if (!options.token) options.token = this.collateralToken
    return super.approve(options)
  }

  async approveAndCall(options = {}) {
    if (!options.token) options.token = this.collateralToken
    return super.approveAndCall(options)
  }

  async allowManager({ user, token = undefined, amount = MAX_UINT192}) {
    if (!token) token = this.collateralToken
    return super.allowManager({ token, user, amount })
  }

  async stake(options = {}) {
    if (!options.amount) options.amount = this.actionCollateral
    if (!options.token) options.token = this.collateralToken
    return super.stake(options)
  }

  async unstake(options = {}) {
    return super.unstake({ token: this.collateralToken, ...options })
  }

  async setAppFee({ token = undefined, amount }) {
    if (!token) token = this.collateralToken
    const appId = await this.appId()
    const cashier = await this.appFeesCashier()
    return cashier.setAppFee(appId, token.address, amount)
  }

  async mockDisputable(options = {}) {
    const { canClose, canChallenge, callbacksRevert } = options
    return this.disputable.mockDisputable(!!canClose, !!canChallenge, !!callbacksRevert)
  }
}

module.exports = DisputableWrapper
