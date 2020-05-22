const { bn } = require('../helpers/lib/numbers')
const { assertBn } = require('../helpers/assert/assertBn')
const { assertRevert } = require('../helpers/assert/assertThrow')
const { assertEvent, assertAmountOfEvents } = require('../helpers/assert/assertEvent')
const { DISPUTABLE_STATE } = require('../helpers/utils/enums')
const { AGREEMENT_EVENTS } = require('../helpers/utils/events')
const { AGREEMENT_ERRORS, ARAGON_OS_ERRORS } = require('../helpers/utils/errors')

const deployer = require('../helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, someone, owner]) => {
  let agreement

  beforeEach('deploy disputable app', async () => {
    agreement = await deployer.deployAndInitializeWrapperWithDisputable({ owner, register: false })
  })

  describe('register', () => {
    context('when the sender has permissions', () => {
      const from = owner

      context('when the disputable was unregistered', () => {
        it('registers the disputable app', async () => {
          const receipt = await agreement.register({ from })

          assertAmountOfEvents(receipt, AGREEMENT_EVENTS.DISPUTABLE_REGISTERED)
          assertEvent(receipt, AGREEMENT_EVENTS.DISPUTABLE_REGISTERED, { disputable: agreement.disputable.address })

          const { state, ongoingActions, currentCollateralRequirementId } = await agreement.getDisputableInfo()
          assertBn(state, DISPUTABLE_STATE.REGISTERED, 'disputable state does not match')
          assertBn(ongoingActions, 0, 'disputable ongoing actions does not match')
          assertBn(currentCollateralRequirementId, 0, 'disputable current collateral requirement ID does not match')
        })

        it('sets up the initial collateral requirements for the disputable', async () => {
          const receipt = await agreement.register({ from })

          assertAmountOfEvents(receipt, AGREEMENT_EVENTS.COLLATERAL_REQUIREMENT_CHANGED)
          assertEvent(receipt, AGREEMENT_EVENTS.COLLATERAL_REQUIREMENT_CHANGED, { disputable: agreement.disputable.address, id: 0 })

          const { collateralToken, actionCollateral, challengeCollateral, challengeDuration } = await agreement.getCollateralRequirement(0)
          assert.equal(collateralToken.address, agreement.collateralToken.address, 'collateral token does not match')
          assertBn(actionCollateral, agreement.actionCollateral, 'action collateral does not match')
          assertBn(challengeCollateral, agreement.challengeCollateral, 'challenge collateral does not match')
          assertBn(challengeDuration, agreement.challengeDuration, 'challenge duration does not match')
        })
      })

      context('when the disputable was registered', () => {
        beforeEach('register disputable', async () => {
          await agreement.register({ from })
        })

        it('reverts', async () => {
          await assertRevert(agreement.register({ from }), AGREEMENT_ERRORS.ERROR_DISPUTABLE_APP_ALREADY_EXISTS)
        })
      })

      context('when the disputable was unregistering', () => {
        beforeEach('register and unregister disputable', async () => {
          await agreement.register({ from })
          await agreement.newAction({})
          await agreement.unregister({ from })
        })

        it('re-registers the disputable app', async () => {
          const receipt = await agreement.register({ from })

          assertAmountOfEvents(receipt, AGREEMENT_EVENTS.DISPUTABLE_REGISTERED)
          assertEvent(receipt, AGREEMENT_EVENTS.DISPUTABLE_REGISTERED, { disputable: agreement.disputable.address })

          const { state, ongoingActions, currentCollateralRequirementId } = await agreement.getDisputableInfo()
          assertBn(state, DISPUTABLE_STATE.REGISTERED, 'disputable state does not match')
          assertBn(ongoingActions, 1, 'disputable ongoing actions does not match')
          assertBn(currentCollateralRequirementId, 1, 'disputable current collateral requirement ID does not match')
        })

        it('sets up another collateral requirement for the disputable', async () => {
          const currentCollateralId = await agreement.getCurrentCollateralRequirementId()
          const receipt = await agreement.register({ from })

          const expectedNewCollateralId = currentCollateralId.add(bn(1))
          assertAmountOfEvents(receipt, AGREEMENT_EVENTS.COLLATERAL_REQUIREMENT_CHANGED)
          assertEvent(receipt, AGREEMENT_EVENTS.COLLATERAL_REQUIREMENT_CHANGED, { disputable: agreement.disputable.address, id: expectedNewCollateralId })

          const { collateralToken, actionCollateral, challengeCollateral, challengeDuration } = await agreement.getCollateralRequirement(expectedNewCollateralId)
          assert.equal(collateralToken.address, agreement.collateralToken.address, 'collateral token does not match')
          assertBn(actionCollateral, agreement.actionCollateral, 'action collateral does not match')
          assertBn(challengeCollateral, agreement.challengeCollateral, 'challenge collateral does not match')
          assertBn(challengeDuration, agreement.challengeDuration, 'challenge duration does not match')
        })
      })
    })

    context('when the sender does not have permissions', () => {
      const from = someone

      it('reverts', async () => {
        await assertRevert(agreement.register({ from }), ARAGON_OS_ERRORS.ERROR_AUTH_FAILED)
      })
    })
  })

  describe('unregister', () => {
    context('when the sender has permissions', () => {
      const from = owner

      context('when the disputable was registered', () => {
        beforeEach('register disputable', async () => {
          await agreement.register({ from })
        })

        context('when the disputable was not unregistering', () => {
          context('when there were no actions ongoing', () => {
            it('unregisters the disputable app', async () => {
              const receipt = await agreement.unregister({ from })

              assertAmountOfEvents(receipt, AGREEMENT_EVENTS.DISPUTABLE_UNREGISTERING)
              assertEvent(receipt, AGREEMENT_EVENTS.DISPUTABLE_UNREGISTERING, { disputable: agreement.disputable.address })

              assertAmountOfEvents(receipt, AGREEMENT_EVENTS.DISPUTABLE_UNREGISTERED)
              assertEvent(receipt, AGREEMENT_EVENTS.DISPUTABLE_UNREGISTERING, { disputable: agreement.disputable.address })

              const { state, ongoingActions, currentCollateralRequirementId } = await agreement.getDisputableInfo()
              assertBn(state, DISPUTABLE_STATE.UNREGISTERED, 'disputable state does not match')
              assertBn(ongoingActions, 0, 'disputable ongoing actions does not match')
              assertBn(currentCollateralRequirementId, 0, 'disputable current collateral requirement ID does not match')
            })
          })

          context('when there were some actions ongoing', () => {
            beforeEach('submit action', async () => {
              await agreement.newAction({})
            })

            it('starts the unregistering process for the disputable app', async () => {
              const receipt = await agreement.unregister({ from })

              assertAmountOfEvents(receipt, AGREEMENT_EVENTS.DISPUTABLE_UNREGISTERING)
              assertEvent(receipt, AGREEMENT_EVENTS.DISPUTABLE_UNREGISTERING, { disputable: agreement.disputable.address })

              assertAmountOfEvents(receipt, AGREEMENT_EVENTS.DISPUTABLE_UNREGISTERED, 0)

              const { state, ongoingActions, currentCollateralRequirementId } = await agreement.getDisputableInfo()
              assertBn(state, DISPUTABLE_STATE.UNREGISTERING, 'disputable state does not match')
              assertBn(ongoingActions, 1, 'disputable ongoing actions does not match')
              assertBn(currentCollateralRequirementId, 0, 'disputable current collateral requirement ID does not match')
            })
          })
        })

        context('when the disputable was already unregistering', () => {
          beforeEach('submit action and unregister app', async () => {
            await agreement.newAction({})
            await agreement.unregister({ from })
          })

          it('reverts', async () => {
            await assertRevert(agreement.unregister({ from }), AGREEMENT_ERRORS.ERROR_DISPUTABLE_APP_NOT_REGISTERED)
          })
        })
      })

      context('when the disputable was not registered', () => {
        it('reverts', async () => {
          await assertRevert(agreement.unregister({ from }), AGREEMENT_ERRORS.ERROR_DISPUTABLE_APP_NOT_REGISTERED)
        })
      })
    })

    context('when the sender does not have permissions', () => {
      const from = someone

      it('reverts', async () => {
        await assertRevert(agreement.unregister({ from }), ARAGON_OS_ERRORS.ERROR_AUTH_FAILED)
      })
    })
  })
})
