const deployer = require('../helpers/utils/deployer')(web3, artifacts)
const { CHALLENGES_STATE, RULINGS } = require('../helpers/utils/enums')

const { assertBn } = require('@aragon/contract-helpers-test/src/asserts')
const { bn, bigExp } = require('@aragon/contract-helpers-test')

contract('Agreement', ([_, challenger, holder0, holder1, holder2, holder3, holder4, holder5]) => {
  let disputable, collateralToken

  const actionCollateral = bigExp(5, 18)
  const challengeCollateral = bigExp(15, 18)

  const actions = [
    // holder 1
    { submitter: holder1, actionContext: '0x010A' },
    { submitter: holder1, actionContext: '0x010B', settlementOffer: actionCollateral, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER },

    // holder 2
    { submitter: holder2, actionContext: '0x020A', settlementOffer: actionCollateral.div(bn(2)), settled: true },
    { submitter: holder2, actionContext: '0x020B', settlementOffer: bn(0), settled: true },

    // holder 3
    { submitter: holder3, actionContext: '0x030A', settlementOffer: bn(0), settled: true },
    { submitter: holder3, actionContext: '0x030B', settlementOffer: actionCollateral.div(bn(3)), ruling: RULINGS.IN_FAVOR_OF_SUBMITTER },
    { submitter: holder3, actionContext: '0x030C', settlementOffer: actionCollateral.div(bn(5)), ruling: RULINGS.IN_FAVOR_OF_CHALLENGER },
    { submitter: holder3, actionContext: '0x030D', closed: true },
    { submitter: holder3, actionContext: '0x030E', settlementOffer: actionCollateral.div(bn(2)), ruling: RULINGS.IN_FAVOR_OF_SUBMITTER },

    // holder 4
    { submitter: holder4, actionContext: '0x040A', settlementOffer: bn(0), ruling: RULINGS.IN_FAVOR_OF_CHALLENGER },
    { submitter: holder4, actionContext: '0x040B', settlementOffer: actionCollateral, ruling: RULINGS.REFUSED },
    { submitter: holder4, actionContext: '0x040C', closed: true },

    // holder 5
    { submitter: holder5, actionContext: '0x050A' },
    { submitter: holder5, actionContext: '0x050B' },
    { submitter: holder5, actionContext: '0x050C' },
  ]

  before('deploy disputable instance', async () => {
    collateralToken = await deployer.deployCollateralToken()
    disputable = await deployer.deployAndInitializeDisputableWrapper({ actionCollateral, challengeCollateral, submitters: [holder1, holder2, holder3, holder4, holder5] })
  })

  describe('integration', () => {
    it('only holders marked as submitters can forward', async () => {
      assert.isFalse(await disputable.canForward(holder0), 'holder 0 can forward')
      assert.isTrue(await disputable.canForward(holder1), 'holder 1 cannot forward')
      assert.isTrue(await disputable.canForward(holder2), 'holder 2 cannot forward')
      assert.isTrue(await disputable.canForward(holder3), 'holder 3 cannot forward')
      assert.isTrue(await disputable.canForward(holder4), 'holder 4 cannot forward')
      assert.isTrue(await disputable.canForward(holder5), 'holder 5 cannot forward')
    })

    it('submits the expected actions', async () => {
      for (const action of actions) {
        const { actionContext, submitter } = action
        const { actionId } = await disputable.newAction({ actionContext, submitter })
        action.id = actionId
        assert.notEqual(actionId, undefined, 'action ID is null')
      }
    })

    it('challenges the expected actions', async () => {
      const challengedActions = actions.filter(action => !!action.settlementOffer)
      for (const action of challengedActions) {
        const { id, settlementOffer } = action
        const { challengeId } = await disputable.challenge({ actionId: id, settlementOffer, challenger, challengeDuration: 10 })
        action.challengeId = challengeId
        const { challenger: actualChallenger } = await disputable.getChallenge(challengeId)
        assert.isTrue(actualChallenger !== undefined, `action ${id} is not challenged`)
      }
    })

    it('settles the expected actions', async () => {
      const settledActions = actions.filter(action => action.settled)
      for (const { id, challengeId } of settledActions) {
        await disputable.settle({ actionId: id })
        const { state } = await disputable.getChallenge(challengeId)
        assert.equal(state, CHALLENGES_STATE.SETTLED, `action ${id} is not settled`)
      }
    })

    it('disputes and rules the expected actions', async () => {
      const disputedActions = actions.filter(action => !!action.ruling)
      for (const { id, challengeId, ruling } of disputedActions) {
        await disputable.dispute({ actionId: id })
        const { state } = await disputable.getChallenge(challengeId)
        assert.equal(state, CHALLENGES_STATE.DISPUTED, `action ${id} is not disputed`)

        await disputable.executeRuling({ actionId: id, ruling })
        const { ruling: actualRuling } = await disputable.getChallenge(challengeId)
        assertBn(actualRuling, ruling, `action ${id} is not ruled`)
      }
    })

    it('closes the expected actions', async () => {
      const closedActions = actions.filter(action => action.closed)
      for (const { id } of closedActions) {
        await disputable.close(id)
        const { closed } = await disputable.getAction(id)
        assert.isTrue(closed, `action ${id} is not closed`)
      }
    })

    it('closes not challenged or challenge-accepted actions', async () => {
      const closedActions = actions.filter(action => (!action.settlementOffer && !action.closed && !action.ruling) || action.ruling === RULINGS.REFUSED || action.ruling === RULINGS.IN_FAVOR_OF_SUBMITTER)
      for (const { id } of closedActions) {
        const canClose = await disputable.agreement.canClose(id)
        assert.isTrue(canClose, `action ${id} cannot be closed`)

        await disputable.close(id)
        const { closed } = await disputable.getAction(id)
        assert.isTrue(closed, `action ${id} is not closed`)
      }

      const notClosedActions = actions.filter(action => !closedActions.includes(action))
      for (const { id } of notClosedActions) {
        const canClose = await disputable.agreement.canClose(id)
        assert.isFalse(canClose, `action ${id} can be closed`)
      }
    })

    it('computes the challenger rewards properly', async () => {
      const challengeSettledActions = actions.filter(action => action.settled).length
      const challengeRefusedActions = actions.filter(action => action.ruling === RULINGS.REFUSED).length
      const challengeAcceptedActions = actions.filter(action => action.ruling === RULINGS.IN_FAVOR_OF_CHALLENGER).length

      const wonDisputesTotal = (challengeCollateral.add(actionCollateral)).mul(bn(challengeAcceptedActions))
      const settledTotal = actions.filter(action => action.settled).reduce((total, action) => total.add(action.settlementOffer), bn(0))
      const returnedCollateralTotal = challengeCollateral.mul(bn(challengeSettledActions)).add(challengeCollateral.mul(bn(challengeRefusedActions)))

      const expectedChallengerBalance = wonDisputesTotal.add(settledTotal).add(returnedCollateralTotal)
      const challengerBalance = await collateralToken.balanceOf(challenger)
      const challengerTotalBalance = await disputable.getTotalAvailableBalance(challenger)
      assertBn(challengerBalance, expectedChallengerBalance, 'challenger balance does not match')
      assertBn(challengerTotalBalance, expectedChallengerBalance, 'challenger total balance does not match')
    })

    it('computes available stake balances properly', async () => {
      const calculateStakedBalance = holderActions => {
        const notSlashedActions = holderActions.filter(action => (!action.settled && !action.ruling) || action.ruling === RULINGS.IN_FAVOR_OF_SUBMITTER || action.ruling === RULINGS.REFUSED).length
        const settleRemainingTotal = holderActions.filter(action => action.settled).reduce((total, action) => total.add(actionCollateral.sub(action.settlementOffer)), bn(0))
        return actionCollateral.mul(bn(notSlashedActions)).add(settleRemainingTotal)
      }

      const holder1Actions = actions.filter(action => action.submitter === holder1)
      const { available: holder1Available, locked: holder1Locked } = await disputable.getBalance(holder1)
      assertBn(calculateStakedBalance(holder1Actions), holder1Available, 'holder 1 available balance does not match')
      assertBn(holder1Locked, 0, 'holder 1 locked balance does not match')

      const holder2Actions = actions.filter(action => action.submitter === holder2)
      const { available: holder2Available, locked: holder2Locked } = await disputable.getBalance(holder2)
      assertBn(calculateStakedBalance(holder2Actions), holder2Available, 'holder 2 available balance does not match')
      assertBn(holder2Locked, 0, 'holder 2 locked balance does not match')

      const holder3Actions = actions.filter(action => action.submitter === holder3)
      const { available: holder3Available, locked: holder3Locked } = await disputable.getBalance(holder3)
      assertBn(calculateStakedBalance(holder3Actions), holder3Available, 'holder 3 available balance does not match')
      assertBn(holder3Locked, 0, 'holder 3 locked balance does not match')

      const holder4Actions = actions.filter(action => action.submitter === holder4)
      const { available: holder4Available, locked: holder4Locked } = await disputable.getBalance(holder4)
      assertBn(calculateStakedBalance(holder4Actions), holder4Available, 'holder 4 available balance does not match')
      assertBn(holder4Locked, 0, 'holder 4 locked balance does not match')

      const holder5Actions = actions.filter(action => action.submitter === holder5)
      const { available: holder5Available, locked: holder5Locked } = await disputable.getBalance(holder5)
      assertBn(calculateStakedBalance(holder5Actions), holder5Available, 'holder 5 available balance does not match')
      assertBn(holder5Locked, 0, 'holder 5 locked balance does not match')

      const staking = await disputable.getStaking()
      const stakingBalance = await collateralToken.balanceOf(staking.address)
      const challengerAvailable = (await disputable.getBalance(challenger)).available
      const expectedBalance = holder1Available.add(holder2Available).add(holder3Available).add(holder4Available).add(holder5Available).add(challengerAvailable)
      assertBn(stakingBalance, expectedBalance, 'agreement staked balance does not match')
    })

    it('transfer the arbitration fees properly', async () => {
      const { feeToken, feeAmount } = await disputable.getDisputeFees()
      const disputedActions = actions.filter(action => !!action.ruling)
      const totalArbitrationFees = feeAmount.mul(bn(disputedActions.length))

      const arbitratorBalance = await feeToken.balanceOf(disputable.arbitrator.address)
      assertBn(arbitratorBalance, totalArbitrationFees, 'arbitrator arbitration fees balance does not match')

      const StakingBalance = await feeToken.balanceOf(disputable.address)
      assertBn(StakingBalance, 0, 'agreement arbitration fees balance does not match')
    })
  })
})
