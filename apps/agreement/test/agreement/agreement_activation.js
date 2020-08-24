const deployer = require('../helpers/utils/deployer')(web3, artifacts)
const { AGREEMENT_EVENTS } = require('../helpers/utils/events')
const { AGREEMENT_ERRORS, ARAGON_OS_ERRORS } = require('../helpers/utils/errors')

const { ZERO_ADDRESS, bn, injectWeb3, injectArtifacts } = require('@aragon/contract-helpers-test')
const { assertBn, assertRevert, assertEvent, assertAmountOfEvents } = require('@aragon/contract-helpers-test/src/asserts')

injectWeb3(web3)
injectArtifacts(artifacts)

contract('Agreement', ([_, someone, owner]) => {
  let disputable

  beforeEach('deploy disputable instance', async () => {
    disputable = await deployer.deployAndInitializeDisputableWrapper({ owner, activate: false })
  })

  describe('activate', () => {
    context('when the sender has permissions', () => {
      const from = owner

      context('when the disputable was inactive', () => {
        it('activates the disputable app', async () => {
          const receipt = await disputable.activate({ from })

          assertAmountOfEvents(receipt, AGREEMENT_EVENTS.DISPUTABLE_ACTIVATED)
          assertEvent(receipt, AGREEMENT_EVENTS.DISPUTABLE_ACTIVATED, { expectedArgs: { disputable: disputable.disputable.address } })

          const { activated, currentCollateralRequirementId } = await disputable.getDisputableInfo()
          assert.isTrue(activated, 'disputable state does not match')
          assertBn(currentCollateralRequirementId, 1, 'disputable current collateral requirement ID does not match')
        })

        it('sets up the initial collateral requirements for the disputable', async () => {
          const receipt = await disputable.activate({ from })

          assertAmountOfEvents(receipt, AGREEMENT_EVENTS.COLLATERAL_REQUIREMENT_CHANGED)
          assertEvent(receipt, AGREEMENT_EVENTS.COLLATERAL_REQUIREMENT_CHANGED, { expectedArgs: { disputable: disputable.disputable.address, collateralRequirementId: 1 } })

          await assertRevert(disputable.getCollateralRequirement(0), AGREEMENT_ERRORS.ERROR_COLLATERAL_REQUIREMENT_DOES_NOT_EXIST)

          const { collateralToken, actionCollateral, challengeCollateral, challengeDuration } = await disputable.getCollateralRequirement(1)
          assert.equal(collateralToken.address, disputable.collateralToken.address, 'collateral token does not match')
          assertBn(actionCollateral, disputable.actionCollateral, 'action collateral does not match')
          assertBn(challengeCollateral, disputable.challengeCollateral, 'challenge collateral does not match')
          assertBn(challengeDuration, disputable.challengeDuration, 'challenge duration does not match')
        })

        it('reverts if the disputable is not a contract', async () => {
          const { collateralToken, actionCollateral, challengeCollateral, challengeDuration } = disputable
          await assertRevert(disputable.agreement.activate(ZERO_ADDRESS, collateralToken.address, challengeDuration, actionCollateral, challengeCollateral, { from }), AGREEMENT_ERRORS.ERROR_DISPUTABLE_NOT_CONTRACT)
        })
      })

      context('when the disputable was activated', () => {
        beforeEach('activate disputable', async () => {
          await disputable.activate({ from })
        })

        context('when the disputable is activated', () => {
          it('reverts', async () => {
            await assertRevert(disputable.activate({ from }), AGREEMENT_ERRORS.ERROR_DISPUTABLE_ALREADY_ACTIVE)
          })
        })

        context('when the disputable is deactivated', () => {
          beforeEach('deactivate disputable', async () => {
            await disputable.deactivate({ from })
          })

          it('re-activates the disputable app', async () => {
            const receipt = await disputable.activate({ from })

            assertAmountOfEvents(receipt, AGREEMENT_EVENTS.DISPUTABLE_ACTIVATED)
            assertEvent(receipt, AGREEMENT_EVENTS.DISPUTABLE_ACTIVATED, { expectedArgs: { disputable: disputable.disputable.address } })

            const { activated, currentCollateralRequirementId } = await disputable.getDisputableInfo()
            assert.isTrue(activated, 'disputable state does not match')
            assertBn(currentCollateralRequirementId, 2, 'disputable current collateral requirement ID does not match')
          })

          it('sets up another collateral requirement for the disputable', async () => {
            const currentCollateralId = await disputable.getCurrentCollateralRequirementId()
            const receipt = await disputable.activate({ from })

            const expectedNewCollateralId = currentCollateralId.add(bn(1))
            assertAmountOfEvents(receipt, AGREEMENT_EVENTS.COLLATERAL_REQUIREMENT_CHANGED)
            assertEvent(receipt, AGREEMENT_EVENTS.COLLATERAL_REQUIREMENT_CHANGED, { expectedArgs: { disputable: disputable.disputable.address, collateralRequirementId: expectedNewCollateralId } })

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

        const itDeactivatesTheDisputableApp = () => {
          it('deactivates the disputable app', async () => {
            const receipt = await disputable.deactivate({ from })

            assertAmountOfEvents(receipt, AGREEMENT_EVENTS.DISPUTABLE_DEACTIVATED)
            assertEvent(receipt, AGREEMENT_EVENTS.DISPUTABLE_DEACTIVATED, { expectedArgs: { disputable: disputable.disputable.address } })

            const { activated, currentCollateralRequirementId } = await disputable.getDisputableInfo()
            assert.isFalse(activated, 'disputable state does not match')
            assertBn(currentCollateralRequirementId, 1, 'disputable current collateral requirement ID does not match')
          })
        }

        context('when there were no actions ongoing', () => {
          itDeactivatesTheDisputableApp()
        })

        context('when there were some actions ongoing', () => {
          beforeEach('submit action', async () => {
            await disputable.newAction({})
          })

          itDeactivatesTheDisputableApp()
        })
      })

      context('when the disputable was not activated', () => {
        it('reverts', async () => {
          await assertRevert(disputable.deactivate({ from }), AGREEMENT_ERRORS.ERROR_DISPUTABLE_NOT_ACTIVE)
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
