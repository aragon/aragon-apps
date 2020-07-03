const { bigExp } = require('../helpers/lib/numbers')
const { assertBn } = require('../helpers/assert/assertBn')
const { assertRevert } = require('../helpers/assert/assertThrow')
const { assertAmountOfEvents, assertEvent } = require('../helpers/assert/assertEvent')
const { AGREEMENT_ERRORS } = require('../helpers/utils/errors')
const { AGREEMENT_EVENTS } = require('../helpers/utils/events')

const deployer = require('../helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, signer]) => {
  let agreement

  const ANY_ADDR = '0xffffffffffffffffffffffffffffffffffffffff'

  beforeEach('deploy agreement instance', async () => {
    agreement = await deployer.deployAndInitializeWrapper()
  })

  describe('sign', () => {
    const from = signer

    const itSignsTheAgreementProperly = () => {
      it('must sign the agreement', async () => {
        const { mustSign } = await agreement.getSigner(from)

        assert.isTrue(mustSign, 'signer must not sign')
      })

      it('is not allowed through ACL oracle', async () => {
        assert.isFalse(await agreement.canPerform(ANY_ADDR, ANY_ADDR, ANY_ADDR, '0x', [from]), 'signer can perform through ACL')
      })

      it('can sign the agreement', async () => {
        const currentSettingId = await agreement.getCurrentSettingId()

        await agreement.sign(from)

        const { lastSettingIdSigned, mustSign } = await agreement.getSigner(from)
        assert.isFalse(mustSign, 'signer must sign')
        assertBn(lastSettingIdSigned, currentSettingId, 'last setting signed does not match')
      })

      it('is allowed through ACL oracle after signing the agreement', async () => {
        await agreement.sign(from)

        assert.isTrue(await agreement.canPerform(ANY_ADDR, ANY_ADDR, ANY_ADDR, '0x', [from]), 'signer cannot perform through ACL')
      })

      it('emits an event', async () => {
        const currentSettingId = await agreement.getCurrentSettingId()

        const receipt = await agreement.sign(from)

        assertAmountOfEvents(receipt, AGREEMENT_EVENTS.SIGNED, 1)
        assertEvent(receipt, AGREEMENT_EVENTS.SIGNED, { signer: from, settingId: currentSettingId })
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
          await assertRevert(agreement.sign(from), AGREEMENT_ERRORS.ERROR_SIGNER_ALREADY_SIGNED)
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

  describe('canPerform', () => {
    it('reverts when the signer is missing', async () => {
      await assertRevert(agreement.canPerform(ANY_ADDR, ANY_ADDR, ANY_ADDR, '0x', []), AGREEMENT_ERRORS.ERROR_ACL_SIGNER_MISSING)
    })

    it('reverts when an invalid signer is given', async () => {
      await assertRevert(agreement.canPerform(ANY_ADDR, ANY_ADDR, ANY_ADDR, '0x', [bigExp(2, 161)]), AGREEMENT_ERRORS.ERROR_ACL_SIGNER_NOT_ADDRESS)
    })
  })
})
