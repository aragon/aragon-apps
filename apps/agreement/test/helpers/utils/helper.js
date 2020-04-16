const EVENTS = require('./events')
const { bn } = require('../lib/numbers')
const { getEventArgument } = require('@aragon/test-helpers/events')
const { encodeCallScript } = require('@aragon/test-helpers/evmScript')

const PCT_BASE = bn(100)

class AgreementHelper {
  constructor(artifacts, web3, agreement, setting = {}) {
    this.artifacts = artifacts
    this.web3 = web3
    this.agreement = agreement
    this.setting = setting
  }

  get address() {
    return this.agreement.address
  }

  get arbitrator() {
    return this.setting.arbitrator
  }

  get content() {
    return this.setting.content
  }

  get collateralAmount() {
    return this.setting.collateralAmount
  }

  get collateralToken() {
    return this.setting.collateralToken
  }

  get challengeLeverage() {
    return this.setting.challengeLeverage
  }

  get challengeStake() {
    return this.collateralAmount.mul(this.challengeLeverage).div(PCT_BASE)
  }

  async getBalance(signer) {
    const [available, locked, challenged] = await this.agreement.getBalance(signer)
    return { available, locked, challenged }
  }

  async getAction(actionId) {
    const [script, context, state, createdAt, submitter, settingId] = await this.agreement.getAction(actionId)
    return { script, context, state, createdAt, submitter, settingId }
  }

  async getChallenge(actionId) {
    const [context, createdAt, challenger, settlementOffer, arbitratorFeeAmount, arbitratorFeeToken, state, disputeId] = await this.agreement.getChallenge(actionId)
    return { context, createdAt, challenger, settlementOffer, arbitratorFeeAmount, arbitratorFeeToken, state, disputeId }
  }

  async getDispute(actionId) {
    const [ruling, submitterFinishedEvidence, challengerFinishedEvidence] = await this.agreement.getDispute(actionId)
    return { ruling, submitterFinishedEvidence, challengerFinishedEvidence }
  }

  async getSetting(settingId) {
    const [content, collateralAmount, challengeLeverage, arbitrator, delayPeriod, settlementPeriod] = await this.agreement.getSetting(settingId)
    return { content, collateralAmount, delayPeriod, settlementPeriod, challengeLeverage, arbitrator }
  }

  async getAllowedPaths(actionId) {
    const canCancel = await this.agreement.canCancel(actionId)
    const canChallenge = await this.agreement.canChallenge(actionId)
    const canAnswerChallenge = await this.agreement.canAnswerChallenge(actionId)
    const canRuleDispute = await this.agreement.canRuleDispute(actionId)
    const canSubmitEvidence = await this.agreement.canSubmitEvidence(actionId)
    const canExecute = await this.agreement.canExecute(actionId)
    return { canCancel, canChallenge, canAnswerChallenge, canRuleDispute, canSubmitEvidence, canExecute }
  }

  async approve({ amount, from = undefined }) {
    if (!from) from = this._getSender()

    await this.collateralToken.generateTokens(from, amount)
    return this.safeApprove(this.collateralToken, from, this.address, amount)
  }

  async approveAndCall({ amount, from = undefined, mint = true }) {
    if (!from) from = this._getSender()

    if (mint) await this.collateralToken.generateTokens(from, amount)
    return this.collateralToken.approveAndCall(this.address, amount, '0x', { from })
  }

  async stake({ signer = undefined, amount = undefined, from = undefined, approve = undefined }) {
    if (!signer) signer = this._getSender()
    if (!amount) amount = this.collateralAmount
    if (!from) from = signer

    if (approve === undefined) approve = amount
    if (approve) await this.approve({ amount: approve, from })

    return (signer === from)
      ? this.agreement.stake(amount, { from: signer })
      : this.agreement.stakeFor(signer, amount, { from })
  }

  async unstake({ signer, amount = undefined }) {
    if (!amount) amount = (await this.getBalance(signer)).available

    return this.agreement.unstake(amount, { from: signer })
  }

  async schedule({ actionContext = '0xabcd', script = undefined, submitter = undefined, stake = undefined }) {
    if (!submitter) submitter = this._getSender()
    if (!script) script = await this.buildEvmScript()

    if (stake === undefined) stake = this.collateralAmount
    if (stake) await this.approveAndCall({ amount: stake, from: submitter })

    const receipt = await this.agreement.schedule(actionContext, script, { from: submitter })
    const actionId = getEventArgument(receipt, EVENTS.ACTION_SCHEDULED, 'actionId');
    return { receipt, actionId }
  }

  async challenge({ actionId, challenger = undefined, settlementOffer = 0, challengeContext = '0xdcba', arbitrationFees = undefined, stake = undefined }) {
    if (!challenger) challenger = this._getSender()

    if (arbitrationFees === undefined) arbitrationFees = await this.halfArbitrationFees()
    if (arbitrationFees) await this.approveArbitrationFees({ amount: arbitrationFees, from: challenger })

    if (stake === undefined) stake = this.challengeStake
    if (stake) await this.approve({ amount: stake, from: challenger })

    return this.agreement.challengeAction(actionId, settlementOffer, challengeContext, { from: challenger })
  }

  async execute({ actionId, from = undefined }) {
    if (!from) from = this._getSender()
    return this.agreement.execute(actionId, { from })
  }

  async cancel({ actionId, from = undefined }) {
    if (!from) from = (await this.getAction(actionId)).submitter
    return this.agreement.cancel(actionId, { from })
  }

  async settle({ actionId, from = undefined }) {
    if (!from) from = (await this.getAction(actionId)).submitter
    return this.agreement.settle(actionId, { from })
  }

  async dispute({ actionId, from = undefined, arbitrationFees = undefined }) {
    if (!from) from = (await this.getAction(actionId)).submitter

    if (arbitrationFees === undefined) arbitrationFees = await this.missingArbitrationFees(actionId)
    if (arbitrationFees) await this.approveArbitrationFees({ amount: arbitrationFees, from })

    return this.agreement.disputeChallenge(actionId, { from })
  }

  async submitEvidence({ actionId, from, evidence = '0x1234567890abcdef', finished = false }) {
    const { disputeId } = await this.getChallenge(actionId)
    return this.agreement.submitEvidence(disputeId, evidence, finished, { from })
  }

  async rule({ actionId, ruling }) {
    const { disputeId } = await this.getChallenge(actionId)
    const ArbitratorMock = this._getContract('ArbitratorMock')
    await ArbitratorMock.at(this.arbitrator.address).rule(disputeId, ruling)
    return this.agreement.executeRuling(actionId)
  }

  async approveArbitrationFees({ amount = undefined, from = undefined }) {
    if (!from) from = this._getSender()
    if (!amount) amount = await this.halfArbitrationFees()

    const feeToken = await this.arbitratorToken()
    await feeToken.generateTokens(from, amount)
    await this.safeApprove(feeToken, from, this.address, amount)
  }

  async arbitratorToken() {
    const [, feeTokenAddress] = await this.arbitrator.getDisputeFees()
    const MiniMeToken = this._getContract('MiniMeToken')
    return MiniMeToken.at(feeTokenAddress)
  }

  async halfArbitrationFees() {
    const [,, feeTokenAmount] = await this.arbitrator.getDisputeFees()
    return feeTokenAmount.div(2)
  }

  async missingArbitrationFees(actionId) {
    const [, missingFees] = await this.agreement.getMissingArbitratorFees(actionId)
    return missingFees
  }

  async buildEvmScript() {
    const ExecutionTarget = this._getContract('ExecutionTarget')
    const executionTarget = await ExecutionTarget.new()
    return encodeCallScript([{ to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }])
  }

  async safeApprove(token, from, to, amount) {
    const allowance = await token.allowance(from, to)
    if (allowance.gt(bn(0))) await token.approve(to, 0, { from })
    return token.approve(to, amount.add(allowance), { from })
  }

  async moveAfterChallengePeriod(actionId) {
    const { createdAt, settingId } = await this.getAction(actionId)
    const { delayPeriod } = await this.getSetting(settingId)
    const challengePeriodEndDate = createdAt.add(delayPeriod)
    const currentTimestamp = await this.agreement.getTimestampPublic()
    const timeDiff = challengePeriodEndDate.sub(currentTimestamp).add(1)
    return this.agreement.mockIncreaseTime(timeDiff)
  }

  _getContract(name) {
    return this.artifacts.require(name)
  }

  _getSender() {
    return this.web3.eth.accounts[0]
  }
}

module.exports = AgreementHelper
