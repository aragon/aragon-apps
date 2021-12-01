const { CHALLENGES_STATE } = require('../utils/enums')
const { AGREEMENT_EVENTS } = require('../utils/events')
const { AGREEMENT_ERRORS } = require('../utils/errors')

const { ZERO_ADDRESS, EMPTY_BYTES, bn, getEventArgument } = require('@aragon/contract-helpers-test')

class AgreementWrapper {
  constructor(artifacts, web3, agreement, arbitrator, stakingFactory, clock) {
    this.artifacts = artifacts
    this.web3 = web3
    this.agreement = agreement
    this.arbitrator = arbitrator
    this.stakingFactory = stakingFactory
    this.clock = clock
    this.staking = {}
  }

  get abi() {
    return this.agreement.abi
  }

  get address() {
    return this.agreement.address
  }

  async canPerform(grantee, where, what, how) {
    return this.agreement.canPerform(grantee, where, what, how)
  }

  async getCurrentSettingId() {
    return this.agreement.getCurrentSettingId()
  }

  async getSetting(settingId = undefined) {
    if (!settingId) settingId = await this.getCurrentSettingId()
    return this.agreement.getSetting(settingId)
  }

  async syncAppFeesCashier() {
    return this.agreement.syncAppFeesCashier()
  }

  async getAction(actionId) {
    const { disputable, disputableActionId, context, closed, submitter, settingId, collateralRequirementId, lastChallengeId, lastChallengeActive } = await this.agreement.getAction(actionId)
    return { disputable, disputableActionId, context, closed, submitter, settingId, collateralRequirementId, lastChallengeId, lastChallengeActive }
  }

  async getChallenge(challengeId) {
    const { actionId, context, endDate, challenger, settlementOffer, state, disputeId, ruling, submitterFinishedEvidence, challengerFinishedEvidence } = await this.agreement.getChallenge(challengeId)
    return { actionId, context, endDate, challenger, settlementOffer, state, disputeId, ruling, submitterFinishedEvidence, challengerFinishedEvidence }
  }

  async getChallengeArbitratorFees(challengeId) {
    const { challengerArbitratorFeesAmount, challengerArbitratorFeesToken: challengerArbitratorFeesTokenAddress, submitterArbitratorFeesAmount, submitterArbitratorFeesToken: submitterArbitratorFeesTokenAddress }  = await this.agreement.getChallengeArbitratorFees(challengeId)
    const MiniMeToken = this._getContract('MiniMeToken')
    return { challengerArbitratorFeesAmount, challengerArbitratorFeesToken: await MiniMeToken.at(challengerArbitratorFeesTokenAddress), submitterArbitratorFeesAmount, submitterArbitratorFeesToken: await MiniMeToken.at(submitterArbitratorFeesTokenAddress) }
  }

  async getChallengeWithArbitratorFees(challengeId) {
    const { actionId, context, endDate, challenger, settlementOffer, state, disputeId, ruling, submitterFinishedEvidence, challengerFinishedEvidence } = await this.agreement.getChallenge(challengeId)
    const { challengerArbitratorFeesAmount, challengerArbitratorFeesToken, submitterArbitratorFeesAmount, submitterArbitratorFeesToken }  = await this.agreement.getChallengeArbitratorFees(challengeId)
    return { actionId, context, endDate, challenger, settlementOffer, challengerArbitratorFeesAmount, challengerArbitratorFeesToken, submitterArbitratorFeesAmount, submitterArbitratorFeesToken, state, disputeId, ruling, submitterFinishedEvidence, challengerFinishedEvidence }
  }

  async getSigner(signer) {
    const { lastSettingIdSigned, mustSign } = await this.agreement.getSigner(signer)
    return { lastSettingIdSigned, mustSign }
  }

  async getBalance(token, user) {
    const staking = await this.getStaking(token)
    const { locked } = await staking.getBalancesOf(user)
    const available = await staking.unlockedBalanceOf(user)
    return { available, locked }
  }

  async getTotalAvailableBalance(token, user) {
    const staking = await this.getStaking(token)
    const unlocked = await staking.unlockedBalanceOf(user)
    const tokenBalance = await token.balanceOf(user)

    return unlocked.add(tokenBalance)
  }

  async getStakingAddress(token) {
    if (!this.staking[token.address]) {
      const stakingAddress = await this.stakingFactory.getInstance(token.address)
      if (stakingAddress !== ZERO_ADDRESS) this.staking[token.address] = stakingAddress
      else {
        const receipt = await this.stakingFactory.getOrCreateInstance(token.address)
        this.staking[token.address] = getEventArgument(receipt, 'NewStaking', 'instance')
      }
    }
    return this.staking[token.address]
  }

  async getStaking(token) {
    const stakingAddress = await this.getStakingAddress(token)
    const Staking = this._getContract('Staking')
    return Staking.at(stakingAddress)
  }

  async getDisputableInfo(disputable) {
    const { activated, currentCollateralRequirementId } = await this.agreement.getDisputableInfo(disputable.address)
    return { activated, currentCollateralRequirementId }
  }

  async getCollateralRequirement(disputable, collateralRequirementId) {
    const MiniMeToken = this._getContract('MiniMeToken')
    const { collateralToken, actionAmount, challengeAmount, challengeDuration } = await this.agreement.getCollateralRequirement(disputable.address, collateralRequirementId)
    return { collateralToken: await MiniMeToken.at(collateralToken), actionCollateral: actionAmount, challengeCollateral: challengeAmount, challengeDuration }
  }

  async canChallenge(actionId, challenger) {
    return this.agreement.canPerformChallenge(actionId, challenger)
  }

  async getAllowedPaths(actionId) {
    const canClose = await this.agreement.canClose(actionId)
    const canChallenge = await this.agreement.canChallenge(actionId)

    let canSettle = false, canDispute = false, canClaimSettlement = false, canRuleDispute = false
    try {
      canSettle = await this.agreement.canSettle(actionId)
      canDispute = await this.agreement.canDispute(actionId)
      canClaimSettlement = await this.agreement.canClaimSettlement(actionId)
      canRuleDispute = await this.agreement.canRuleDispute(actionId)
    } catch (error) {
      if (!error.message.includes(AGREEMENT_ERRORS.ERROR_CHALLENGE_DOES_NOT_EXIST)) throw error
    }

    return { canClose, canChallenge, canSettle, canDispute, canClaimSettlement, canRuleDispute }
  }

  async sign({ settingId = undefined, from = undefined }) {
    if (!settingId) settingId = await this.getCurrentSettingId()
    if (!from) from = await this._getSender()
    return this.agreement.sign(settingId, { from })
  }

  async close(actionId) {
    return this.agreement.closeAction(actionId)
  }

  async challenge({ actionId, challenger = undefined, settlementOffer = 0, challengeContext = '0xdcba', finishedSubmittingEvidence = false, arbitratorFees = undefined }) {
    if (!challenger) challenger = await this._getSender()

    if (arbitratorFees === undefined) arbitratorFees = await this.arbitratorFees()
    if (arbitratorFees) await this.approveArbitratorFees({ amount: arbitratorFees, from: challenger })

    const receipt = await this.agreement.challengeAction(actionId, settlementOffer, finishedSubmittingEvidence, challengeContext, { from: challenger })
    const challengeId = getEventArgument(receipt, AGREEMENT_EVENTS.ACTION_CHALLENGED, 'challengeId')
    return { receipt, challengeId }
  }

  async settle({ actionId, from = undefined }) {
    if (!from) from = (await this.getAction(actionId)).submitter
    return this.agreement.settleAction(actionId, { from })
  }

  async dispute({ actionId, from = undefined, finishedSubmittingEvidence = false, arbitratorFees = undefined }) {
    if (!from) from = (await this.getAction(actionId)).submitter

    if (arbitratorFees === undefined) arbitratorFees = await this.arbitratorFees()
    if (arbitratorFees) await this.approveArbitratorFees({ amount: arbitratorFees, from })

    return this.agreement.disputeAction(actionId, finishedSubmittingEvidence, { from })
  }

  async submitEvidence({ actionId, from, evidence = '0x1234567890abcdef', finished = false }) {
    const { lastChallengeId } = await this.getAction(actionId)
    const { disputeId } = await this.getChallenge(lastChallengeId)
    return this.agreement.submitEvidence(disputeId, evidence, finished, { from })
  }

  async finishEvidence({ actionId, from }) {
    return this.submitEvidence({ actionId, from, evidence: '0x', finished: true })
  }

  async closeEvidencePeriod(actionId) {
    const { lastChallengeId } = await this.getAction(actionId)
    const { disputeId } = await this.getChallenge(lastChallengeId)
    return this.agreement.closeEvidencePeriod(disputeId)
  }

  async executeRuling({ actionId, ruling, mockRuling = true }) {
    const { lastChallengeId } = await this.getAction(actionId)
    const { state, disputeId } = await this.getChallenge(lastChallengeId)

    if (mockRuling) {
      const ArbitratorMock = this._getContract('ArbitratorMock')
      const arbitrator = await ArbitratorMock.at(this.arbitrator.address)
      await arbitrator.rule(disputeId, ruling)
    }

    return (state.toString() != CHALLENGES_STATE.WAITING && state.toString() != CHALLENGES_STATE.SETTLED)
      ? this.arbitrator.executeRuling(disputeId)
      : this.agreement.rule(disputeId, ruling)
  }

  async activate({ disputable, collateralToken, actionCollateral, challengeCollateral, challengeDuration, from = undefined }) {
    if (!from) from = await this._getSender()
    return this.agreement.activate(disputable.address, collateralToken.address, challengeDuration, actionCollateral, challengeCollateral, { from })
  }

  async deactivate({ disputable, from = undefined }) {
    if (!from) from = await this._getSender()
    return this.agreement.deactivate(disputable.address, { from })
  }

  async changeCollateralRequirement(options = {}) {
    const currentRequirements = await this.getCollateralRequirement()
    const from = options.from || await this._getSender()

    const collateralToken = options.collateralToken || currentRequirements.collateralToken
    const actionCollateral = options.actionCollateral || currentRequirements.actionCollateral
    const challengeCollateral = options.challengeCollateral || currentRequirements.challengeCollateral
    const challengeDuration = options.challengeDuration || currentRequirements.challengeDuration

    return this.agreement.changeCollateralRequirement(options.disputable.address, collateralToken.address, challengeDuration, actionCollateral, challengeCollateral, { from })
  }

  async changeSetting({ title = 'title', content = '0x1234', arbitrator = undefined, setCashier = false, from = undefined }) {
    if (!from) from = await this._getSender()
    if (!arbitrator) arbitrator = this.arbitrator
    return this.agreement.changeSetting(arbitrator.address, setCashier, title, content, { from })
  }

  async approveArbitratorFees({ amount = undefined, from = undefined, accumulate = false }) {
    if (!from) from = await this._getSender()
    if (amount === undefined) amount = await this.arbitratorFees()

    const feeToken = await this.arbitratorToken()
    await feeToken.generateTokens(from, amount)
    await this.safeApprove(feeToken, from, this.address, amount, accumulate)
  }

  async getDisputeFees() {
    const { feeToken: feeTokenAddress, feeAmount } = await this.arbitrator.getDisputeFees()
    const MiniMeToken = this._getContract('MiniMeToken')
    const feeToken = await MiniMeToken.at(feeTokenAddress)
    return { feeToken, feeAmount }
  }

  async arbitratorFees() {
    const { feeAmount } = await this.getDisputeFees()
    return feeAmount
  }

  async arbitratorToken() {
    const { feeToken } = await this.getDisputeFees()
    return feeToken
  }

  async appFeesCashier() {
    const { recipient } = await this.arbitrator.getSubscriptionFees(ZERO_ADDRESS)
    return this._getContract('IAragonAppFeesCashier').at(recipient)
  }

  async currentTimestamp() {
    return this.agreement.getTimestampPublic()
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
    const currentTimestamp = await this.currentTimestamp()
    if (timestamp.lt(currentTimestamp)) return this.clock.mockSetTimestamp(timestamp)
    const timeDiff = timestamp.sub(currentTimestamp)
    return this.clock.mockIncreaseTime(timeDiff)
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
    return token.approveAndCall(to, amount, EMPTY_BYTES, { from })
  }

  async allowManager({ token, user, amount }) {
    const staking = await this.getStaking(token)
    const { allowance, amount: locked } = await staking.getLock(user, this.agreement.address)
    if (allowance.eq(bn(0))) {
      return staking.allowManager(this.agreement.address, amount, EMPTY_BYTES, { from: user })
    } else if (allowance.sub(locked).lt(amount)) {
      return staking.increaseLockAllowance(this.agreement.address, amount.sub(allowance.sub(locked)), { from: user })
    }
  }

  async stake({ token, amount, user = undefined, from = undefined, approve = undefined }) {
    if (!user) user = await this._getSender()
    if (!from) from = user

    const staking = await this.getStaking(token)
    if (approve === undefined) approve = amount
    if (approve) await this.approve({ token, amount: approve, to: staking.address, from })

    return (user === from)
      ? staking.stake(amount, EMPTY_BYTES, { from: user })
      : staking.stakeFor(user, amount, EMPTY_BYTES, { from })
  }

  async unstake({ token, user, amount = undefined }) {
    const staking = await this.getStaking(token)
    if (amount === undefined) amount = await staking.unlockedBalanceOf(user)
    return staking.unstake(amount, EMPTY_BYTES, { from: user })
  }

  async safeApprove(token, from, to, amount, accumulate = true) {
    const allowance = await token.allowance(from, to)
    if (allowance.gt(bn(0))) await token.approve(to, 0, { from })
    const newAllowance = accumulate ? amount.add(allowance) : amount
    return token.approve(to, newAllowance, { from })
  }

  async _getSender() {
    if (!this.sender) {
      const accounts = await this.web3.eth.getAccounts()
      this.sender = accounts[0]
    }
    return this.sender
  }

  _getContract(name) {
    return this.artifacts.require(name)
  }
}

module.exports = AgreementWrapper
