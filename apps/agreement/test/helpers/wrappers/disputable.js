const AgreementWrapper = require('./agreement')

const { bn } = require('../lib/numbers')
const { decodeEventsOfType } = require('../lib/decodeEvent')
const { getEventArgument } = require('@aragon/contract-helpers-test/events')
const { AGREEMENT_EVENTS, DISPUTABLE_EVENTS } = require('../utils/events')

const EMPTY_DATA = '0x'

class DisputableWrapper extends AgreementWrapper {
  constructor(artifacts, web3, agreement, arbitrator, aragonAppFeesCashier, stakingFactory, disputable, collateralRequirement = {}) {
    super(artifacts, web3, agreement, arbitrator, aragonAppFeesCashier, stakingFactory)
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

  async activate(options = {}) {
    const { disputable, collateralToken, actionCollateral, challengeCollateral, challengeDuration } = this
    return super.activate({ disputable, collateralToken, actionCollateral, challengeCollateral, challengeDuration, ...options })
  }

  async deactivate(options = {}) {
    return super.deactivate({ disputable: this.disputable, ...options })
  }

  async forward({ script = '0x', context = '0x1234', value = bn(0), from = undefined }) {
    if (!from) from = await this._getSender()

    await this.allowManager({ user: from, amount: this.actionCollateral })

    const receipt = await this.disputable.forward(script, context, { from, value })
    const logs = decodeEventsOfType(receipt, this.abi, AGREEMENT_EVENTS.ACTION_SUBMITTED)
    const actionId = logs.length > 0 ? getEventArgument({ logs }, AGREEMENT_EVENTS.ACTION_SUBMITTED, 'actionId') : undefined

    const disputableActionId = getEventArgument(receipt, DISPUTABLE_EVENTS.SUBMITTED, 'id')
    return { receipt, actionId, disputableActionId }
  }

  async newAction({ submitter = undefined, actionContext = '0x1234', sign = undefined, stake = undefined, value = bn(0) }) {
    if (!submitter) submitter = await this._getSender()

    if (stake === undefined) stake = this.actionCollateral
    if (stake) await this.approveAndCall({ amount: stake, from: submitter })
    if (sign === undefined && (await this.getSigner(submitter)).mustSign) await this.sign(submitter)

    return this.forward({ context: actionContext, from: submitter, value })
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

  async allowManager({ token = undefined, user, amount}) {
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
    const appId = await this.disputable.appId()
    return this.aragonAppFeesCashier.setAppFee(appId, token.address, amount)
  }

  async unsetAppFee() {
    const appId = await this.disputable.appId()
    return this.aragonAppFeesCashier.unsetAppFee(appId)
  }

  async mockDisputable(options = {}) {
    const { canClose, canChallenge } = options
    return this.disputable.mockDisputable(!!canClose, !!canChallenge)
  }
}

module.exports = DisputableWrapper
