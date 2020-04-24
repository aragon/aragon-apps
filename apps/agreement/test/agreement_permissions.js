const { bn, bigExp } = require('./helpers/lib/numbers')

const deployer = require('./helpers/utils/deployer')(web3, artifacts)

const TokenBalanceOracle = artifacts.require('TokenBalanceOracle')

contract('Agreement', ([_, owner, someone, signer, challenger]) => {
  let agreement, SIGN_ROLE, CHALLENGE_ROLE

  const ANY_ADDR = '0xffffffffffffffffffffffffffffffffffffffff'
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

  before('load sign role', async () => {
    await deployer.deployBase()
    SIGN_ROLE = await deployer.base.SIGN_ROLE()
    CHALLENGE_ROLE = await deployer.base.CHALLENGE_ROLE()
  })

  describe('canSign', () => {
    let signPermissionToken
    const signPermissionBalance = bigExp(100, 18)

    const itHandlesTokenBalancePermissionsProperly = () => {
      const setTokenBalance = (holder, balance) => {
        beforeEach('mint tokens', async () => {
          const currentBalance = await signPermissionToken.balanceOf(holder)
          if (currentBalance.eq(balance)) return

          if (currentBalance.gt(balance)) {
            const balanceDiff = currentBalance.sub(balance)
            await signPermissionToken.destroyTokens(holder, balanceDiff)
          } else {
            const balanceDiff = balance.sub(currentBalance)
            await signPermissionToken.generateTokens(holder, balanceDiff)
          }
        })
      }

      context('when the signer does not have any permission balance', () => {
        setTokenBalance(signer, bn(0))

        it('returns false', async () => {
          assert.isFalse(await agreement.canSign(signer), 'signer can sign')
        })
      })

      context('when the signer has less than the requested permission balance', () => {
        setTokenBalance(signer, signPermissionBalance.div(bn(2)))

        it('returns false', async () => {
          assert.isFalse(await agreement.canSign(signer), 'signer can sign')
        })
      })

      context('when the signer has the requested permission balance', () => {
        setTokenBalance(signer, signPermissionBalance)

        it('returns true', async () => {
          assert.isTrue(await agreement.canSign(signer), 'signer cannot sign')
        })
      })
    }

    context('for ACL permissions', () => {
      beforeEach('deploy agreement instance', async () => {
        agreement = await deployer.deployAndInitialize({ owner, signers: [] })
      })

      context('when the permission is set to a particular address', async () => {
        beforeEach('grant permission', async () => {
          await deployer.acl.createPermission(signer, agreement.address, SIGN_ROLE, owner, { from: owner })
        })

        context('when the signer is that address', async () => {
          it('returns true', async () => {
            assert.isTrue(await agreement.canSign(signer), 'signer cannot sign')
          })
        })

        context('when the signer is not that address', async () => {
          it('returns false', async () => {
            assert.isFalse(await agreement.canSign(someone), 'signer can sign')
          })
        })
      })

      context('when the permission is open to any address', async () => {
        beforeEach('grant permission', async () => {
          await deployer.acl.createPermission(ANY_ADDR, agreement.address, SIGN_ROLE, owner, { from: owner })
        })

        it('returns true', async () => {
          assert.isTrue(await agreement.canSign(someone), 'signer cannot sign')
        })
      })

      context('when the agreement is changed to token balance permissions', async () => {
        before('deploy permission token', async () => {
          signPermissionToken = await deployer.deploySignPermissionToken()
        })

        beforeEach('change to token balance permission', async () => {
          await agreement.changeTokenBalancePermission(signPermissionToken.address, signPermissionBalance, ZERO_ADDRESS, bn(0), { from: owner })
        })

        itHandlesTokenBalancePermissionsProperly()
      })
    })

    context('for token balance permissions', () => {
      before('deploy permission token', async () => {
        signPermissionToken = await deployer.deploySignPermissionToken()
      })

      beforeEach('deploy agreement instance', async () => {
        agreement = await deployer.deployAndInitialize({ owner, signPermissionBalance, signers: [] })
      })

      context('when using an embedded configuration', () => {
        context('when the signer does not have sign permissions', () => {
          itHandlesTokenBalancePermissionsProperly()
        })

        context('when the signer has sign permissions', () => {
          beforeEach('grant permission', async () => {
            await deployer.acl.createPermission(signer, agreement.address, SIGN_ROLE, owner, { from: owner })
          })

          itHandlesTokenBalancePermissionsProperly()
        })

        context('when there is a sign permission open to any address', () => {
          beforeEach('grant permission', async () => {
            await deployer.acl.createPermission(signer, agreement.address, SIGN_ROLE, owner, { from: owner })
          })

          itHandlesTokenBalancePermissionsProperly()
        })

        context('when using a proper balance oracle', () => {
          let balanceOracle

          beforeEach('unset sign token balance permission', async () => {
            // swap sign permission token as challenge permission token
            await agreement.changeTokenBalancePermission(ZERO_ADDRESS, bn(0), signPermissionToken.address, signPermissionBalance, { from: owner })
            assert.isFalse(await agreement.canSign(signer), 'signer can sign')
          })

          beforeEach('set balance oracle', async () => {
            balanceOracle = await TokenBalanceOracle.new(signPermissionToken.address, signPermissionBalance)
            const param = await balanceOracle.getPermissionParam()
            await deployer.acl.createPermission(ANY_ADDR, agreement.address, SIGN_ROLE, owner, { from: owner })
            await deployer.acl.grantPermissionP(ANY_ADDR, agreement.address, SIGN_ROLE, [param], { from: owner })
          })

          itHandlesTokenBalancePermissionsProperly()
        })
      })
    })
  })

  describe('canChallenge', () => {
    let challengePermissionToken
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
          assert.isFalse(await agreement.canChallenge(challenger), 'challenger can challenge')
        })
      })

      context('when the challenger has less than the requested permission balance', () => {
        setTokenBalance(challenger, challengePermissionBalance.div(bn(2)))

        it('returns false', async () => {
          assert.isFalse(await agreement.canChallenge(challenger), 'challenger can challenge')
        })
      })

      context('when the challenger has the requested permission balance', () => {
        setTokenBalance(challenger, challengePermissionBalance)

        it('returns true', async () => {
          assert.isTrue(await agreement.canChallenge(challenger), 'challenger cannot challenge')
        })
      })
    }

    context('for ACL permissions', () => {
      beforeEach('deploy agreement instance', async () => {
        agreement = await deployer.deployAndInitialize({ owner, challengers: [] })
      })

      context('when the permission is set to a particular address', async () => {
        beforeEach('grant permission', async () => {
          await deployer.acl.createPermission(challenger, agreement.address, CHALLENGE_ROLE, owner, { from: owner })
        })

        context('when the challenger is that address', async () => {
          it('returns true', async () => {
            assert.isTrue(await agreement.canChallenge(challenger), 'challenger cannot challenge')
          })
        })

        context('when the challenger is not that address', async () => {
          it('returns false', async () => {
            assert.isFalse(await agreement.canChallenge(someone), 'challenger can challenge')
          })
        })
      })

      context('when the permission is open to any address', async () => {
        beforeEach('grant permission', async () => {
          await deployer.acl.createPermission(ANY_ADDR, agreement.address, CHALLENGE_ROLE, owner, { from: owner })
        })

        it('returns true', async () => {
          assert.isTrue(await agreement.canChallenge(someone), 'challenger cannot challenge')
        })
      })

      context('when the agreement is changed to token balance permissions', async () => {
        before('deploy permission token', async () => {
          challengePermissionToken = await deployer.deployChallengePermissionToken()
        })

        beforeEach('change to token balance permission', async () => {
          await agreement.changeTokenBalancePermission(ZERO_ADDRESS, bn(0), challengePermissionToken.address, challengePermissionBalance, { from: owner })
        })

        itHandlesTokenBalancePermissionsProperly()
      })
    })

    context('for token balance permissions', () => {
      before('deploy permission token', async () => {
        challengePermissionToken = await deployer.deployChallengePermissionToken()
      })

      beforeEach('deploy agreement instance', async () => {
        agreement = await deployer.deployAndInitialize({ owner, challengePermissionBalance, challengers: [] })
      })

      context('when using an embedded configuration', () => {
        context('when the challenger does not have challenge permissions', () => {
          itHandlesTokenBalancePermissionsProperly()
        })

        context('when the challenger has challenge permissions', () => {
          beforeEach('grant permission', async () => {
            await deployer.acl.createPermission(challenger, agreement.address, CHALLENGE_ROLE, owner, { from: owner })
          })

          itHandlesTokenBalancePermissionsProperly()
        })

        context('when there is a challenge permission open to any address', () => {
          beforeEach('grant permission', async () => {
            await deployer.acl.createPermission(challenger, agreement.address, CHALLENGE_ROLE, owner, { from: owner })
          })

          itHandlesTokenBalancePermissionsProperly()
        })

        context('when using a proper balance oracle', () => {
          let balanceOracle

          beforeEach('unset challenge token balance permission', async () => {
            // swap challenge permission token as sign permission token
            await agreement.changeTokenBalancePermission(challengePermissionToken.address, challengePermissionBalance, ZERO_ADDRESS, bn(0), { from: owner })
            assert.isFalse(await agreement.canChallenge(challenger), 'challenger can challenge')
          })

          beforeEach('set balance oracle', async () => {
            balanceOracle = await TokenBalanceOracle.new(challengePermissionToken.address, challengePermissionBalance)
            const param = await balanceOracle.getPermissionParam()
            await deployer.acl.createPermission(ANY_ADDR, agreement.address, CHALLENGE_ROLE, owner, { from: owner })
            await deployer.acl.grantPermissionP(ANY_ADDR, agreement.address, CHALLENGE_ROLE, [param], { from: owner })
          })

          itHandlesTokenBalancePermissionsProperly()
        })
      })
    })
  })
})
