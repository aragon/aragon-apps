const { bn } = require('../lib/numbers')
const { CHALLENGES_STATE } = require('../utils/enums')
const { AGREEMENT_EVENTS } = require('../utils/events')
const { getEventArgument } = require('@aragon/contract-test-helpers/events')

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

class AgreementWrapper {
  constructor(artifacts, web3, agreement, arbitrator, stakingFactory) {
    this.artifacts = artifacts
    this.web3 = web3
    this.agreement = agreement
    this.arbitrator = arbitrator
    this.stakingFactory = stakingFactory
  }

  get abi() {
    return this.agreement.abi
  }

  get address() {
    return this.agreement.address
  }

  async canPerform(who, where, what, how) {
    return this.agreement.canPerform(who, where, what, how)
  }

  async getCurrentContentId() {
    return this.agreement.getCurrentContentId()
  }

  async getCurrentContent() {
    return this.agreement.getContent(await this.getCurrentContentId())
  }

  async getAction(actionId) {
    const { disputable, disputableId, context, state, endDate, submitter, collateralId, currentChallengeId } = await this.agreement.getAction(actionId)
    return { disputable, disputableId, context, state, endDate, submitter, collateralId, currentChallengeId }
  }

  async getChallenge(challengeId) {
    const { actionId, context, endDate, challenger, settlementOffer, arbitratorFeeAmount, arbitratorFeeToken, state, disputeId, ruling, submitterFinishedEvidence, challengerFinishedEvidence } = await this.agreement.getChallenge(challengeId)
    return { actionId, context, endDate, challenger, settlementOffer, arbitratorFeeAmount, arbitratorFeeToken, state, disputeId, ruling, submitterFinishedEvidence, challengerFinishedEvidence }
  }

  async getSigner(signer) {
    const { lastContentIdSigned, mustSign } = await this.agreement.getSigner(signer)
    return { lastContentIdSigned, mustSign }
  }

  async getBalance(token, user) {
    const staking = await this.getStaking(token)
    const { available, locked } = await staking.getBalance(user)
    return { available, locked }
  }

  async getStakingAddress(token) {
    const stakingAddress = await this.stakingFactory.getInstance(token.address)
    if (stakingAddress !== ZERO_ADDRESS) return stakingAddress
    const receipt = await this.stakingFactory.getOrCreateInstance(token.address)
    return getEventArgument(receipt, 'NewStaking', 'instance')
  }

  async getStaking(token) {
    const stakingAddress = await this.getStakingAddress(token)
    const Staking = this._getContract('Staking')
    return Staking.at(stakingAddress)
  }

  async getDisputableInfo(disputable) {
    const { registered, currentCollateralRequirementId } = await this.agreement.getDisputableInfo(disputable.address)
    return { registered, currentCollateralRequirementId }
  }

  async getCollateralRequirement(disputable, collateralId) {
    const MiniMeToken = this._getContract('MiniMeToken')
    const { collateralToken, actionAmount, challengeAmount, challengeDuration } = await this.agreement.getCollateralRequirement(disputable.address, collateralId)
    return { collateralToken: await MiniMeToken.at(collateralToken), actionCollateral: actionAmount, challengeCollateral: challengeAmount, challengeDuration }
  }

  async canChallenge(actionId, challenger) {
    return this.agreement.canPerformChallenge(actionId, challenger)
  }

  async getAllowedPaths(actionId) {
    const canProceed = await this.agreement.canProceed(actionId)
    const canChallenge = await this.agreement.canChallenge(actionId)
    const canSettle = await this.agreement.canSettle(actionId)
    const canDispute = await this.agreement.canDispute(actionId)
    const canClaimSettlement = await this.agreement.canClaimSettlement(actionId)
    const canRuleDispute = await this.agreement.canRuleDispute(actionId)
    return { canProceed, canChallenge, canSettle, canDispute, canClaimSettlement, canRuleDispute }
  }

  async sign(from) {
    if (!from) from = await this._getSender()
    return this.agreement.sign({ from })
  }

  async challenge({ actionId, challenger = undefined, settlementOffer = 0, challengeDuration = undefined, challengeContext = '0xdcba', finishedSubmittingEvidence = false, arbitrationFees = undefined }) {
    if (!challenger) challenger = await this._getSender()

    if (arbitrationFees === undefined) arbitrationFees = await this.halfArbitrationFees()
    if (arbitrationFees) await this.approveArbitrationFees({ amount: arbitrationFees, from: challenger })

    const receipt = await this.agreement.challengeAction(actionId, settlementOffer, finishedSubmittingEvidence, challengeContext, { from: challenger })
    const challengeId = getEventArgument(receipt, AGREEMENT_EVENTS.ACTION_CHALLENGED, 'challengeId')
    if (challengeDuration) await this.increaseTime(challengeDuration)
    return { receipt, challengeId }
  }

  async settle({ actionId, from = undefined }) {
    if (!from) from = (await this.getAction(actionId)).submitter
    return this.agreement.settle(actionId, { from })
  }

  async dispute({ actionId, from = undefined, finishedSubmittingEvidence = false, arbitrationFees = undefined }) {
    if (!from) from = (await this.getAction(actionId)).submitter

    if (arbitrationFees === undefined) arbitrationFees = await this.missingArbitrationFees(actionId)
    if (arbitrationFees) await this.approveArbitrationFees({ amount: arbitrationFees, from })

    return this.agreement.disputeAction(actionId, finishedSubmittingEvidence, { from })
  }

  async submitEvidence({ actionId, from, evidence = '0x1234567890abcdef', finished = false }) {
    const { currentChallengeId } = await this.getAction(actionId)
    const { disputeId } = await this.getChallenge(currentChallengeId)
    return this.agreement.submitEvidence(disputeId, evidence, finished, { from })
  }

  async finishEvidence({ actionId, from }) {
    return this.submitEvidence({ actionId, from, evidence: '0x', finished: true })
  }

  async executeRuling({ actionId, ruling, mockRuling = true }) {
    const { currentChallengeId } = await this.getAction(actionId)
    const { state, disputeId } = await this.getChallenge(currentChallengeId)

    if (mockRuling) {
      const ArbitratorMock = this._getContract('ArbitratorMock')
      const arbitrator = await ArbitratorMock.at(this.arbitrator.address)
      await arbitrator.rule(disputeId, ruling)
    }

    return (state.toString() != CHALLENGES_STATE.WAITING && state.toString() != CHALLENGES_STATE.SETTLED)
      ? this.arbitrator.executeRuling(disputeId)
      : this.agreement.rule(disputeId, ruling)
  }

  async register({ disputable, collateralToken, actionCollateral, challengeCollateral, challengeDuration, from = undefined }) {
    if (!from) from = await this._getSender()
    return this.agreement.register(disputable.address, collateralToken.address, actionCollateral, challengeCollateral, challengeDuration, { from })
  }

  async unregister({ disputable, from = undefined }) {
    if (!from) from = await this._getSender()
    return this.agreement.unregister(disputable.address, { from })
  }

  async changeCollateralRequirement(options = {}) {
    const currentRequirements = await this.getCollateralRequirement()
    const from = options.from || await this._getSender()

    const collateralToken = options.collateralToken || currentRequirements.collateralToken
    const actionCollateral = options.actionCollateral || currentRequirements.actionCollateral
    const challengeCollateral = options.challengeCollateral || currentRequirements.challengeCollateral
    const challengeDuration = options.challengeDuration || currentRequirements.challengeDuration

    return this.agreement.changeCollateralRequirement(options.disputable.address, collateralToken.address, actionCollateral, challengeCollateral, challengeDuration, { from })
  }

  async changeContent({ content = '0x1234', from = undefined }) {
    if (!from) from = await this._getSender()
    return this.agreement.changeContent(content, { from })
  }

  async approveArbitrationFees({ amount = undefined, from = undefined, accumulate = false }) {
    if (!from) from = await this._getSender()
    if (amount === undefined) amount = await this.halfArbitrationFees()

    const feeToken = await this.arbitratorToken()
    await feeToken.generateTokens(from, amount)
    await this.safeApprove(feeToken, from, this.address, amount, accumulate)
  }

  async arbitratorFees() {
    const { feeToken: feeTokenAddress, feeAmount } = await this.arbitrator.getDisputeFees()
    const MiniMeToken = this._getContract('MiniMeToken')
    const feeToken = await MiniMeToken.at(feeTokenAddress)
    return { feeToken, feeAmount }
  }

  async arbitratorToken() {
    const { feeToken } = await this.arbitratorFees()
    return feeToken
  }

  async halfArbitrationFees() {
    const { feeAmount } = await this.arbitratorFees()
    return feeAmount.div(bn(2))
  }

  async missingArbitrationFees(actionId) {
    const { missingFees } = await this.agreement.getMissingArbitratorFees(actionId)
    return missingFees
  }

  async currentTimestamp() {
    return this.agreement.getTimestampPublic()
  }

  async moveBeforeActionEndDate(actionId) {
    const { endDate } = await this.getAction(actionId)
    return this.moveToTimestamp(endDate.sub(bn(1)))
  }

  async moveToActionEndDate(actionId) {
    const { endDate } = await this.getAction(actionId)
    return this.moveToTimestamp(endDate)
  }

  async moveAfterActionEndDate(actionId) {
    const { endDate } = await this.getAction(actionId)
    return this.moveToTimestamp(endDate.add(bn(1)))
  }

  async moveBeforeChallengeEndDate(challengeId) {
    const { endDate } = await this.getChallenge(challengeId)
    return this.moveToTimestamp(endDate.sub(bn(1)))
  }

  async moveToChallengeEndDate(challengeId) {
    const { endDate } = await this.getChallenge(challengeId)
    return this.moveToTimestamp(endDate)
  }

  async moveAfterChallengeEndDate(challengeId) {
    const { endDate } = await this.getChallenge(challengeId)
    return this.moveToTimestamp(endDate.add(bn(1)))
  }

  async moveToTimestamp(timestamp) {
    const clockMockAddress = await this.agreement.clockMock()
    const clockMock = await this._getContract('ClockMock').at(clockMockAddress)
    const currentTimestamp = await this.currentTimestamp()
    if (timestamp.lt(currentTimestamp)) return clockMock.mockSetTimestamp(timestamp)
    const timeDiff = timestamp.sub(currentTimestamp)
    return clockMock.mockIncreaseTime(timeDiff)
  }

  async increaseTime(seconds) {
    const clockMockAddress = await this.agreement.clockMock()
    const clockMock = await this._getContract('ClockMock').at(clockMockAddress)
    return clockMock.mockIncreaseTime(seconds)
  }

  async approve({ token, amount, to = undefined, from = undefined, accumulate = true }) {
    if (!to) to = this.address
    if (!from) from = await this._getSender()

    await token.generateTokens(from, amount)
    return this.safeApprove(token, from, to, amount, accumulate)
  }

  async approveAndCall({ token, amount, to = undefined, from = undefined, mint = true }) {
    if (!to) to = await this.getStakingAddress(token)
    if (!from) from = await this._getSender()

    if (mint) await token.generateTokens(from, amount)
    return token.approveAndCall(to, amount, '0x', { from })
  }

  async stake({ token, amount, user = undefined, from = undefined, approve = undefined }) {
    if (!user) user = await this._getSender()
    if (!from) from = user

    const staking = await this.getStaking(token)
    if (approve === undefined) approve = amount
    if (approve) await this.approve({ token, amount: approve, to: staking.address, from })

    return (user === from)
      ? staking.stake(amount, { from: user })
      : staking.stakeFor(user, amount, { from })
  }

  async unstake({ token, user, amount = undefined }) {
    if (amount === undefined) amount = (await this.getBalance(user)).available
    const staking = await this.getStaking(token)
    return staking.unstake(amount, { from: user })
  }

  async safeApprove(token, from, to, amount, accumulate = true) {
    const allowance = await token.allowance(from, to)
    if (allowance.gt(bn(0))) await token.approve(to, 0, { from })
    const newAllowance = accumulate ? amount.add(allowance) : amount
    return token.approve(to, newAllowance, { from })
  }

  async _getSender() {
    const accounts = await this.web3.eth.getAccounts()
    return accounts[0]
  }

  _getContract(name) {
    return this.artifacts.require(name)
  }
}

module.exports = AgreementWrapper
