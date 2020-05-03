const ERRORS = require('./helpers/utils/errors')
const EVENTS = require('./helpers/utils/events')
const { NOW } = require('./helpers/lib/time')
const { assertBn } = require('./helpers/assert/assertBn')
const { bn, bigExp } = require('./helpers/lib/numbers')
const { assertRevert } = require('./helpers/assert/assertThrow')
const { ACTIONS_STATE } = require('./helpers/utils/enums')
const { assertAmountOfEvents, assertEvent } = require('./helpers/assert/assertEvent')

const deployer = require('./helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, signer, someone]) => {
  let agreement, collateralToken

  describe('isForwarder', () => {
    beforeEach('deploy agreement instance', async () => {
      agreement = await deployer.deploy()
    })

    it('returns true', async () => {
      assert.isTrue(await agreement.isForwarder(), 'agreement is not a forwarder')
    })
  })

  describe('canForward', () => {
    const collateralAmount = bigExp(100, 18)

    beforeEach('deploy agreement instance', async () => {
      agreement = await deployer.deployAndInitialize({ signers: [signer], collateralAmount })
      collateralToken = deployer.collateralToken
    })

    const stakeTokens = amount => {
      beforeEach('stake tokens', async () => {
        await collateralToken.generateTokens(signer, amount)
        await collateralToken.approve(agreement.address, amount, { from: signer })
        await agreement.stake(amount, { from: signer })
      })
    }

    context('when the sender has permissions', () => {
      const from = signer

      context('when the sender has already signed the agreement', () => {
        beforeEach('sign agreement', async () => {
          await agreement.sign({ from })
        })

        context('when the sender stake is above the collateral amount', () => {
          stakeTokens(collateralAmount.add(bn(1)))

          it('returns true', async () => {
            assert.isTrue(await agreement.canForward(from, '0x'), 'sender cannot forward')
          })
        })

        context('when the sender stake is equal to the collateral amount', () => {
          stakeTokens(collateralAmount)

          it('returns true', async () => {
            assert.isTrue(await agreement.canForward(from, '0x'), 'sender cannot forward')
          })
        })

        context('when the sender stake is below the collateral amount', () => {
          it('returns true', async () => {
            assert.isTrue(await agreement.canForward(from, '0x'), 'sender cannot forward')
          })
        })
      })

      context('when the sender has not signed the agreement', () => {
        it('returns true', async () => {
          assert.isTrue(await agreement.canForward(from, '0x'), 'sender cannot forward')
        })
      })
    })

    context('when the sender does not have permissions', () => {
      const from = someone

      it('returns false', async () => {
        assert.isFalse(await agreement.canForward(from, '0x'), 'sender can forward')
      })
    })
  })

  describe('forward', () => {
    const script = '0x1234'

    beforeEach('deploy agreement instance', async () => {
      agreement = await deployer.deployAndInitializeWrapper({ signers: [signer] })
      collateralToken = deployer.collateralToken
    })

    context('when the sender has permissions', () => {
      const from = signer

      context('when the sender has already signed the agreement', () => {
        beforeEach('sign agreement', async () => {
          await agreement.sign(signer)
        })

        context('when the sender has some amount staked before', () => {
          beforeEach('stake tokens', async () => {
            await agreement.stake({ signer })
          })

          context('when the signer has enough balance', () => {
            it('creates a new scheduled action', async () => {
              const currentSettingId = await agreement.getCurrentSettingId()
              const { actionId } = await agreement.forward({ script, from })

              const actionData = await agreement.getAction(actionId)
              assert.equal(actionData.script, script, 'action script does not match')
              assert.equal(actionData.context, null, 'action context does not match')
              assert.equal(actionData.state, ACTIONS_STATE.SCHEDULED, 'action state does not match')
              assert.equal(actionData.submitter, from, 'submitter does not match')
              assertBn(actionData.challengeEndDate, agreement.delayPeriod.add(bn(NOW)), 'challenge end date does not match')
              assertBn(actionData.settingId, currentSettingId, 'setting ID does not match')
            })

            it('locks the collateral amount', async () => {
              const { locked: previousLockedBalance, available: previousAvailableBalance } = await agreement.getSigner(from)

              await agreement.forward({ script, from })

              const { locked: currentLockedBalance, available: currentAvailableBalance } = await agreement.getSigner(from)
              assertBn(currentLockedBalance, previousLockedBalance.add(agreement.collateralAmount), 'locked balance does not match')
              assertBn(currentAvailableBalance, previousAvailableBalance.sub(agreement.collateralAmount), 'available balance does not match')
            })

            it('does not affect the challenged balance', async () => {
              const { challenged: previousChallengedBalance } = await agreement.getSigner(from)

              await agreement.forward({ script, from })

              const { challenged: currentChallengedBalance } = await agreement.getSigner(from)
              assertBn(currentChallengedBalance, previousChallengedBalance, 'challenged balance does not match')
            })

            it('does not affect token balances', async () => {
              const { collateralToken } = agreement
              const previousSubmitterBalance = await collateralToken.balanceOf(from)
              const previousAgreementBalance = await collateralToken.balanceOf(agreement.address)

              await agreement.forward({ script, from })

              const currentSubmitterBalance = await collateralToken.balanceOf(from)
              assertBn(currentSubmitterBalance, previousSubmitterBalance, 'submitter balance does not match')

              const currentAgreementBalance = await collateralToken.balanceOf(agreement.address)
              assertBn(currentAgreementBalance, previousAgreementBalance, 'agreement balance does not match')
            })

            it('emits an event', async () => {
              const { receipt, actionId } = await agreement.forward({ script, from })

              assertAmountOfEvents(receipt, EVENTS.ACTION_SCHEDULED, 1)
              assertEvent(receipt, EVENTS.ACTION_SCHEDULED, { actionId })
            })

            it('can be challenged or cancelled', async () => {
              const { actionId } = await agreement.forward({ script, from })

              const { canCancel, canChallenge, canSettle, canDispute, canClaimSettlement, canRuleDispute, canExecute } = await agreement.getAllowedPaths(actionId)
              assert.isTrue(canCancel, 'action cannot be cancelled')
              assert.isTrue(canChallenge, 'action cannot be challenged')
              assert.isFalse(canSettle, 'action can be settled')
              assert.isFalse(canDispute, 'action can be disputed')
              assert.isFalse(canRuleDispute, 'action dispute can be ruled')
              assert.isFalse(canClaimSettlement, 'action settlement can be claimed')
              assert.isFalse(canExecute, 'action can be executed')
            })
          })

          context('when the signer does not have enough stake', () => {
            beforeEach('schedule other actions', async () => {
              await agreement.forward({ script, from })
            })

            it('reverts', async () => {
              await assertRevert(agreement.forward({ script, from }), ERRORS.ERROR_NOT_ENOUGH_AVAILABLE_STAKE)
            })
          })
        })

        context('when the sender does not have an amount staked before', () => {
          it('reverts', async () => {
            await assertRevert(agreement.forward({ script, from }), ERRORS.ERROR_NOT_ENOUGH_AVAILABLE_STAKE)
          })
        })
      })

      context('when the sender has not signed the agreement', () => {
        it('reverts', async () => {
          await assertRevert(agreement.forward({ script, from }), ERRORS.ERROR_SIGNER_MUST_SIGN_SETTING)
        })
      })
    })

    context('when the sender does not have permissions', () => {
      const from = someone

      it('reverts', async () => {
        await assertRevert(agreement.forward({ script, from }), ERRORS.ERROR_CAN_NOT_FORWARD)
      })
    })
  })
})
