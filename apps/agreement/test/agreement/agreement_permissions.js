const deployer = require('../helpers/utils/deployer')(web3, artifacts)

const { sha3 } = require('web3-utils')
const { bn, bigExp } = require('@aragon/contract-helpers-test')
const { ANY_ENTITY } = require('@aragon/contract-helpers-test/src/aragon-os')

const TokenBalanceOracle = artifacts.require('TokenBalanceOracle')

contract('Agreement', ([_, owner, someone, submitter, challenger]) => {
  let agreement, disputable

  before('deploy base contracts', async () => {
    agreement = await deployer.deployBase()
    await deployer.deployBaseDisputable()
  })

  describe('canForward', () => {
    let SUBMIT_ROLE

    before('load role', async () => {
      SUBMIT_ROLE = await deployer.baseDisputable.SUBMIT_ROLE()
    })

    beforeEach('deploy disputable instance', async () => {
      disputable = await deployer.deployAndInitializeDisputableWrapper({ owner, submitters: [] })
    })

    context('when the permission is set to a particular address', async () => {
      beforeEach('grant permission', async () => {
        await deployer.acl.createPermission(submitter, disputable.disputable.address, SUBMIT_ROLE, owner, { from: owner })
      })

      context('when the submitter is that address', async () => {
        it('returns true', async () => {
          assert.isTrue(await disputable.canForward(submitter), 'submitter cannot forward')
        })
      })

      context('when the submitter is not that address', async () => {
        it('returns false', async () => {
          assert.isFalse(await disputable.canForward(someone), 'submitter can forward')
        })
      })
    })

    context('when the permission is open to any address', async () => {
      beforeEach('grant permission', async () => {
        await deployer.acl.createPermission(ANY_ENTITY, disputable.disputable.address, SUBMIT_ROLE, owner, { from: owner })
      })

      it('returns true', async () => {
        assert.isTrue(await disputable.canForward(someone), 'submitter cannot forward')
      })
    })

    context('when the permission is set up with a token balance oracle', async () => {
      let submitPermissionToken, balanceOracle
      const submitPermissionBalance = bigExp(100, 18)

      before('deploy token balance oracle', async () => {
        submitPermissionToken = await deployer.deployToken({ symbol: 'ANT', decimals: 18, name: 'Sample ANT' })
        balanceOracle = await TokenBalanceOracle.new(submitPermissionToken.address, submitPermissionBalance)
      })

      beforeEach('set balance oracle', async () => {
        const param = await balanceOracle.getPermissionParam()
        await deployer.acl.createPermission(ANY_ENTITY, disputable.disputable.address, SUBMIT_ROLE, owner, { from: owner })
        await deployer.acl.grantPermissionP(ANY_ENTITY, disputable.disputable.address, SUBMIT_ROLE, [param], { from: owner })
      })

      const setTokenBalance = (holder, balance) => {
        beforeEach('mint tokens', async () => {
          const currentBalance = await submitPermissionToken.balanceOf(holder)
          if (currentBalance.eq(balance)) return

          if (currentBalance.gt(balance)) {
            const balanceDiff = currentBalance.sub(balance)
            await submitPermissionToken.destroyTokens(holder, balanceDiff)
          } else {
            const balanceDiff = balance.sub(currentBalance)
            await submitPermissionToken.generateTokens(holder, balanceDiff)
          }
        })
      }

      context('when the submitter does not have any permission balance', () => {
        setTokenBalance(submitter, bn(0))

        it('returns false', async () => {
          assert.isFalse(await disputable.canForward(submitter), 'submitter can forward')
        })
      })

      context('when the submitter has less than the requested permission balance', () => {
        setTokenBalance(submitter, submitPermissionBalance.div(bn(2)))

        it('returns false', async () => {
          assert.isFalse(await disputable.canForward(submitter), 'submitter can forward')
        })
      })

      context('when the submitter has the requested permission balance', () => {
        setTokenBalance(submitter, submitPermissionBalance)

        it('returns true', async () => {
          assert.isTrue(await disputable.canForward(submitter), 'submitter cannot forward')
        })
      })
    })
  })

  describe('canChallenge', () => {
    let CHALLENGE_ROLE, actionId

    before('load role', async () => {
      CHALLENGE_ROLE = await deployer.base.CHALLENGE_ROLE()
    })

    beforeEach('deploy disputable instance', async () => {
      disputable = await deployer.deployAndInitializeDisputableWrapper({ owner, challengers: [] })
      const result = await disputable.newAction({ submitter })
      actionId = result.actionId
    })

    context('when the permission is set to a particular address', async () => {
      beforeEach('grant permission', async () => {
        await deployer.acl.createPermission(challenger, disputable.disputable.address, CHALLENGE_ROLE, owner, { from: owner })
      })

      context('when the challenger is that address', async () => {
        it('returns true', async () => {
          assert.isTrue(await disputable.canChallenge(actionId, challenger), 'challenger cannot challenge')
        })
      })

      context('when the challenger is not that address', async () => {
        it('returns false', async () => {
          assert.isFalse(await disputable.canChallenge(actionId, someone), 'challenger can challenge')
        })
      })
    })

    context('when the permission is open to any address', async () => {
      beforeEach('grant permission', async () => {
        await deployer.acl.createPermission(ANY_ENTITY, disputable.disputable.address, CHALLENGE_ROLE, owner, { from: owner })
      })

      it('returns true', async () => {
        assert.isTrue(await disputable.canChallenge(actionId, someone), 'challenger cannot challenge')
      })
    })

    context('when the permission is set up with a token balance oracle', async () => {
      let challengePermissionToken, balanceOracle
      const challengePermissionBalance = bigExp(101, 18)

      before('deploy token balance oracle', async () => {
        challengePermissionToken = await deployer.deployToken({ symbol: 'ANT', decimals: 18, name: 'Sample ANT' })
        balanceOracle = await TokenBalanceOracle.new(challengePermissionToken.address, challengePermissionBalance)
      })

      beforeEach('set balance oracle', async () => {
        const param = await balanceOracle.getPermissionParam()
        await deployer.acl.createPermission(ANY_ENTITY, disputable.disputable.address, CHALLENGE_ROLE, owner, { from: owner })
        await deployer.acl.grantPermissionP(ANY_ENTITY, disputable.disputable.address, CHALLENGE_ROLE, [param], { from: owner })
      })

      const setTokenBalance = (holder, balance) => {
        beforeEach('mint tokens', async () => {
          const currentBalance = await challengePermissionToken.balanceOf(holder)
          if (currentBalance.eq(balance)) return

          if (currentBalance.gt(balance)) {
            const balanceDiff = currentBalance.sub(balance)
            await challengePermissionToken.destroyTokens(holder, balanceDiff)
          } else {
            const balanceDiff = balance.sub(currentBalance)
            await challengePermissionToken.generateTokens(holder, balanceDiff)
          }
        })
      }

      context('when the challenger does not have any permission balance', () => {
        setTokenBalance(challenger, bn(0))

        it('returns false', async () => {
          assert.isFalse(await disputable.canChallenge(actionId, challenger), 'challenger can challenge')
        })
      })

      context('when the challenger has less than the requested permission balance', () => {
        setTokenBalance(challenger, challengePermissionBalance.div(bn(2)))

        it('returns false', async () => {
          assert.isFalse(await disputable.canChallenge(actionId, challenger), 'challenger can challenge')
        })
      })

      context('when the challenger has the requested permission balance', () => {
        setTokenBalance(challenger, challengePermissionBalance)

        it('returns true', async () => {
          assert.isTrue(await disputable.canChallenge(actionId, challenger), 'challenger cannot challenge')
        })
      })
    })
  })

  describe('roles', () => {
    it('computes roles properly', async () => {
      const EXPECTED_CHALLENGE_ROLE = sha3('CHALLENGE_ROLE')
      assert.equal(await agreement.CHALLENGE_ROLE(), EXPECTED_CHALLENGE_ROLE, 'CHALLENGE_ROLE doesn’t match')

      const EXPECTED_CHANGE_AGREEMENT_ROLE = sha3('CHANGE_AGREEMENT_ROLE')
      assert.equal(await agreement.CHANGE_AGREEMENT_ROLE(), EXPECTED_CHANGE_AGREEMENT_ROLE, 'CHANGE_AGREEMENT_ROLE doesn’t match')

      const EXPECTED_MANAGE_DISPUTABLE_ROLE = sha3('MANAGE_DISPUTABLE_ROLE')
      assert.equal(await agreement.MANAGE_DISPUTABLE_ROLE(), EXPECTED_MANAGE_DISPUTABLE_ROLE, 'MANAGE_DISPUTABLE_ROLE doesn’t match')
    })
  })
})
