const { assertBn } = require('../helpers/assert/assertBn')
const { assertRevert } = require('../helpers/assert/assertThrow')
const { assertAmountOfEvents, assertEvent } = require('../helpers/assert/assertEvent')
const { AGREEMENT_ERRORS } = require('../helpers/utils/errors')
const { AGREEMENT_EVENTS } = require('../helpers/utils/events')

const deployer = require('../helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, signer]) => {
  let agreement

  beforeEach('deploy agreement instance', async () => {
    agreement = await deployer.deployAndInitializeWrapper()
  })

  describe('sign', () => {
    const from = signer

    const itSignsTheAgreementProperly = () => {
      it('signs the agreement', async () => {
        const currentContentId = await agreement.getCurrentContentId()

        await agreement.sign(from)

        const { lastContentIdSigned, mustSign } = await agreement.getSigner(from)
        assert.isFalse(mustSign, 'signer must sign')
        assertBn(lastContentIdSigned, currentContentId, 'signer last content signed does not match')
      })

      it('emits an event', async () => {
        const currentContentId = await agreement.getCurrentContentId()

        const receipt = await agreement.sign(from)

        assertAmountOfEvents(receipt, AGREEMENT_EVENTS.SIGNED, 1)
        assertEvent(receipt, AGREEMENT_EVENTS.SIGNED, { signer: from, contentId: currentContentId })
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
          await agreement.changeContent('0xabcd')
        })

        itSignsTheAgreementProperly()
      })
    })
  })
})
