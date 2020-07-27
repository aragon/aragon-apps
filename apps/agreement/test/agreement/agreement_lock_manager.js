const deployer = require('../helpers/utils/deployer')(web3, artifacts)
const { injectWeb3, injectArtifacts } = require('@aragon/contract-helpers-test')
const { RULINGS } = require('../helpers/utils/enums')

injectWeb3(web3)
injectArtifacts(artifacts)

contract('Agreement', ([_, owner, submitter, challenger, someone]) => {
  let disputable, actionCollateral, collateralToken
  let agreement

  before('deploy agreement instance', async () => {
    disputable = await deployer.deployAndInitializeDisputableWrapper({ owner, activate: false, submitters: [submitter], challengers: [challenger] })
    agreement = disputable.agreement
    collateralToken = disputable.collateralToken
    actionCollateral = disputable.actionCollateral
  })

  describe('lock manager interface', () => {
    let actionId

    context("can't unlock", () => {
      const cannotUnlock = async (user) => {
        await Promise.all(
          [owner, submitter, challenger, someone].map(async (user) => {
            assert.isFalse(await agreement.canUnlock(user, 0), 'User can unlock')
            assert.isFalse(await agreement.canUnlock(user, 1), 'User can unlock')
          })
        )
      }

      before('initial check', async () => {
        await cannot_unlock()
      })

      it('after activation', async () => {
        await disputable.activate({ from: owner })
        await cannot_unlock()
      })

      it('after siging', async () => {
        await disputable.sign(submitter)
        await cannot_unlock()
      })

      it('after allowing manager', async () => {
        await disputable.allowManager({ user: submitter })
        await cannot_unlock()
      })

      it('after staking', async () => {
        await disputable.stake({ amount: actionCollateral, user: submitter })
        await cannot_unlock()
      })

      it('after new action', async () => {
        ({ actionId } = await disputable.newAction({ submitter }))
        await cannot_unlock()
      })

      it('after challenge', async () => {
        await disputable.challenge({ actionId, challenger })
        await cannot_unlock()
      })

      it('after dispute', async () => {
        await disputable.dispute({ actionId })
        await cannot_unlock()
      })

      it('after ruling', async () => {
        await disputable.executeRuling({ actionId, ruling: RULINGS.REFUSED })
        await cannot_unlock()
      })

      it('after close', async () => {
        await disputable.close(actionId)
        await cannot_unlock()
      })
    })
  })
})
