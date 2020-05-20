const AgreementWrapper = require('./agreement')

const { decodeEventsOfType } = require('../lib/decodeEvent')
const { getEventArgument } = require('@aragon/contract-test-helpers/events')
const { AGREEMENT_EVENTS, DISPUTABLE_EVENTS } = require('../utils/events')

class DisputableWrapper extends AgreementWrapper {
  constructor(artifacts, web3, agreement, arbitrator, stakingFactory, disputable, collateralRequirement = {}) {
    super(artifacts, web3, agreement, arbitrator, stakingFactory)
    this.disputable = disputable
    this.collateralRequirement = collateralRequirement
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

  async getDisputableInfo() {
    return super.getDisputableInfo(this.disputable)
  }

  async getCurrentCollateralRequirementId() {
    const { currentCollateralRequirementId } = await this.getDisputableInfo()
    return currentCollateralRequirementId
  }

  async getCollateralRequirement(id = undefined) {
    if (!id) id = await this.getCurrentCollateralRequirementId()
    return super.getCollateralRequirement(this.disputable, id)
  }

  async getStakingAddress() {
    return super.getStakingAddress(this.collateralToken)
  }

  async getStaking() {
    return super.getStaking(this.collateralToken)
  }

  async setAgreement({ agreement = this.address, from = undefined }) {
    if (!from) from = await this._getSender()
    return this.disputable.setAgreement(agreement, { from })
  }

  async register(options = {}) {
    const { disputable, collateralToken, actionCollateral, challengeCollateral, challengeDuration } = this
    return super.register({ disputable, collateralToken, actionCollateral, challengeCollateral, challengeDuration, ...options })
  }

  async unregister(options = {}) {
    return super.unregister({ disputable: this.disputable, ...options })
  }

  async forward({ script = '0x', from = undefined }) {
    if (!from) from = await this._getSender()

    const receipt = await this.disputable.forward(script, { from })
    const logs = decodeEventsOfType(receipt, this.abi, AGREEMENT_EVENTS.ACTION_SUBMITTED)
    const actionId = getEventArgument({ logs }, AGREEMENT_EVENTS.ACTION_SUBMITTED, 'actionId')

    const disputableId = getEventArgument(receipt, DISPUTABLE_EVENTS.SUBMITTED, 'id')
    return { receipt, actionId, disputableId }
  }

  async newAction({ submitter = undefined, actionContext = '0x1234', sign = undefined, stake = undefined }) {
    if (!submitter) submitter = await this._getSender()

    if (stake === undefined) stake = this.actionCollateral
    if (stake) await this.approveAndCall({ amount: stake, from: submitter })
    if (sign === undefined && (await this.getSigner(submitter)).mustSign) await this.sign(submitter)

    const { receipt, actionId } = await this.forward({ script: actionContext, from: submitter })
    return { receipt, actionId }
  }

  async challenge(options = {}) {
    if (options.stake === undefined) options.stake = this.challengeCollateral
    if (options.stake) await this.approve({ amount: options.stake, from: options.challenger })
    return super.challenge(options)
  }

  async close({ actionId, from = undefined }) {
    return from === undefined ? this.disputable.closeAction(actionId) : this.agreement.closeAction(actionId, { from })
  }

  async changeCollateralRequirement(options = {}) {
    return super.changeCollateralRequirement({ disputable: this.disputable, ...options })
  }

  async approve(options = {}) {
    return super.approve({ token: this.collateralToken, ...options })
  }

  async approveAndCall(options = {}) {
    return super.approveAndCall({ token: this.collateralToken, ...options })
  }

  async stake(options = {}) {
    if (!options.amount) options.amount = this.actionCollateral
    return super.stake({ token: this.collateralToken, ...options })
  }

  async unstake(options = {}) {
    return super.unstake({ token: this.collateralToken, ...options })
  }
}

module.exports = DisputableWrapper
