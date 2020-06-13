const AgreementWrapper = require('./agreement')

const { bn } = require('../lib/numbers')
const { decodeEventsOfType } = require('../lib/decodeEvent')
const { getEventArgument } = require('@aragon/contract-helpers-test/events')
const { AGREEMENT_EVENTS, DISPUTABLE_EVENTS } = require('../utils/events')

const EMPTY_DATA = '0x'

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

  async getTotalAvailableBalance(user) {
    return super.getTotalAvailableBalance(this.collateralToken, user)
  }

  async getDisputableInfo() {
    return super.getDisputableInfo(this.disputable)
  }

  async getDisputableAction(actionId) {
    const { disputableActionId } = await this.getAction(actionId)
    const { challenged, endDate, finished } = await this.disputable.getDisputableAction(disputableActionId)
    return { challenged, endDate, finished }
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

  async activate(options = {}) {
    const { disputable, collateralToken, actionCollateral, challengeCollateral, challengeDuration } = this
    return super.activate({ disputable, collateralToken, actionCollateral, challengeCollateral, challengeDuration, ...options })
  }

  async deactivate(options = {}) {
    return super.deactivate({ disputable: this.disputable, ...options })
  }

  async allowManager({ owner, amount}) {
    // allow lock manager if needed
    const staking = await this.getStaking()
    const lock = await staking.getLock(owner, this.agreement.address)
    if (lock._allowance.eq(bn(0))) {
      await staking.allowManager(this.agreement.address, amount, EMPTY_DATA, { from: owner })
    } else if (lock._allowance.sub(lock._amount).lt(amount)) {
      await staking.increaseLockAllowance(this.agreement.address, amount, { from: owner })
    }
  }

  async forward({ script = '0x', from = undefined }) {
    if (!from) from = await this._getSender()

    await this.allowManager({ owner: from, amount: this.actionCollateral })

    const receipt = await this.disputable.forward(script, { from })
    const logs = decodeEventsOfType(receipt, this.abi, AGREEMENT_EVENTS.ACTION_SUBMITTED)
    const actionId = logs.length > 0 ? getEventArgument({ logs }, AGREEMENT_EVENTS.ACTION_SUBMITTED, 'actionId') : undefined

    const disputableActionId = getEventArgument(receipt, DISPUTABLE_EVENTS.SUBMITTED, 'id')
    return { receipt, actionId, disputableActionId }
  }

  async newAction({ submitter = undefined, actionContext = '0x1234', sign = undefined, stake = undefined }) {
    if (!submitter) submitter = await this._getSender()

    if (stake === undefined) stake = this.actionCollateral
    if (stake) await this.approveAndCall({ amount: stake, from: submitter })
    if (sign === undefined && (await this.getSigner(submitter)).mustSign) await this.sign(submitter)

    return this.forward({ script: actionContext, from: submitter })
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

  async mockDisputable(options = {}) {
    const { canClose, canChallenge } = options
    return this.disputable.mockDisputable(!!canClose, !!canChallenge)
  }
}

module.exports = DisputableWrapper
