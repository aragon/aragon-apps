const ERRORS = require('./helpers/utils/errors')
const EVENTS = require('./helpers/utils/events')
const { assertBn } = require('./helpers/assert/assertBn')
const { assertRevert } = require('./helpers/assert/assertThrow')
const { assertAmountOfEvents, assertEvent } = require('./helpers/assert/assertEvent')

const deployer = require('./helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, signer, someone]) => {
  let agreement

  beforeEach('deploy agreement instance', async () => {
    agreement = await deployer.deployAndInitializeWrapper({ signers: [signer] })
  })

  describe('sign', () => {
    context('when the sender has permissions to sign', () => {
      const from = signer

      const itSignsTheAgreementProperly = () => {
        it('signs the agreement', async () => {
          const currentSettingId = await agreement.getCurrentSettingId()

          await agreement.sign(from)

          const { lastSettingIdSigned, mustSign } = await agreement.getSigner(from)
          assert.isFalse(mustSign, 'signer must sign')
          assertBn(lastSettingIdSigned, currentSettingId, 'signer last setting signed does not match')
        })

        it('emits an event', async () => {
          const currentSettingId = await agreement.getCurrentSettingId()

          const receipt = await agreement.sign(from)

          assertAmountOfEvents(receipt, EVENTS.SIGNED, 1)
          assertEvent(receipt, EVENTS.SIGNED, { signer: from, settingId: currentSettingId })
        })
      }

      context('when the sender did not signed the agreement', () => {
        itSignsTheAgreementProperly()
      })

      context('when the sender has already signed the agreement', () => {
        beforeEach('sign agreement', async () => {
          await agreement.sign(from)
        })

        context('when the agreement has not changed', () => {
          it('can not sign the agreement again', async () => {
            await assertRevert(agreement.sign(from), ERRORS.ERROR_SIGNER_ALREADY_SIGNED)
          })
        })

        context('when the agreement has changed', () => {
          beforeEach('change agreement', async () => {
            await agreement.changeSetting({ content: '0xabcd' })
          })

          itSignsTheAgreementProperly()
        })
      })
    })

    context('when the sender does not have permissions to sign', () => {
      const from = someone

      it('can not sign the agreement again', async () => {
        await assertRevert(agreement.sign(from), ERRORS.ERROR_AUTH_FAILED)
      })
    })
  })
})
