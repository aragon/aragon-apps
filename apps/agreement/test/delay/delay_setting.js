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

  let initialCollateralRequirements = {
    actionCollateral: bigExp(200, 18),
    challengeCollateral: bigExp(100, 18),
    challengeDuration: 3 * DAY,
  }

  beforeEach('deploy agreement', async () => {
    delay = await deployer.deployAndInitializeWrapperWithDisputable({ delay: true, owner, ...initialCollateralRequirements })
    initialCollateralRequirements.collateralToken = deployer.collateralToken
  })

  describe('changeCollateralRequirements', () => {
    let newCollateralRequirements = {
      challengeDuration: 10 * DAY,
      actionCollateral: bigExp(100, 18),
      challengeCollateral: bigExp(50, 18),
    }

    beforeEach('deploy new collateral token', async () => {
      newCollateralRequirements.collateralToken = await deployer.deployToken({})
    })

    const assertCurrentCollateralRequirements = async (actualCollateralRequirements, expectedCollateralRequirements) => {
      assert.equal(actualCollateralRequirements.collateralToken.address, expectedCollateralRequirements.collateralToken.address, 'collateral token does not match')
      assertBn(actualCollateralRequirements.actionCollateral, expectedCollateralRequirements.actionCollateral, 'action collateral does not match')
      assertBn(actualCollateralRequirements.challengeCollateral, expectedCollateralRequirements.challengeCollateral, 'challenge collateral does not match')
      assertBn(actualCollateralRequirements.challengeDuration, expectedCollateralRequirements.challengeDuration, 'challenge duration does not match')
    }

    it('starts with expected initial settings', async () => {
      const currentCollateralRequirements = await delay.getCollateralRequirements()
      await assertCurrentCollateralRequirements(currentCollateralRequirements, initialCollateralRequirements)
    })

    context('when the sender has permissions', () => {
      const from = owner

      it('changes the settings', async () => {
        await delay.changeCollateralRequirements({ ...newCollateralRequirements, from })

        const currentCollateralRequirements = await delay.getCollateralRequirements()
        await assertCurrentCollateralRequirements(currentCollateralRequirements, newCollateralRequirements)
      })

      it('emits an event', async () => {
        const receipt = await delay.changeCollateralRequirements({ ...newCollateralRequirements, from })

        assertAmountOfEvents(receipt, DELAY_EVENTS.COLLATERAL_CHANGED, 1)

        const { collateralToken, actionCollateral, challengeCollateral, challengeDuration } = newCollateralRequirements
        assertEvent(receipt, DELAY_EVENTS.COLLATERAL_CHANGED, { token: collateralToken, actionAmount: actionCollateral, challengeAmount: challengeCollateral, challengeDuration })
      })
    })

    context('when the sender does not have permissions', () => {
      const from = someone

      it('reverts', async () => {
        await assertRevert(delay.changeCollateralRequirements({ ...newCollateralRequirements, from }), DELAY_ERRORS.ERROR_AUTH_FAILED)
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
