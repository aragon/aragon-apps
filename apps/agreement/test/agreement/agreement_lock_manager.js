const deployer = require('../helpers/utils/deployer')(web3, artifacts)
const { RULINGS } = require('../helpers/utils/enums')

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

    context('can not unlock', () => {
      const cannotUnlock = async () => {
        await Promise.all(
          [owner, submitter, challenger, someone].map(async (user) => {
            assert.isFalse(await agreement.canUnlock(user, 0), 'User can unlock')
            assert.isFalse(await agreement.canUnlock(user, 1), 'User can unlock')
          })
        )
      }

      before('initial check', async () => {
        await cannotUnlock()
      })

      it('after activation', async () => {
        await disputable.activate({ from: owner })
        await cannotUnlock()
      })

      it('after signing', async () => {
        await disputable.sign(submitter)
        await cannotUnlock()
      })

      it('after allowing manager', async () => {
        await disputable.allowManager({ user: submitter })
        await cannotUnlock()
      })

      it('after staking', async () => {
        await disputable.stake({ amount: actionCollateral, user: submitter })
        await cannotUnlock()
      })

      it('after new action', async () => {
        ({ actionId } = await disputable.newAction({ submitter }))
        await cannotUnlock()
      })

      it('after challenge', async () => {
        await disputable.challenge({ actionId, challenger })
        await cannotUnlock()
      })

      it('after dispute', async () => {
        await disputable.dispute({ actionId })
        await cannotUnlock()
      })

      it('after ruling', async () => {
        await disputable.executeRuling({ actionId, ruling: RULINGS.REFUSED })
        await cannotUnlock()
      })

      it('after close', async () => {
        await disputable.close(actionId)
        await cannotUnlock()
      })
    })
  })
})
