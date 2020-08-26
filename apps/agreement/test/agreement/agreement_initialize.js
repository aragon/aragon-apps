const deployer = require('../helpers/utils/deployer')(web3, artifacts)
const { AGREEMENT_EVENTS } = require('../helpers/utils/events')
const { ARAGON_OS_ERRORS, AGREEMENT_ERRORS } = require('../helpers/utils/errors')

const { ZERO_ADDRESS, bigExp, injectWeb3, injectArtifacts } = require('@aragon/contract-helpers-test')
const { assertBn, assertEvent, assertRevert } = require('@aragon/contract-helpers-test/src/asserts')

injectWeb3(web3)
injectArtifacts(artifacts)

const ARBITRABLE_INTERFACE = '0x88f3ee69'
const ARAGON_APP_INTERFACE = '0x54053e6c'

contract('Agreement', ([_, EOA, owner]) => {
  let arbitrator, stakingFactory, agreement

  const title = 'Sample Agreement'
  const content = '0xabcd'

  before('deploy instances', async () => {
    arbitrator = await deployer.deployArbitrator()
    stakingFactory = await deployer.deployStakingFactory()
    agreement = await deployer.deploy({ owner })
  })

  describe('initialize', () => {
    it('cannot initialize the base app', async () => {
      const base = deployer.base

      assert(await base.isPetrified(), 'base agreement contract should be petrified')
      await assertRevert(base.initialize(arbitrator.address, true, title, content, stakingFactory.address), ARAGON_OS_ERRORS.ERROR_ALREADY_INITIALIZED)
    })

    context('when the initialization fails', () => {
      it('fails when using a non-contract arbitrator', async () => {
        const court = EOA

        await assertRevert(agreement.initialize(court, true, title, content, stakingFactory.address), AGREEMENT_ERRORS.ERROR_ARBITRATOR_NOT_CONTRACT)
      })

      it('fails when using a non-contract staking factory', async () => {
        const factory = EOA

        await assertRevert(agreement.initialize(arbitrator.address, true, title, content, factory), AGREEMENT_ERRORS.ERROR_STAKING_FACTORY_NOT_CONTRACT)
      })
    })

    context('when the initialization succeeds', () => {
      let receipt

      before('initialize agreement DAO', async () => {
        receipt = await agreement.initialize(arbitrator.address, true, title, content, stakingFactory.address)
      })

      it('cannot be initialized again', async () => {
        await assertRevert(agreement.initialize(arbitrator.address, true, title, content, stakingFactory.address), ARAGON_OS_ERRORS.ERROR_ALREADY_INITIALIZED)
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

      it('does not allow recovering funds', async () => {
        const token = await deployer.deployToken({})
        const balance = bigExp(10, 18)
        await token.generateTokens(agreement.address, balance)
        assertBn(await token.balanceOf(agreement.address), balance, 'agreement token balance does not match')

        await assertRevert(agreement.transferToVault(token.address), ARAGON_OS_ERRORS.ERROR_RECOVER_DISALLOWED)
        assertBn(await token.balanceOf(agreement.address), balance, 'agreement token balance does not match')
        assert.isFalse(await agreement.allowRecoverability(token.address), 'agreement allows recovering funds')
      })
    })
  })

  describe('ERC165', () => {
    it('supports IArbitrable interface', async () => {
      assert.isTrue(await agreement.supportsInterface(ARBITRABLE_INTERFACE), 'agreement does not support IArbitrable')
    })

    it('supports IAragonApp interface', async () => {
      assert.isTrue(await agreement.supportsInterface(ARAGON_APP_INTERFACE), 'agreement does not support IAragonApp')
    })
  })
})
