const AgreementWrapper = require('./agreement')

const { AGREEMENT_EVENTS } = require('../utils/events')
const { decodeEventsOfType } = require('../lib/decodeEvent')
const { getEventArgument } = require('@aragon/contract-test-helpers/events')

class DisputableWrapper extends AgreementWrapper {
  constructor(artifacts, web3, agreement, arbitrator, disputable, collateralRequirements = {}) {
    super(artifacts, web3, agreement, arbitrator);
    this.disputable = disputable
    this.collateralRequirements = collateralRequirements
  }

  get collateralToken() {
    return this.collateralRequirements.collateralToken
  }

  get actionCollateral() {
    return this.collateralRequirements.actionAmount
  }

  get challengeCollateral() {
    return this.collateralRequirements.challengeAmount
  }

  get challengeDuration() {
    return this.collateralRequirements.challengeDuration
  }

  async getBalance(user) {
    return super.getBalance(this.collateralToken, user)
  }

  async getCollateralRequirements() {
    const { collateralToken, actionAmount: actionCollateral, challengeAmount: challengeCollateral, challengeDuration } = await this.disputable.getCollateralRequirements()
    return { collateralToken: await this._getContract('MiniMeToken').at(collateralToken), actionCollateral, challengeCollateral, challengeDuration }
  }

  async newAction({ submitter = undefined, actionContext = '0x1234', sign = undefined, stake = undefined }) {
    if (!submitter) submitter = await this._getSender()

    if (stake === undefined) stake = this.actionCollateral
    if (stake) await this.approveAndCall({ amount: stake, from: submitter })
    if (sign === undefined && (await this.getSigner(submitter)).mustSign) await this.sign(submitter)

    const receipt = await this.disputable.forward(actionContext, { from: submitter })
    const logs = decodeEventsOfType(receipt, this.abi, AGREEMENT_EVENTS.ACTION_SUBMITTED)
    const actionId = getEventArgument({ logs }, AGREEMENT_EVENTS.ACTION_SUBMITTED, 'actionId')
    return { receipt, actionId }
  }

  async challenge({ actionId, challenger = undefined, settlementOffer = 0, challengeContext = '0xdcba', arbitrationFees = undefined, stake = undefined }) {
    if (stake === undefined) stake = this.challengeCollateral
    if (stake) await this.approve({ amount: stake, from: challenger })
    return super.challenge({ actionId, challenger, settlementOffer, challengeContext, arbitrationFees })
  }

  async close({ actionId, from = undefined }) {
    return from === undefined ? this.disputable.close(actionId) : this.agreement.close(actionId)
  }

  async changeCollateralRequirements(options = {}) {
    const currentRequirements = await this.getCollateralRequirements()
    const from = options.from || await this._getSender()

    const collateralToken = options.collateralToken || currentRequirements.collateralToken
    const actionCollateral = options.actionCollateral || currentRequirements.actionCollateral
    const challengeCollateral = options.challengeCollateral || currentRequirements.challengeCollateral
    const challengeDuration = options.challengeDuration || currentRequirements.challengeDuration

    return this.disputable.changeCollateralRequirements(collateralToken.address, actionCollateral, challengeCollateral, challengeDuration, { from })
  }

  async approve({ amount, from = undefined, accumulate = true }) {
    return super.approve({ token: this.collateralToken, amount, from, accumulate })
  }

  async approveAndCall({ amount, from = undefined, mint = true }) {
    return super.approveAndCall({ token: this.collateralToken, amount, from, mint })
  }

  async stake({ amount = undefined, user = undefined, from = undefined, approve = undefined }) {
    if (!amount) amount = this.actionCollateral
    return super.stake({ token: this.collateralToken, amount, user, from, approve })
  }

  async unstake({ user, amount = undefined }) {
    return super.unstake({ token: this.collateralToken, amount, user })
  }
}

module.exports = DisputableWrapper
