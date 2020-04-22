const { bn, bigExp } = require('./helpers/lib/numbers')

const deployer = require('./helpers/utils/deployer')(web3, artifacts)

const TokenBalanceOracle = artifacts.require('TokenBalanceOracle')

contract('Agreement', ([_, owner, someone, signer]) => {
  let agreement, permissionToken, SIGN_ROLE

  const permissionBalance = bigExp(100, 18)
  const ANY_ADDR = '0xffffffffffffffffffffffffffffffffffffffff'
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

  before('load sign role', async () => {
    await deployer.deployBase()
    SIGN_ROLE = await deployer.base.SIGN_ROLE()
  })

  describe('canSign', () => {
    const itHandlesTokenBalancePermissionsProperly = () => {
      const setTokenBalance = (holder, balance) => {
        beforeEach('mint tokens', async () => {
          const currentBalance = await permissionToken.balanceOf(signer)
          if (currentBalance.eq(balance)) return

          if (currentBalance.gt(balance)) {
            const balanceDiff = currentBalance.sub(balance)
            await permissionToken.destroyTokens(signer, balanceDiff)
          } else {
            const balanceDiff = balance.sub(currentBalance)
            await permissionToken.generateTokens(signer, balanceDiff)
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
        setTokenBalance(signer, permissionBalance.div(2))

        it('returns false', async () => {
          assert.isFalse(await agreement.canSign(signer), 'signer can sign')
        })
      })

      context('when the signer has the requested permission balance', () => {
        setTokenBalance(signer, permissionBalance)

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
          permissionToken = await deployer.deployPermissionToken()
        })

        beforeEach('change to token balance permission', async () => {
          await agreement.changeTokenBalancePermission(permissionToken.address, permissionBalance, { from: owner })
        })

        itHandlesTokenBalancePermissionsProperly()
      })
    })

    context('for token balance permissions', () => {
      before('deploy permission token', async () => {
        permissionToken = await deployer.deployPermissionToken()
      })

      beforeEach('deploy agreement instance', async () => {
        agreement = await deployer.deployAndInitialize({ owner, permissionBalance, signers: [] })
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

          beforeEach('unset token balance permission', async () => {
            await agreement.changeTokenBalancePermission(ZERO_ADDRESS, bn(0), { from: owner })
            assert.isFalse(await agreement.canSign(signer), 'signer can sign')
          })

          beforeEach('set balance oracle', async () => {
            balanceOracle = await TokenBalanceOracle.new(permissionToken.address, permissionBalance)
            const param = await balanceOracle.getPermissionParam()
            await deployer.acl.createPermission(ANY_ADDR, agreement.address, SIGN_ROLE, owner, { from: owner })
            await deployer.acl.grantPermissionP(ANY_ADDR, agreement.address, SIGN_ROLE, [param], { from: owner })
          })

          itHandlesTokenBalancePermissionsProperly()
        })
      })
    })
  })
})
