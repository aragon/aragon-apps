const { assertBn } = require('./helpers/lib/assertBn')
const { bn, bigExp } = require('./helpers/lib/numbers')
const { ACTIONS_STATE, CHALLENGES_STATE, RULINGS } = require('./helpers/utils/enums')

const deployer = require('./helpers/utils/deployer')(web3, artifacts)


contract('Agreement', ([_, challenger, holder0, holder10, holder20, holder30, holder40, holder50]) => {
  let agreement, collateralToken, permissionToken

  const collateralAmount = bigExp(5, 18)
  const challengeCollateral = bigExp(15, 18)
  const permissionBalance = bigExp(10, 18)

  const actions = [
    // holder 10
    { submitter: holder10, actionContext: '0x010A' },
    // { submitter: holder10, actionContext: '0x010B', settlementOffer: collateralAmount, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER },

    // holder 20
    { submitter: holder20, actionContext: '0x020A', settlementOffer: collateralAmount.div(2), settled: true },
    { submitter: holder20, actionContext: '0x020B', settlementOffer: bn(0), settled: true },

    // holder 30
    { submitter: holder30, actionContext: '0x030A', settlementOffer: bn(0), settled: true },
    { submitter: holder30, actionContext: '0x030B', settlementOffer: collateralAmount.div(3), ruling: RULINGS.IN_FAVOR_OF_SUBMITTER },
    { submitter: holder30, actionContext: '0x030C', settlementOffer: collateralAmount.div(5), ruling: RULINGS.IN_FAVOR_OF_CHALLENGER },
    { submitter: holder30, actionContext: '0x030D', cancelled: true },
    { submitter: holder30, actionContext: '0x030E', settlementOffer: collateralAmount.div(2), ruling: RULINGS.IN_FAVOR_OF_SUBMITTER },

    // holder 40
    { submitter: holder40, actionContext: '0x040A', settlementOffer: bn(0), ruling: RULINGS.IN_FAVOR_OF_CHALLENGER },
    { submitter: holder40, actionContext: '0x040B', settlementOffer: collateralAmount, ruling: RULINGS.REFUSED },
    { submitter: holder40, actionContext: '0x040C', cancelled: true },

    // holder 50
    { submitter: holder50, actionContext: '0x050A' },
    { submitter: holder50, actionContext: '0x050B' },
    { submitter: holder50, actionContext: '0x050C' },
  ]

  before('deploy tokens', async () => {
    collateralToken = await deployer.deployCollateralToken()
    permissionToken = await deployer.deployPermissionToken()

    await permissionToken.generateTokens(holder10, permissionBalance)
    await permissionToken.generateTokens(holder20, permissionBalance.mul(2))
    await permissionToken.generateTokens(holder30, permissionBalance.mul(3))
    await permissionToken.generateTokens(holder40, permissionBalance.mul(4))
    await permissionToken.generateTokens(holder50, permissionBalance.mul(5))
  })

  before('deploy agreement instance', async () => {
    agreement = await deployer.deployAndInitializeWrapper({ collateralAmount, challengeCollateral, signers: [holder10, holder20, holder30, holder40, holder50]})
  })

  describe('integration', () => {
    it('only holders with more than 10 permission tokens can sign', async () => {
      assert.isFalse(await agreement.canSign(holder0), 'holder 0 can sign')
      assert.isTrue(await agreement.canSign(holder10), 'holder 10 cannot sign')
      assert.isTrue(await agreement.canSign(holder20), 'holder 20 cannot sign')
      assert.isTrue(await agreement.canSign(holder30), 'holder 30 cannot sign')
      assert.isTrue(await agreement.canSign(holder40), 'holder 40 cannot sign')
      assert.isTrue(await agreement.canSign(holder50), 'holder 50 cannot sign')
    })

    it('submits the expected actions', async () => {
      for (const action of actions) {
        const { actionContext, submitter } = action
        const { actionId } = await agreement.schedule({ actionContext, submitter })
        action.id = actionId
        assert.notEqual(actionId, undefined, 'action ID is null')
      }
    })

    it('challenges the expected actions', async () => {
      const challengedActions = actions.filter(action => !!action.settlementOffer)
      for (const { id, settlementOffer } of challengedActions) {
        await agreement.challenge({ actionId: id, settlementOffer, challenger })
        const { state } = await agreement.getAction(id)
        assert.equal(state, ACTIONS_STATE.CHALLENGED, `action ${id} is not challenged`)
      }
    })

    it('settles the expected actions', async () => {
      const settledActions = actions.filter(action => action.settled)
      for (const { id } of settledActions) {
        await agreement.settle({ actionId: id })
        const { state } = await agreement.getChallenge(id)
        assert.equal(state, CHALLENGES_STATE.SETTLED, `action ${id} is not settled`)
      }
    })

    it('disputes the expected actions', async () => {
      const disputedActions = actions.filter(action => !!action.ruling)
      for (const { id, ruling } of disputedActions) {
        await agreement.dispute({ actionId: id })
        const { state } = await agreement.getChallenge(id)
        assert.equal(state, CHALLENGES_STATE.DISPUTED, `action ${id} is not disputed`)

        await agreement.executeRuling({ actionId: id, ruling })
        const { ruling: actualRuling } = await agreement.getDispute(id)
        assertBn(actualRuling, ruling, `action ${id} is not ruled`)
      }
    })

    it('cancels the expected actions', async () => {
      const cancelledActions = actions.filter(action => action.cancelled)
      for (const { id } of cancelledActions) {
        await agreement.cancel({ actionId: id })
        const { state } = await agreement.getAction(id)
        assert.equal(state, ACTIONS_STATE.CANCELLED, `action ${id} is not cancelled`)
      }
    })

    it('executes not challenged or challenge-rejected actions', async () => {
      await agreement.moveAfterChallengePeriod(actions[0].id)
      const executedActions = actions.filter(action => (!action.settlementOffer && !action.cancelled && !action.ruling) || action.ruling === RULINGS.IN_FAVOR_OF_SUBMITTER)
      for (const { id } of executedActions) {
        const canExecute = await agreement.agreement.canExecute(id)
        assert.isTrue(canExecute, `action ${id} cannot be executed`)
        await agreement.execute({ actionId: id })
        const { state } = await agreement.getAction(id)
        assert.equal(state, ACTIONS_STATE.EXECUTED, `action ${id} is not executed`)
      }

      const notExecutedActions = actions.filter(action => !executedActions.includes(action))
      for (const { id } of notExecutedActions) {
        const canExecute = await agreement.agreement.canExecute(id)
        assert.isFalse(canExecute, `action ${id} can be executed`)
      }
    })

    it('computes the challenger rewards properly', async () => {
      const challengeSettledActions = actions.filter(action => action.settled).length
      const challengeRefusedActions = actions.filter(action => action.ruling === RULINGS.REFUSED).length
      const challengeAcceptedActions = actions.filter(action => action.ruling === RULINGS.IN_FAVOR_OF_CHALLENGER).length

      const wonDisputesTotal = (challengeCollateral.add(collateralAmount)).mul(challengeAcceptedActions)
      const settledTotal = actions.filter(action => action.settled).reduce((total, action) => total.add(action.settlementOffer), bn(0))
      const returnedCollateralTotal = challengeCollateral.mul(challengeSettledActions).add(challengeCollateral.mul(challengeRefusedActions))

      const expectedChallengerBalance = wonDisputesTotal.add(settledTotal).add(returnedCollateralTotal)
      assertBn(await collateralToken.balanceOf(challenger), expectedChallengerBalance, 'challenger balance does not match')
    })

    it('computes available stake balances properly', async () => {
      const calculateStakedBalance = holderActions => {
        const notSlashedActions = holderActions.filter(action => (!action.settled && !action.ruling) || action.ruling === RULINGS.IN_FAVOR_OF_SUBMITTER || action.ruling === RULINGS.REFUSED)
        const settleRemainingTotal = holderActions.filter(action => action.settled).reduce((total, action) => total.add(collateralAmount.sub(action.settlementOffer)), bn(0))
        return collateralAmount.mul(notSlashedActions.length).add(settleRemainingTotal)
      }

      const holder10Actions = actions.filter(action => action.submitter === holder10)
      const { available: holder10Available, locked: holder10Locked, challenged: holder10Challenged } = await agreement.getBalance(holder10)
      assertBn(calculateStakedBalance(holder10Actions), holder10Available, 'holder 10 available balance does not match')
      assertBn(holder10Locked, 0, 'holder 10 locked balance does not match')
      assertBn(holder10Challenged, 0, 'holder 10 challenged balance does not match')

      const holder20Actions = actions.filter(action => action.submitter === holder20)
      const { available: holder20Available, locked: holder20Locked, challenged: holder20Challenged } = await agreement.getBalance(holder20)
      assertBn(calculateStakedBalance(holder20Actions), holder20Available, 'holder 20 available balance does not match')
      assertBn(holder20Locked, 0, 'holder 20 locked balance does not match')
      assertBn(holder20Challenged, 0, 'holder 20 challenged balance does not match')

      const holder30Actions = actions.filter(action => action.submitter === holder30)
      const { available: holder30Available, locked: holder30Locked, challenged: holder30Challenged } = await agreement.getBalance(holder30)
      assertBn(calculateStakedBalance(holder30Actions), holder30Available, 'holder 30 available balance does not match')
      assertBn(holder30Locked, 0, 'holder 30 locked balance does not match')
      assertBn(holder30Challenged, 0, 'holder 30 challenged balance does not match')

      const holder40Actions = actions.filter(action => action.submitter === holder40)
      const { available: holder40Available, locked: holder40Locked, challenged: holder40Challenged } = await agreement.getBalance(holder40)
      assertBn(calculateStakedBalance(holder40Actions), holder40Available, 'holder 40 available balance does not match')
      assertBn(holder40Locked, 0, 'holder 40 locked balance does not match')
      assertBn(holder40Challenged, 0, 'holder 40 challenged balance does not match')

      const holder50Actions = actions.filter(action => action.submitter === holder50)
      const { available: holder50Available, locked: holder50Locked, challenged: holder50Challenged } = await agreement.getBalance(holder50)
      assertBn(calculateStakedBalance(holder50Actions), holder50Available, 'holder 50 available balance does not match')
      assertBn(holder50Locked, 0, 'holder 50 locked balance does not match')
      assertBn(holder50Challenged, 0, 'holder 50 challenged balance does not match')

      const agreementBalance = await collateralToken.balanceOf(agreement.address)
      const expectedBalance = holder10Available.add(holder20Available).add(holder30Available).add(holder40Available).add(holder50Available)
      assertBn(agreementBalance, expectedBalance, 'agreement staked balance does not match')
    })

    it('transfer the arbitration fees properly', async () => {
      const { feeToken, feeAmount } = await agreement.arbitratorFees()
      const disputedActions = actions.filter(action => !!action.ruling)
      const totalArbitrationFees = feeAmount.mul(disputedActions.length)

      const arbitratorBalance = await feeToken.balanceOf(agreement.arbitrator.address)
      assertBn(arbitratorBalance, totalArbitrationFees, 'arbitrator arbitration fees balance does not match')

      const agreementBalance = await feeToken.balanceOf(agreement.address)
      assertBn(agreementBalance, 0, 'agreement arbitration fees balance does not match')
    })
  })
})
