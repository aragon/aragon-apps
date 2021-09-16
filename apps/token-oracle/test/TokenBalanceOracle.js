const { assertRevert } = require('./helpers/helpers')
const Oracle = artifacts.require('TokenBalanceOracle')
const MockErc20 = artifacts.require('TokenMock')
const ExecutionTarget = artifacts.require('ExecutionTarget')

const deployDAO = require('./helpers/deployDao')
const { deployedContract } = require('./helpers/helpers')
const { hash: nameHash } = require('eth-ens-namehash')
const BN = require('bn.js')

const ANY_ADDR = '0xffffffffffffffffffffffffffffffffffffffff'

contract(
  'TokenBalanceOracle',
  ([appManager, accountBal900, accountBal100, accountBal0, nonContractAddress]) => {
    let oracleBase, oracle, mockErc20
    let SET_TOKEN_ROLE, SET_MIN_BALANCE_ROLE

    const ORACLE_MINIMUM_BALANCE = 100
    const MOCK_TOKEN_BALANCE = 1000

    before('deploy base apps', async () => {
      oracleBase = await Oracle.new()
      SET_TOKEN_ROLE = await oracleBase.SET_TOKEN_ROLE()
      SET_MIN_BALANCE_ROLE = await oracleBase.SET_MIN_BALANCE_ROLE()
    })

    beforeEach('deploy dao and token balance oracle', async () => {
      const daoDeployment = await deployDAO(appManager)
      dao = daoDeployment.dao
      acl = daoDeployment.acl

      const newOracleReceipt = await dao.newAppInstance(
        nameHash('token-balance-oracle.aragonpm.test'),
        oracleBase.address,
        '0x',
        false,
        {
          from: appManager,
        }
      )
      oracle = await Oracle.at(deployedContract(newOracleReceipt))
      mockErc20 = await MockErc20.new(accountBal900, MOCK_TOKEN_BALANCE)
      mockErc20.transfer(accountBal100, ORACLE_MINIMUM_BALANCE, { from: accountBal900 })
    })

    describe('initialize(address _token)', () => {
      beforeEach('initialize oracle', async () => {
        await oracle.initialize(mockErc20.address, ORACLE_MINIMUM_BALANCE)
      })

      it('sets variables as expected', async () => {
        const actualToken = await oracle.token()
        const hasInitialized = await oracle.hasInitialized()

        assert.strictEqual(actualToken, mockErc20.address)
        assert.isTrue(hasInitialized)
      })

      it('reverts on reinitialization', async () => {
        await assertRevert(
          oracle.initialize(mockErc20.address, ORACLE_MINIMUM_BALANCE),
          'INIT_ALREADY_INITIALIZED'
        )
      })

      describe('setToken(address _token)', () => {
        beforeEach('set permission', async () => {
          await acl.createPermission(appManager, oracle.address, SET_TOKEN_ROLE, appManager)
        })

        it('sets a new token', async () => {
          const newMockErc20 = await MockErc20.new(appManager, 100)
          const expectedToken = newMockErc20.address

          await oracle.setToken(expectedToken)

          const actualToken = await oracle.token()
          assert.equal(actualToken, expectedToken)
        })

        it('reverts when setting a non contract token address', async () => {
          await assertRevert(oracle.setToken(nonContractAddress), 'ORACLE_TOKEN_NOT_CONTRACT')
        })
      })

      describe('setBalance(uint256 _minBalance)', () => {
        beforeEach('set permission', async () => {
          await acl.createPermission(appManager, oracle.address, SET_MIN_BALANCE_ROLE, appManager)
        })

        it('sets a new minimum balance', async () => {
          const expectedNewBalance = 100
          await oracle.setMinBalance(expectedNewBalance)

          const actualNewBalance = await oracle.minBalance()
          assert.equal(actualNewBalance, expectedNewBalance)
        })
      })

      describe('canPerform(address, address, bytes32, uint256[])', async () => {
        context(`Required balance is ${ORACLE_MINIMUM_BALANCE}`, () => {
          it('can perform action if account has exactly the minimum required balance passed as param', async () => {
            assert.isTrue(await oracle.canPerform(ANY_ADDR, ANY_ADDR, '0x', [accountBal900]))
          })

          it('can perform action if account has exactly the minimum required balance', async () => {
            assert.isTrue(await oracle.canPerform(ANY_ADDR, ANY_ADDR, '0x', [accountBal100]))
          })

          it("can't perform action if account does not have tokens", async () => {
            assert.isFalse(await oracle.canPerform(ANY_ADDR, ANY_ADDR, '0x', [accountBal0]))
          })
        })

        context(`Required balance is 1`, () => {
          beforeEach('set minimum required balance to 1', async () => {
            await acl.createPermission(appManager, oracle.address, SET_MIN_BALANCE_ROLE, appManager)
            await oracle.setMinBalance(1)
          })

          it('all accounts with positive balance can perform action', async () => {
            assert.isTrue(await oracle.canPerform(ANY_ADDR, ANY_ADDR, '0x', [accountBal900]))
            assert.isTrue(await oracle.canPerform(ANY_ADDR, ANY_ADDR, '0x', [accountBal100]))
          })

          it("can't perform action if account does not have tokens", async () => {
            assert.isFalse(await oracle.canPerform(ANY_ADDR, ANY_ADDR, '0x', [accountBal0]))
          })
        })

        it('reverts when no sender passed as param', async () => {
          await assertRevert(
            oracle.canPerform(ANY_ADDR, ANY_ADDR, '0x', []),
            'TOKEN_BALANCE_ORACLE_SENDER_MISSING'
          )
        })

        it('reverts when sender too big', async () => {
          await assertRevert(
            oracle.canPerform(ANY_ADDR, ANY_ADDR, '0x', [new BN(2).pow(new BN(160))]),
            'TOKEN_BALANCE_ORACLE_SENDER_TOO_BIG'
          )
        })

        it('reverts when passed address zero', async () => {
          await assertRevert(
            oracle.canPerform(ANY_ADDR, ANY_ADDR, '0x', [0]),
            'TOKEN_BALANCE_ORACLE_SENDER_ZERO'
          )
        })
      })
    })
    describe('app not initialized', () => {
      it('reverts on setting token', async () => {
        await assertRevert(oracle.setToken(mockErc20.address), 'APP_AUTH_FAILED')
      })

      it('reverts on setting balance', async () => {
        await assertRevert(oracle.setMinBalance(0), 'APP_AUTH_FAILED')
      })

      it('reverts on checking can perform', async () => {
        await assertRevert(oracle.canPerform(appManager, ANY_ADDR, '0x', []))
      })
    })

    describe('integration tests with executionTarget', () => {
      let executionTargetBase, executionTarget
      let INCREASE_COUNTER_ROLE
      let oracleAddressBN, params

      const ORACLE_PARAM_ID = new BN(203).shln(248)
      const EQ = new BN(1).shln(240)
      const INITIAL_COUNTER = 1

      beforeEach('deploy ExecutionTarget', async () => {
        executionTargetBase = await ExecutionTarget.new()
        INCREASE_COUNTER_ROLE = await executionTargetBase.INCREASE_COUNTER_ROLE()

        const newExecutionTargetReceipt = await dao.newAppInstance(
          nameHash('execution-target.aragonpm.test'),
          executionTargetBase.address,
          '0x',
          false,
          {
            from: appManager,
          }
        )
        executionTarget = await ExecutionTarget.at(deployedContract(newExecutionTargetReceipt))

        // convert oracle address to BN and get param256: [(uint256(ORACLE_PARAM_ID) << 248) + (uint256(EQ) << 240) + oracleAddress];
        oracleAddressBN = new BN(oracle.address.slice(2), 16)
        params = [ORACLE_PARAM_ID.add(EQ).add(oracleAddressBN)]

        await executionTarget.initialize(INITIAL_COUNTER)
        await oracle.initialize(mockErc20.address, ORACLE_MINIMUM_BALANCE)

        await acl.createPermission(
          appManager,
          executionTarget.address,
          INCREASE_COUNTER_ROLE,
          appManager
        )
        await acl.grantPermissionP(ANY_ADDR, executionTarget.address, INCREASE_COUNTER_ROLE, params)
      })

      context(`Required balance is ${ORACLE_MINIMUM_BALANCE}`, () => {
        it('can increase counter if account has more than minimum required balance', async () => {
          await executionTarget.increaseCounter({ from: accountBal900 })

          const actualCounter = await executionTarget.counter()
          assert.equal(actualCounter, INITIAL_COUNTER + 1)
        })

        it(`can increase counter if account has exactly the minimum required balance`, async () => {
          await executionTarget.increaseCounter({ from: accountBal100 })
        })

        it("can't increase counter if account does not have tokens", async () => {
          await assertRevert(
            executionTarget.increaseCounter({ from: accountBal0 }),
            'APP_AUTH_FAILED'
          )
        })
      })

      context(`Required balance is 1`, () => {
        beforeEach('set minimum required balance to 1', async () => {
          await acl.createPermission(appManager, oracle.address, SET_MIN_BALANCE_ROLE, appManager)
          await oracle.setMinBalance(1)
        })

        it('all accounts with positive balance can increase counter', async () => {
          await executionTarget.increaseCounter({ from: accountBal900 })
          await executionTarget.increaseCounter({ from: accountBal100 })
        })

        it('all accounts with no balance cannot increase counter', async () => {
          await assertRevert(
            executionTarget.increaseCounter({ from: accountBal0 }),
            'APP_AUTH_FAILED'
          )
        })
      })

      context(`required balance is ${MOCK_TOKEN_BALANCE * 2}`, () => {
        beforeEach(`set minimum required balance to ${MOCK_TOKEN_BALANCE * 2}`, async () => {
          await acl.createPermission(appManager, oracle.address, SET_MIN_BALANCE_ROLE, appManager)
          await oracle.setMinBalance(MOCK_TOKEN_BALANCE * 2)
        })

        it('no account can increase counter', async () => {
          await assertRevert(
            executionTarget.increaseCounter({ from: accountBal900 }),
            'APP_AUTH_FAILED'
          )
          await assertRevert(
            executionTarget.increaseCounter({ from: accountBal100 }),
            'APP_AUTH_FAILED'
          )
          await assertRevert(
            executionTarget.increaseCounter({ from: accountBal0 }),
            'APP_AUTH_FAILED'
          )
        })
      })
    })
  }
)
