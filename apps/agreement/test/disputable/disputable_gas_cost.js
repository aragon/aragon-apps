const { RULINGS } = require('../helpers/utils/enums')

const deployer = require('../helpers/utils/deployer')(web3, artifacts)

contract('DisputableApp', ([_, user]) => {
  let disputable, actionId

  beforeEach('deploy disputable instance', async () => {
    disputable = await deployer.deployAndInitializeWrapperWithDisputable()
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
      itCostsAtMost(131e3, () => disputable.stake({ user }))
    })

    context('unstake', () => {
      beforeEach('stake', async () => {
        await disputable.stake({ user })
      })

      itCostsAtMost(100e3, () => disputable.unstake({ user }))
    })

    context('newAction', () => {
      itCostsAtMost(233e3, async () => (await disputable.newAction({})).receipt)
    })

    context('closeAction', () => {
      beforeEach('submit action', async () => {
        ({ actionId } = await disputable.newAction({}))
      })

      itCostsAtMost(105e3, () => disputable.close({ actionId }))
    })

    context('challenge', () => {
      beforeEach('submit action', async () => {
        ({ actionId } = await disputable.newAction({}))
      })

      itCostsAtMost(372e3, () => disputable.challenge({ actionId }))
    })

    context('settle', () => {
      beforeEach('submit and challenge action', async () => {
        ({ actionId } = await disputable.newAction({}))
        await disputable.challenge({ actionId })
      })

      itCostsAtMost(266e3, () => disputable.settle({ actionId }))
    })

    context('dispute', () => {
      beforeEach('submit and challenge action', async () => {
        ({ actionId } = await disputable.newAction({}))
        await disputable.challenge({ actionId })
      })

      itCostsAtMost(290e3, () => disputable.dispute({ actionId }))
    })

    context('executeRuling', () => {
      beforeEach('submit and dispute action', async () => {
        ({ actionId } = await disputable.newAction({}))
        await disputable.challenge({ actionId })
        await disputable.dispute({ actionId })
      })

      context('in favor of the submitter', () => {
        itCostsAtMost(210e3, () => disputable.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_SUBMITTER }))
      })

      context('in favor of the challenger', () => {
        itCostsAtMost(265e3, () => disputable.executeRuling({ actionId, ruling: RULINGS.IN_FAVOR_OF_CHALLENGER }))
      })

      context('refused', () => {
        itCostsAtMost(211e3, () => disputable.executeRuling({ actionId, ruling: RULINGS.REFUSED }))
      })
    })
  })
})
