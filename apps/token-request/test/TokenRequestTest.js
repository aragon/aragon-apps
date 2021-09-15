const ForwarderMock = artifacts.require('ForwarderMock')
const MiniMeToken = artifacts.require('MiniMeToken')
const MiniMeTokenFactory = artifacts.require('MiniMeTokenFactory')
const MockErc20 = artifacts.require('TokenMock')
const TokenManager = artifacts.require('TokenManager')
const TokenRequest = artifacts.require('TokenRequest')
const Vault = artifacts.require('Vault')

const deployDAO = require('./helpers/deployDAO')
const { deployedContract, assertRevert } = require('./helpers/helpers')
const { getEventArgument } = require('@aragon/test-helpers/events')
const { encodeCallScript } = require('@aragon/test-helpers/evmScript')
const { hash: nameHash } = require('eth-ens-namehash')
const getBalanceFn = require('@aragon/test-helpers/balance')
const BN = require('bn.js')

const ETH_ADDRESS = '0x0000000000000000000000000000000000000000'

contract('TokenRequest', ([rootAccount, ...accounts]) => {
  let requestableToken, tokenRequestBase, tokenRequest, tokenManager, tokenManagerBase, mockErc20, vaultBase, vault
  let FINALISE_TOKEN_REQUEST_ROLE, MINT_ROLE, SET_TOKEN_MANAGER_ROLE, SET_VAULT_ROLE, MODIFY_TOKENS_ROLE
  let dao, acl

  const ROOT_ETHER_AMOUNT = 2000
  const ROOT_TOKEN_AMOUNT = 100
  const MOCK_TOKEN_BALANCE = 100000
  const getBalance = getBalanceFn(web3)
  const REFERENCE = 'This is a token request test.'

  before('deploy base apps', async () => {
    tokenRequestBase = await TokenRequest.new()
    FINALISE_TOKEN_REQUEST_ROLE = await tokenRequestBase.FINALISE_TOKEN_REQUEST_ROLE()
    SET_TOKEN_MANAGER_ROLE = await tokenRequestBase.SET_TOKEN_MANAGER_ROLE()
    SET_VAULT_ROLE = await tokenRequestBase.SET_VAULT_ROLE()
    MODIFY_TOKENS_ROLE = await tokenRequestBase.MODIFY_TOKENS_ROLE()

    tokenManagerBase = await TokenManager.new()
    MINT_ROLE = await tokenManagerBase.MINT_ROLE()

    vaultBase = await Vault.new()
  })

  beforeEach('deploy dao and token request', async () => {
    const daoDeployment = await deployDAO(rootAccount)
    dao = daoDeployment.dao
    acl = daoDeployment.acl

    const miniMeTokenFactory = await MiniMeTokenFactory.new()
    requestableToken = await MiniMeToken.new(
      miniMeTokenFactory.address,
      ETH_ADDRESS,
      0,
      'RequestableToken',
      18,
      'RQT',
      true
    )

    const newTokenRequestAppReceipt = await dao.newAppInstance(
      nameHash('token-request.aragonpm.test'),
      tokenRequestBase.address,
      '0x',
      false,
      {
        from: rootAccount,
      }
    )
    tokenRequest = await TokenRequest.at(deployedContract(newTokenRequestAppReceipt))

    const newTokenManagerAppReceipt = await dao.newAppInstance(
      nameHash('token-manager.aragonpm.test'),
      tokenManagerBase.address,
      '0x',
      false,
      { from: rootAccount }
    )
    tokenManager = await TokenManager.at(deployedContract(newTokenManagerAppReceipt))
    await requestableToken.changeController(tokenManager.address)

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

    await vault.initialize()
    await tokenManager.initialize(requestableToken.address, false, 0)

    mockErc20 = await MockErc20.new(rootAccount, MOCK_TOKEN_BALANCE)
  })

  describe('initialize(address _tokenManager, address _vault, address[] _acceptedDepositTokens)', async () => {
    it('reverts when passed non-contract address as token manager', async () => {
      await assertRevert(tokenRequest.initialize(rootAccount, vault.address, []), 'TOKEN_REQUEST_ADDRESS_NOT_CONTRACT')
    })

    it('reverts when passed non-contract address in accepted deposit tokens', async () => {
      await assertRevert(
        tokenRequest.initialize(tokenManager.address, vault.address, [ETH_ADDRESS, rootAccount]),
        'TOKEN_REQUEST_ADDRESS_NOT_CONTRACT'
      )
    })

    it('reverts when passed token list with more tokens than the max accepted', async () => {
      const maxTokens = await tokenRequest.MAX_ACCEPTED_DEPOSIT_TOKENS()
      let tokenList = []
      for (let i = 0; i <= maxTokens.toNumber(); i++) {
        const token = await MockErc20.new(rootAccount, MOCK_TOKEN_BALANCE)
        tokenList.push(token.address)
      }
      await assertRevert(
        tokenRequest.initialize(tokenManager.address, vault.address, tokenList),
        'TOKEN_REQUEST_TOO_MANY_ACCEPTED_TOKENS'
      )
    })

    it('reverts when an accepted token is duplicated', async () => {
      await assertRevert(tokenRequest.initialize(tokenManager.address, vault.address, [mockErc20.address, mockErc20.address]),
        'TOKEN_REQUEST_ACCEPTED_TOKENS_MALFORMED')
    })

    it('reverts when accepted tokens are not in ascending order', async () => {
      const token2 = await MockErc20.new(rootAccount, MOCK_TOKEN_BALANCE)
      const acceptedTokens = token2.address > mockErc20.address ? [token2.address, mockErc20.address] : [mockErc20.address, token2.address]
      await assertRevert(tokenRequest.initialize(vault.address, tokenManager.address, acceptedTokens),
        'TOKEN_REQUEST_ACCEPTED_TOKENS_MALFORMED')
    })

    it('can accept multiple accepted tokens in ascending order', async () => {
      const token2 = await MockErc20.new(rootAccount, MOCK_TOKEN_BALANCE)

      const acceptedTokens = token2.address > mockErc20.address ? [mockErc20.address, token2.address] : [token2.address, mockErc20.address]
      await tokenRequest.initialize(vault.address, tokenManager.address, acceptedTokens)

      const actualTokenAddresses = await tokenRequest.getAcceptedDepositTokens()
      assert.deepStrictEqual(actualTokenAddresses, acceptedTokens)
    })
  })

  describe('initialize(address _tokenManager, address _vault, address[] _acceptedDepositTokens)', () => {
    let acceptedDepositTokens

    beforeEach(async () => {
      acceptedDepositTokens = [ETH_ADDRESS, mockErc20.address]
      await tokenRequest.initialize(tokenManager.address, vault.address, acceptedDepositTokens)
    })

    it('sets correct variables', async () => {
      const actualTokenManager = await tokenRequest.tokenManager()
      const actualVault = await tokenRequest.vault()

      assert.strictEqual(actualTokenManager, tokenManager.address)
      assert.strictEqual(actualVault, vault.address)
    })

    describe('setTokenManager(address _tokenManager)', () => {
      beforeEach(async () => {
        await acl.createPermission(accounts[1], tokenRequest.address, SET_TOKEN_MANAGER_ROLE, rootAccount)
      })

      it('sets a token manager', async () => {
        const expectedTokenManagerAddress = tokenManager.address
        await tokenRequest.setTokenManager(expectedTokenManagerAddress, { from: accounts[1] })

        const actualTokenManager = await tokenRequest.tokenManager()
        assert.strictEqual(actualTokenManager, expectedTokenManagerAddress)
      })

      it('reverts when setting non-contract address', async () => {
        await assertRevert(
          tokenRequest.setTokenManager(rootAccount, { from: accounts[1] }),
          'TOKEN_REQUEST_ADDRESS_NOT_CONTRACT'
        )
      })
    })

    describe('setVault(address _vault)', () => {
      beforeEach(async () => {
        await acl.createPermission(accounts[1], tokenRequest.address, SET_VAULT_ROLE, rootAccount)
      })

      it('sets a vault', async () => {
        const expectedVaultAddress = vault.address
        await tokenRequest.setVault(expectedVaultAddress, { from: accounts[1] })

        const actualVault = await tokenRequest.vault()
        assert.strictEqual(actualVault, expectedVaultAddress)
      })
    })

    describe('addToken(address _token)', async () => {
      beforeEach(async () => {
        await acl.createPermission(accounts[1], tokenRequest.address, MODIFY_TOKENS_ROLE, rootAccount)
      })

      it('adds a token', async () => {
        const newToken = await MockErc20.new(rootAccount, MOCK_TOKEN_BALANCE)
        const expectedTokens = [...acceptedDepositTokens, newToken.address]

        await tokenRequest.addToken(newToken.address, { from: accounts[1] })

        const actualTokens = await tokenRequest.getAcceptedDepositTokens()
        assert.deepStrictEqual(actualTokens, expectedTokens)
      })

      it('adds ETH to acceptedDepositTokens', async () => {
        await tokenRequest.removeToken(ETH_ADDRESS, { from: accounts[1] })
        const expectedTokens = [mockErc20.address, ETH_ADDRESS]

        await tokenRequest.addToken(ETH_ADDRESS, { from: accounts[1] })

        const actualTokens = await tokenRequest.getAcceptedDepositTokens()
        assert.deepStrictEqual(actualTokens, expectedTokens)
      })

      it('cannot add more than max tokens', async () => {
        const maxTokens = await tokenRequest.MAX_ACCEPTED_DEPOSIT_TOKENS()
        for (let i = 0; i < maxTokens - 2; i++) {
          const token = await MockErc20.new(rootAccount, MOCK_TOKEN_BALANCE)
          await tokenRequest.addToken(token.address, { from: accounts[1] })
        }

        const overflowToken = await MockErc20.new(rootAccount, MOCK_TOKEN_BALANCE)
        await assertRevert(
          tokenRequest.addToken(overflowToken.address, { from: accounts[1] }),
          'TOKEN_REQUEST_TOO_MANY_ACCEPTED_TOKENS'
        )
      })

      it('reverts when adding non-contract address', async () => {
        await assertRevert(
          tokenRequest.addToken(rootAccount, { from: accounts[1] }),
          'TOKEN_REQUEST_ADDRESS_NOT_CONTRACT'
        )
      })

      it('reverts when adding already added token', async () => {
        await assertRevert(
          tokenRequest.addToken(ETH_ADDRESS, { from: accounts[1] }),
          'TOKEN_REQUEST_TOKEN_ALREADY_ACCEPTED'
        )
      })
    })

    describe('removeToken(address _token)', async () => {
      beforeEach(async () => {
        await acl.createPermission(accounts[1], tokenRequest.address, MODIFY_TOKENS_ROLE, rootAccount)
      })

      it('removes a token', async () => {
        const expectedTokens = [ETH_ADDRESS]

        await tokenRequest.removeToken(mockErc20.address, { from: accounts[1] })

        const actualTokens = await tokenRequest.getAcceptedDepositTokens()
        assert.deepStrictEqual(actualTokens, expectedTokens)
      })

      it('reverts when removing unaccepted token', async () => {
        await assertRevert(
          tokenRequest.removeToken(rootAccount, { from: accounts[1] }),
          'TOKEN_REQUEST_TOKEN_NOT_ACCEPTED'
        )
      })
    })

    describe('createTokenRequest(address _depositToken, uint256 _depositAmount, uint256 _requestAmount, string _reference)', () => {
      it('creates a new token request in exchange for Ether', async () => {
        const expectedEtherBalance = 2000
        const expectedNextTokenRequestId = 1

        const receipt = await tokenRequest.createTokenRequest(ETH_ADDRESS, ROOT_ETHER_AMOUNT, 1, REFERENCE, {
          value: ROOT_ETHER_AMOUNT,
        })
        const actualReference = getEventArgument(receipt, 'TokenRequestCreated', 'reference')
        const actualEtherBalance = (await getBalance(tokenRequest.address)).valueOf()
        const actualNextTokenRequestId = await tokenRequest.nextTokenRequestId()

        assert.equal(actualEtherBalance, expectedEtherBalance)
        assert.equal(actualNextTokenRequestId, expectedNextTokenRequestId)
        assert.equal(actualReference, REFERENCE)
      })

      it('should not create a new request with different _depositAmount and value', async () => {
        await assertRevert(
          tokenRequest.createTokenRequest(ETH_ADDRESS, 100, 1, REFERENCE, {
            value: 50,
          }),
          'TOKEN_REQUEST_ETH_VALUE_MISMATCH'
        )
      })

      it('creates a new token request in exchange for TokenMock', async () => {
        const expectedTokenRequestBalance = ROOT_TOKEN_AMOUNT
        const expectedNextTokenRequestId = 1

        await mockErc20.approve(tokenRequest.address, ROOT_TOKEN_AMOUNT, {
          from: rootAccount,
        })

        const receipt = await tokenRequest.createTokenRequest(mockErc20.address, ROOT_TOKEN_AMOUNT, 300, REFERENCE)
        const actualReference = getEventArgument(receipt, 'TokenRequestCreated', 'reference')
        const actualTokenRequestBalance = await mockErc20.balanceOf(tokenRequest.address)

        const actualNextTokenRequestId = await tokenRequest.nextTokenRequestId()

        assert.equal(actualTokenRequestBalance, expectedTokenRequestBalance)
        assert.equal(actualNextTokenRequestId, expectedNextTokenRequestId)
        assert.equal(actualReference, REFERENCE)
      })

      it('should not create a new request without token approve', async () => {
        await assertRevert(
          tokenRequest.createTokenRequest(mockErc20.address, 100, 1, REFERENCE),
          'TOKEN_REQUEST_TOKEN_TRANSFER_REVERTED'
        )
      })
    })

    describe('finaliseTokenRequest(uint256 _tokenRequestId)', () => {
      let script, failureScript, forwarderMock, forwarderMockBase
      beforeEach(async () => {
        forwarderMockBase = await ForwarderMock.new()
        const newForwarderMockReceipt = await dao.newAppInstance('0x9876', forwarderMockBase.address, '0x', false, {
          from: rootAccount,
        })
        forwarderMock = await ForwarderMock.at(deployedContract(newForwarderMockReceipt))

        await forwarderMock.initialize()

        await acl.createPermission(tokenRequest.address, tokenManager.address, MINT_ROLE, rootAccount)
        await acl.createPermission(
          forwarderMock.address,
          tokenRequest.address,
          FINALISE_TOKEN_REQUEST_ROLE,
          rootAccount
        )

        const action = {
          to: tokenRequest.address,
          calldata: tokenRequest.contract.methods.finaliseTokenRequest(0).encodeABI(),
        }
        const failureAction = {
          to: tokenRequest.address,
          calldata: tokenRequest.contract.methods.finaliseTokenRequest(1).encodeABI(),
        }
        script = encodeCallScript([action])
        failureScript = encodeCallScript([failureAction])
      })

      it('finalise token request (ERC20)', async () => {
        const expectedUserMiniMeBalance = 300
        const expectedVaultBalance = ROOT_TOKEN_AMOUNT

        await mockErc20.approve(tokenRequest.address, ROOT_TOKEN_AMOUNT, {
          from: rootAccount,
        })
        await tokenRequest.createTokenRequest(
          mockErc20.address,
          expectedVaultBalance,
          expectedUserMiniMeBalance,
          REFERENCE,
          {
            from: rootAccount,
          }
        )

        await forwarderMock.forward(script, { from: rootAccount })

        const actualUserMiniMeBalance = await tokenManager.spendableBalanceOf(rootAccount)
        const actualVaultBalance = await vault.balance(mockErc20.address)

        assert.equal(actualUserMiniMeBalance, expectedUserMiniMeBalance)
        assert.equal(actualVaultBalance, expectedVaultBalance)
      })

      it('finalise token request (ETH)', async () => {
        const expectedUserMiniMeBalance = 300
        const expectedVaultBalance = 200

        await tokenRequest.createTokenRequest(ETH_ADDRESS, expectedVaultBalance, expectedUserMiniMeBalance, REFERENCE, {
          from: rootAccount,
          value: expectedVaultBalance,
        })

        await forwarderMock.forward(script, { from: rootAccount })

        const actualUserMiniMeBalance = await tokenManager.spendableBalanceOf(rootAccount)
        const actualVaultBalance = await vault.balance(ETH_ADDRESS)

        assert.equal(actualUserMiniMeBalance, expectedUserMiniMeBalance)
        assert.equal(actualVaultBalance, expectedVaultBalance)
      })

      it('finalise token request (ETH) when 0 is deposited', async () => {
        const expectedUserMiniMeBalance = 300
        const expectedVaultBalance = 0

        await tokenRequest.createTokenRequest(ETH_ADDRESS, expectedVaultBalance, expectedUserMiniMeBalance, REFERENCE, {
          from: rootAccount,
          value: expectedVaultBalance,
        })

        await forwarderMock.forward(script, { from: rootAccount })

        const actualUserMiniMeBalance = await tokenManager.spendableBalanceOf(rootAccount)
        const actualVaultBalance = await vault.balance(ETH_ADDRESS)

        assert.equal(actualUserMiniMeBalance, expectedUserMiniMeBalance)
        assert.equal(actualVaultBalance, expectedVaultBalance)
      })

      it('it should not finalise the same request twice', async () => {
        const expectedUserMiniMeBalance = 300
        const expectedVaultBalance = 200

        await tokenRequest.createTokenRequest(ETH_ADDRESS, expectedVaultBalance, expectedUserMiniMeBalance, REFERENCE, {
          from: rootAccount,
          value: expectedVaultBalance,
        })

        await tokenRequest.createTokenRequest(ETH_ADDRESS, expectedVaultBalance, expectedUserMiniMeBalance, REFERENCE, {
          from: rootAccount,
          value: expectedVaultBalance,
        })

        await forwarderMock.forward(script, { from: rootAccount })

        await assertRevert(forwarderMock.forward(script, { from: rootAccount }), 'TOKEN_REQUEST_NOT_PENDING')
      })

      it('it should not finalise a request that does not exist', async () => {
        const expectedUserMiniMeBalance = 300
        const expectedVaultBalance = 200

        await tokenRequest.createTokenRequest(ETH_ADDRESS, expectedVaultBalance, expectedUserMiniMeBalance, REFERENCE, {
          from: rootAccount,
          value: expectedVaultBalance,
        })

        await assertRevert(forwarderMock.forward(failureScript, { from: rootAccount }), 'TOKEN_REQUEST_NO_REQUEST')
      })

      it('it should revert if ETH transfer fails', async () => {
        const expectedUserMiniMeBalance = 50
        const expectedVaultBalance = 1
        await acl.createPermission(accounts[1], tokenRequest.address, SET_VAULT_ROLE, rootAccount)
        await tokenRequest.setVault(mockErc20.address, { from: accounts[1] })

        await tokenRequest.createTokenRequest(ETH_ADDRESS, expectedVaultBalance, expectedUserMiniMeBalance, REFERENCE, {
          from: rootAccount,
          value: expectedVaultBalance,
        })

        await assertRevert(forwarderMock.forward(script, { from: rootAccount }), 'TOKEN_REQUEST_ETH_TRANSFER_FAILED')
      })
    })

    describe('refundTokenRequest(uint256 _tokenRequestId)', () => {
      const refundEthAccount = accounts[2]
      it('refund token (ERC20)', async () => {
        const refundAmount = 100
        const expectedUserBalance = await mockErc20.balanceOf(rootAccount)

        await mockErc20.approve(tokenRequest.address, refundAmount, {
          from: rootAccount,
        })
        await tokenRequest.createTokenRequest(mockErc20.address, refundAmount, 1, REFERENCE, {
          from: rootAccount,
        })

        await tokenRequest.refundTokenRequest(0, { from: rootAccount })

        const actualUserBalance = await mockErc20.balanceOf(rootAccount)
        assert.equal(Number(actualUserBalance), Number(expectedUserBalance))
      })

      it('refund ETH', async () => {
        const weiValue = 3000000000000000
        const expectedETHBalance = await web3.eth.getBalance(refundEthAccount)

        const request = await tokenRequest.createTokenRequest(ETH_ADDRESS, weiValue, 1, REFERENCE, {
          value: weiValue,
          from: refundEthAccount,
        })

        const requestTransaction = await web3.eth.getTransaction(request.tx)
        const requestGasUsed = new BN(request.receipt.gasUsed)
        const requestTransactionGasPrice = new BN(requestTransaction.gasPrice)
        const requestPrice = new BN(requestGasUsed.mul(requestTransactionGasPrice))

        const refund = await tokenRequest.refundTokenRequest(0, { from: refundEthAccount })
        const refundTransaction = await web3.eth.getTransaction(refund.tx)

        const refundGasUsed = new BN(refund.receipt.gasUsed)
        const refundGasPrice = new BN(refundTransaction.gasPrice)
        const refundPrice = new BN(refundGasUsed.mul(refundGasPrice))

        let actualBalance = new BN(await web3.eth.getBalance(refundEthAccount))
        const actualETHBalance = actualBalance.add(refundPrice).add(requestPrice)

        assert.equal(actualETHBalance, expectedETHBalance)
      })

      it('refund 0 ETH when 0 is deposited', async () => {
        const zeroWei = 0
        const expectedETHBalance = await web3.eth.getBalance(refundEthAccount)

        const request = await tokenRequest.createTokenRequest(ETH_ADDRESS, zeroWei, 1, REFERENCE, {
          value: zeroWei,
          from: refundEthAccount,
        })

        const requestTransaction = await web3.eth.getTransaction(request.tx)
        const requestGasUsed = new BN(request.receipt.gasUsed)
        const requestGasPrice = new BN(requestTransaction.gasPrice)
        const requestFee = new BN(requestGasUsed.mul(requestGasPrice))

        const refund = await tokenRequest.refundTokenRequest(0, { from: refundEthAccount })
        const refundTransaction = await web3.eth.getTransaction(refund.tx)

        const refundGasUsed = new BN(refund.receipt.gasUsed)
        const refundGasPrice = new BN(refundTransaction.gasPrice)
        const refundFee = new BN(refundGasUsed.mul(refundGasPrice))

        let actualBalance = new BN(await web3.eth.getBalance(refundEthAccount))
        const actualETHBalance = actualBalance.add(refundFee).add(requestFee)

        assert.equal(actualETHBalance, expectedETHBalance)
      })

      it('should not refund a a token request from other user', async () => {
        await mockErc20.approve(tokenRequest.address, ROOT_TOKEN_AMOUNT, {
          from: rootAccount,
        })
        await tokenRequest.createTokenRequest(mockErc20.address, ROOT_TOKEN_AMOUNT, 1, REFERENCE, {
          from: rootAccount,
        })

        await assertRevert(tokenRequest.refundTokenRequest(0, { from: accounts[1] }), 'TOKEN_REQUEST_NOT_OWNER')
      })

      it('should not refund the same request twice', async () => {
        const weiValue = 1000000000000000
        await tokenRequest.createTokenRequest(ETH_ADDRESS, weiValue, 1, REFERENCE, {
          value: weiValue,
          from: refundEthAccount,
        })

        await tokenRequest.refundTokenRequest(0, { from: refundEthAccount })

        await assertRevert(tokenRequest.refundTokenRequest(0, { from: refundEthAccount }), 'TOKEN_REQUEST_NOT_PENDING')
      })

      it('should not refund a request that does not exist', async () => {
        const weiValue = 1000000000000000
        await tokenRequest.createTokenRequest(ETH_ADDRESS, weiValue, 1, REFERENCE, {
          value: weiValue,
          from: refundEthAccount,
        })

        await assertRevert(tokenRequest.refundTokenRequest(1, { from: refundEthAccount }), 'TOKEN_REQUEST_NO_REQUEST')
      })
    })

    describe('transferToVault(address _token)', () => {
      it('reverts', async () => {
        await assertRevert(
          tokenRequest.transferToVault(mockErc20.address),
          'RECOVER_DISALLOWED')
      })
    })
  })
})
