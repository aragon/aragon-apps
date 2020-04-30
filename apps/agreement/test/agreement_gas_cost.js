const { RULINGS } = require('./helpers/utils/enums')

const deployer = require('./helpers/utils/deployer')(web3, artifacts)

contract('Agreement', ([_, signer]) => {
  let agreement, actionId

  beforeEach('deploy agreement instance', async () => {
    agreement = await deployer.deployAndInitializeWrapper()
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
      itCostsAtMost(175e3, () => agreement.stake({ signer }))
    })

    context('unstake', () => {
      beforeEach('stake', async () => {
        await agreement.stake({ signer })
      })

      itCostsAtMost(115e3, () => agreement.unstake({ signer }))
    })

    context('schedule', () => {
      itCostsAtMost(195e3, async () => (await agreement.schedule({})).receipt)
    })

    context('cancel', () => {
      beforeEach('schedule action', async () => {
        ({ actionId } = await agreement.schedule({}))
      })

      itCostsAtMost(61e3, () => agreement.cancel({ actionId }))
    })

    context('challenge', () => {
      beforeEach('schedule action', async () => {
        ({ actionId } = await agreement.schedule({}))
      })

      itCostsAtMost(355e3, () => agreement.challenge({ actionId }))
    })

    context('settle', () => {
      beforeEach('schedule and challenge action', async () => {
        ({ actionId } = await agreement.schedule({}))
        await agreement.challenge({ actionId })
      })

      itCostsAtMost(241e3, () => agreement.settle({ actionId }))
    })

    context('dispute', () => {
      beforeEach('schedule and challenge action', async () => {
        ({ actionId } = await agreement.schedule({}))
        await agreement.challenge({ actionId })
      })

      itCostsAtMost(293e3, () => agreement.dispute({ actionId }))
    })

    context('executeRuling', () => {
      beforeEach('schedule and dispute action', async () => {
        ({ actionId } = await agreement.schedule({}))
        await agreement.challenge({ actionId })
        await agreement.dispute({ actionId })
      })

      context('in favor of the submitter', () => {
        itCostsAtMost(200e3, () => agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER }))
      })

      context('in favor of the challenger', () => {
        itCostsAtMost(215e3, () => agreement.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER }))
      })

      context('refused', () => {
        itCostsAtMost(200e3, () => agreement.executeRuling({ actionId, ruling: RULINGS.REFUSED }))
      })
    })
  })
})
