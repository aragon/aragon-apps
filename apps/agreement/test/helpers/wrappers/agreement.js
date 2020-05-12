const { bn } = require('../lib/numbers')
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

  async getCurrentContentId() {
    return this.agreement.getCurrentContentId()
  }

  async getCurrentContent() {
    return this.agreement.getContent(await this.getCurrentContentId())
  }

  async getAction(actionId) {
    const { disputable, disputableId, context, state, submitter, collateralId } = await this.agreement.getAction(actionId)
    return { disputable, disputableId, context, state, submitter, collateralId }
  }

  async getChallenge(actionId) {
    const { context, endDate, challenger, settlementOffer, arbitratorFeeAmount, arbitratorFeeToken, state, disputeId } = await this.agreement.getChallenge(actionId)
    return { context, endDate, challenger, settlementOffer, arbitratorFeeAmount, arbitratorFeeToken, state, disputeId }
  }

  async getDispute(actionId) {
    const { ruling, submitterFinishedEvidence, challengerFinishedEvidence } = await this.agreement.getDispute(actionId)
    return { ruling, submitterFinishedEvidence, challengerFinishedEvidence }
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

  async getAllowedPaths(actionId) {
    const canProceed = await this.agreement.canProceed(actionId)
    const canChallenge = await this.agreement.canChallenge(actionId)
    const canSettle = await this.agreement.canSettle(actionId)
    const canDispute = await this.agreement.canDispute(actionId)
    const canClaimSettlement = await this.agreement.canClaimSettlement(actionId)
    const canRuleDispute = await this.agreement.canRuleDispute(actionId)
    return { canProceed, canChallenge, canSettle, canDispute, canClaimSettlement, canRuleDispute }
  }

  async changeContent({ content = '0x1234', from = undefined }) {
    if (!from) from = await this._getSender()
    return this.agreement.changeContent(content, { from })
  }

  async sign(from) {
    if (!from) from = await this._getSender()
    return this.agreement.sign({ from })
  }

  async challenge({ actionId, challenger = undefined, settlementOffer = 0, challengeContext = '0xdcba', arbitrationFees = undefined }) {
    if (!challenger) challenger = await this._getSender()

    if (arbitrationFees === undefined) arbitrationFees = await this.halfArbitrationFees()
    if (arbitrationFees) await this.approveArbitrationFees({ amount: arbitrationFees, from: challenger })

    return this.agreement.challengeAction(actionId, settlementOffer, challengeContext, { from: challenger })
  }

  async settle({ actionId, from = undefined }) {
    if (!from) from = (await this.getAction(actionId)).submitter
    return this.agreement.settle(actionId, { from })
  }

  async dispute({ actionId, from = undefined, arbitrationFees = undefined }) {
    if (!from) from = (await this.getAction(actionId)).submitter

    if (arbitrationFees === undefined) arbitrationFees = await this.missingArbitrationFees(actionId)
    if (arbitrationFees) await this.approveArbitrationFees({ amount: arbitrationFees, from })

    return this.agreement.disputeAction(actionId, { from })
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

  async currentTimestamp() {
    return this.agreement.getTimestampPublic()
  }

  async moveBeforeChallengeEndDate(actionId) {
    const { endDate } = await this.getChallenge(actionId)
    return this.moveTo(endDate.sub(bn(1)))
  }

  async moveToChallengeEndDate(actionId) {
    const { endDate } = await this.getChallenge(actionId)
    return this.moveTo(endDate)
  }

  async moveAfterChallengeEndDate(actionId) {
    const { endDate } = await this.getChallenge(actionId)
    return this.moveTo(endDate.add(bn(1)))
  }

  async moveTo(timestamp) {
    const clockMockAddress = await this.agreement.clockMock()
    const clockMock = await this._getContract('ClockMock').at(clockMockAddress)
    const currentTimestamp = await this.currentTimestamp()
    if (timestamp.lt(currentTimestamp)) return clockMock.mockSetTimestamp(timestamp)
    const timeDiff = timestamp.sub(currentTimestamp)
    return clockMock.mockIncreaseTime(timeDiff)
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
