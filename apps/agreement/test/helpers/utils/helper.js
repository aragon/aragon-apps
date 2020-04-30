const EVENTS = require('./events')
const { bn } = require('../lib/numbers')
const { getEventArgument } = require('@aragon/contract-test-helpers/events')
const { encodeCallScript } = require('@aragon/contract-test-helpers/evmScript')

class AgreementHelper {
  constructor(artifacts, web3, agreement, arbitrator, collateralToken, setting = {}) {
    this.artifacts = artifacts
    this.web3 = web3
    this.agreement = agreement
    this.arbitrator = arbitrator
    this.collateralToken = collateralToken
    this.setting = setting
  }

  get address() {
    return this.agreement.address
  }

  get content() {
    return this.setting.content
  }

  get delayPeriod() {
    return this.setting.delayPeriod
  }

  get settlementPeriod() {
    return this.setting.settlementPeriod
  }

  get collateralAmount() {
    return this.setting.collateralAmount
  }

  get challengeCollateral() {
    return this.setting.challengeCollateral
  }

  async getSigner(signer) {
    const { available, locked, challenged, lastActionId, shouldReviewCurrentSetting } = await this.agreement.getSigner(signer)
    return { available, locked, challenged, lastActionId, shouldReviewCurrentSetting }
  }

  async getAction(actionId) {
    const { script, context, state, challengeEndDate, submitter, settingId } = await this.agreement.getAction(actionId)
    return { script, context, state, challengeEndDate, submitter, settingId }
  }

  async getChallenge(actionId) {
    const { context, settlementEndDate, challenger, settlementOffer, arbitratorFeeAmount, arbitratorFeeToken, state, disputeId } = await this.agreement.getChallenge(actionId)
    return { context, settlementEndDate, challenger, settlementOffer, arbitratorFeeAmount, arbitratorFeeToken, state, disputeId }
  }

  async getDispute(actionId) {
    const { ruling, submitterFinishedEvidence, challengerFinishedEvidence } = await this.agreement.getDispute(actionId)
    return { ruling, submitterFinishedEvidence, challengerFinishedEvidence }
  }

  async getSetting(settingId = undefined) {
    if (!settingId) settingId = await this.agreement.getCurrentSettingId()
    const { content, delayPeriod, settlementPeriod, collateralAmount, challengeCollateral } = await this.agreement.getSetting(settingId)
    return { content, delayPeriod, settlementPeriod, collateralAmount, challengeCollateral }
  }

  async getTokenBalancePermission() {
    const { signPermissionToken, signPermissionBalance, challengePermissionToken, challengePermissionBalance } = await this.agreement.getTokenBalancePermission()
    return { signPermissionToken, signPermissionBalance, challengePermissionToken, challengePermissionBalance }
  }

  async canSign(signer) {
    return this.agreement.canSign(signer)
  }

  async getAllowedPaths(actionId) {
    const canCancel = await this.agreement.canCancel(actionId)
    const canChallenge = await this.agreement.canChallengeAction(actionId)
    const canSettle = await this.agreement.canSettle(actionId)
    const canDispute = await this.agreement.canDispute(actionId)
    const canClaimSettlement = await this.agreement.canClaimSettlement(actionId)
    const canRuleDispute = await this.agreement.canRuleDispute(actionId)
    const canExecute = await this.agreement.canExecute(actionId)
    return { canCancel, canChallenge, canSettle, canDispute, canClaimSettlement, canRuleDispute, canExecute }
  }

  async approve({ amount, from = undefined, accumulate = true }) {
    if (!from) from = await this._getSender()

    await this.collateralToken.generateTokens(from, amount)
    return this.safeApprove(this.collateralToken, from, this.address, amount, accumulate)
  }

  async approveAndCall({ amount, from = undefined, mint = true }) {
    if (!from) from = await this._getSender()

    if (mint) await this.collateralToken.generateTokens(from, amount)
    return this.collateralToken.approveAndCall(this.address, amount, '0x', { from })
  }

  async stake({ signer = undefined, amount = undefined, from = undefined, approve = undefined }) {
    if (!signer) signer = await this._getSender()
    if (!from) from = signer
    if (amount === undefined) amount = this.collateralAmount

    if (approve === undefined) approve = amount
    if (approve) await this.approve({ amount: approve, from })

    return (signer === from)
      ? this.agreement.stake(amount, { from: signer })
      : this.agreement.stakeFor(signer, amount, { from })
  }

  async unstake({ signer, amount = undefined }) {
    if (amount === undefined) {
      const { available } = await this.getSigner(signer)
      amount = available
    }

    return this.agreement.unstake(amount, { from: signer })
  }

  async forward({ script = undefined, from }) {
    if (!from) from = await this._getSender()
    if (!script) script = await this.buildEvmScript()
    const receipt = await this.agreement.forward(script, { from })
    const actionId = getEventArgument(receipt, EVENTS.ACTION_SCHEDULED, 'actionId')
    return { receipt, actionId }
  }

  async schedule({ actionContext = '0xabcd', script = undefined, submitter = undefined, stake = undefined }) {
    if (!submitter) submitter = await this._getSender()
    if (!script) script = await this.buildEvmScript()

    if (stake === undefined) stake = this.collateralAmount
    if (stake) await this.approveAndCall({ amount: stake, from: submitter })

    const receipt = await this.agreement.schedule(actionContext, script, { from: submitter })
    const actionId = getEventArgument(receipt, EVENTS.ACTION_SCHEDULED, 'actionId')
    return { receipt, actionId }
  }

  async challenge({ actionId, challenger = undefined, settlementOffer = 0, challengeContext = '0xdcba', arbitrationFees = undefined, stake = undefined }) {
    if (!challenger) challenger = await this._getSender()

    if (arbitrationFees === undefined) arbitrationFees = await this.halfArbitrationFees()
    if (arbitrationFees) await this.approveArbitrationFees({ amount: arbitrationFees, from: challenger })

    if (stake === undefined) stake = this.challengeCollateral
    if (stake) await this.approve({ amount: stake, from: challenger })

    return this.agreement.challengeAction(actionId, settlementOffer, challengeContext, { from: challenger })
  }

  async execute({ actionId, from = undefined }) {
    if (!from) from = await this._getSender()
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

  async finishEvidence({ actionId, from }) {
    return this.submitEvidence({ actionId, from, evidence: '0x', finished: true })
  }

  async executeRuling({ actionId, ruling, mockRuling = true }) {
    if (mockRuling) {
      const { disputeId } = await this.getChallenge(actionId)
      const ArbitratorMock = this._getContract('ArbitratorMock')
      const arbitrator = await ArbitratorMock.at(this.arbitrator.address)
      await arbitrator.rule(disputeId, ruling)
    }
    return this.agreement.executeRuling(actionId)
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

  async buildEvmScript() {
    const ExecutionTarget = this._getContract('ExecutionTarget')
    const executionTarget = await ExecutionTarget.new()
    return encodeCallScript([{ to: executionTarget.address, calldata: executionTarget.contract.methods.execute().encodeABI() }])
  }

  async changeSetting(options = {}) {
    const currentSettings = await this.getSetting()
    const from = options.from || await this._getSender()
    const content = options.content || currentSettings.content
    const collateralAmount = options.collateralAmount || currentSettings.collateralAmount
    const delayPeriod = options.delayPeriod || currentSettings.delayPeriod
    const settlementPeriod = options.settlementPeriod || currentSettings.settlementPeriod
    const challengeCollateral = options.challengeCollateral || currentSettings.challengeCollateral

    return this.agreement.changeSetting(content, delayPeriod, settlementPeriod, collateralAmount, challengeCollateral, { from })
  }

  async changeTokenBalancePermission(options = {}) {
    const from = options.from || await this._getSender()
    const permission = await this.getTokenBalancePermission()
    const signPermissionToken = options.signPermissionToken ? options.signPermissionToken.address : permission.signToken
    const signPermissionBalance = options.signPermissionBalance || permission.signBalance
    const challengePermissionToken = options.challengePermissionToken ? options.challengePermissionToken.address : permission.challengeToken
    const challengePermissionBalance = options.challengePermissionBalance || permission.challengeBalance

    return this.agreement.changeTokenBalancePermission(signPermissionToken, signPermissionBalance, challengePermissionToken, challengePermissionBalance, { from })
  }

  async safeApprove(token, from, to, amount, accumulate = true) {
    const allowance = await token.allowance(from, to)
    if (allowance.gt(bn(0))) await token.approve(to, 0, { from })
    const newAllowance = accumulate ? amount.add(allowance) : amount
    return token.approve(to, newAllowance, { from })
  }

  async currentTimestamp() {
    return this.agreement.getTimestampPublic()
  }

  async moveBeforeEndOfChallengePeriod(actionId) {
    const { challengeEndDate } = await this.getAction(actionId)
    return this.moveTo(challengeEndDate.sub(bn(1)))
  }

  async moveToEndOfChallengePeriod(actionId) {
    const { challengeEndDate } = await this.getAction(actionId)
    return this.moveTo(challengeEndDate)
  }

  async moveAfterChallengePeriod(actionId) {
    const { challengeEndDate } = await this.getAction(actionId)
    return this.moveTo(challengeEndDate.add(bn(1)))
  }

  async moveBeforeEndOfSettlementPeriod(actionId) {
    const { settlementEndDate } = await this.getChallenge(actionId)
    return this.moveTo(settlementEndDate.sub(bn(1)))
  }

  async moveToEndOfSettlementPeriod(actionId) {
    const { settlementEndDate } = await this.getChallenge(actionId)
    return this.moveTo(settlementEndDate)
  }

  async moveAfterSettlementPeriod(actionId) {
    const { settlementEndDate } = await this.getChallenge(actionId)
    return this.moveTo(settlementEndDate.add(bn(1)))
  }

  async moveTo(timestamp) {
    const currentTimestamp = await this.currentTimestamp()
    if (timestamp.lt(currentTimestamp)) return this.agreement.mockSetTimestamp(timestamp)
    const timeDiff = timestamp.sub(currentTimestamp)
    return this.agreement.mockIncreaseTime(timeDiff)
  }

  _getContract(name) {
    return this.artifacts.require(name)
  }

  async _getSender() {
    const accounts = await this.web3.eth.getAccounts()
    return accounts[0]
  }
}

module.exports = AgreementHelper
