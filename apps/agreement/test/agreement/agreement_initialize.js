const { assertBn } = require('../helpers/assert/assertBn')
const { assertEvent } = require('../helpers/assert/assertEvent')
const { assertRevert } = require('../helpers/assert/assertThrow')
const { decodeEventsOfType } = require('../helpers/lib/decodeEvent')
const { AGREEMENT_EVENTS } = require('../helpers/utils/events')
const { ARAGON_OS_ERRORS, AGREEMENT_ERRORS } = require('../helpers/utils/errors')

const deployer = require('../helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, EOA]) => {
  let arbitrator, stakingFactory, agreement

  const title = 'Sample Agreement'
  const content = '0xabcd'

  before('deploy instances', async () => {
    arbitrator = await deployer.deployArbitrator()
    stakingFactory = await deployer.deployStakingFactory()
    agreement = await deployer.deploy()
  })

  describe('initialize', () => {
    it('cannot initialize the base app', async () => {
      const base = deployer.base

      assert(await base.isPetrified(), 'base agreement contract should be petrified')
      await assertRevert(base.initialize(title, content, arbitrator.address, stakingFactory.address), ARAGON_OS_ERRORS.ERROR_ALREADY_INITIALIZED)
    })

    context('when the initialization fails', () => {
      it('fails when using a non-contract arbitrator', async () => {
        const court = EOA

        await assertRevert(agreement.initialize(title, content, court, stakingFactory.address), AGREEMENT_ERRORS.ERROR_ARBITRATOR_NOT_CONTRACT)
      })

      it('fails when using a non-contract staking factory', async () => {
        const factory = EOA

        await assertRevert(agreement.initialize(title, content, arbitrator.address, factory), AGREEMENT_ERRORS.ERROR_STAKING_FACTORY_NOT_CONTRACT)
      })
    })

    context('when the initialization succeeds', () => {
      let receipt

      before('initialize agreement DAO', async () => {
        receipt = await agreement.initialize(title, content, arbitrator.address, stakingFactory.address)
      })

      it('cannot be initialized again', async () => {
        await assertRevert(agreement.initialize(title, content, arbitrator.address, stakingFactory.address), ARAGON_OS_ERRORS.ERROR_ALREADY_INITIALIZED)
      })

      it('initializes the first content', async () => {
        const currentContentId = await agreement.getCurrentContentId()

        assertBn(currentContentId, 1, 'current content ID does not match')

        const logs = decodeEventsOfType(receipt, deployer.abi, AGREEMENT_EVENTS.CONTENT_CHANGED)
        assertEvent({ logs }, AGREEMENT_EVENTS.CONTENT_CHANGED, { contentId: currentContentId })
      })

      it('initializes the title', async () => {
        const actualTitle = await agreement.title()
        assert.equal(actualTitle, title, 'title does not match')
      })

      it('initializes the arbitrator', async () => {
        const actualArbitrator = await agreement.arbitrator()
        assert.equal(actualArbitrator, arbitrator.address, 'arbitrator does not match')
      })
    })
  })
})
