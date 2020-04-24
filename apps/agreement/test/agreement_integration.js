const { assertBn } = require('./helpers/lib/assertBn')
const { bn, bigExp } = require('./helpers/lib/numbers')
const { ACTIONS_STATE, CHALLENGES_STATE, RULINGS } = require('./helpers/utils/enums')

const deployer = require('./helpers/utils/deployer')(web3, artifacts)


contract('Agreement', ([_, challenger, holder0, holder1, holder2, holder3, holder4, holder5]) => {
  let agreement, collateralToken, signPermissionToken

  const collateralAmount = bigExp(5, 18)
  const challengeCollateral = bigExp(15, 18)

  const actions = [
    // holder 1
    { submitter: holder1, actionContext: '0x010A' },
    { submitter: holder1, actionContext: '0x010B', settlementOffer: collateralAmount, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER },

    // holder 2
    { submitter: holder2, actionContext: '0x020A', settlementOffer: collateralAmount.div(2), settled: true },
    { submitter: holder2, actionContext: '0x020B', settlementOffer: bn(0), settled: true },

    // holder 3
    { submitter: holder3, actionContext: '0x030A', settlementOffer: bn(0), settled: true },
    { submitter: holder3, actionContext: '0x030B', settlementOffer: collateralAmount.div(3), ruling: RULINGS.IN_FAVOR_OF_SUBMITTER },
    { submitter: holder3, actionContext: '0x030C', settlementOffer: collateralAmount.div(5), ruling: RULINGS.IN_FAVOR_OF_CHALLENGER },
    { submitter: holder3, actionContext: '0x030D', cancelled: true },
    { submitter: holder3, actionContext: '0x030E', settlementOffer: collateralAmount.div(2), ruling: RULINGS.IN_FAVOR_OF_SUBMITTER },

    // holder 4
    { submitter: holder4, actionContext: '0x040A', settlementOffer: bn(0), ruling: RULINGS.IN_FAVOR_OF_CHALLENGER },
    { submitter: holder4, actionContext: '0x040B', settlementOffer: collateralAmount, ruling: RULINGS.REFUSED },
    { submitter: holder4, actionContext: '0x040C', cancelled: true },

    // holder 5
    { submitter: holder5, actionContext: '0x050A' },
    { submitter: holder5, actionContext: '0x050B' },
    { submitter: holder5, actionContext: '0x050C' },
  ]

  before('deploy tokens', async () => {
    collateralToken = await deployer.deployCollateralToken()
    signPermissionToken = await deployer.deploySignPermissionToken()
  })

  before('deploy agreement instance', async () => {
    agreement = await deployer.deployAndInitializeWrapper({ collateralAmount, challengeCollateral, signers: [holder1, holder2, holder3, holder4, holder5]})
  })

  describe('integration', () => {
    it('only holders with more than 10 permission tokens can sign', async () => {
      assert.isFalse(await agreement.canSign(holder0), 'holder 0 can sign')
      assert.isTrue(await agreement.canSign(holder1), 'holder 1 cannot sign')
      assert.isTrue(await agreement.canSign(holder2), 'holder 2 cannot sign')
      assert.isTrue(await agreement.canSign(holder3), 'holder 3 cannot sign')
      assert.isTrue(await agreement.canSign(holder4), 'holder 4 cannot sign')
      assert.isTrue(await agreement.canSign(holder5), 'holder 5 cannot sign')
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

      const holder1Actions = actions.filter(action => action.submitter === holder1)
      const { available: holder1Available, locked: holder1Locked, challenged: holder1Challenged } = await agreement.getBalance(holder1)
      assertBn(calculateStakedBalance(holder1Actions), holder1Available, 'holder 1 available balance does not match')
      assertBn(holder1Locked, 0, 'holder 1 locked balance does not match')
      assertBn(holder1Challenged, 0, 'holder 1 challenged balance does not match')

      const holder2Actions = actions.filter(action => action.submitter === holder2)
      const { available: holder2Available, locked: holder2Locked, challenged: holder2Challenged } = await agreement.getBalance(holder2)
      assertBn(calculateStakedBalance(holder2Actions), holder2Available, 'holder 2 available balance does not match')
      assertBn(holder2Locked, 0, 'holder 2 locked balance does not match')
      assertBn(holder2Challenged, 0, 'holder 2 challenged balance does not match')

      const holder3Actions = actions.filter(action => action.submitter === holder3)
      const { available: holder3Available, locked: holder3Locked, challenged: holder3Challenged } = await agreement.getBalance(holder3)
      assertBn(calculateStakedBalance(holder3Actions), holder3Available, 'holder 3 available balance does not match')
      assertBn(holder3Locked, 0, 'holder 3 locked balance does not match')
      assertBn(holder3Challenged, 0, 'holder 3 challenged balance does not match')

      const holder4Actions = actions.filter(action => action.submitter === holder4)
      const { available: holder4Available, locked: holder4Locked, challenged: holder4Challenged } = await agreement.getBalance(holder4)
      assertBn(calculateStakedBalance(holder4Actions), holder4Available, 'holder 4 available balance does not match')
      assertBn(holder4Locked, 0, 'holder 4 locked balance does not match')
      assertBn(holder4Challenged, 0, 'holder 4 challenged balance does not match')

      const holder5Actions = actions.filter(action => action.submitter === holder5)
      const { available: holder5Available, locked: holder5Locked, challenged: holder5Challenged } = await agreement.getBalance(holder5)
      assertBn(calculateStakedBalance(holder5Actions), holder5Available, 'holder 5 available balance does not match')
      assertBn(holder5Locked, 0, 'holder 5 locked balance does not match')
      assertBn(holder5Challenged, 0, 'holder 5 challenged balance does not match')

      const agreementBalance = await collateralToken.balanceOf(agreement.address)
      const expectedBalance = holder1Available.add(holder2Available).add(holder3Available).add(holder4Available).add(holder5Available)
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
