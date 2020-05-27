const { assertRevert } = require('../helpers/assert/assertThrow')
const { assertAmountOfEvents, assertEvent } = require('../helpers/assert/assertEvent')
const { DISPUTABLE_EVENTS } = require('../helpers/utils/events')
const { DISPUTABLE_ERRORS, ARAGON_OS_ERRORS } = require('../helpers/utils/errors')

const deployer = require('../helpers/utils/deployer')(web3, artifacts)

contract('DisputableApp', ([_, owner, someone]) => {
  let disputable

  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

  beforeEach('deploy disputable instance', async () => {
    disputable = await deployer.deployAndInitializeWrapperWithDisputable({ owner, register: false })

    const SET_AGREEMENT_ROLE = await disputable.disputable.SET_AGREEMENT_ROLE()
    await deployer.acl.grantPermission(owner, disputable.disputable.address, SET_AGREEMENT_ROLE, { from: owner })
  })

  describe('setAgreement', () => {
    context('when the sender has permissions', () => {
      const from = owner

      context('when the agreement was unset', () => {
        context('when trying to set a new the agreement', () => {
          it('sets the agreement', async () => {
            await disputable.setAgreement({ from })

            const currentAgreement = await disputable.disputable.getAgreement()
            assert.equal(currentAgreement, disputable.agreement.address, 'disputable agreement does not match')
          })

          it('emits an event', async () => {
            const receipt = await disputable.setAgreement({ from })

            assertAmountOfEvents(receipt, DISPUTABLE_EVENTS.AGREEMENT_SET)
            assertEvent(receipt, DISPUTABLE_EVENTS.AGREEMENT_SET, { agreement: disputable.agreement.address })
          })
        })

        context('when trying to unset the agreement', () => {
          const agreement = ZERO_ADDRESS

          it('reverts', async () => {
            await assertRevert(disputable.setAgreement({ agreement, from }), DISPUTABLE_ERRORS.ERROR_AGREEMENT_ALREADY_SET)
          })
        })
      })

      context('when the agreement was already set', () => {
        beforeEach('set agreement', async () => {
          await disputable.setAgreement({ from })
        })

        context('when trying to set a new the agreement', () => {
          it('reverts', async () => {
            await assertRevert(disputable.setAgreement({ from }), DISPUTABLE_ERRORS.ERROR_AGREEMENT_ALREADY_SET)
          })
        })

        context('when trying to unset the agreement', () => {
          const agreement = ZERO_ADDRESS

          it('unsets the agreement', async () => {
            await disputable.setAgreement({ agreement, from })

            const currentAgreement = await disputable.disputable.getAgreement()
            assert.equal(currentAgreement, agreement, 'disputable agreement does not match')
          })

          it('emits an event', async () => {
            const receipt = await disputable.setAgreement({ agreement, from })

            assertAmountOfEvents(receipt, DISPUTABLE_EVENTS.AGREEMENT_SET)
            assertEvent(receipt, DISPUTABLE_EVENTS.AGREEMENT_SET, { agreement })
          })
        })
      })
    })

    context('when the sender does not have permissions', () => {
      const from = someone

      it('reverts', async () => {
        await assertRevert(disputable.setAgreement({ from }), ARAGON_OS_ERRORS.ERROR_AUTH_FAILED)
      })
    })
  })

  describe('onDisputableChallenged', () => {
    const disputableId = 0, challenger = owner

    context('when the agreement was already set', () => {
      const agreement = someone

      beforeEach('set agreement', async () => {
        await disputable.setAgreement({ agreement, from: owner })
      })

      context('when the sender is the agreement', () => {
        const from = agreement

        it('does not fails', async () => {
          const receipt = await disputable.disputable.onDisputableChallenged(disputableId, challenger, { from })

          assertAmountOfEvents(receipt, DISPUTABLE_EVENTS.CHALLENGED)
        })
      })

      context('when the sender is not the agreement', () => {
        const from = owner

        it('reverts', async () => {
          await assertRevert(disputable.disputable.onDisputableChallenged(disputableId, challenger, { from }), DISPUTABLE_ERRORS.ERROR_SENDER_NOT_AGREEMENT)
        })
      })
    })

    context('when the agreement was not set', () => {
      it('reverts', async () => {
        await assertRevert(disputable.disputable.onDisputableChallenged(disputableId, challenger, { from: someone }), DISPUTABLE_ERRORS.ERROR_SENDER_NOT_AGREEMENT)
      })
    })
  })

  describe('onDisputableAllowed', () => {
    const disputableId = 0

    context('when the agreement was already set', () => {
      const agreement = someone

      beforeEach('set agreement', async () => {
        await disputable.setAgreement({ agreement, from: owner })
      })

      context('when the sender is the agreement', () => {
        const from = agreement

        it('does not fails', async () => {
          const receipt = await disputable.disputable.onDisputableAllowed(disputableId, { from })

          assertAmountOfEvents(receipt, DISPUTABLE_EVENTS.ALLOWED)
        })
      })

      context('when the sender is not the agreement', () => {
        const from = owner

        it('reverts', async () => {
          await assertRevert(disputable.disputable.onDisputableAllowed(disputableId, { from }), DISPUTABLE_ERRORS.ERROR_SENDER_NOT_AGREEMENT)
        })
      })
    })

    context('when the agreement was not set', () => {
      it('reverts', async () => {
        await assertRevert(disputable.disputable.onDisputableAllowed(disputableId, { from: someone }), DISPUTABLE_ERRORS.ERROR_SENDER_NOT_AGREEMENT)
      })
    })
  })

  describe('onDisputableRejected', () => {
    const disputableId = 0

    context('when the agreement was already set', () => {
      const agreement = someone

      beforeEach('set agreement', async () => {
        await disputable.setAgreement({ agreement, from: owner })
      })

      context('when the sender is the agreement', () => {
        const from = agreement

        it('does not fails', async () => {
          const receipt = await disputable.disputable.onDisputableRejected(disputableId, { from })

          assertAmountOfEvents(receipt, DISPUTABLE_EVENTS.REJECTED)
        })
      })

      context('when the sender is not the agreement', () => {
        const from = owner

        it('reverts', async () => {
          await assertRevert(disputable.disputable.onDisputableRejected(disputableId, { from }), DISPUTABLE_ERRORS.ERROR_SENDER_NOT_AGREEMENT)
        })
      })
    })

    context('when the agreement was not set', () => {
      it('reverts', async () => {
        await assertRevert(disputable.disputable.onDisputableRejected(disputableId, { from: someone }), DISPUTABLE_ERRORS.ERROR_SENDER_NOT_AGREEMENT)
      })
    })
  })

  describe('onDisputableVoided', () => {
    const disputableId = 0

    context('when the agreement was already set', () => {
      const agreement = someone

      beforeEach('set agreement', async () => {
        await disputable.setAgreement({ agreement, from: owner })
      })

      context('when the sender is the agreement', () => {
        const from = agreement

        it('does not fails', async () => {
          const receipt = await disputable.disputable.onDisputableVoided(disputableId, { from })

          assertAmountOfEvents(receipt, DISPUTABLE_EVENTS.VOIDED)
        })
      })

      context('when the sender is not the agreement', () => {
        const from = owner

        it('reverts', async () => {
          await assertRevert(disputable.disputable.onDisputableVoided(disputableId, { from }), DISPUTABLE_ERRORS.ERROR_SENDER_NOT_AGREEMENT)
        })
      })
    })

    context('when the agreement was not set', () => {
      it('reverts', async () => {
        await assertRevert(disputable.disputable.onDisputableVoided(disputableId, { from: someone }), DISPUTABLE_ERRORS.ERROR_SENDER_NOT_AGREEMENT)
      })
    })
  })
})
