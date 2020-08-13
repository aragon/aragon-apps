const deployer = require('../helpers/utils/deployer')(web3, artifacts)

const { ZERO_ADDRESS } = require('@aragon/contract-helpers-test')

const AppFeesCashier = artifacts.require('AragonAppFeesCashierMock')

contract('Agreement', () => {
  let agreement

  beforeEach('deploy agreement instance', async () => {
    agreement = await deployer.deployAndInitializeAgreementWrapper({ setCashier: false })
  })

  describe('setting', () => {
    let newAppFeesCashier

    beforeEach('deploy another app fees cashier', async () => {
      newAppFeesCashier = await AppFeesCashier.new()
    })

    context('when the app fees cashier is not set', () => {
      it('does not hold an app fees cashier reference', async () => {
        const { aragonAppFeesCashier } = await agreement.getSetting()
        assert.equal(aragonAppFeesCashier, ZERO_ADDRESS, 'app fees cashier address does not match')
      })

      it('does not update the app fees cashier if the Arbitrator changes it', async () => {
        await agreement.arbitrator.setAppFeesCashier(newAppFeesCashier.address)

        await agreement.syncAppFeesCashier()

        const { aragonAppFeesCashier } = await agreement.getSetting()
        assert.equal(aragonAppFeesCashier, ZERO_ADDRESS, 'app fees cashier address does not match')
      })
    })

    context('when the app fees cashier is set', () => {
      beforeEach('set app fees cashier', async () => {
        await agreement.changeSetting({ setCashier: true })
      })

      it('holds an app fees cashier reference', async () => {
        const { aragonAppFeesCashier } = await agreement.getSetting()

        const appFeesCashier = await agreement.appFeesCashier()
        assert.equal(aragonAppFeesCashier, appFeesCashier.address, 'app fees cashier address does not match')
      })

      it('can update the app fees cashier with the Arbitrator reference', async () => {
        await agreement.arbitrator.setAppFeesCashier(newAppFeesCashier.address)

        await agreement.syncAppFeesCashier()

        const { aragonAppFeesCashier } = await agreement.getSetting()
        assert.equal(aragonAppFeesCashier, newAppFeesCashier.address, 'app fees cashier address does not match')
      })

      it('can drop the app fees cashier reference', async () => {
        await agreement.changeSetting({ setCashier: false })

        assert.equal((await agreement.getSetting()).aragonAppFeesCashier, ZERO_ADDRESS, 'app fees cashier address does not match')

        await agreement.arbitrator.setAppFeesCashier((await AppFeesCashier.new()).address)

        assert.equal((await agreement.getSetting()).aragonAppFeesCashier, ZERO_ADDRESS, 'app fees cashier address does not match')
      })
    })
  })
})
