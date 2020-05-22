const { RULINGS } = require('../helpers/utils/enums')

const deployer = require('../helpers/utils/deployer')(web3, artifacts)

contract('Delay', ([_, user]) => {
  let delay, delayableId

  beforeEach('deploy delay instance', async () => {
    delay = await deployer.deployAndInitializeWrapperWithDisputable({ delay: true })
  })

  describe('gas costs', () => {
    const itCostsAtMost = (expectedCost, call) => {
      it(`should cost up to ${expectedCost.toLocaleString()} gas`, async () => {
        const { receipt: { gasUsed } } = await call()
        console.log(`gas costs: ${gasUsed.toLocaleString()}`)
        assert.isAtMost(gasUsed, expectedCost)
      })
    }

    context('stake', () => {
      itCostsAtMost(140e3, () => delay.stake({ user }))
    })

    context('unstake', () => {
      beforeEach('stake', async () => {
        await delay.stake({ user })
      })

      itCostsAtMost(110e3, () => delay.unstake({ user }))
    })

    context('schedule', () => {
      itCostsAtMost(339e3, async () => (await delay.schedule({})).receipt)
    })

    context('stop', () => {
      beforeEach('schedule action', async () => {
        ({ delayableId } = await delay.schedule({}))
      })

      itCostsAtMost(107e3, () => delay.stop({ delayableId }))
    })

    context('challenge', () => {
      beforeEach('schedule action', async () => {
        ({ delayableId } = await delay.schedule({}))
      })

      itCostsAtMost(428e3, () => delay.challenge({ delayableId }))
    })

    context('settle', () => {
      beforeEach('schedule and challenge action', async () => {
        ({ delayableId } = await delay.schedule({}))
        await delay.challenge({ delayableId })
      })

      itCostsAtMost(279e3, () => delay.settle({ delayableId }))
    })

    context('dispute', () => {
      beforeEach('schedule and challenge action', async () => {
        ({ delayableId } = await delay.schedule({}))
        await delay.challenge({ delayableId })
      })

      itCostsAtMost(285e3, () => delay.dispute({ delayableId }))
    })

    context('executeRuling', () => {
      beforeEach('schedule and dispute action', async () => {
        ({ delayableId } = await delay.schedule({}))
        await delay.challenge({ delayableId })
        await delay.dispute({ delayableId })
      })

      context('in favor of the submitter', () => {
        itCostsAtMost(239e3, () => delay.executeRuling({ delayableId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER }))
      })

      context('in favor of the challenger', () => {
        itCostsAtMost(251e3, () => delay.executeRuling({ delayableId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER }))
      })

      context('refused', () => {
        itCostsAtMost(240e3, () => delay.executeRuling({ delayableId, ruling: RULINGS.REFUSED }))
      })
    })
  })
})
