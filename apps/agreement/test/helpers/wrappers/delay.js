const ExecutorWrapper = require('./executor')

const { bn } = require('../lib/numbers')
const { decodeEventsOfType } = require('../lib/decodeEvent')
const { encodeCallScript } = require('@aragon/contract-test-helpers/evmScript')
const { getEventArgument } = require('@aragon/contract-test-helpers/events')
const { DELAY_EVENTS, AGREEMENT_EVENTS } = require('../utils/events')

class DelayWrapper extends ExecutorWrapper {
  async delayPeriod() {
    return this.executor.delayPeriod()
  }

  async canForward(sender, bytes = '0x') {
    return this.executor.canForward(sender, bytes)
  }

  async canChallenge(delayableId, challenger) {
    return this.executor.canChallenge(delayableId, challenger)
  }

  async getTokenBalancePermission() {
    const { submitPermissionToken, submitPermissionBalance, challengePermissionToken, challengePermissionBalance } = await this.executor.getTokenBalancePermission()
    return { submitPermissionToken, submitPermissionBalance, challengePermissionToken, challengePermissionBalance }
  }

  async getDelayable(id) {
    const { submitter, executableAt, state, actionId, script } = await this.executor.getDelayable(id)
    return { submitter, executableAt, state, actionId, script }
  }

  async getAllowedPaths(id) {
    const canStop = await this.executor.canStop(id)
    const canExecute = await this.executor.canExecute(id)

    const { actionId } = await this.getDelayable(id)
    const actionAllowedPaths = await super.getAllowedPaths(actionId)
    return { canExecute, canStop, ...actionAllowedPaths }
  }

  async forward({ script = undefined, from }) {
    if (!from) from = await this._getSender()
    if (!script) script = await this.buildEvmScript()

    const receipt = await this.executor.forward(script, { from })
    const logs = decodeEventsOfType(receipt, this.abi, AGREEMENT_EVENTS.ACTION_SUBMITTED)

    const actionId = getEventArgument({ logs }, AGREEMENT_EVENTS.ACTION_SUBMITTED, 'actionId')
    const delayableId = getEventArgument(receipt, DELAY_EVENTS.SCHEDULED, 'id')
    return { receipt, actionId, delayableId }
  }

  async schedule({ actionContext = '0xabcd', script = undefined, submitter = undefined, sign = undefined, stake = undefined }) {
    if (!submitter) submitter = await this._getSender()
    if (!script) script = await this.buildEvmScript()

    if (stake === undefined) stake = this.actionCollateral
    if (stake) await this.approveAndCall({ amount: stake, from: submitter })
    if (sign === undefined && (await this.getSigner(submitter)).mustSign) await this.sign(submitter)

    const receipt = await this.executor.schedule(script, actionContext, { from: submitter })
    const logs = decodeEventsOfType(receipt, this.abi, AGREEMENT_EVENTS.ACTION_SUBMITTED)

    const actionId = getEventArgument({ logs }, AGREEMENT_EVENTS.ACTION_SUBMITTED, 'actionId')
    const delayableId = getEventArgument(receipt, DELAY_EVENTS.SCHEDULED, 'id')
    return { receipt, delayableId, actionId }
  }

  async execute({ delayableId, from = undefined }) {
    if (!from) from = await this._getSender()
    return this.executor.execute(delayableId, { from })
  }

  async stop({ delayableId, from = undefined }) {
    if (!from) from = (await this.getDelayable(delayableId)).submitter
    return this.executor.stop(delayableId, { from })
  }

  async challenge({ delayableId, challenger = undefined, settlementOffer = 0, challengeContext = '0xdcba', arbitrationFees = undefined, stake = undefined }) {
    const { actionId } = await this.getDelayable(delayableId)
    return super.challenge({ actionId, challenger, settlementOffer, challengeContext, arbitrationFees, stake })
  }

  async settle({ delayableId, from = undefined }) {
    const { actionId } = await this.getDelayable(delayableId)
    return super.settle({ actionId, from })
  }

  async dispute({ delayableId, from = undefined, arbitrationFees = undefined }) {
    const { actionId } = await this.getDelayable(delayableId)
    return super.dispute({ actionId, from, arbitrationFees })
  }

  async executeRuling({ delayableId, ruling, mockRuling = true }) {
    const { actionId } = await this.getDelayable(delayableId)
    return super.executeRuling({ actionId, ruling, mockRuling })
  }

  async moveBeforeEndOfDelayPeriod(delayableId) {
    const { executableAt } = await this.getDelayable(delayableId)
    return super.moveTo(executableAt.sub(bn(1)))
  }

  async moveToEndOfDelayPeriod(delayableId) {
    const { executableAt } = await this.getDelayable(delayableId)
    return super.moveTo(executableAt)
  }

  async moveAfterDelayPeriod(delayableId) {
    const { executableAt } = await this.getDelayable(delayableId)
    return super.moveTo(executableAt.add(bn(1)))
  }

  async changeTokenBalancePermission(options = {}) {
    const from = options.from || await this._getSender()
    const permission = await this.getTokenBalancePermission()

    const submitPermissionToken = options.submitPermissionToken ? options.submitPermissionToken.address : permission.submitToken
    const submitPermissionBalance = options.submitPermissionBalance || permission.submitBalance
    const challengePermissionToken = options.challengePermissionToken ? options.challengePermissionToken.address : permission.challengeToken
    const challengePermissionBalance = options.challengePermissionBalance || permission.challengeBalance

    return this.executor.changeTokenBalancePermission(submitPermissionToken, submitPermissionBalance, challengePermissionToken, challengePermissionBalance, { from })
  }

  async buildEvmScript() {
    const ExecutionTarget = this._getContract('ExecutionTarget')
    const executionTarget = await ExecutionTarget.new()
    return encodeCallScript([{ to: executionTarget.address, calldata: executionTarget.contract.methods.execute().encodeABI() }])
  }
}

module.exports = DelayWrapper
