const { bn } = require('../helpers/lib/numbers')
const { assertBn } = require('../helpers/assert/assertBn')
const { assertRevert } = require('../helpers/assert/assertThrow')
const { assertEvent, assertAmountOfEvents } = require('../helpers/assert/assertEvent')
const { AGREEMENT_EVENTS } = require('../helpers/utils/events')
const { AGREEMENT_ERRORS, ARAGON_OS_ERRORS } = require('../helpers/utils/errors')

const deployer = require('../helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, someone, owner]) => {
  let disputable

  beforeEach('deploy disputable app', async () => {
    disputable = await deployer.deployAndInitializeWrapperWithDisputable({ owner, activate: false })
  })

  describe('activate', () => {
    context('when the sender has permissions', () => {
      const from = owner

      context('when the disputable was unregistered', () => {
        it('registers the disputable app', async () => {
          const receipt = await disputable.activate({ from })

          assertAmountOfEvents(receipt, AGREEMENT_EVENTS.DISPUTABLE_ACTIVATED)
          assertEvent(receipt, AGREEMENT_EVENTS.DISPUTABLE_ACTIVATED, { disputable: disputable.disputable.address })

          const { activated, currentCollateralRequirementId } = await disputable.getDisputableInfo()
          assert.isTrue(activated, 'disputable state does not match')
          assertBn(currentCollateralRequirementId, 0, 'disputable current collateral requirement ID does not match')
        })

        it('sets up the initial collateral requirements for the disputable', async () => {
          const receipt = await disputable.activate({ from })

          assertAmountOfEvents(receipt, AGREEMENT_EVENTS.COLLATERAL_REQUIREMENT_CHANGED)
          assertEvent(receipt, AGREEMENT_EVENTS.COLLATERAL_REQUIREMENT_CHANGED, { disputable: disputable.disputable.address, collateralRequirementId: 0 })

          const { collateralToken, actionCollateral, challengeCollateral, challengeDuration } = await disputable.getCollateralRequirement(0)
          assert.equal(collateralToken.address, disputable.collateralToken.address, 'collateral token does not match')
          assertBn(actionCollateral, disputable.actionCollateral, 'action collateral does not match')
          assertBn(challengeCollateral, disputable.challengeCollateral, 'challenge collateral does not match')
          assertBn(challengeDuration, disputable.challengeDuration, 'challenge duration does not match')
        })
      })

      context('when the disputable was activated', () => {
        beforeEach('activate disputable', async () => {
          await disputable.activate({ from })
        })

        context('when the disputable is activated', () => {
          it('reverts', async () => {
            await assertRevert(disputable.activate({ from }), AGREEMENT_ERRORS.ERROR_DISPUTABLE_APP_ALREADY_EXISTS)
          })
        })

        context('when the disputable is unregistered', () => {
          beforeEach('deactivate disputable', async () => {
            await disputable.deactivate({ from })
          })

          it('re-registers the disputable app', async () => {
            const receipt = await disputable.activate({ from })

            assertAmountOfEvents(receipt, AGREEMENT_EVENTS.DISPUTABLE_ACTIVATED)
            assertEvent(receipt, AGREEMENT_EVENTS.DISPUTABLE_ACTIVATED, { disputable: disputable.disputable.address })

            const { activated, currentCollateralRequirementId } = await disputable.getDisputableInfo()
            assert.isTrue(activated, 'disputable state does not match')
            assertBn(currentCollateralRequirementId, 1, 'disputable current collateral requirement ID does not match')
          })

          it('sets up another collateral requirement for the disputable', async () => {
            const currentCollateralId = await disputable.getCurrentCollateralRequirementId()
            const receipt = await disputable.activate({ from })

            const expectedNewCollateralId = currentCollateralId.add(bn(1))
            assertAmountOfEvents(receipt, AGREEMENT_EVENTS.COLLATERAL_REQUIREMENT_CHANGED)
            assertEvent(receipt, AGREEMENT_EVENTS.COLLATERAL_REQUIREMENT_CHANGED, { disputable: disputable.disputable.address, collateralRequirementId: expectedNewCollateralId })

            const { collateralToken, actionCollateral, challengeCollateral, challengeDuration } = await disputable.getCollateralRequirement(expectedNewCollateralId)
            assert.equal(collateralToken.address, disputable.collateralToken.address, 'collateral token does not match')
            assertBn(actionCollateral, disputable.actionCollateral, 'action collateral does not match')
            assertBn(challengeCollateral, disputable.challengeCollateral, 'challenge collateral does not match')
            assertBn(challengeDuration, disputable.challengeDuration, 'challenge duration does not match')
          })
        })
      })
    })

    context('when the sender does not have permissions', () => {
      const from = someone

      it('reverts', async () => {
        await assertRevert(disputable.activate({ from }), ARAGON_OS_ERRORS.ERROR_AUTH_FAILED)
      })
    })
  })

  describe('deactivate', () => {
    context('when the sender has permissions', () => {
      const from = owner

      context('when the disputable was activated', () => {
        beforeEach('activate disputable', async () => {
          await disputable.activate({ from })
        })

        const itUnregistersTheDisputableApp = () => {
          it('unregisters the disputable app', async () => {
            const receipt = await disputable.deactivate({ from })

            assertAmountOfEvents(receipt, AGREEMENT_EVENTS.DISPUTABLE_DEACTIVATED)
            assertEvent(receipt, AGREEMENT_EVENTS.DISPUTABLE_DEACTIVATED, { disputable: disputable.disputable.address })

            const { activated, currentCollateralRequirementId } = await disputable.getDisputableInfo()
            assert.isFalse(activated, 'disputable state does not match')
            assertBn(currentCollateralRequirementId, 0, 'disputable current collateral requirement ID does not match')
          })
        }

        context('when there were no actions ongoing', () => {
          itUnregistersTheDisputableApp()
        })

        context('when there were some actions ongoing', () => {
          beforeEach('submit action', async () => {
            await disputable.newAction({})
          })

          itUnregistersTheDisputableApp()
        })
      })

      context('when the disputable was not activated', () => {
        it('reverts', async () => {
          await assertRevert(disputable.deactivate({ from }), AGREEMENT_ERRORS.ERROR_DISPUTABLE_APP_NOT_ACTIVE)
        })
      })
    })

    context('when the sender does not have permissions', () => {
      const from = someone

      it('reverts', async () => {
        await assertRevert(disputable.deactivate({ from }), ARAGON_OS_ERRORS.ERROR_AUTH_FAILED)
      })
    })
  })
})
