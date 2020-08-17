const deployer = require('../helpers/utils/deployer')(web3, artifacts)
const { AGREEMENT_EVENTS } = require('../helpers/utils/events')
const { ARAGON_OS_ERRORS, AGREEMENT_ERRORS } = require('../helpers/utils/errors')

const { ZERO_ADDRESS, injectWeb3, injectArtifacts } = require('@aragon/contract-helpers-test')
const { assertBn, assertEvent, assertRevert } = require('@aragon/contract-helpers-test/src/asserts')

injectWeb3(web3)
injectArtifacts(artifacts)

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
      await assertRevert(base.initialize(title, content, arbitrator.address, true, stakingFactory.address), ARAGON_OS_ERRORS.ERROR_ALREADY_INITIALIZED)
    })

    context('when the initialization fails', () => {
      it('fails when using a non-contract arbitrator', async () => {
        const court = EOA

        await assertRevert(agreement.initialize(title, content, court, true, stakingFactory.address), AGREEMENT_ERRORS.ERROR_ARBITRATOR_NOT_CONTRACT)
      })

      it('fails when using a non-contract staking factory', async () => {
        const factory = EOA

        await assertRevert(agreement.initialize(title, content, arbitrator.address, true, factory), AGREEMENT_ERRORS.ERROR_STAKING_FACTORY_NOT_CONTRACT)
      })
    })

    context('when the initialization succeeds', () => {
      let receipt

      before('initialize agreement DAO', async () => {
        receipt = await agreement.initialize(title, content, arbitrator.address, true, stakingFactory.address)
      })

      it('cannot be initialized again', async () => {
        await assertRevert(agreement.initialize(title, content, arbitrator.address, true, stakingFactory.address), ARAGON_OS_ERRORS.ERROR_ALREADY_INITIALIZED)
      })

      it('initializes the first setting', async () => {
        const currentSettingId = await agreement.getCurrentSettingId()

        assertBn(currentSettingId, 1, 'current content ID does not match')
        assertEvent(receipt, AGREEMENT_EVENTS.SETTING_CHANGED, { expectedArgs: { settingId: currentSettingId }, decodeForAbi: deployer.abi })
      })

      it('initializes the first setting with the given title, content, arbitrator and app fees cashier', async () => {
        const setting = await agreement.getSetting(1)

        assert.equal(setting.title, title, 'title does not match')
        assert.equal(setting.content, content, 'content does not match')
        assert.equal(setting.arbitrator, arbitrator.address, 'arbitrator does not match')

        const { recipient: expectedCashier } = await arbitrator.getSubscriptionFees(ZERO_ADDRESS)
        assert.equal(setting.aragonAppFeesCashier, expectedCashier, 'aragon app fees cashier does not match')
      })
    })
  })
})
