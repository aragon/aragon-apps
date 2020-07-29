const deployer = require('../helpers/utils/deployer')(web3, artifacts)
const { AGREEMENT_EVENTS } = require('../helpers/utils/events')
const { ARAGON_OS_ERRORS } = require('../helpers/utils/errors')

const { ONE_DAY, bigExp, bn } = require('@aragon/contract-helpers-test')
const { assertAmountOfEvents, assertEvent, assertBn, assertRevert } = require('@aragon/contract-helpers-test/src/asserts')

contract('Agreement', ([_, owner, someone]) => {
  let disputable

  let initialCollateralRequirement = {
    actionCollateral: bigExp(200, 18),
    challengeCollateral: bigExp(100, 18),
    challengeDuration: bn(3 * ONE_DAY),
  }

  beforeEach('deploy agreement', async () => {
    disputable = await deployer.deployAndInitializeDisputableWrapper({ owner, ...initialCollateralRequirement })
    initialCollateralRequirement.collateralToken = deployer.collateralToken
  })

  describe('changeCollateralRequirement', () => {
    let newCollateralRequirement = {
      challengeDuration: bn(10 * ONE_DAY),
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
      const currentCollateralRequirement = await disputable.getCollateralRequirement()
      await assertCurrentCollateralRequirement(currentCollateralRequirement, initialCollateralRequirement)
    })

    context('when the sender has permissions', () => {
      const from = owner

      it('changes the collateral requirements', async () => {
        await disputable.changeCollateralRequirement({ ...newCollateralRequirement, from })

        const currentCollateralRequirement = await disputable.getCollateralRequirement()
        await assertCurrentCollateralRequirement(currentCollateralRequirement, newCollateralRequirement)
      })

      it('keeps the previous collateral requirements', async () => {
        const currentId = await disputable.getCurrentCollateralRequirementId()
        await disputable.changeCollateralRequirement({ ...newCollateralRequirement, from })

        const previousCollateralRequirement = await disputable.getCollateralRequirement(currentId)
        await assertCurrentCollateralRequirement(previousCollateralRequirement, initialCollateralRequirement)
      })

      it('emits an event', async () => {
        const currentId = await disputable.getCurrentCollateralRequirementId()
        const receipt = await disputable.changeCollateralRequirement({ ...newCollateralRequirement, from })

        assertAmountOfEvents(receipt, AGREEMENT_EVENTS.COLLATERAL_REQUIREMENT_CHANGED)
        assertEvent(receipt, AGREEMENT_EVENTS.COLLATERAL_REQUIREMENT_CHANGED, { expectedArgs: { collateralRequirementId: currentId.add(bn(1)), disputable: disputable.disputable.address } })
      })
    })

    context('when the sender does not have permissions', () => {
      const from = someone

      it('reverts', async () => {
        await assertRevert(disputable.changeCollateralRequirement({ ...newCollateralRequirement, from }), ARAGON_OS_ERRORS.ERROR_AUTH_FAILED)
      })
    })
  })
})
