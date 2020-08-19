const deployer = require('../helpers/utils/deployer')(web3, artifacts)
const { AGREEMENT_ERRORS } = require('../helpers/utils/errors')
const { AGREEMENT_EVENTS } = require('../helpers/utils/events')

const { ANY_ENTITY } = require('@aragon/contract-helpers-test/src/aragon-os')
const { bn, injectWeb3, injectArtifacts } = require('@aragon/contract-helpers-test')
const { assertBn, assertRevert, assertAmountOfEvents, assertEvent } = require('@aragon/contract-helpers-test/src/asserts')

injectWeb3(web3)
injectArtifacts(artifacts)

contract('Agreement', ([_, signer]) => {
  let agreement

  beforeEach('deploy agreement instance', async () => {
    agreement = await deployer.deployAndInitializeAgreementWrapper()
  })

  describe('sign', () => {
    const from = signer

    const itSignsTheAgreementProperly = () => {
      it('must sign the agreement', async () => {
        const { mustSign } = await agreement.getSigner(from)

        assert.isTrue(mustSign, 'signer must not sign')
      })

      it('is not allowed through ACL oracle', async () => {
        assert.isFalse(await agreement.canPerform(ANY_ENTITY, ANY_ENTITY, '0x', [from]), 'signer can perform through ACL')
      })

      it('can sign the agreement', async () => {
        const currentSettingId = await agreement.getCurrentSettingId()

        await agreement.sign({ settingId: currentSettingId, from })

        const { lastSettingIdSigned, mustSign } = await agreement.getSigner(from)
        assert.isFalse(mustSign, 'signer must sign')
        assertBn(lastSettingIdSigned, currentSettingId, 'last setting signed does not match')
      })

      it('does not allow signing the same or future versions', async () => {
        const currentSettingId = await agreement.getCurrentSettingId()

        await assertRevert(agreement.sign({ settingId: currentSettingId.sub(bn(1)), from }), AGREEMENT_ERRORS.ERROR_SIGNER_ALREADY_SIGNED)
        await assertRevert(agreement.sign({ settingId: currentSettingId.add(bn(1)), from }), AGREEMENT_ERRORS.ERROR_INVALID_SIGNING_SETTING)
      })

      it('is allowed through ACL oracle after signing the agreement', async () => {
        await agreement.sign({ from })

        assert.isTrue(await agreement.canPerform(ANY_ENTITY, ANY_ENTITY, '0x', [from]), 'signer cannot perform through ACL')
      })

      it('emits an event', async () => {
        const currentSettingId = await agreement.getCurrentSettingId()

        const receipt = await agreement.sign({ settingId: currentSettingId, from })

        assertAmountOfEvents(receipt, AGREEMENT_EVENTS.SIGNED)
        assertEvent(receipt, AGREEMENT_EVENTS.SIGNED, { expectedArgs: { signer: from, settingId: currentSettingId } })
      })
    }

    context('when the sender did not signed the agreement', () => {
      itSignsTheAgreementProperly()
    })

    context('when the sender has already signed the agreement', () => {
      beforeEach('sign agreement', async () => {
        await agreement.sign({ from })
      })

      context('when the agreement has not changed', () => {
        it('can not sign the agreement again', async () => {
          await assertRevert(agreement.sign({ from }), AGREEMENT_ERRORS.ERROR_SIGNER_ALREADY_SIGNED)
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
})
