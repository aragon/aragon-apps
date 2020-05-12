const { DAY } = require('../helpers/lib/time')
const { assertBn } = require('../helpers/assert/assertBn')
const { bigExp, bn } = require('../helpers/lib/numbers')
const { assertRevert } = require('../helpers/assert/assertThrow')
const { assertAmountOfEvents, assertEvent } = require('../helpers/assert/assertEvent')
const { DELAY_ERRORS } = require('../helpers/utils/errors')
const { DELAY_EVENTS } = require('../helpers/utils/events')

const deployer = require('../helpers/utils/deployer')(web3, artifacts)

contract('Delay', ([_, owner, someone]) => {
  let delay

  let initialCollateralRequirement = {
    actionCollateral: bigExp(200, 18),
    challengeCollateral: bigExp(100, 18),
    challengeDuration: 3 * DAY,
  }

  beforeEach('deploy agreement', async () => {
    delay = await deployer.deployAndInitializeWrapperWithDisputable({ delay: true, owner, ...initialCollateralRequirement })
    initialCollateralRequirement.collateralToken = deployer.collateralToken
  })

  describe('changeCollateralRequirement', () => {
    let newCollateralRequirement = {
      challengeDuration: 10 * DAY,
      actionCollateral: bigExp(100, 18),
      challengeCollateral: bigExp(50, 18),
    }

    beforeEach('deploy new collateral token', async () => {
      newCollateralRequirement.collateralToken = await deployer.deployToken({})
    })

    const assertCurrentCollateralRequirement = async (actualCollateralRequirement, expectedCollateralRequirement) => {
      assert.equal(actualCollateralRequirement.collateralToken.address, expectedCollateralRequirement.collateralToken.address, 'collateral token does not match')
      assertBn(actualCollateralRequirement.actionCollateral, expectedCollateralRequirement.actionCollateral, 'action collateral does not match')
      assertBn(actualCollateralRequirement.challengeCollateral, expectedCollateralRequirement.challengeCollateral, 'challenge collateral does not match')
      assertBn(actualCollateralRequirement.challengeDuration, expectedCollateralRequirement.challengeDuration, 'challenge duration does not match')
    }

    it('starts with expected initial collateral requirements', async () => {
      const currentCollateralRequirement = await delay.getCollateralRequirement()
      await assertCurrentCollateralRequirement(currentCollateralRequirement, initialCollateralRequirement)
    })

    context('when the sender has permissions', () => {
      const from = owner

      it('changes the collateral requirements', async () => {
        await delay.changeCollateralRequirement({ ...newCollateralRequirement, from })

        const currentCollateralRequirement = await delay.getCollateralRequirement()
        await assertCurrentCollateralRequirement(currentCollateralRequirement, newCollateralRequirement)
      })

      it('keeps the previous collateral requirements', async () => {
        const currentId = await delay.getCurrentCollateralRequirementId()
        await delay.changeCollateralRequirement({ ...newCollateralRequirement, from })

        const previousCollateralRequirement = await delay.getCollateralRequirement(currentId)
        await assertCurrentCollateralRequirement(previousCollateralRequirement, initialCollateralRequirement)
      })

      it('emits an event', async () => {
        const currentId = await delay.getCurrentCollateralRequirementId()
        const receipt = await delay.changeCollateralRequirement({ ...newCollateralRequirement, from })

        assertAmountOfEvents(receipt, DELAY_EVENTS.COLLATERAL_CHANGED, 1)

        const { collateralToken, actionCollateral, challengeCollateral, challengeDuration } = newCollateralRequirement
        assertEvent(receipt, DELAY_EVENTS.COLLATERAL_CHANGED, { id: currentId.add(bn(1)), token: collateralToken, actionAmount: actionCollateral, challengeAmount: challengeCollateral, challengeDuration })
      })
    })

    context('when the sender does not have permissions', () => {
      const from = someone

      it('reverts', async () => {
        await assertRevert(delay.changeCollateralRequirement({ ...newCollateralRequirement, from }), DELAY_ERRORS.ERROR_AUTH_FAILED)
      })
    })
  })

  describe('changeTokenBalancePermission', () => {
    let newTokenBalancePermission

    beforeEach('deploy token balance permission', async () => {
      const submitPermissionBalance = bigExp(101, 18)
      const challengePermissionBalance = bigExp(202, 18)
      const submitPermissionToken = await deployer.deployToken({ name: 'Submit Permission Token', symbol: 'SPT', decimals: 18 })
      const challengePermissionToken = await deployer.deployToken({ name: 'Challenge Permission Token', symbol: 'CPT', decimals: 18 })
      newTokenBalancePermission = { submitPermissionToken, submitPermissionBalance, challengePermissionBalance, challengePermissionToken }
    })

    const assertCurrentTokenBalancePermission = async (actualPermission, expectedPermission) => {
      assertBn(actualPermission.submitPermissionBalance, expectedPermission.submitPermissionBalance, 'submit permission balance does not match')
      assert.equal(actualPermission.submitPermissionToken, expectedPermission.submitPermissionToken.address, 'submit permission token does not match')
      assertBn(actualPermission.challengePermissionBalance, expectedPermission.challengePermissionBalance, 'challenge permission balance does not match')
      assert.equal(actualPermission.challengePermissionToken, expectedPermission.challengePermissionToken.address, 'challenge permission token does not match')
    }

    it('starts with the expected initial permission', async () => {
      const nullToken = { address: '0x0000000000000000000000000000000000000000' }
      const initialPermission = { submitPermissionToken: nullToken, submitPermissionBalance: bn(0), challengePermissionToken: nullToken, challengePermissionBalance: bn(0) }
      const currentTokenPermission = await delay.getTokenBalancePermission()

      await assertCurrentTokenBalancePermission(currentTokenPermission, initialPermission)
    })

    context('when the sender has permissions', () => {
      const from = owner

      it('changes the token balance permission', async () => {
        await delay.changeTokenBalancePermission({ ...newTokenBalancePermission, from })

        const currentTokenPermission = await delay.getTokenBalancePermission()
        await assertCurrentTokenBalancePermission(currentTokenPermission, newTokenBalancePermission)
      })

      it('emits an event', async () => {
        const receipt = await delay.changeTokenBalancePermission({ ...newTokenBalancePermission, from })

        assertAmountOfEvents(receipt, DELAY_EVENTS.PERMISSION_CHANGED, 1)
        assertEvent(receipt, DELAY_EVENTS.PERMISSION_CHANGED, {
          submitToken: newTokenBalancePermission.submitPermissionToken.address,
          submitBalance: newTokenBalancePermission.submitPermissionBalance,
          challengeToken: newTokenBalancePermission.challengePermissionToken.address,
          challengeBalance: newTokenBalancePermission.challengePermissionBalance,
        })
      })
    })

    context('when the sender does not have permissions', () => {
      const from = someone

      it('reverts', async () => {
        await assertRevert(delay.changeTokenBalancePermission({ ...newTokenBalancePermission, from }), DELAY_ERRORS.ERROR_AUTH_FAILED)
      })
    })
  })
})
