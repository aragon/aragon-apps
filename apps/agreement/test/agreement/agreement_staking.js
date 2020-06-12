const { assertBn } = require('../helpers/assert/assertBn')
const { bn, bigExp } = require('../helpers/lib/numbers')
const { assertRevert } = require('../helpers/assert/assertThrow')
const { decodeEventsOfType } = require('../helpers/lib/decodeEvent')
const { assertAmountOfEvents, assertEvent } = require('../helpers/assert/assertEvent')
const { STAKING_EVENTS } = require('../helpers/utils/events')
const { STAKING_ERRORS } = require('../helpers/utils/errors')

const deployer = require('../helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, someone, user]) => {
  let token, staking, agreement

  beforeEach('deploy agreement instance', async () => {
    token = await deployer.deployToken({})
    staking = await deployer.deployStakingInstance(token)
    agreement = await deployer.deployAndInitializeWrapper()
  })

  describe('stake', () => {
    const approve = false // do not approve tokens before staking

    context('when the amount is greater than zero', () => {
      const amount = bigExp(200, 18)

      context('when the user has approved the requested amount', () => {
        beforeEach('approve tokens', async () => {
          await agreement.approve({ token, amount, from: user, to: staking.address })
        })

        it('increases the user available balance', async () => {
          const { available: previousAvailableBalance } = await agreement.getBalance(token, user)

          await agreement.stake({ token, amount, user, approve })

          const { available: currentAvailableBalance } = await agreement.getBalance(token, user)
          assertBn(currentAvailableBalance, previousAvailableBalance.add(amount), 'available balance does not match')
        })

        it('does not affect the locked balance of the user', async () => {
          const { locked: previousLockedBalance } = await agreement.getBalance(token, user)

          await agreement.stake({ token, amount, user, approve })

          const { locked: currentLockedBalance } = await agreement.getBalance(token, user)
          assertBn(currentLockedBalance, previousLockedBalance, 'locked balance does not match')
        })

        it('transfers the staked tokens to the contract', async () => {
          const previousUserBalance = await token.balanceOf(user)
          const previousStakingBalance = await token.balanceOf(staking.address)

          await agreement.stake({ token, amount, user, approve })

          const currentUserBalance = await token.balanceOf(user)
          assertBn(currentUserBalance, previousUserBalance.sub(amount), 'user balance does not match')

          const currentStakingBalance = await token.balanceOf(staking.address)
          assertBn(currentStakingBalance, previousStakingBalance.add(amount), 'staking balance does not match')
        })

        it('emits an event', async () => {
          const receipt = await agreement.stake({ token, amount, user, approve })

          assertAmountOfEvents(receipt, STAKING_EVENTS.BALANCE_STAKED, 1)
          assertEvent(receipt, STAKING_EVENTS.BALANCE_STAKED, { user, amount })
        })
      })

      context('when the user has not approved the requested amount', () => {
        it('reverts', async () => {
          await assertRevert(agreement.stake({ token, amount, user, approve }), STAKING_ERRORS.ERROR_TOKEN_DEPOSIT_FAILED)
        })
      })
    })

    context('when the amount is zero', () => {
      const amount = 0

      it('reverts', async () => {
        await assertRevert(agreement.stake({ token, amount, user, approve }), STAKING_ERRORS.ERROR_AMOUNT_ZERO)
      })
    })
  })

  describe('stakeFor', () => {
    const from = someone
    const approve = false // do not approve tokens before staking

    context('when the amount is greater than zero', () => {
      const amount = bigExp(200, 18)

      context('when the user has approved the requested amount', () => {
        beforeEach('approve tokens', async () => {
          const staking = await agreement.getStaking(token)
          await agreement.approve({ token, amount, from, to: staking.address })
        })

        it('increases the user available balance', async () => {
          const { available: previousAvailableBalance } = await agreement.getBalance(token, user)

          await agreement.stake({ token, user, amount, from, approve })

          const { available: currentAvailableBalance } = await agreement.getBalance(token, user)
          assertBn(currentAvailableBalance, previousAvailableBalance.add(amount), 'available balance does not match')
        })

        it('does not affect the locked balance of the user', async () => {
          const { locked: previousLockedBalance } = await agreement.getBalance(token, user)

          await agreement.stake({ token, user, amount, from, approve })

          const { locked: currentLockedBalance } = await agreement.getBalance(token, user)
          assertBn(currentLockedBalance, previousLockedBalance, 'locked balance does not match')
        })

        it('transfers the staked tokens to the contract', async () => {
          const previousUserBalance = await token.balanceOf(from)
          const previousStakingBalance = await token.balanceOf(staking.address)

          await agreement.stake({ token, user, amount, from, approve })

          const currentUserBalance = await token.balanceOf(from)
          assertBn(currentUserBalance, previousUserBalance.sub(amount), 'user balance does not match')

          const currentStakingBalance = await token.balanceOf(staking.address)
          assertBn(currentStakingBalance, previousStakingBalance.add(amount), 'staking balance does not match')
        })

        it('emits an event', async () => {
          const receipt = await agreement.stake({ token, user, amount, from, approve })

          assertAmountOfEvents(receipt, STAKING_EVENTS.BALANCE_STAKED, 1)
          assertEvent(receipt, STAKING_EVENTS.BALANCE_STAKED, { user, amount })
        })
      })

      context('when the user has not approved the requested amount', () => {
        it('reverts', async () => {
          await assertRevert(agreement.stake({ token, user, amount, from, approve }), STAKING_ERRORS.ERROR_TOKEN_DEPOSIT_FAILED)
        })
      })
    })

    context('when the amount is zero', () => {
      const amount = 0

      it('reverts', async () => {
        await assertRevert(agreement.stake({ token, user, amount, from, approve }), STAKING_ERRORS.ERROR_AMOUNT_ZERO)
      })
    })
  })

  describe('approveAndCall', () => {
    const from = user

    context('when the amount is greater than zero', () => {
      const amount = bigExp(200, 18)

      beforeEach('mint tokens', async () => {
        await token.generateTokens(from, amount)
      })

      it('increases the user available balance', async () => {
        const { available: previousAvailableBalance } = await agreement.getBalance(token, user)

        await agreement.approveAndCall({ token, amount, from, to: staking.address, mint: false })

        const { available: currentAvailableBalance } = await agreement.getBalance(token, user)
        assertBn(currentAvailableBalance, previousAvailableBalance.add(amount), 'available balance does not match')
      })

      it('does not affect the locked balance of the user', async () => {
        const { locked: previousLockedBalance } = await agreement.getBalance(token, user)

        await agreement.approveAndCall({ token, amount, from, to: staking.address, mint: false })

        const { locked: currentLockedBalance } = await agreement.getBalance(token, user)
        assertBn(currentLockedBalance, previousLockedBalance, 'locked balance does not match')
      })

      it('transfers the staked tokens to the contract', async () => {
        const previousUserBalance = await token.balanceOf(user)
        const previousStakingBalance = await token.balanceOf(staking.address)

        await agreement.approveAndCall({ token, amount, from, to: staking.address, mint: false })

        const currentUserBalance = await token.balanceOf(user)
        assertBn(currentUserBalance, previousUserBalance.sub(amount), 'user balance does not match')

        const currentStakingBalance = await token.balanceOf(staking.address)
        assertBn(currentStakingBalance, previousStakingBalance.add(amount), 'staking balance does not match')
      })

      it('emits an event', async () => {
        const Staking = artifacts.require('Staking')
        const receipt = await agreement.approveAndCall({ token, amount, from, to: staking.address, mint: false })
        const logs = decodeEventsOfType(receipt, Staking.abi, STAKING_EVENTS.BALANCE_STAKED)

        assertAmountOfEvents({ logs }, STAKING_EVENTS.BALANCE_STAKED, 1)
        assertEvent({ logs }, STAKING_EVENTS.BALANCE_STAKED, { user, amount })
      })
    })

    context('when the amount is zero', () => {
      const amount = 0

      it('reverts', async () => {
        await assertRevert(agreement.approveAndCall({ token, amount, from, to: staking.address, mint: false }), STAKING_ERRORS.ERROR_AMOUNT_ZERO)
      })
    })
  })

  describe('unstake', () => {
    const initialStake = bigExp(200, 18)

    context('when the sender has some amount staked before', () => {
      beforeEach('stake', async () => {
        await agreement.stake({ token, user, amount: initialStake })
      })

      context('when the requested amount is greater than zero', () => {
        const itUnstakesCollateralProperly = amount => {
          it('reduces the user available balance', async () => {
            const { available: previousAvailableBalance } = await agreement.getBalance(token, user)

            await agreement.unstake({ token, user, amount })

            const { available: currentAvailableBalance } = await agreement.getBalance(token, user)
            assertBn(currentAvailableBalance, previousAvailableBalance.sub(amount), 'available balance does not match')
          })

          it('does not affect the locked balance of the user', async () => {
            const { locked: previousLockedBalance } = await agreement.getBalance(token, user)

            await agreement.unstake({ token, user, amount })

            const { locked: currentLockedBalance } = await agreement.getBalance(token, user)
            assertBn(currentLockedBalance, previousLockedBalance, 'locked balance does not match')
          })

          it('transfers the staked tokens to the user', async () => {
            const previousUserBalance = await token.balanceOf(user)
            const previousStakingBalance = await token.balanceOf(staking.address)

            await agreement.unstake({ token, user, amount })

            const currentUserBalance = await token.balanceOf(user)
            assertBn(currentUserBalance, previousUserBalance.add(amount), 'user balance does not match')

            const currentStakingBalance = await token.balanceOf(staking.address)
            assertBn(currentStakingBalance, previousStakingBalance.sub(amount), 'staking balance does not match')
          })

          it('emits an event', async () => {
            const receipt = await agreement.unstake({ token, user, amount })

            assertAmountOfEvents(receipt, STAKING_EVENTS.BALANCE_UNSTAKED, 1)
            assertEvent(receipt, STAKING_EVENTS.BALANCE_UNSTAKED, { user, amount })
          })
        }

        context('when the requested amount is lower than the actual available balance', () => {
          const amount = initialStake.sub(bn(1))

          itUnstakesCollateralProperly(amount)
        })
        context('when the requested amount is equal to the actual available balance', () => {
          const amount = initialStake

          itUnstakesCollateralProperly(amount)
        })

        context('when the requested amount is higher than the actual available balance', () => {
          const amount = initialStake.add(bn(1))

          it('reverts', async () => {
            await assertRevert(agreement.unstake({ token, user, amount }), STAKING_ERRORS.STAKING_NOT_ENOUGH_BALANCE)
          })
        })
      })

      context('when the requested amount is zero', () => {
        const amount = 0

        it('reverts', async () => {
          await assertRevert(agreement.unstake({ token, user, amount }), STAKING_ERRORS.ERROR_AMOUNT_ZERO)
        })
      })
    })

    context('when the sender does not have an amount staked before', () => {
      context('when the requested amount is greater than zero', () => {
        const amount = bigExp(200, 18)

        it('reverts', async () => {
          await assertRevert(agreement.unstake({ token, user, amount }), STAKING_ERRORS.STAKING_NOT_ENOUGH_BALANCE)
        })
      })

      context('when the requested amount is zero', () => {
        const amount = 0

        it('reverts', async () => {
          await assertRevert(agreement.unstake({ token, user, amount }), STAKING_ERRORS.ERROR_AMOUNT_ZERO)
        })
      })
    })
  })
})
