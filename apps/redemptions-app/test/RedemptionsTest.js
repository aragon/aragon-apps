const Redemptions = artifacts.require('Redemptions')
const TokenManager = artifacts.require('TokenManager')
const Vault = artifacts.require('Vault')
const MiniMeTokenFactory = artifacts.require('MiniMeTokenFactory')
const MiniMeToken = artifacts.require('MiniMeToken')
const Erc20 = artifacts.require('ERC20Token')

const deployDAO = require('./helpers/deployDAO')
const { assertRevert, deployedContract, getSeconds, timeTravel } = require('./helpers/helpers')
const { hash: nameHash } = require('eth-ens-namehash')

const ANY_ADDRESS = '0xffffffffffffffffffffffffffffffffffffffff'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const ETHER_FAKE_ADDRESS = ZERO_ADDRESS

contract('Redemptions', ([rootAccount, redeemer, ...accounts]) => {
  let REDEEM_ROLE, ADD_TOKEN_ROLE, REMOVE_TOKEN_ROLE
  let TRANSFER_ROLE, MINT_ROLE, ISSUE_ROLE, ASSIGN_ROLE, REVOKE_VESTINGS_ROLE, BURN_ROLE
  let vaultBase,
    vault,
    burnableToken,
    redemptionsBase,
    redemptions,
    tokenManagerBase,
    tokenManager,
    token0
  let dao, acl

  before('deploy base apps', async () => {
    vaultBase = await Vault.new()
    redemptionsBase = await Redemptions.new()
    tokenManagerBase = await TokenManager.new()

    REDEEM_ROLE = await redemptionsBase.REDEEM_ROLE()
    ADD_TOKEN_ROLE = await redemptionsBase.ADD_TOKEN_ROLE()
    REMOVE_TOKEN_ROLE = await redemptionsBase.REMOVE_TOKEN_ROLE()

    MINT_ROLE = await tokenManagerBase.MINT_ROLE()
    ISSUE_ROLE = await tokenManagerBase.ISSUE_ROLE()
    ASSIGN_ROLE = await tokenManagerBase.ASSIGN_ROLE()
    REVOKE_VESTINGS_ROLE = await tokenManagerBase.REVOKE_VESTINGS_ROLE()
    BURN_ROLE = await tokenManagerBase.BURN_ROLE()
    TRANSFER_ROLE = await vaultBase.TRANSFER_ROLE()
  })

  beforeEach('deploy dao and redemptions', async () => {
    const daoDeployment = await deployDAO(rootAccount)
    dao = daoDeployment.dao
    acl = daoDeployment.acl

    const newVaultAppReceipt = await dao.newAppInstance(
      nameHash('vault.aragonpm.test'),
      vaultBase.address,
      '0x',
      false,
      {
        from: rootAccount,
      }
    )
    vault = await Vault.at(deployedContract(newVaultAppReceipt))

    const newTokenManagerAppReceipt = await dao.newAppInstance(
      nameHash('token-manager.aragonpm.test'),
      tokenManagerBase.address,
      '0x',
      false,
      {
        from: rootAccount,
      }
    )
    tokenManager = await TokenManager.at(deployedContract(newTokenManagerAppReceipt))

    const newRedemptionsAppReceipt = await dao.newAppInstance(
      nameHash('redemptions.aragonpm.test'),
      redemptionsBase.address,
      '0x',
      false,
      {
        from: rootAccount,
      }
    )
    redemptions = await Redemptions.at(deployedContract(newRedemptionsAppReceipt))

    await acl.createPermission(ANY_ADDRESS, redemptions.address, REDEEM_ROLE, rootAccount, {
      from: rootAccount,
    })
    await acl.createPermission(ANY_ADDRESS, redemptions.address, ADD_TOKEN_ROLE, rootAccount, {
      from: rootAccount,
    })
    await acl.createPermission(ANY_ADDRESS, redemptions.address, REMOVE_TOKEN_ROLE, rootAccount, {
      from: rootAccount,
    })

    const miniMeTokenFactory = await MiniMeTokenFactory.new()
    burnableToken = await MiniMeToken.new(
      miniMeTokenFactory.address,
      ZERO_ADDRESS,
      0,
      'Redemption Token',
      18,
      'RDT',
      true
    )

    await burnableToken.changeController(tokenManager.address)
    token0 = await Erc20.new(rootAccount, '', '')

    await tokenManager.initialize(burnableToken.address, false, 0)
    await vault.initialize()
  })

  describe('initialize(Vault _vault, TokenManager _tokenManager)', async () => {
    it('reverts when passed non-contract address as vault', async () => {
      await assertRevert(
        redemptions.initialize(rootAccount, tokenManager.address, [token0.address]),
        'REDEMPTIONS_VAULT_NOT_CONTRACT'
      )
    })

    it('reverts when passed non-contract address as token manager', async () => {
      await assertRevert(
        redemptions.initialize(vault.address, rootAccount, [token0.address]),
        'REDEMPTIONS_TOKEN_MANAGER_NOT_CONTRACT'
      )
    })

    it('reverts when passed non-contract address as one of the redeemable tokens', async () => {
      await assertRevert(
        redemptions.initialize(vault.address, tokenManager.address, [token0.address, rootAccount]),
        'REDEMPTIONS_TOKEN_NOT_CONTRACT'
      )
    })

    it('reverts when a redeemable token is duplicated', async () => {
      await assertRevert(redemptions.initialize(vault.address, tokenManager.address, [token0.address, token0.address]),
        'REDEMPTIONS_DUPLICATE_REDEEMABLE_TOKEN')
    })

    it('can accept multiple redeemable tokens', async () => {
      const token1 = await Erc20.new(rootAccount, '', '')
      const expectedRedeemableTokens = [token0.address, token1.address]
      await redemptions.initialize(vault.address, tokenManager.address, expectedRedeemableTokens)

      const actualTokenAddresses = await redemptions.getRedeemableTokens()
      assert.deepStrictEqual(actualTokenAddresses, expectedRedeemableTokens)
    })
  })

  context('initialize(Vault _vault, TokenManager _tokenManager)', () => {
    beforeEach(async () => {
      await redemptions.initialize(vault.address, tokenManager.address, [token0.address])
    })

    it('should set initial values correctly', async () => {
      const actualVaultAddress = await redemptions.vault()
      const actualTokenManager = await redemptions.tokenManager()
      const actualBurnableToken = await redemptions.getToken()
      const actualTokenAddresses = await redemptions.getRedeemableTokens()

      assert.strictEqual(actualVaultAddress, vault.address)
      assert.strictEqual(actualTokenManager, tokenManager.address)
      assert.strictEqual(actualBurnableToken, burnableToken.address)
      assert.deepStrictEqual(actualTokenAddresses, [token0.address])
    })

    it('reverts when re-initializing contract', async () => {
      await assertRevert(
        redemptions.initialize(vault.address, tokenManager.address, [token0.address]),
        'INIT_ALREADY_INITIALIZED'
      )
    })

    // Test to not decrease coverage (convenience function for radspec)
    it('should get ETH fake Address', async () => {
      assert.strictEqual(await redemptions.getETHAddress(), ETHER_FAKE_ADDRESS)
    })

    context('addRedeemableToken(address _token)', () => {
      it('should add an address to the vault tokens', async () => {
        const token1 = await Erc20.new(rootAccount, '', '')
        const expectedTokenAddresses = [token0.address, token1.address]

        await redemptions.addRedeemableToken(token1.address)

        const actualTokenAddresses = await redemptions.getRedeemableTokens()
        const actualTokenAddedToken = await redemptions.redeemableTokenAdded(token1.address)
        assert.deepStrictEqual(actualTokenAddresses, expectedTokenAddresses)
        assert.isTrue(actualTokenAddedToken)
      })

      it('should add ether fake address to the vault tokens', async () => {
        await redemptions.addRedeemableToken(ETHER_FAKE_ADDRESS)

        const etherAdded = await redemptions.redeemableTokenAdded(ETHER_FAKE_ADDRESS)
        assert.isTrue(etherAdded)
      })

      it('reverts when adding more than max allowed redeemable tokens ', async () => {
        const redeemableTokensMaxSize = await redemptions.REDEEMABLE_TOKENS_MAX_SIZE()

        for (let i = 0; i < redeemableTokensMaxSize - 1; i++) {
          const token = await Erc20.new(rootAccount, '', '')
          await redemptions.addRedeemableToken(token.address)
        }

        const token = await Erc20.new(rootAccount, '', '')
        await assertRevert(
          redemptions.addRedeemableToken(token.address),
          'REDEMPTIONS_REDEEMABLE_TOKEN_LIST_FULL'
        )
      })

      it('reverts when adding already added token', async () => {
        await assertRevert(
          redemptions.addRedeemableToken(token0.address),
          'REDEMPTIONS_TOKEN_ALREADY_ADDED'
        )
      })

      it('reverts when adding non-contract address', async () => {
        await assertRevert(
          redemptions.addRedeemableToken(accounts[0]),
          'REDEMPTIONS_TOKEN_NOT_CONTRACT'
        )
      })
    })

    context('removeRedeemableToken(address _token)', () => {
      it('Should remove token address', async () => {
        const expectedTokenAddresses = [token0.address].slice(1)

        await redemptions.removeRedeemableToken(token0.address)

        const actualTokenAddresses = await redemptions.getRedeemableTokens()
        const actualTokenAddedToken = await redemptions.redeemableTokenAdded(token0.address)

        assert.deepStrictEqual(actualTokenAddresses, expectedTokenAddresses)
        assert.isFalse(actualTokenAddedToken)
      })

      it('reverts if removing token not present', async () => {
        await assertRevert(
          redemptions.removeRedeemableToken(accounts[0]),
          'REDEMPTIONS_TOKEN_NOT_ADDED.'
        )
      })
    })

    context('redeem(uint256 _amount)', () => {
      let token1

      const rootAccountAmount = 80000
      const redeemerAmount = 20000

      const vaultToken0Amount = 45231
      const vaultToken1Amount = 20001

      beforeEach(async () => {
        // set permissions
        await acl.createPermission(rootAccount, tokenManager.address, MINT_ROLE, rootAccount, {
          from: rootAccount,
        })
        await acl.createPermission(
          redemptions.address,
          tokenManager.address,
          BURN_ROLE,
          rootAccount,
          {
            from: rootAccount,
          }
        )
        await acl.createPermission(redemptions.address, vault.address, TRANSFER_ROLE, rootAccount, {
          from: rootAccount,
        })

        token1 = await Erc20.new(rootAccount, '', '')

        await redemptions.addRedeemableToken(token1.address)

        // transfer tokens to vault
        await token0.transfer(vault.address, vaultToken0Amount)
        await token1.transfer(vault.address, vaultToken1Amount)

        // mint redeemableTokens to first two accounts
        await tokenManager.mint(rootAccount, rootAccountAmount)
        await tokenManager.mint(redeemer, redeemerAmount)
      })

      it('Should redeem tokens as expected', async () => {
        const burnableTokenTotalSupply = await burnableToken.totalSupply()
        const expectedRedeemableBalance = 0
        const expectedRedemptionToken0 = parseInt(
          (redeemerAmount * vaultToken0Amount) / burnableTokenTotalSupply
        )
        const expectedRedemptionToken1 = parseInt(
          (redeemerAmount * vaultToken1Amount) / burnableTokenTotalSupply
        )

        await redemptions.redeem(redeemerAmount, { from: redeemer })

        const actualRedeemableBalance = await tokenManager.spendableBalanceOf(redeemer)
        const actualRedemptionToken0 = await token0.balanceOf(redeemer)
        const actualRedemptionToken1 = await token1.balanceOf(redeemer)

        assert.equal(actualRedeemableBalance, expectedRedeemableBalance)
        assert.equal(actualRedemptionToken0, expectedRedemptionToken0)
        assert.equal(actualRedemptionToken1, expectedRedemptionToken1)
      })

      it('should allow redeeming up to max redeemable tokens and no more', async () => {
        const maxGasAllowed = 3000000
        const redeemableTokensMaxSize = await redemptions.REDEEMABLE_TOKENS_MAX_SIZE()
        const burnableTokenTotalSupply = await burnableToken.totalSupply()
        const expectedRedemptionTokenBalance = parseInt(
          (redeemerAmount * vaultToken0Amount) / burnableTokenTotalSupply
        )
        const tokens = []

        for (let i = 0; i < redeemableTokensMaxSize - 2; i++) {
          const token = await Erc20.new(rootAccount, '', '')
          await redemptions.addRedeemableToken(token.address)
          await token.transfer(vault.address, vaultToken0Amount)
          tokens.push(token)
        }
        const token = await Erc20.new(rootAccount, '', '')
        await assertRevert(
          redemptions.addRedeemableToken(token.address),
          'REDEMPTIONS_REDEEMABLE_TOKEN_LIST_FULL'
        ) // Cannot add more than max redeemable tokens

        const receipt = await redemptions.redeem(redeemerAmount, { from: redeemer })

        const actualRedemptionTokenBalance = await tokens[tokens.length - 1].balanceOf(redeemer)
        assert.equal(actualRedemptionTokenBalance, expectedRedemptionTokenBalance)
        assert.isBelow(receipt.receipt.gasUsed, maxGasAllowed)
      })

      it('reverts if there is no eligible assets in the vault', async () => {
        await redemptions.removeRedeemableToken(token0.address)
        await redemptions.removeRedeemableToken(token1.address)

        await assertRevert(redemptions.redeem(redeemerAmount, { from: redeemer }), 'REDEMPTIONS_CANNOT_REDEEM_ZERO')
        const actualRedeemableBalance = await tokenManager.spendableBalanceOf(redeemer)
        assert.equal(actualRedeemableBalance.toNumber(), redeemerAmount)
      })

      it('reverts if amount to redeem is zero', async () => {
        await assertRevert(
          redemptions.redeem(0, {
            from: redeemer,
          }),
          'REDEMPTIONS_CANNOT_BURN_ZERO'
        )
      })

      it("reverts if amount to redeem exceeds account's balance", async () => {
        await assertRevert(
          redemptions.redeem(redeemerAmount + 1, { from: redeemer }),
          'REDEMPTIONS_INSUFFICIENT_BALANCE'
        )
      })

      it('reverts if all redeemable token amounts are zero', async () => {
        await token0.burn(vault.address, vaultToken0Amount)
        await token1.burn(vault.address, vaultToken1Amount)

        await assertRevert(redemptions.redeem(redeemerAmount, { from: redeemer }), 'REDEMPTIONS_CANNOT_REDEEM_ZERO')
      })

      context('respect vesting', () => {
        const vestingAmount = 200

        let TIME_TO_CLIFF
        let TIME_TO_VESTING

        beforeEach(async () => {
          await acl.createPermission(ANY_ADDRESS, tokenManager.address, ISSUE_ROLE, rootAccount, {
            from: rootAccount,
          })
          await acl.createPermission(ANY_ADDRESS, tokenManager.address, ASSIGN_ROLE, rootAccount, {
            from: rootAccount,
          })
          await acl.createPermission(
            ANY_ADDRESS,
            vault.address,
            REVOKE_VESTINGS_ROLE,
            rootAccount,
            {
              from: rootAccount,
            }
          )

          const NOW = getSeconds()
          const start = NOW + 1
          const cliff = start + 4
          const vesting = start + 10

          TIME_TO_CLIFF = cliff - NOW
          TIME_TO_VESTING = vesting - NOW

          await tokenManager.issue(vestingAmount)
          await tokenManager.assignVested(redeemer, vestingAmount, start, cliff, vesting, true)
        })

        it('reverts when redeeming tokens before vesting starts', async () => {
          await assertRevert(
            redemptions.redeem(redeemerAmount + 1, { from: redeemer }),
            'REDEMPTIONS_INSUFFICIENT_BALANCE'
          )
        })

        it('reverts when redeeming tokens before cliff', async () => {
          await timeTravel(web3)(TIME_TO_CLIFF - 1)
          await assertRevert(
            redemptions.redeem(redeemerAmount + 1, { from: redeemer }),
            'REDEMPTIONS_INSUFFICIENT_BALANCE'
          )
        })

        it('should redeem partial amount of vested tokens after cliff', async () => {
          await timeTravel(web3)(TIME_TO_CLIFF + 2)

          const amountToRedeem = redeemerAmount + 1
          await redemptions.redeem(amountToRedeem, {
            from: redeemer,
          })
        })

        it('should redeem all tokens after vesting', async () => {
          await timeTravel(web3)(TIME_TO_VESTING + 1)
          const expectedRedeemableBalance = 0
          await await redemptions.redeem(redeemerAmount + vestingAmount, {
            from: redeemer,
          })

          const actualRedeemableBalance = await tokenManager.spendableBalanceOf(redeemer)
          assert.equal(actualRedeemableBalance, expectedRedeemableBalance)
        })
      })
    })
  })

  context('app not initialized', () => {
    it('reverts on adding token ', async () => {
      await assertRevert(redemptions.addRedeemableToken(ANY_ADDRESS), 'APP_AUTH_FAILED')
    })
    it('reverts on removing token ', async () => {
      await assertRevert(redemptions.removeRedeemableToken(ANY_ADDRESS), 'APP_AUTH_FAILED')
    })
    it('reverts on redeeming tokens ', async () => {
      await assertRevert(redemptions.redeem(1), 'APP_AUTH_FAILED')
    })
  })
})
