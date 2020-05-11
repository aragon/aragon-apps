const { assertBn } = require('../helpers/assert/assertBn')
const { bn, bigExp } = require('../helpers/lib/numbers')
const { DELAY_STATE, ACTIONS_STATE, CHALLENGES_STATE, RULINGS } = require('../helpers/utils/enums')

const deployer = require('../helpers/utils/deployer')(web3, artifacts)


contract('Delay', ([_, challenger, holder0, holder1, holder2, holder3, holder4, holder5]) => {
  let delay, collateralToken, submitPermissionToken

  const actionCollateral = bigExp(5, 18)
  const challengeCollateral = bigExp(15, 18)

  const delayables = [
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
    { submitter: holder3, actionContext: '0x030D', stopped: true },
    { submitter: holder3, actionContext: '0x030E', settlementOffer: actionCollateral.div(bn(2)), ruling: RULINGS.IN_FAVOR_OF_SUBMITTER },

    // holder 4
    { submitter: holder4, actionContext: '0x040A', settlementOffer: bn(0), ruling: RULINGS.IN_FAVOR_OF_CHALLENGER },
    { submitter: holder4, actionContext: '0x040B', settlementOffer: actionCollateral, ruling: RULINGS.REFUSED },
    { submitter: holder4, actionContext: '0x040C', stopped: true },

    // holder 5
    { submitter: holder5, actionContext: '0x050A' },
    { submitter: holder5, actionContext: '0x050B' },
    { submitter: holder5, actionContext: '0x050C' },
  ]

  before('deploy tokens', async () => {
    collateralToken = await deployer.deployCollateralToken()
    submitPermissionToken = await deployer.deploySubmitPermissionToken()
  })

  before('deploy delay instance', async () => {
    delay = await deployer.deployAndInitializeWrapperWithDisputable({ delay: true, actionCollateral, challengeCollateral, submitters: [holder1, holder2, holder3, holder4, holder5] })
  })

  describe('integration', () => {
    it('only holders marked as submitters can forward', async () => {
      assert.isFalse(await delay.canForward(holder0), 'holder 0 can forward')
      assert.isTrue(await delay.canForward(holder1), 'holder 1 cannot forward')
      assert.isTrue(await delay.canForward(holder2), 'holder 2 cannot forward')
      assert.isTrue(await delay.canForward(holder3), 'holder 3 cannot forward')
      assert.isTrue(await delay.canForward(holder4), 'holder 4 cannot forward')
      assert.isTrue(await delay.canForward(holder5), 'holder 5 cannot forward')
    })

    it('submits the expected delayables', async () => {
      for (const delayable of delayables) {
        const { actionContext, submitter } = delayable
        const { delayableId } = await delay.schedule({ actionContext, submitter })
        delayable.id = delayableId
        assert.notEqual(delayableId, undefined, 'delayable ID is null')
      }
    })

    it('challenges the expected delayables', async () => {
      const challengedDelayables = delayables.filter(delayable => !!delayable.settlementOffer)
      for (const { id, settlementOffer } of challengedDelayables) {
        await delay.challenge({ delayableId: id, settlementOffer, challenger })
        const { state } = await delay.getDelayable(id)
        assert.equal(state, ACTIONS_STATE.CHALLENGED, `delayable ${id} is not challenged`)
      }
    })

    it('settles the expected delayables', async () => {
      const settledDelayables = delayables.filter(delayable => delayable.settled)
      for (const { id } of settledDelayables) {
        await delay.settle({ delayableId: id })
        const { state } = await delay.getChallenge(id)
        assert.equal(state, CHALLENGES_STATE.SETTLED, `delayable ${id} is not settled`)
      }
    })

    it('disputes the expected delayables', async () => {
      const disputedDelayables = delayables.filter(delayable => !!delayable.ruling)
      for (const { id, ruling } of disputedDelayables) {
        await delay.dispute({ delayableId: id })
        const { state } = await delay.getChallenge(id)
        assert.equal(state, CHALLENGES_STATE.DISPUTED, `delayable ${id} is not disputed`)

        await delay.executeRuling({ delayableId: id, ruling })
        const { ruling: actualRuling } = await delay.getDispute(id)
        assertBn(actualRuling, ruling, `delayable ${id} is not ruled`)
      }
    })

    it('stops the expected delayables', async () => {
      const stoppedDelayables = delayables.filter(delayable => delayable.stopped)
      for (const { id } of stoppedDelayables) {
        await delay.stop({ delayableId: id })
        const { state } = await delay.getDelayable(id)
        assert.equal(state, DELAY_STATE.STOPPED, `delayable ${id} is not stopped`)
      }
    })

    it('executes not challenged or challenge-rejected delayables', async () => {
      await delay.moveAfterDelayPeriod(delayables[0].id)
      const executedDelayables = delayables.filter(delayable => (!delayable.settlementOffer && !delayable.stopped && !delayable.ruling) || delayable.ruling === RULINGS.IN_FAVOR_OF_SUBMITTER)
      for (const { id } of executedDelayables) {
        const canExecute = await delay.disputable.canExecute(id)
        assert.isTrue(canExecute, `delayable ${id} cannot be executed`)
        await delay.execute({ delayableId: id })
        const { state } = await delay.getDelayable(id)
        assert.equal(state, DELAY_STATE.EXECUTED, `delayable ${id} is not executed`)
      }

      const notExecutedDelayables = delayables.filter(delayable => !executedDelayables.includes(delayable))
      for (const { id } of notExecutedDelayables) {
        const canExecute = await delay.disputable.canExecute(id)
        assert.isFalse(canExecute, `delayable ${id} can be executed`)
      }
    })

    it('computes the challenger rewards properly', async () => {
      const challengeSettledDelayables = delayables.filter(delayable => delayable.settled).length
      const challengeRefusedDelayables = delayables.filter(delayable => delayable.ruling === RULINGS.REFUSED).length
      const challengeAcceptedDelayables = delayables.filter(delayable => delayable.ruling === RULINGS.IN_FAVOR_OF_CHALLENGER).length

      const wonDisputesTotal = (challengeCollateral.add(actionCollateral)).mul(bn(challengeAcceptedDelayables))
      const settledTotal = delayables.filter(delayable => delayable.settled).reduce((total, delayable) => total.add(delayable.settlementOffer), bn(0))
      const returnedCollateralTotal = challengeCollateral.mul(bn(challengeSettledDelayables)).add(challengeCollateral.mul(bn(challengeRefusedDelayables)))

      const expectedChallengerBalance = wonDisputesTotal.add(settledTotal).add(returnedCollateralTotal)
      assertBn(await collateralToken.balanceOf(challenger), expectedChallengerBalance, 'challenger balance does not match')
    })

    it('computes available stake balances properly', async () => {
      const calculateStakedBalance = holderDelayables => {
        const notSlashedDelayables = holderDelayables.filter(delayable => (!delayable.settled && !delayable.ruling) || delayable.ruling === RULINGS.IN_FAVOR_OF_SUBMITTER || delayable.ruling === RULINGS.REFUSED).length
        const settleRemainingTotal = holderDelayables.filter(delayable => delayable.settled).reduce((total, delayable) => total.add(actionCollateral.sub(delayable.settlementOffer)), bn(0))
        return actionCollateral.mul(bn(notSlashedDelayables)).add(settleRemainingTotal)
      }

      const holder1Delayables = delayables.filter(delayable => delayable.submitter === holder1)
      const { available: holder1Available, locked: holder1Locked } = await delay.getBalance(holder1)
      assertBn(calculateStakedBalance(holder1Delayables), holder1Available, 'holder 1 available balance does not match')
      assertBn(holder1Locked, 0, 'holder 1 locked balance does not match')

      const holder2Delayables = delayables.filter(delayable => delayable.submitter === holder2)
      const { available: holder2Available, locked: holder2Locked } = await delay.getBalance(holder2)
      assertBn(calculateStakedBalance(holder2Delayables), holder2Available, 'holder 2 available balance does not match')
      assertBn(holder2Locked, 0, 'holder 2 locked balance does not match')

      const holder3Delayables = delayables.filter(delayable => delayable.submitter === holder3)
      const { available: holder3Available, locked: holder3Locked } = await delay.getBalance(holder3)
      assertBn(calculateStakedBalance(holder3Delayables), holder3Available, 'holder 3 available balance does not match')
      assertBn(holder3Locked, 0, 'holder 3 locked balance does not match')

      const holder4Delayables = delayables.filter(delayable => delayable.submitter === holder4)
      const { available: holder4Available, locked: holder4Locked } = await delay.getBalance(holder4)
      assertBn(calculateStakedBalance(holder4Delayables), holder4Available, 'holder 4 available balance does not match')
      assertBn(holder4Locked, 0, 'holder 4 locked balance does not match')

      const holder5Delayables = delayables.filter(delayable => delayable.submitter === holder5)
      const { available: holder5Available, locked: holder5Locked } = await delay.getBalance(holder5)
      assertBn(calculateStakedBalance(holder5Delayables), holder5Available, 'holder 5 available balance does not match')
      assertBn(holder5Locked, 0, 'holder 5 locked balance does not match')

      const staking = await delay.getStaking()
      const stakingBalance = await collateralToken.balanceOf(staking.address)
      const expectedBalance = holder1Available.add(holder2Available).add(holder3Available).add(holder4Available).add(holder5Available)
      assertBn(stakingBalance, expectedBalance, 'agreement staked balance does not match')
    })

    it('transfer the arbitration fees properly', async () => {
      const { feeToken, feeAmount } = await delay.arbitratorFees()
      const disputedDelayables = delayables.filter(delayable => !!delayable.ruling)
      const totalArbitrationFees = feeAmount.mul(bn(disputedDelayables.length))

      const arbitratorBalance = await feeToken.balanceOf(delay.arbitrator.address)
      assertBn(arbitratorBalance, totalArbitrationFees, 'arbitrator arbitration fees balance does not match')

      const StakingBalance = await feeToken.balanceOf(delay.address)
      assertBn(StakingBalance, 0, 'agreement arbitration fees balance does not match')
    })
  })
})
