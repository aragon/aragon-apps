const { bn, bigExp } = require('../helpers/lib/numbers')

const deployer = require('../helpers/utils/deployer')(web3, artifacts)

const TokenBalanceOracle = artifacts.require('TokenBalanceOracle')

contract('Delay', ([_, owner, someone, submitter, challenger]) => {
  let delay, SUBMIT_ROLE, CHALLENGE_ROLE

  const ANY_ADDR = '0xffffffffffffffffffffffffffffffffffffffff'
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

  before('deploy base contracts', async () => {
    await deployer.deployBase()
    await deployer.deployBaseDisputable()
    SUBMIT_ROLE = await deployer.baseDisputable.SUBMIT_ROLE()
    CHALLENGE_ROLE = await deployer.baseDisputable.CHALLENGE_ROLE()
  })

  describe('canForward', () => {
    let submitPermissionToken
    const submitPermissionBalance = bigExp(100, 18)

    const itHandlesTokenBalancePermissionsProperly = () => {
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
          assert.isFalse(await delay.canForward(submitter), 'submitter can forward')
        })
      })

      context('when the submitter has less than the requested permission balance', () => {
        setTokenBalance(submitter, submitPermissionBalance.div(bn(2)))

        it('returns false', async () => {
          assert.isFalse(await delay.canForward(submitter), 'submitter can forward')
        })
      })

      context('when the submitter has the requested permission balance', () => {
        setTokenBalance(submitter, submitPermissionBalance)

        it('returns true', async () => {
          assert.isTrue(await delay.canForward(submitter), 'submitter cannot forward')
        })
      })
    }

    context('for ACL permissions', () => {
      beforeEach('deploy delay instance', async () => {
        delay = await deployer.deployAndInitializeWrapperWithDisputable({ delay: true, owner, submitters: [] })
      })

      context('when the permission is set to a particular address', async () => {
        beforeEach('grant permission', async () => {
          await deployer.acl.createPermission(submitter, delay.disputable.address, SUBMIT_ROLE, owner, { from: owner })
        })

        context('when the submitter is that address', async () => {
          it('returns true', async () => {
            assert.isTrue(await delay.canForward(submitter), 'submitter cannot forward')
          })
        })

        context('when the submitter is not that address', async () => {
          it('returns false', async () => {
            assert.isFalse(await delay.canForward(someone), 'submitter can forward')
          })
        })
      })

      context('when the permission is open to any address', async () => {
        beforeEach('grant permission', async () => {
          await deployer.acl.createPermission(ANY_ADDR, delay.disputable.address, SUBMIT_ROLE, owner, { from: owner })
        })

        it('returns true', async () => {
          assert.isTrue(await delay.canForward(someone), 'submitter cannot forward')
        })
      })

      context('when the agreement is changed to token balance permissions', async () => {
        before('deploy permission token', async () => {
          submitPermissionToken = await deployer.deploySubmitPermissionToken()
        })

        beforeEach('change to token balance permission', async () => {
          await delay.disputable.changeTokenBalancePermission(submitPermissionToken.address, submitPermissionBalance, ZERO_ADDRESS, bn(0), { from: owner })
        })

        itHandlesTokenBalancePermissionsProperly()
      })
    })

    context('for token balance permissions', () => {
      before('deploy permission token', async () => {
        submitPermissionToken = await deployer.deploySubmitPermissionToken()
      })

      beforeEach('deploy delay instance', async () => {
        delay = await deployer.deployAndInitializeWrapperWithDisputable({ owner, submitPermissionBalance, delay: true, submitters: [] })
      })

      context('when using an embedded configuration', () => {
        context('when the submitter does not have submit permissions', () => {
          itHandlesTokenBalancePermissionsProperly()
        })

        context('when the submitter has submit permissions', () => {
          beforeEach('grant permission', async () => {
            await deployer.acl.createPermission(submitter, delay.disputable.address, SUBMIT_ROLE, owner, { from: owner })
          })

          itHandlesTokenBalancePermissionsProperly()
        })

        context('when there is a submit permission open to any address', () => {
          beforeEach('grant permission', async () => {
            await deployer.acl.createPermission(submitter, delay.disputable.address, SUBMIT_ROLE, owner, { from: owner })
          })

          itHandlesTokenBalancePermissionsProperly()
        })

        context('when using a proper balance oracle', () => {
          let balanceOracle

          beforeEach('unset submit token balance permission', async () => {
            // swap submit permission token as challenge permission token
            await delay.disputable.changeTokenBalancePermission(ZERO_ADDRESS, bn(0), submitPermissionToken.address, submitPermissionBalance, { from: owner })
            assert.isFalse(await delay.canForward(submitter), 'submitter can forward')
          })

          beforeEach('set balance oracle', async () => {
            balanceOracle = await TokenBalanceOracle.new(submitPermissionToken.address, submitPermissionBalance)
            const param = await balanceOracle.getPermissionParam()
            await deployer.acl.createPermission(ANY_ADDR, delay.disputable.address, SUBMIT_ROLE, owner, { from: owner })
            await deployer.acl.grantPermissionP(ANY_ADDR, delay.disputable.address, SUBMIT_ROLE, [param], { from: owner })
          })

          itHandlesTokenBalancePermissionsProperly()
        })
      })
    })
  })

  describe('canChallenge', () => {
    let challengePermissionToken, delayableId
    const challengePermissionBalance = bigExp(101, 18)

    const itHandlesTokenBalancePermissionsProperly = () => {
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
          assert.isFalse(await delay.canChallenge(delayableId, challenger), 'challenger can challenge')
        })
      })

      context('when the challenger has less than the requested permission balance', () => {
        setTokenBalance(challenger, challengePermissionBalance.div(bn(2)))

        it('returns false', async () => {
          assert.isFalse(await delay.canChallenge(delayableId, challenger), 'challenger can challenge')
        })
      })

      context('when the challenger has the requested permission balance', () => {
        setTokenBalance(challenger, challengePermissionBalance)

        it('returns true', async () => {
          assert.isTrue(await delay.canChallenge(delayableId, challenger), 'challenger cannot challenge')
        })
      })
    }

    context('for ACL permissions', () => {
      beforeEach('deploy delay instance', async () => {
        delay = await deployer.deployAndInitializeWrapperWithDisputable({ delay: true, owner, challengers: [] })
        const result = await delay.schedule({ submitter })
        delayableId = result.delayableId
      })

      context('when the permission is set to a particular address', async () => {
        beforeEach('grant permission', async () => {
          await deployer.acl.createPermission(challenger, delay.disputable.address, CHALLENGE_ROLE, owner, { from: owner })
        })

        context('when the challenger is that address', async () => {
          it('returns true', async () => {
            assert.isTrue(await delay.canChallenge(delayableId, challenger), 'challenger cannot challenge')
          })
        })

        context('when the challenger is not that address', async () => {
          it('returns false', async () => {
            assert.isFalse(await delay.canChallenge(delayableId, someone), 'challenger can challenge')
          })
        })
      })

      context('when the permission is open to any address', async () => {
        beforeEach('grant permission', async () => {
          await deployer.acl.createPermission(ANY_ADDR, delay.disputable.address, CHALLENGE_ROLE, owner, { from: owner })
        })

        it('returns true', async () => {
          assert.isTrue(await delay.canChallenge(delayableId, someone), 'challenger cannot challenge')
        })
      })

      context('when the agreement is changed to token balance permissions', async () => {
        before('deploy permission token', async () => {
          challengePermissionToken = await deployer.deployChallengePermissionToken()
        })

        beforeEach('change to token balance permission', async () => {
          await delay.disputable.changeTokenBalancePermission(ZERO_ADDRESS, bn(0), challengePermissionToken.address, challengePermissionBalance, { from: owner })
        })

        itHandlesTokenBalancePermissionsProperly()
      })
    })

    context('for token balance permissions', () => {
      before('deploy permission token', async () => {
        challengePermissionToken = await deployer.deployChallengePermissionToken()
      })

      beforeEach('deploy delay instance', async () => {
        delay = await deployer.deployAndInitializeWrapperWithDisputable({ owner, challengePermissionBalance, delay: true, challengers: [] })
        const result = await delay.schedule({ submitter })
        delayableId = result.delayableId
      })

      context('when using an embedded configuration', () => {
        context('when the challenger does not have challenge permissions', () => {
          itHandlesTokenBalancePermissionsProperly()
        })

        context('when the challenger has challenge permissions', () => {
          beforeEach('grant permission', async () => {
            await deployer.acl.createPermission(challenger, delay.disputable.address, CHALLENGE_ROLE, owner, { from: owner })
          })

          itHandlesTokenBalancePermissionsProperly()
        })

        context('when there is a challenge permission open to any address', () => {
          beforeEach('grant permission', async () => {
            await deployer.acl.createPermission(challenger, delay.disputable.address, CHALLENGE_ROLE, owner, { from: owner })
          })

          itHandlesTokenBalancePermissionsProperly()
        })

        context('when using a proper balance oracle', () => {
          let balanceOracle

          beforeEach('unset challenge token balance permission', async () => {
            // swap challenge permission token as submit permission token
            await delay.disputable.changeTokenBalancePermission(challengePermissionToken.address, challengePermissionBalance, ZERO_ADDRESS, bn(0), { from: owner })
            assert.isFalse(await delay.canChallenge(delayableId, challenger), 'challenger can challenge')
          })

          beforeEach('set balance oracle', async () => {
            balanceOracle = await TokenBalanceOracle.new(challengePermissionToken.address, challengePermissionBalance)
            const param = await balanceOracle.getPermissionParam()
            await deployer.acl.createPermission(ANY_ADDR, delay.disputable.address, CHALLENGE_ROLE, owner, { from: owner })
            await deployer.acl.grantPermissionP(ANY_ADDR, delay.disputable.address, CHALLENGE_ROLE, [param], { from: owner })
          })

          itHandlesTokenBalancePermissionsProperly()
        })
      })
    })
  })
})
