const ExecutionTarget = artifacts.require('ExecutionTarget')
const TimeLock = artifacts.require('TimeLockMock')
const MockErc20 = artifacts.require('TokenMock')
const TokenBalanceOracle = artifacts.require('TokenBalanceOracle')

const { encodeCallScript } = require('@aragon/test-helpers/evmScript')
const deployDAO = require('./helpers/deployDAO')
const { assertRevert, deployedContract } = require('./helpers/helpers')
const { hash: nameHash } = require('eth-ens-namehash')
const BN = require('bn.js')

const bigExp = (x, y = 0) => new BN(x).mul(new BN(10).pow(new BN(y)))
const pct16 = x => bigExp(x, 16)
const decimals = 18
const ANY_ADDR = '0x'.padEnd(42, 'f')

contract('TimeLock', ([appManager, accountBal1000, accountBal500, accountNoBalance, ...accounts]) => {
  let timeLockBase, timeLockForwarder, mockErc20
  let CHANGE_DURATION_ROLE, CHANGE_AMOUNT_ROLE, LOCK_TOKENS_ROLE, CHANGE_SPAM_PENALTY_ROLE

  const MOCK_TOKEN_BALANCE = bigExp(10000, decimals)
  const INITIAL_LOCK_AMOUNT = bigExp(10, decimals)
  const INITIAL_LOCK_DURATION = 60 // seconds
  const INITIAL_SPAM_PENALTY_FACTOR = pct16(50) // 50%

  before('deploy base apps', async () => {
    timeLockBase = await TimeLock.new()
    CHANGE_DURATION_ROLE = await timeLockBase.CHANGE_DURATION_ROLE()
    CHANGE_AMOUNT_ROLE = await timeLockBase.CHANGE_AMOUNT_ROLE()
    CHANGE_SPAM_PENALTY_ROLE = await timeLockBase.CHANGE_SPAM_PENALTY_ROLE()
    LOCK_TOKENS_ROLE = await timeLockBase.LOCK_TOKENS_ROLE()
  })

  beforeEach('deploy dao and time lock app', async () => {
    const daoDeployment = await deployDAO(appManager)
    dao = daoDeployment.dao
    acl = daoDeployment.acl

    const newLockAppReceipt = await dao.newAppInstance(
      nameHash('time-lock.aragonpm.test'),
      timeLockBase.address,
      '0x',
      false,
      {
        from: appManager,
      }
    )
    timeLockForwarder = await TimeLock.at(deployedContract(newLockAppReceipt))

    mockErc20 = await MockErc20.new(appManager, MOCK_TOKEN_BALANCE)
  })

  it('initialize() reverts when passed non-contract address as token', async () => {
    await assertRevert(
      timeLockForwarder.initialize(appManager, INITIAL_LOCK_DURATION, INITIAL_LOCK_AMOUNT, INITIAL_SPAM_PENALTY_FACTOR),
      'TIME_LOCK_NOT_CONTRACT'
    )
  })

  describe('initialize(address _token, uint256 _lockDuration, uint256 _lockAmount)', () => {
    beforeEach('initialize time-lock-app', async () => {
      await timeLockForwarder.initialize(
        mockErc20.address,
        INITIAL_LOCK_DURATION,
        INITIAL_LOCK_AMOUNT,
        INITIAL_SPAM_PENALTY_FACTOR
      )
    })

    it('sets variables as expected', async () => {
      const actualToken = await timeLockForwarder.token()
      const actualLockDuration = await timeLockForwarder.lockDuration()
      const actualLockAmount = await timeLockForwarder.lockAmount()
      const actualSpamPenaltyFactor = await timeLockForwarder.spamPenaltyFactor()
      const hasInitialized = await timeLockForwarder.hasInitialized()

      assert.strictEqual(actualToken, mockErc20.address)
      assert.equal(actualLockDuration, INITIAL_LOCK_DURATION)
      assert.equal(actualLockAmount, INITIAL_LOCK_AMOUNT.toString())
      assert.equal(actualSpamPenaltyFactor, INITIAL_SPAM_PENALTY_FACTOR.toString())
      assert.isTrue(hasInitialized)
    })

    it('checks it is a forwarder', async () => {
      assert.isTrue(await timeLockForwarder.isForwarder())
    })

    it('checks account can forward actions', async () => {
      await acl.createPermission(appManager, timeLockForwarder.address, LOCK_TOKENS_ROLE, appManager)
      assert.isTrue(await timeLockForwarder.canForward(appManager, '0x'))
    })

    it('cannot forward if account not permitted to lock tokens ', async () => {
      assert.isFalse(await timeLockForwarder.canForward(appManager, '0x'))
    })

    describe('changeLockDuration(uint256 _lockDuration)', () => {
      it('sets a new lock duration', async () => {
        await acl.createPermission(appManager, timeLockForwarder.address, CHANGE_DURATION_ROLE, appManager)
        const expectedLockDuration = 120

        await timeLockForwarder.changeLockDuration(expectedLockDuration)

        const actualLockDuration = await timeLockForwarder.lockDuration()
        assert.equal(actualLockDuration, expectedLockDuration)
      })
    })

    describe('changeLockAmount(uint256 _lockAmount)', () => {
      it('sets a new lock amount', async () => {
        await acl.createPermission(appManager, timeLockForwarder.address, CHANGE_AMOUNT_ROLE, appManager)
        const expectedLockAmount = bigExp(20, decimals)

        await timeLockForwarder.changeLockAmount(expectedLockAmount)

        const actualLockAmount = await timeLockForwarder.lockAmount()
        assert.equal(actualLockAmount, expectedLockAmount.toString())
      })
    })

    describe('changeSpamPenaltyFactor(uint256 _spamPenaltyFactor)', () => {
      it('sets a new spam penalty factor', async () => {
        await acl.createPermission(appManager, timeLockForwarder.address, CHANGE_SPAM_PENALTY_ROLE, appManager)
        const expectedSpamPenaltyFactor = pct16(100)

        await timeLockForwarder.changeSpamPenaltyFactor(expectedSpamPenaltyFactor)

        const actualSpamPenaltyFactor = await timeLockForwarder.spamPenaltyFactor()
        assert.equal(actualSpamPenaltyFactor, expectedSpamPenaltyFactor.toString())
      })
    })

    describe('forwardFee()', async () => {
      it("get's forwarding fee information", async () => {
        const [actualToken, actualLockAmount] = Object.values(await timeLockForwarder.forwardFee())

        assert.strictEqual(actualToken, mockErc20.address)
        assert.equal(actualLockAmount, INITIAL_LOCK_AMOUNT.toString())
      })

      context('account has 1 active lock', async () => {
        beforeEach(async () => {
          const executionTarget = await ExecutionTarget.new()
          const action = {
            to: executionTarget.address,
            calldata: executionTarget.contract.methods.execute().encodeABI(),
          }
          const script = encodeCallScript([action])
          await acl.createPermission(appManager, timeLockForwarder.address, LOCK_TOKENS_ROLE, appManager)
          await mockErc20.approve(timeLockForwarder.address, INITIAL_LOCK_AMOUNT, {
            from: appManager,
          })
          await timeLockForwarder.forward(script, { from: appManager })
        })

        it('forward fee increases for second lock', async () => {
          const [_, actualLockAmount] = Object.values(await timeLockForwarder.forwardFee({ from: appManager }))
          assert.equal(actualLockAmount, bigExp(15, decimals).toString())
        })

        it('forward fee increases when increasing spam penalty factor', async () => {
          await acl.createPermission(appManager, timeLockForwarder.address, CHANGE_SPAM_PENALTY_ROLE, appManager)
          await timeLockForwarder.changeSpamPenaltyFactor(pct16(100))
          const [_, actualLockAmount] = Object.values(await timeLockForwarder.forwardFee({ from: appManager }))

          assert.equal(actualLockAmount, bigExp(20, decimals).toString())
        })
      })
    })

    describe('getSpamPenalty()', () => {
      it("get's spam penalty amount and duration", async () => {
        const [actualSpamPenaltyAmount, actualSpamPenaltyDuration] = Object.values(
          await timeLockForwarder.getSpamPenalty(appManager)
        )

        assert.equal(actualSpamPenaltyAmount, 0)
        assert.equal(actualSpamPenaltyDuration, 0)
      })

      context('account has 1 active lock', async () => {
        beforeEach(async () => {
          const executionTarget = await ExecutionTarget.new()
          const action = {
            to: executionTarget.address,
            calldata: executionTarget.contract.methods.execute().encodeABI(),
          }
          const script = encodeCallScript([action])
          await acl.createPermission(appManager, timeLockForwarder.address, LOCK_TOKENS_ROLE, appManager)
          await mockErc20.approve(timeLockForwarder.address, INITIAL_LOCK_AMOUNT, {
            from: appManager,
          })
          await timeLockForwarder.forward(script, { from: appManager })
        })

        it('spam penalty amount and duration increase for second lock', async () => {
          const [actualSpamPenaltyAmount, actualSpamPenaltyDuration] = Object.values(
            await timeLockForwarder.getSpamPenalty(appManager)
          )

          assert.equal(actualSpamPenaltyAmount, bigExp(5, decimals).toString())
          assert.equal(actualSpamPenaltyDuration, 30)
        })

        it('spam penalty amount and duration increase when increasing spam penalty factor', async () => {
          await acl.createPermission(appManager, timeLockForwarder.address, CHANGE_SPAM_PENALTY_ROLE, appManager)
          await timeLockForwarder.changeSpamPenaltyFactor(pct16(100))

          const [actualSpamPenaltyAmount, actualSpamPenaltyDuration] = Object.values(
            await timeLockForwarder.getSpamPenalty(appManager)
          )

          assert.equal(actualSpamPenaltyAmount, bigExp(10, decimals).toString())
          assert.equal(actualSpamPenaltyDuration, 60)
        })
      })
    })

    describe('forward(bytes _evmCallScript)', async () => {
      let executionTarget, script, action
      let addressLocks = 0

      beforeEach('create execution script', async () => {
        await acl.createPermission(appManager, timeLockForwarder.address, LOCK_TOKENS_ROLE, appManager)

        // create script
        executionTarget = await ExecutionTarget.new()
        action = {
          to: executionTarget.address,
          calldata: executionTarget.contract.methods.execute().encodeABI(),
        }
        script = encodeCallScript([action])
      })

      it('forwards action successfully', async () => {
        await mockErc20.approve(timeLockForwarder.address, INITIAL_LOCK_AMOUNT, {
          from: appManager,
        })

        const expectedCounter = 1
        const expectedLockerBalance = MOCK_TOKEN_BALANCE.sub(INITIAL_LOCK_AMOUNT)
        const expectedLockAppBalance = INITIAL_LOCK_AMOUNT
        const expectedNumberOfLocks = addressLocks + 1
        const expectedLockAmount = INITIAL_LOCK_AMOUNT

        await timeLockForwarder.forward(script, { from: appManager })

        const actualCounter = await executionTarget.counter()
        const actualLockerBalance = await mockErc20.balanceOf(appManager)
        const actualLockAppBalance = await mockErc20.balanceOf(timeLockForwarder.address)
        const actualNumberOfLocks = await timeLockForwarder.getWithdrawLocksCount(appManager)
        const { lockAmount: actualLockAmount } = await timeLockForwarder.addressesWithdrawLocks(appManager, 0)

        // forwarded successfully
        assert.equal(actualCounter, expectedCounter)

        // transfered tokens successfully
        assert.equal(actualLockerBalance, expectedLockerBalance.toString())
        assert.equal(actualLockAppBalance, expectedLockAppBalance.toString())

        // lock created successfully
        assert.equal(actualNumberOfLocks, expectedNumberOfLocks)
        assert.equal(actualLockAmount, expectedLockAmount.toString())
      })

      it('cannot forward if evmScript calls a function on the TimeLock app', async () => {
        await mockErc20.approve(timeLockForwarder.address, INITIAL_LOCK_AMOUNT, {
          from: appManager,
        })

        const action = {
          to: timeLockForwarder.address,
          calldata: timeLockForwarder.contract.methods.isForwarder().encodeABI(),
        }
        script = encodeCallScript([action])

        await assertRevert(timeLockForwarder.forward(script), 'EVMCALLS_BLACKLISTED_CALL')
      })

      it('cannot forward if evmScript calls a function on the LockApps token', async () => {
        await mockErc20.approve(timeLockForwarder.address, INITIAL_LOCK_AMOUNT, {
          from: appManager,
        })

        const action = {
          to: mockErc20.address,
          calldata: mockErc20.contract.methods.transfer(appManager, INITIAL_LOCK_AMOUNT.toString()).encodeABI(),
        }
        script = encodeCallScript([action])

        await assertRevert(timeLockForwarder.forward(script), 'EVMCALLS_BLACKLISTED_CALL')
      })

      it('cannot forward if evmScript uses incorrect scriptId', async () => {
        await mockErc20.approve(timeLockForwarder.address, INITIAL_LOCK_AMOUNT, {
          from: appManager,
        })
        script = encodeCallScript([action])
        script = '0x00000002' + script.slice(10)

        await assertRevert(timeLockForwarder.forward(script, { from: appManager }))
        assert.equal(await executionTarget.counter(), 0)
      })

      it('cannot forward if multiple evmScripts are passed to forward', async () => {
        await mockErc20.approve(timeLockForwarder.address, INITIAL_LOCK_AMOUNT.mul(new BN(2)), {
           from: appManager,
         })
         script = encodeCallScript([action, action])

         await assertRevert(timeLockForwarder.forward(script, { from: appManager }), "TIME_LOCK_SCRIPT_INCORRECT_LENGTH")
         assert.equal(await executionTarget.counter(), 0)
      })

      it('cannot forward if sender does not approve lock app to transfer tokens', async () => {
        await assertRevert(timeLockForwarder.forward(script, { from: appManager }), 'TIME_LOCK_TRANSFER_REVERTED')
      })

      context('account has 1 active lock', async () => {
        beforeEach(async () => {
          await mockErc20.approve(timeLockForwarder.address, INITIAL_LOCK_AMOUNT, {
            from: appManager,
          })
          await timeLockForwarder.forward(script, { from: appManager })
        })

        it('lock amount increases for second lock', async () => {
          const expectedLockAmount = bigExp(15, decimals)

          await mockErc20.approve(timeLockForwarder.address, expectedLockAmount, {
            from: appManager,
          })
          await timeLockForwarder.forward(script, { from: appManager })

          const { lockAmount: actualLockAmount } = await timeLockForwarder.addressesWithdrawLocks(appManager, 1)
          assert.equal(actualLockAmount, expectedLockAmount.toString())
        })

        it('lock amount increases when increasing spam penalty factor', async () => {
          await acl.createPermission(appManager, timeLockForwarder.address, CHANGE_SPAM_PENALTY_ROLE, appManager)
          await timeLockForwarder.changeSpamPenaltyFactor(pct16(100))
          const expectedLockAmount = bigExp(20, decimals)

          await mockErc20.approve(timeLockForwarder.address, expectedLockAmount, {
            from: appManager,
          })
          await timeLockForwarder.forward(script, { from: appManager })

          const { lockAmount: actualLockAmount } = await timeLockForwarder.addressesWithdrawLocks(appManager, 1)

          assert.equal(actualLockAmount, expectedLockAmount.toString())
        })
      })

      describe('withdrawTokens()', async () => {
        let lockCount = 20

        beforeEach('Forward actions', async () => {
          await mockErc20.approve(timeLockForwarder.address, INITIAL_LOCK_AMOUNT.mul(bigExp(1000)), {
            // approve more than required
            from: appManager,
          })

          for (let i = 0; i < lockCount; i++) {
            await timeLockForwarder.forward(script, { from: appManager })
          }
        })

        it("doesn't withdraw tokens before lock duration has elapsed", async () => {
          const expectedLockCount = lockCount

          await timeLockForwarder.withdrawTokens(lockCount, {
            from: appManager,
          })

          const actualLockCount = await timeLockForwarder.getWithdrawLocksCount(appManager)
          assert.equal(actualLockCount, expectedLockCount)
        })

        it("can't withdraw more than locked", async () => {
          await assertRevert(timeLockForwarder.withdrawTokens(lockCount + 1), 'TIME_LOCK_TOO_MANY_WITHDRAW_LOCKS')
        })

        it('withdraws 1 locked token', async () => {
          const locksToWithdraw = 1
          const addressPrevBalance = await mockErc20.balanceOf(appManager)

          const expectedLockCount = lockCount - locksToWithdraw
          const expectedBalance = addressPrevBalance.add(INITIAL_LOCK_AMOUNT.mul(bigExp(locksToWithdraw)))

          // increase time
          await timeLockForwarder.mockIncreaseTime(INITIAL_LOCK_DURATION + 1)
          await timeLockForwarder.withdrawTokens(locksToWithdraw, {
            from: appManager,
          })

          const actualLockCount = await timeLockForwarder.getWithdrawLocksCount(appManager)
          const actualBalance = await mockErc20.balanceOf(appManager)
          assert.equal(actualLockCount, expectedLockCount)
          assert.equal(actualBalance, expectedBalance.toString())
        })

        it('withdraws half of locked tokens', async () => {
          const locksToWithdraw = lockCount / 2
          const expectedLockCount = lockCount - locksToWithdraw

          // increase time
          await timeLockForwarder.mockIncreaseTime(INITIAL_LOCK_DURATION * lockCount + 1)
          await timeLockForwarder.withdrawTokens(locksToWithdraw, {
            from: appManager,
          })

          const actualLockCount = await timeLockForwarder.getWithdrawLocksCount(appManager)

          let locks = []
          for (let i = 0; i < actualLockCount; i++) {
            locks.push(await timeLockForwarder.addressesWithdrawLocks(appManager, i))
          }

          const isSorted = locks.every(({ unlockTime }, i, arr) => !i || unlockTime >= arr[i - 1].unlockTime)

          assert.equal(actualLockCount, expectedLockCount)
          assert.isTrue(isSorted)
        })

        it(`withdraws all locked tokens (${lockCount})`, async () => {
          const expectedLockCount = 0

          // increase time
          await timeLockForwarder.mockIncreaseTime(INITIAL_LOCK_DURATION * lockCount + 1)
          await timeLockForwarder.withdrawAllTokens()

          const actualLockCount = await timeLockForwarder.getWithdrawLocksCount(appManager)
          assert.equal(actualLockCount, expectedLockCount)
        })

        describe('change lock duration', async () => {
          beforeEach(async () => {
            await acl.createPermission(appManager, timeLockForwarder.address, CHANGE_DURATION_ROLE, appManager)
          })

          it("does not change current locks's unlockTime", async () => {
            const locksToWithdraw = 1
            const newLockDuration = 120

            const expectedLockCount = lockCount - locksToWithdraw

            await timeLockForwarder.changeLockDuration(newLockDuration)
            // current locks's unlockTime is 60
            await timeLockForwarder.mockIncreaseTime(INITIAL_LOCK_DURATION + 1)
            await timeLockForwarder.withdrawTokens(locksToWithdraw, {
              from: appManager,
            })

            const actualLockCount = await timeLockForwarder.getWithdrawLocksCount(appManager)
            assert.equal(actualLockCount, expectedLockCount)
          })
        })

        describe('change lock amount', async () => {
          beforeEach(async () => {
            await acl.createPermission(appManager, timeLockForwarder.address, CHANGE_AMOUNT_ROLE, appManager)
          })

          it("does not change current locks's lockAmount", async () => {
            const locksToWithdraw = 1
            const previousBalance = await mockErc20.balanceOf(appManager)
            const newLockAmount = bigExp(20, decimals)

            const expectedBalance = previousBalance.add(INITIAL_LOCK_AMOUNT)

            await timeLockForwarder.changeLockAmount(newLockAmount)
            // current locks's lockAmount is 10
            await timeLockForwarder.mockIncreaseTime(INITIAL_LOCK_DURATION + 1)
            await timeLockForwarder.withdrawTokens(locksToWithdraw, {
              from: appManager,
            })

            const actualBalance = await mockErc20.balanceOf(appManager)
            assert.equal(actualBalance, expectedBalance.toString())
          })
        })
      })
    })

    describe('transferToVault(address _token)', () => {
      it('reverts', async () => {
        await assertRevert(
          timeLockForwarder.transferToVault(mockErc20.address),
          'RECOVER_DISALLOWED')
      })
    })
  })

  describe('integration tests with token balance oracle', () => {
    let tokenBalanceOracleBase, tokenBalanceOracle
    let SET_MIN_BALANCE_ROLE

    const ORACLE_PARAM_ID = new BN(203).shln(248)
    const EQ = new BN(1).shln(240)

    const totalSupply = bigExp(1500, decimals)
    const INITIAL_MININUM_BALANCE = bigExp(1000, decimals)

    beforeEach('deploy oracle and set permissions', async () => {
      tokenBalanceOracleBase = await TokenBalanceOracle.new()
      SET_MIN_BALANCE_ROLE = await tokenBalanceOracleBase.SET_MIN_BALANCE_ROLE()

      const newOracleReceipt = await dao.newAppInstance(
        nameHash('token-balance-oracle.aragonpm.test'),
        tokenBalanceOracleBase.address,
        '0x',
        false,
        {
          from: appManager,
        }
      )
      tokenBalanceOracle = await TokenBalanceOracle.at(deployedContract(newOracleReceipt))

      const oracleToken = await MockErc20.new(accountBal1000, totalSupply)
      oracleToken.transfer(accountBal500, totalSupply.sub(INITIAL_MININUM_BALANCE), { from: accountBal1000 })
      await tokenBalanceOracle.initialize(oracleToken.address, INITIAL_MININUM_BALANCE)

      await timeLockForwarder.initialize(
        mockErc20.address,
        INITIAL_LOCK_DURATION,
        INITIAL_LOCK_AMOUNT,
        INITIAL_SPAM_PENALTY_FACTOR
      )

      // convert oracle address to BN and get param256: [(uint256(ORACLE_PARAM_ID) << 248) + (uint256(EQ) << 240) + oracleAddress];
      const oracleAddressBN = new BN(tokenBalanceOracle.address.slice(2), 16)
      const params = [ORACLE_PARAM_ID.add(EQ).add(oracleAddressBN)]

      await acl.createPermission(appManager, timeLockForwarder.address, LOCK_TOKENS_ROLE, appManager)
      await acl.grantPermissionP(ANY_ADDR, timeLockForwarder.address, LOCK_TOKENS_ROLE, params)
    })

    describe('canForward(address _sender, bytes', async () => {
      it('can forward action if account has tokens', async () => {
        assert.isTrue(await timeLockForwarder.canForward(accountBal1000, '0x'))
      })

      it('cannot forward action if account does not have minimum required balance', async () => {
        assert.isFalse(await timeLockForwarder.canForward(accountBal500, '0x'))
      })

      it('cannot forward action if account does not have tokens', async () => {
        assert.isFalse(await timeLockForwarder.canForward(accountNoBalance, '0x'))
      })

      context('minimum required balance set to 500', () => {
        beforeEach('set minimum required balance to 500', async () => {
          await acl.createPermission(appManager, tokenBalanceOracle.address, SET_MIN_BALANCE_ROLE, appManager)
          await tokenBalanceOracle.setMinBalance(bigExp(500, decimals))
        })

        it('can forward action if account has tokens', async () => {
          assert.isTrue(await timeLockForwarder.canForward(accountBal1000, '0x'))
          assert.isTrue(await timeLockForwarder.canForward(accountBal500, '0x'))
        })

        it('cannot forward action if account does not have tokens', async () => {
          assert.isFalse(await timeLockForwarder.canForward(accountNoBalance, '0x'))
        })
      })

      context('minimum required balance set to 2000', () => {
        beforeEach('set minimum required balance to 2000', async () => {
          await acl.createPermission(appManager, tokenBalanceOracle.address, SET_MIN_BALANCE_ROLE, appManager)
          await tokenBalanceOracle.setMinBalance(bigExp(2000, decimals))
        })

        it('cannot forward action if account does not have required minimum balance', async () => {
          assert.isFalse(await timeLockForwarder.canForward(accountBal1000, '0x'))
          assert.isFalse(await timeLockForwarder.canForward(accountBal500, '0x'))
          assert.isFalse(await timeLockForwarder.canForward(accountNoBalance, '0x'))
        })
      })
    })
  })

  describe('app not initialized', () => {
    it('reverts on forwarding', async () => {
      await assertRevert(timeLockForwarder.forward('0x', { from: appManager }), 'TIME_LOCK_CAN_NOT_FORWARD')
    })

    it('reverts on changing duration', async () => {
      await assertRevert(timeLockForwarder.changeLockDuration(20), 'APP_AUTH_FAILED')
    })

    it('reverts on changing amount', async () => {
      await assertRevert(timeLockForwarder.changeLockAmount(10), 'APP_AUTH_FAILED')
    })

    it('reverts on changing spam penalty factor', async () => {
      await assertRevert(timeLockForwarder.changeSpamPenaltyFactor(10), 'APP_AUTH_FAILED')
    })

    it('reverts on withdrawing tokens', async () => {
      await assertRevert(timeLockForwarder.withdrawTokens())
    })
  })
})
