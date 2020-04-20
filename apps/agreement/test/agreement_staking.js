const ERRORS = require('./helpers/utils/errors')
const EVENTS = require('./helpers/utils/events')
const { assertBn } = require('./helpers/lib/assertBn')
const { bn, bigExp } = require('./helpers/lib/numbers')
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { decodeEventsOfType } = require('./helpers/lib/decodeEvent')
const { assertAmountOfEvents, assertEvent } = require('./helpers/lib/assertEvent')

const deployer = require('./helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, someone, signer]) => {
  let collateralToken, agreement

  const collateralAmount = bigExp(200, 18)

  const itManagesStakingProperly = type => {
    beforeEach('deploy agreement instance', async () => {
      agreement = await deployer.deployAndInitializeWrapper({ collateralAmount, signers: [signer], type })
      collateralToken = await agreement.collateralToken
    })

    describe('stake', () => {
      context('when the sender has permissions', () => {
        const approve = false // do not approve tokens before staking

        const itStakesCollateralProperly = amount => {
          context('when the signer has approved the requested amount', () => {
            beforeEach('approve tokens', async () => {
              await agreement.approve({ amount, from: signer })
            })

            it('increases the signer available balance', async () => {
              const { available: previousAvailableBalance } = await agreement.getBalance(signer)

              await agreement.stake({ amount, signer, approve })

              const { available: currentAvailableBalance } = await agreement.getBalance(signer)
              assertBn(currentAvailableBalance, previousAvailableBalance.add(amount), 'available balance does not match')
            })

            it('does not affect the locked or challenged balances of the signer', async () => {
              const { locked: previousLockedBalance, challenged: previousChallengedBalance } = await agreement.getBalance(signer)

              await agreement.stake({ amount, signer, approve })

              const { locked: currentLockedBalance, challenged: currentChallengedBalance } = await agreement.getBalance(signer)
              assertBn(currentLockedBalance, previousLockedBalance, 'locked balance does not match')
              assertBn(currentChallengedBalance, previousChallengedBalance, 'challenged balance does not match')
            })

            it('transfers the staked tokens to the contract', async () => {
              const previousSignerBalance = await collateralToken.balanceOf(signer)
              const previousAgreementBalance = await collateralToken.balanceOf(agreement.address)

              await agreement.stake({ amount, signer, approve })

              const currentSignerBalance = await collateralToken.balanceOf(signer)
              assertBn(currentSignerBalance, previousSignerBalance.sub(amount), 'signer balance does not match')

              const currentAgreementBalance = await collateralToken.balanceOf(agreement.address)
              assertBn(currentAgreementBalance, previousAgreementBalance.add(amount), 'agreement balance does not match')
            })

            it('emits an event', async () => {
              const receipt = await agreement.stake({ amount, signer, approve })

              assertAmountOfEvents(receipt, EVENTS.BALANCE_STAKED, 1)
              assertEvent(receipt, EVENTS.BALANCE_STAKED, { signer, amount })
            })
          })

          context('when the signer has approved the requested amount', () => {
            it('reverts', async () => {
              await assertRevert(agreement.stake({ amount, signer, approve }), ERRORS.ERROR_COLLATERAL_TOKEN_TRANSFER_FAILED)
            })
          })
        }

        context('when the amount is above the collateral amount', () => {
          const amount = collateralAmount.add(bn(1))

          itStakesCollateralProperly(amount)
        })

        context('when the amount is equal to the collateral amount', () => {
          const amount = collateralAmount

          itStakesCollateralProperly(amount)
        })

        context('when the amount is below the collateral amount', () => {
          const amount = collateralAmount.sub(bn(1))

          it('reverts', async () => {
            await assertRevert(agreement.stake({ amount, signer, approve }), ERRORS.ERROR_AVAILABLE_BALANCE_BELOW_COLLATERAL)
          })
        })

        context('when the amount is zero', () => {
          const amount = 0

          it('reverts', async () => {
            await assertRevert(agreement.stake({ amount, signer, approve }), ERRORS.ERROR_AVAILABLE_BALANCE_BELOW_COLLATERAL)
          })
        })
      })

      context('when the sender does not have permissions', () => {
        const signer = someone

        it('reverts', async () => {
          await assertRevert(agreement.stake({ signer }), ERRORS.ERROR_AUTH_FAILED)
        })
      })
    })

    describe('stakeFor', () => {
      const from = someone

      context('when the signer has permissions', () => {
        const approve = false // do not approve tokens before staking

        const itStakesCollateralProperly = amount => {
          context('when the signer has approved the requested amount', () => {
            beforeEach('approve tokens', async () => {
              await agreement.approve({ amount, from })
            })

            it('increases the signer available balance', async () => {
              const { available: previousAvailableBalance } = await agreement.getBalance(signer)

              await agreement.stake({ signer, amount, from, approve })

              const { available: currentAvailableBalance } = await agreement.getBalance(signer)
              assertBn(currentAvailableBalance, previousAvailableBalance.add(amount), 'available balance does not match')
            })

            it('does not affect the locked or challenged balances of the signer', async () => {
              const { locked: previousLockedBalance, challenged: previousChallengedBalance } = await agreement.getBalance(signer)

              await agreement.stake({ signer, amount, from, approve })

              const { locked: currentLockedBalance, challenged: currentChallengedBalance } = await agreement.getBalance(signer)
              assertBn(currentLockedBalance, previousLockedBalance, 'locked balance does not match')
              assertBn(currentChallengedBalance, previousChallengedBalance, 'challenged balance does not match')
            })

            it('transfers the staked tokens to the contract', async () => {
              const previousSignerBalance = await collateralToken.balanceOf(from)
              const previousAgreementBalance = await collateralToken.balanceOf(agreement.address)

              await agreement.stake({ signer, amount, from, approve })

              const currentSignerBalance = await collateralToken.balanceOf(from)
              assertBn(currentSignerBalance, previousSignerBalance.sub(amount), 'signer balance does not match')

              const currentAgreementBalance = await collateralToken.balanceOf(agreement.address)
              assertBn(currentAgreementBalance, previousAgreementBalance.add(amount), 'agreement balance does not match')
            })

            it('emits an event', async () => {
              const receipt = await agreement.stake({ signer, amount, from, approve })

              assertAmountOfEvents(receipt, EVENTS.BALANCE_STAKED, 1)
              assertEvent(receipt, EVENTS.BALANCE_STAKED, { signer, amount })
            })
          })

          context('when the signer has approved the requested amount', () => {
            it('reverts', async () => {
              await assertRevert(agreement.stake({ signer, amount, from, approve }), ERRORS.ERROR_COLLATERAL_TOKEN_TRANSFER_FAILED)
            })
          })
        }

        context('when the amount is above the collateral amount', () => {
          const amount = collateralAmount.add(bn(1))

          itStakesCollateralProperly(amount)
        })

        context('when the amount is equal to the collateral amount', () => {
          const amount = collateralAmount

          itStakesCollateralProperly(amount)
        })

        context('when the amount is below the collateral amount', () => {
          const amount = collateralAmount.sub(bn(1))

          it('reverts', async () => {
            await assertRevert(agreement.stake({ signer, amount, from, approve }), ERRORS.ERROR_AVAILABLE_BALANCE_BELOW_COLLATERAL)
          })
        })

        context('when the amount is zero', () => {
          const amount = 0

          it('reverts', async () => {
            await assertRevert(agreement.stake({ signer, amount, from, approve }), ERRORS.ERROR_AVAILABLE_BALANCE_BELOW_COLLATERAL)
          })
        })
      })

      context('when the signer does not have permissions', () => {
        const signer = someone

        it('reverts', async () => {
          await assertRevert(agreement.stake({ signer, from }), ERRORS.ERROR_AUTH_FAILED)
        })
      })
    })

    describe('approveAndCall', () => {
      context('when the signer has permissions', () => {
        const from = signer

        const itStakesCollateralProperly = amount => {
          beforeEach('mint tokens', async () => {
            await agreement.collateralToken.generateTokens(from, amount)
          })

          it('increases the signer available balance', async () => {
            const { available: previousAvailableBalance } = await agreement.getBalance(signer)

            await agreement.approveAndCall({ amount, from, mint: false })

            const { available: currentAvailableBalance } = await agreement.getBalance(signer)
            assertBn(currentAvailableBalance, previousAvailableBalance.add(amount), 'available balance does not match')
          })

          it('does not affect the locked or challenged balances of the signer', async () => {
            const { locked: previousLockedBalance, challenged: previousChallengedBalance } = await agreement.getBalance(signer)

            await agreement.approveAndCall({ amount, from, mint: false })

            const { locked: currentLockedBalance, challenged: currentChallengedBalance } = await agreement.getBalance(signer)
            assertBn(currentLockedBalance, previousLockedBalance, 'locked balance does not match')
            assertBn(currentChallengedBalance, previousChallengedBalance, 'challenged balance does not match')
          })

          it('transfers the staked tokens to the contract', async () => {
            const previousSignerBalance = await collateralToken.balanceOf(signer)
            const previousAgreementBalance = await collateralToken.balanceOf(agreement.address)

            await agreement.approveAndCall({ amount, from, mint: false })

            const currentSignerBalance = await collateralToken.balanceOf(signer)
            assertBn(currentSignerBalance, previousSignerBalance.sub(amount), 'signer balance does not match')

            const currentAgreementBalance = await collateralToken.balanceOf(agreement.address)
            assertBn(currentAgreementBalance, previousAgreementBalance.add(amount), 'agreement balance does not match')
          })

          it('emits an event', async () => {
            const receipt = await agreement.approveAndCall({ amount, from, mint: false })
            const logs = decodeEventsOfType(receipt, deployer.abi, EVENTS.BALANCE_STAKED)

            assertAmountOfEvents({ logs }, EVENTS.BALANCE_STAKED, 1)
            assertEvent({ logs }, EVENTS.BALANCE_STAKED, { signer, amount })
          })
        }

        context('when the amount is above the collateral amount', () => {
          const amount = collateralAmount.add(bn(1))

          itStakesCollateralProperly(amount)
        })

        context('when the amount is equal to the collateral amount', () => {
          const amount = collateralAmount

          itStakesCollateralProperly(amount)
        })

        context('when the amount is below the collateral amount', () => {
          const amount = collateralAmount.sub(bn(1))

          it('reverts', async () => {
            await assertRevert(agreement.approveAndCall({ amount, from, mint: false }), ERRORS.ERROR_AVAILABLE_BALANCE_BELOW_COLLATERAL)
          })
        })

        context('when the amount is zero', () => {
          const amount = 0

          it('reverts', async () => {
            await assertRevert(agreement.approveAndCall({ amount, from, mint: false }), ERRORS.ERROR_AVAILABLE_BALANCE_BELOW_COLLATERAL)
          })
        })
      })

      context('when the signer does not have permissions', () => {
        const from = someone
        const amount = collateralAmount

        it('reverts', async () => {
          await assertRevert(agreement.approveAndCall({ amount, from }), ERRORS.ERROR_AUTH_FAILED)
        })
      })
    })

    describe('unstake', () => {
      const initialStake = collateralAmount.mul(2)

      context('when the sender has some amount staked before', () => {
        beforeEach('stake', async () => {
          await agreement.stake({ signer, amount: initialStake })
        })

        context('when the requested amount greater than zero', () => {
          const itUnstakesCollateralProperly = amount => {
            it('reduces the signer available balance', async () => {
              const { available: previousAvailableBalance } = await agreement.getBalance(signer)

              await agreement.unstake({ signer, amount })

              const { available: currentAvailableBalance } = await agreement.getBalance(signer)
              assertBn(currentAvailableBalance, previousAvailableBalance.sub(amount), 'available balance does not match')
            })

            it('does not affect the locked or challenged balances of the signer', async () => {
              const { locked: previousLockedBalance, challenged: previousChallengedBalance } = await agreement.getBalance(signer)

              await agreement.unstake({ signer, amount })

              const { locked: currentLockedBalance, challenged: currentChallengedBalance } = await agreement.getBalance(signer)
              assertBn(currentLockedBalance, previousLockedBalance, 'locked balance does not match')
              assertBn(currentChallengedBalance, previousChallengedBalance, 'challenged balance does not match')
            })

            it('transfers the staked tokens to the signer', async () => {
              const previousSignerBalance = await collateralToken.balanceOf(signer)
              const previousAgreementBalance = await collateralToken.balanceOf(agreement.address)

              await agreement.unstake({ signer, amount })

              const currentSignerBalance = await collateralToken.balanceOf(signer)
              assertBn(currentSignerBalance, previousSignerBalance.add(amount), 'signer balance does not match')

              const currentAgreementBalance = await collateralToken.balanceOf(agreement.address)
              assertBn(currentAgreementBalance, previousAgreementBalance.sub(amount), 'agreement balance does not match')
            })

            it('emits an event', async () => {
              const receipt = await agreement.unstake({ signer, amount })

              assertAmountOfEvents(receipt, EVENTS.BALANCE_UNSTAKED, 1)
              assertEvent(receipt, EVENTS.BALANCE_UNSTAKED, { signer, amount })
            })
          }

          context('when the requested amount is lower than or equal to the actual available balance', () => {
            context('when the remaining amount is above the collateral amount', () => {
              const amount = initialStake.sub(collateralAmount).sub(1)

              itUnstakesCollateralProperly(amount)
            })

            context('when the remaining amount is equal to the collateral amount', () => {
              const amount = initialStake.sub(collateralAmount)

              itUnstakesCollateralProperly(amount)
            })

            context('when the remaining amount is below the collateral amount', () => {
              const amount = initialStake.sub(collateralAmount).add(1)

              it('reverts', async () => {
                await assertRevert(agreement.unstake({ signer, amount }), ERRORS.ERROR_AVAILABLE_BALANCE_BELOW_COLLATERAL)
              })
            })

            context('when the remaining amount is zero', () => {
              const amount = initialStake

              itUnstakesCollateralProperly(amount)
            })
          })

          context('when the requested amount is higher than the actual available balance', () => {
            const amount = initialStake.add(1)

            it('reverts', async () => {
              await assertRevert(agreement.unstake({ signer, amount }), ERRORS.ERROR_NOT_ENOUGH_AVAILABLE_STAKE)
            })
          })
        })

        context('when the requested amount is zero', () => {
          const amount = 0

          it('reverts', async () => {
            await assertRevert(agreement.unstake({ signer, amount }), ERRORS.ERROR_INVALID_UNSTAKE_AMOUNT)
          })
        })
      })

      context('when the sender does not have an amount staked before', () => {
        const amount = initialStake

        context('when the requested amount greater than zero', () => {
          it('reverts', async () => {
            await assertRevert(agreement.unstake({ signer, amount }), ERRORS.ERROR_NOT_ENOUGH_AVAILABLE_STAKE)
          })
        })

        context('when the requested amount is zero', () => {
          const amount = 0

          it('reverts', async () => {
            await assertRevert(agreement.unstake({ signer, amount }), ERRORS.ERROR_INVALID_UNSTAKE_AMOUNT)
          })
        })
      })
    })
  }

  describe('token balance based permission', () => {
    const type = 'permission'

    before('deploy agreement instance', async () => {
      await deployer.deployBase({ type })
    })

    itManagesStakingProperly(type)
  })

  describe('token balance based agreement', () => {
    const type = 'token'

    before('deploy agreement base', async () => {
      await deployer.deployBase({ type })
    })

    itManagesStakingProperly(type)
  })
})
