const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { encodeCallScript } = require('@aragon/test-helpers/evmScript')

const getContract = artifacts.require
const getEvent = (receipt, event, arg) => { return receipt.logs.filter(l => l.event == event)[0].args[arg] }

contract('Staking app, no overlocking', accounts => {
  let app, token
  const owner = accounts[0]
  const other = accounts[1]
  const balance = 1000
  const amount = 100

  const zeroBytes32 = "0x0000000000000000000000000000000000000000000000000000000000000000"
  const zeroAddress = "0x00"
  const TIME_UNIT_BLOCKS = 0
  const TIME_UNIT_SECONDS = 1
  const OVERLOCKING = false

  context('Without scripts', async () => {
    beforeEach(async () => {
      app = await getContract('StakingMock').new()
      token = await getContract('StandardTokenMock').new(owner, balance)
      // allow Staking app to move owner tokens
      await token.approve(app.address, amount)
      await app.initialize(OVERLOCKING, token.address, '', '', '')
    })

    it('has correct initial state', async () => {
      assert.equal(await app.token.call(), token.address, "Token is wrong")
      assert.equal((await app.totalStaked.call()).valueOf(), 0, "Initial total staked amount should be zero")
      assert.isFalse(await app.supportsHistory.call(), "Shouldn't support history")
      assert.isFalse(await app.overlocking.call(), "Shouldn't support overlocking")
    })

    it('can not reinitialize', async () => {
      return assertRevert(async () => {
        await app.initialize(OVERLOCKING, token.address, '', '', '')
      })
    })

    it('stakes', async () => {
      const initialOwnerBalance = parseInt((await token.balanceOf.call(owner)).valueOf(), 10)
      const initialStakingBalance = parseInt((await token.balanceOf.call(app.address)).valueOf(), 10)

      // stake tokens
      await app.stake(amount, '')

      const finalOwnerBalance = parseInt((await token.balanceOf.call(owner)).valueOf(), 10)
      const finalStakingBalance = parseInt((await token.balanceOf.call(app.address)).valueOf(), 10)
      assert.equal(finalOwnerBalance, initialOwnerBalance - amount, "owner balance should match")
      assert.equal(finalStakingBalance, initialStakingBalance + amount, "Staking app balance should match")
      assert.equal((await app.totalStakedFor.call(owner)).valueOf(), amount, "staked value should match")
    })

    it('fails staking 0 amount', async () => {
      const amount = 0
      return assertRevert(async () => {
        await app.stake(amount, '')
      })
    })

    it('fails staking more than balance', async () => {
      const amount = balance + 1
      return assertRevert(async () => {
        await app.stake(amount, '')
      })
    })

    it('stakes for', async () => {
      const initialOwnerBalance = parseInt((await token.balanceOf.call(owner)).valueOf(), 10)
      const initialOtherBalance = parseInt((await token.balanceOf.call(other)).valueOf(), 10)
      const initialStakingBalance = parseInt((await token.balanceOf.call(app.address)).valueOf(), 10)

      // stake tokens
      await app.stakeFor(other, amount, '')

      const finalOwnerBalance = parseInt((await token.balanceOf.call(owner)).valueOf(), 10)
      const finalOtherBalance = parseInt((await token.balanceOf.call(other)).valueOf(), 10)
      const finalStakingBalance = parseInt((await token.balanceOf.call(app.address)).valueOf(), 10)
      assert.equal(finalOwnerBalance, initialOwnerBalance - amount, "owner balance should match")
      assert.equal(finalOtherBalance, initialOtherBalance, "other balance should match")
      assert.equal(finalStakingBalance, initialStakingBalance + amount, "Staking app balance should match")
      assert.equal((await app.totalStakedFor.call(owner)).valueOf(), 0, "staked value for owner should match")
      assert.equal((await app.totalStakedFor.call(other)).valueOf(), amount, "staked value for other should match")
    })

    it('unstakes', async () => {
      const initialOwnerBalance = parseInt((await token.balanceOf.call(owner)).valueOf(), 10)
      const initialStakingBalance = parseInt((await token.balanceOf.call(app.address)).valueOf(), 10)

      // stake tokens
      await app.stake(amount, '')
      // unstake half of them
      await app.unstake(amount / 2, '')

      const finalOwnerBalance = parseInt((await token.balanceOf.call(owner)).valueOf(), 10)
      const finalStakingBalance = parseInt((await token.balanceOf.call(app.address)).valueOf(), 10)
      assert.equal(finalOwnerBalance, initialOwnerBalance - amount / 2, "owner balance should match")
      assert.equal(finalStakingBalance, initialStakingBalance + amount / 2, "Staking app balance should match")
      assert.equal((await app.totalStakedFor.call(owner)).valueOf(), amount / 2, "staked value should match")
    })

    it('fails unstaking 0 amount', async () => {
      await app.stake(amount, '')
      return assertRevert(async () => {
        await app.unstake(0, '')
      })
    })

    it('fails unstaking more than staked', async () => {
      await app.stake(amount, '')
      return assertRevert(async () => {
        await app.unstake(amount + 1, '')
      })
    })

    it('locks indefinitely', async () => {
      await app.stake(amount, '')
      const r = await app.lockIndefinitely(amount / 2, other, '', '')
      const lockId = getEvent(r, 'Locked', 'lockId')
      // can not unlock
      assert.isFalse(await app.canUnlock.call(owner, lockId))
      await app.setTimestamp((await app.getTimestampExt.call()) + 5000)
      // still the same, can not unlock
      assert.isFalse(await app.canUnlock.call(owner, lockId))
      assert.equal((await app.unlockedBalanceOf.call(owner, zeroAddress)).valueOf(), amount / 2, "Unlocked balance should match")
      assert.equal((await app.unlockedBalanceOf.call(owner, other)).valueOf(), amount / 2, "Unlocked balance should match for unlocker")
      assert.equal((await app.locksCount.call(owner)).valueOf(), parseInt(lockId, 10) + 1, "last lock id should match")
    })

    it('locks using seconds', async () => {
      const time = 1000
      await app.stake(amount, '')
      const endTime = (await app.getTimestampExt.call()) + time
      const r = await app.lockNow(amount / 2, TIME_UNIT_SECONDS, endTime, other, '', '')
      const lockId = getEvent(r, 'Locked', 'lockId')

      // check lock values
      const lock = await app.getLock.call(owner, lockId)
      assert.equal(lock[0], amount / 2, "locked amount should match")
      assert.equal(lock[1], TIME_UNIT_SECONDS, "lock time unit should match")
      assert.equal(lock[2], endTime, "lock time end should match")
      assert.equal(lock[3], other, "unlocker should match")
      assert.equal(lock[4], zeroBytes32, "lock metadata should match")

      // can not unlock
      assert.isFalse(await app.canUnlock.call(owner, lockId))
      assert.equal((await app.unlockedBalanceOf.call(owner, zeroAddress)).valueOf(), amount / 2, "Unlocked balance should match")
      assert.equal((await app.unlockedBalanceOf.call(owner, other)).valueOf(), amount / 2, "Unlocked balance should match for unlocker")
      assert.equal((await app.locksCount.call(owner)).valueOf(), parseInt(lockId, 10) + 1, "last lock id should match")

      await app.setTimestamp(endTime + 1)
      // can unlock
      assert.isTrue(await app.canUnlock.call(owner, lockId))
      // unlockable balance counts as unlocked
      assert.equal((await app.unlockedBalanceOf.call(owner, zeroAddress)).valueOf(), amount, "Unlocked balance should match")
      assert.equal((await app.unlockedBalanceOf.call(owner, other)).valueOf(), amount, "Unlocked balance should match for unlocker")

    })

    it('locks using blocks', async () => {
      const blocks = 2
      await app.stake(amount, '')
      const endBlock = (await app.getBlockNumberExt.call()) + blocks
      const r = await app.lockNow(amount / 2, TIME_UNIT_BLOCKS, endBlock, other, '', '')
      const lockId = getEvent(r, 'Locked', 'lockId')

      // check lock values
      const lock = await app.lastLock.call(owner)
      assert.equal(lock[0], amount / 2, "locked amount should match")
      assert.equal(lock[1], TIME_UNIT_BLOCKS, "lock time unit should match")
      assert.equal(lock[2], endBlock, "lock time end should match")
      assert.equal(lock[3], other, "unlocker should match")
      assert.equal(lock[4], "0x0000000000000000000000000000000000000000000000000000000000000000", "lock metadata should match")

      // can not unlock
      assert.isFalse(await app.canUnlock.call(owner, lockId))
      assert.equal((await app.unlockedBalanceOf.call(owner, zeroAddress)).valueOf(), amount / 2, "Unlocked balance should match")
      assert.equal((await app.unlockedBalanceOf.call(owner, other)).valueOf(), amount / 2, "Unlocked balance should match for unlocker")
      assert.equal((await app.locksCount.call(owner)).valueOf(), parseInt(lockId, 10) + 1, "last lock id should match")

      await app.setBlockNumber(endBlock + 1)
      // can unlock
      assert.isTrue(await app.canUnlock.call(owner, lockId))
    })

    it('fails locking 0 tokens', async () => {
      const blocks = 10
      await app.stake(amount, '')
      const endBlock = (await app.getBlockNumberExt.call()) + blocks
      return assertRevert(async () => {
        await app.lockNow(0, TIME_UNIT_BLOCKS, endBlock, other, '', '')
      })
    })

    it('fails locking more tokens than staked', async () => {
      const blocks = 10
      await app.stake(amount, '')
      const endBlock = (await app.getBlockNumberExt.call()) + blocks
      return assertRevert(async () => {
        await app.lockNow(amount + 1, TIME_UNIT_BLOCKS, endBlock, other, '', '')
      })
    })

    it('fails locking already locked tokens', async () => {
      await app.stake(amount, '')
      await app.lockIndefinitely(amount / 2 + 1, other, '', '')
      return assertRevert(async () => {
        await app.lockIndefinitely(amount / 2, other, '', '')
      })
    })

    it('stakes and locks in one call', async () => {
      const time = 1000
      const startTime = (await app.getTimestampExt.call())
      const endTime = startTime + time
      const r = await app.stakeAndLock(amount, TIME_UNIT_SECONDS, startTime, endTime, other, '', '', '')
      const lockId = getEvent(r, 'Locked', 'lockId')

      // can not unlock
      assert.isFalse(await app.canUnlock.call(owner, lockId))
      assert.equal((await app.unlockedBalanceOf.call(owner, zeroAddress)).valueOf(), 0, "Unlocked balance should match")
      assert.equal((await app.unlockedBalanceOf.call(owner, other)).valueOf(), 0, "Unlocked balance should match for unlocker")
      assert.equal((await app.locksCount.call(owner)).valueOf(), parseInt(lockId, 10) + 1, "last lock id should match")

      await app.setTimestamp(endTime + 1)
      // can unlock
      assert.isTrue(await app.canUnlock.call(owner, lockId))
    })

    it('unlocks last lock', async () => {
      const time = 1000
      await app.stake(amount, '')
      const endTime = (await app.getTimestampExt.call()) + time
      const r = await app.lockNow(amount / 2, TIME_UNIT_SECONDS, endTime, other, '', '')
      const lockId = getEvent(r, 'Locked', 'lockId')

      // unlock
      await app.unlock(owner, lockId, { from: other })

      assert.equal((await app.unlockedBalanceOf.call(owner, zeroAddress)).valueOf(), amount, "Unlocked balance should match")
      assert.equal((await app.locksCount.call(owner)).valueOf(), 0, "there shouldn't be locks")
    })

    it('unlocks non-last lock', async () => {
      const time = 1000
      await app.stake(amount, '')
      const endTime = (await app.getTimestampExt.call()) + time
      const r = await app.lockNow(amount / 2, TIME_UNIT_SECONDS, endTime, other, '', '')
      const lockId = getEvent(r, 'Locked', 'lockId')
      await app.lockNow(amount / 2, TIME_UNIT_SECONDS, endTime, other, '', '')

      // unlock
      await app.unlock(owner, lockId, { from: other })

      assert.equal((await app.unlockedBalanceOf.call(owner, zeroAddress)).valueOf(), amount / 2, "Unlocked balance should match")
      assert.equal((await app.locksCount.call(owner)).valueOf(), 1, "there should be just 1 lock")
    })

    it('fails to unlock if can not unlock', async () => {
      const time = 1000
      await app.stake(amount, '')
      const endTime = (await app.getTimestampExt.call()) + time
      const r = await app.lockNow(amount / 2, TIME_UNIT_SECONDS, endTime, other, '', '')
      const lockId = getEvent(r, 'Locked', 'lockId')

      // tries to unlock
      return assertRevert(async () => {
        await app.unlock(owner, lockId)
      })
    })

    it('unlocks all', async () => {
      const time = 1000
      await app.stake(amount, '')
      const endTime = (await app.getTimestampExt.call()) + time
      await app.lockNow(amount / 4, TIME_UNIT_SECONDS, endTime, other, '', '')
      await app.lockNow(amount / 4, TIME_UNIT_SECONDS, endTime, other, '', '')

      // unlock
      await app.unlockAll(owner, { from: other })

      assert.equal((await app.unlockedBalanceOf.call(owner, zeroAddress)).valueOf(), amount, "Unlocked balance should match")
      assert.equal((await app.locksCount.call(owner)).valueOf(), 0, "there shouldn't be locks")
    })

    it('unlocks all with no previous locks', async () => {
      await app.unlockAll(owner, { from: other })
      assert.equal((await app.locksCount.call(owner)).valueOf(), 0, "there shouldn't be locks")
    })

    it('tries to unlockAll but it only unlocks one', async () => {
      const time = 1000
      await app.stake(amount, '')
      await app.lockIndefinitely(amount / 2, other, '', '')
      const endTime = (await app.getTimestampExt.call()) + time
      await app.lockNow(amount / 4, TIME_UNIT_SECONDS, endTime, other, '', '')

      await app.setTimestamp(endTime + 1)
      // unlock
      await app.unlockAll(owner)

      assert.equal((await app.unlockedBalanceOf.call(owner, zeroAddress)).valueOf(), amount / 2, "Unlocked balance should match")
      assert.equal((await app.locksCount.call(owner)).valueOf(), 1, "there shouldn't be locks")
    })

    it('fails trying to unlockAllOrNone if a lock cannot be unlocked', async () => {
      const time = 1000
      await app.stake(amount, '')
      await app.lockIndefinitely(amount / 2, other, '', '')
      const endTime = (await app.getTimestampExt.call()) + time
      await app.lockNow(amount / 4, TIME_UNIT_SECONDS, endTime, other, '', '')

      await app.setTimestamp(endTime + 1)
      // unlock
      return assertRevert(async () => {
        await app.unlockAllOrNone(owner)
      })
    })

    it('unlocks partially', async () => {
      const time = 1000
      await app.stake(amount, '')
      const endTime = (await app.getTimestampExt.call()) + time
      const r = await app.lockNow(amount / 2, TIME_UNIT_SECONDS, endTime, other, '', '')
      const lockId = getEvent(r, 'Locked', 'lockId')

      // unlock
      await app.unlockPartial(owner, lockId, amount / 4, { from: other })

      assert.equal((await app.unlockedBalanceOf.call(owner, zeroAddress)).valueOf(), amount * 3 / 4, "Unlocked balance should match")
      assert.equal((await app.locksCount.call(owner)).valueOf(), 1, "there should still be 1 lock")

      // unlocks again
      await app.unlockPartial(owner, lockId, amount / 4, { from: other })

      assert.equal((await app.unlockedBalanceOf.call(owner, zeroAddress)).valueOf(), amount, "Unlocked balance should match")
      assert.equal((await app.locksCount.call(owner)).valueOf(), 0, "there shouldnt be locks")
    })

    it('fails to unlock partially if can not unlock', async () => {
      const time = 1000
      await app.stake(amount, '')
      const endTime = (await app.getTimestampExt.call()) + time
      const r = await app.lockNow(amount / 2, TIME_UNIT_SECONDS, endTime, other, '', '')
      const lockId = getEvent(r, 'Locked', 'lockId')

      // tries to unlock
      return assertRevert(async () => {
        await app.unlockPartial(owner, lockId, amount / 4)
      })
    })

    it('moves tokens', async () => {
      const time = 1000
      await app.stake(amount, '')
      await app.moveTokens(owner, other, amount / 2)
      assert.equal((await app.unlockedBalanceOf.call(owner, zeroAddress)).valueOf(), amount / 2, "Unlocked owner balance should match")
      assert.equal((await app.unlockedBalanceOf.call(other, zeroAddress)).valueOf(), amount / 2, "Unlocked other balance should match")
    })

    it('fails moving 0 tokens', async () => {
      await app.stake(amount, '')
      return assertRevert(async () => {
        await app.moveTokens(owner, other, 0)
      })
    })

    it('fails moving more tokens than staked', async () => {
      await app.stake(amount, '')
      return assertRevert(async () => {
        await app.moveTokens(owner, other, amount + 1)
      })
    })

    it('fails moving more tokens than unlocked', async () => {
      await app.stake(amount, '')
      await app.lockIndefinitely(amount / 2, other, '', '')
      return assertRevert(async () => {
        await app.moveTokens(owner, other, amount / 2 + 1)
      })
    })

    // TODO: should we allow this? Or force to unlock first? Or unlock automatically?
    it('moves unlocked tokens if they can be unlocked', async () => {
      const time = 1000
      const endTime = (await app.getTimestampExt.call()) + time
      await app.stake(amount, '')
      // lock
      await app.lockNow(amount / 2, TIME_UNIT_SECONDS, endTime, other, '', '')
      // wait for time to go by
      await app.setTimestamp(endTime + 1)
      // move
      await app.moveTokens(owner, other, amount / 2 + 1)
      // checks
      assert.equal((await app.unlockedBalanceOf.call(owner, zeroAddress)).valueOf(), amount / 2 - 1, "Unlocked owner balance should match")
      assert.equal((await app.unlockedBalanceOf.call(other, zeroAddress)).valueOf(), amount / 2 + 1, "Unlocked other balance should match")
    })

    it('unlocks and moves tokens', async () => {
      const time = 1000
      await app.stake(amount, '')
      const endTime = (await app.getTimestampExt.call()) + time
      const r = await app.lockNow(amount / 2, TIME_UNIT_SECONDS, endTime, other, '', '')
      const lockId = getEvent(r, 'Locked', 'lockId')

      // unlock
      await app.unlockPartialAndMoveTokens(owner, lockId, other, amount / 4, { from: other })

      assert.equal((await app.unlockedBalanceOf.call(owner, zeroAddress)).valueOf(), amount / 2, "Unlocked owner balance should match")
      assert.equal((await app.locksCount.call(owner)).valueOf(), 1, "there should still be 1 lock")
      assert.equal((await app.unlockedBalanceOf.call(other, zeroAddress)).valueOf(), amount / 4, "Unlocked other balance should match")
    })

  })

  context('With scripts', async () => {
    let daoFact, executionTarget = {}

    before(async () => {
      const regFact = await getContract('EVMScriptRegistryFactory').new()
      const kernelBase = await getContract('Kernel').new()
      const aclBase = await getContract('ACL').new()
      daoFact = await getContract('DAOFactory').new(kernelBase.address, aclBase.address, regFact.address)
    })

    beforeEach(async () => {
      // scripts
      executionTarget = await getContract('ExecutionTarget').new()
      const stakeAction = { to: executionTarget.address, calldata: executionTarget.contract.executeStake.getData() }
      const stakeScript = encodeCallScript([stakeAction])
      const unstakeAction = { to: executionTarget.address, calldata: executionTarget.contract.executeUnstake.getData() }
      const unstakeScript = encodeCallScript([unstakeAction])
      const lockAction = { to: executionTarget.address, calldata: executionTarget.contract.executeLock.getData() }
      const lockScript = encodeCallScript([lockAction])

      // token
      token = await getContract('StandardTokenMock').new(owner, balance)

      // DAO
      const r = await daoFact.newDAO(owner)
      const dao = getContract('Kernel').at(r.logs.filter(l => l.event == 'DeployDAO')[0].args.dao)
      const acl = getContract('ACL').at(await dao.acl())

      await acl.createPermission(owner, dao.address, await dao.APP_MANAGER_ROLE(), owner, { from: owner })

      // App
      const receipt = await dao.newAppInstance('0x1234', (await getContract('StakingMock').new()).address, { from: owner })
      app = getContract('StakingMock').at(receipt.logs.filter(l => l.event == 'NewAppProxy')[0].args.proxy)
      await app.initialize(OVERLOCKING, token.address, stakeScript, unstakeScript, lockScript)

      // allow Staking app to move owner tokens
      await token.approve(app.address, amount)

      // Permissions
      await acl.createPermission(owner, app.address, await app.STAKE_ROLE(), owner, { from: owner })
      await acl.createPermission(owner, app.address, await app.UNSTAKE_ROLE(), owner, { from: owner })
      await acl.createPermission(owner, app.address, await app.LOCK_ROLE(), owner, { from: owner })
    })

    it('stakes and runs script', async () => {
      const initialOwnerBalance = parseInt((await token.balanceOf.call(owner)).valueOf(), 10)
      const initialStakingBalance = parseInt((await token.balanceOf.call(app.address)).valueOf(), 10)

      // stake tokens
      await app.stake(amount, '')

      const finalOwnerBalance = parseInt((await token.balanceOf.call(owner)).valueOf(), 10)
      const finalStakingBalance = parseInt((await token.balanceOf.call(app.address)).valueOf(), 10)
      assert.equal(finalOwnerBalance, initialOwnerBalance - amount, "owner balance should match")
      assert.equal(finalStakingBalance, initialStakingBalance + amount, "Staking app balance should match")
      assert.equal((await app.totalStakedFor.call(owner)).valueOf(), amount, "staked value should match")
      assert.equal(await executionTarget.stakeCounter(), 1, 'should have received execution call')
    })

    it('unstakes and runs script', async () => {
      const initialOwnerBalance = parseInt((await token.balanceOf.call(owner)).valueOf(), 10)
      const initialStakingBalance = parseInt((await token.balanceOf.call(app.address)).valueOf(), 10)

      // stake tokens
      await app.stake(amount, '')
      // unstake half of them
      await app.unstake(amount / 2, '')

      const finalOwnerBalance = parseInt((await token.balanceOf.call(owner)).valueOf(), 10)
      const finalStakingBalance = parseInt((await token.balanceOf.call(app.address)).valueOf(), 10)
      assert.equal(finalOwnerBalance, initialOwnerBalance - amount / 2, "owner balance should match")
      assert.equal(finalStakingBalance, initialStakingBalance + amount / 2, "Staking app balance should match")
      assert.equal((await app.totalStakedFor.call(owner)).valueOf(), amount / 2, "staked value should match")
      assert.equal(await executionTarget.unstakeCounter(), 1, 'should have received execution call')
    })

    it('locks indefinitely and runs script', async () => {
      await app.stake(amount, '')
      const r = await app.lockIndefinitely(amount / 2, other, '', '')
      const lockId = getEvent(r, 'Locked', 'lockId')
      // can not unlock
      assert.isFalse(await app.canUnlock.call(owner, lockId))
      await app.setTimestamp((await app.getTimestampExt.call()) + 5000)
      // still the same, can not unlock
      assert.isFalse(await app.canUnlock.call(owner, lockId))
      assert.equal((await app.unlockedBalanceOf.call(owner, zeroAddress)).valueOf(), amount / 2, "Unlocked balance should match")
      assert.equal((await app.locksCount.call(owner)).valueOf(), parseInt(lockId, 10) + 1, "last lock id should match")
      assert.equal(await executionTarget.lockCounter(), 1, 'should have received execution call')
    })

    it('stakes, locks and runs both script', async () => {
      const time = 1000
      const initialOwnerBalance = parseInt((await token.balanceOf.call(owner)).valueOf(), 10)
      const initialStakingBalance = parseInt((await token.balanceOf.call(app.address)).valueOf(), 10)
      const startTime = (await app.getTimestampExt.call())
      const endTime = startTime + time
      // stake and lock tokens
      const r = await app.stakeAndLock(amount, TIME_UNIT_SECONDS, startTime, endTime, other, '', '', '')
      const lockId = getEvent(r, 'Locked', 'lockId')

      // can not unlock
      assert.isFalse(await app.canUnlock.call(owner, lockId))
      assert.equal((await app.unlockedBalanceOf.call(owner, zeroAddress)).valueOf(), 0, "Unlocked balance should match")
      assert.equal((await app.locksCount.call(owner)).valueOf(), parseInt(lockId, 10) + 1, "last lock id should match")

      await app.setTimestamp(endTime + 1)
      // can unlock
      assert.isTrue(await app.canUnlock.call(owner, lockId))

      // check balances
      const finalOwnerBalance = parseInt((await token.balanceOf.call(owner)).valueOf(), 10)
      const finalStakingBalance = parseInt((await token.balanceOf.call(app.address)).valueOf(), 10)
      assert.equal(finalOwnerBalance, initialOwnerBalance - amount, "owner balance should match")
      assert.equal(finalStakingBalance, initialStakingBalance + amount, "Staking app balance should match")
      assert.equal((await app.totalStakedFor.call(owner)).valueOf(), amount, "staked value should match")
      // check executions
      assert.equal(await executionTarget.stakeCounter(), 1, 'should have received execution call')
      assert.equal(await executionTarget.lockCounter(), 1, 'should have received execution call')
    })

    it('unlocks unstakes and runs script', async () => {
      const time = 1000
      const initialOwnerBalance = parseInt((await token.balanceOf.call(owner)).valueOf(), 10)
      const initialStakingBalance = parseInt((await token.balanceOf.call(app.address)).valueOf(), 10)

      // stake tokens
      await app.stake(amount, '')
      // locks tokens
      const endTime = (await app.getTimestampExt.call()) + time
      await app.lockNow(amount, TIME_UNIT_SECONDS, endTime, other, '', '')

      await app.setTimestamp(endTime + 1)

      // unlock and unstake half of them
      await app.unlockAndUnstake(amount / 2, '')

      const finalOwnerBalance = parseInt((await token.balanceOf.call(owner)).valueOf(), 10)
      const finalStakingBalance = parseInt((await token.balanceOf.call(app.address)).valueOf(), 10)
      assert.equal(finalOwnerBalance, initialOwnerBalance - amount / 2, "owner balance should match")
      assert.equal(finalStakingBalance, initialStakingBalance + amount / 2, "Staking app balance should match")
      assert.equal((await app.totalStakedFor.call(owner)).valueOf(), amount / 2, "staked value should match")
      assert.equal(await executionTarget.unstakeCounter(), 1, 'should have received execution call')
    })
  })
})
