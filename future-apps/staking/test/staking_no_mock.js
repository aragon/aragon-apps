const getTimestamp = async () => await web3.eth.getBlock(web3.eth.blockNumber).timestamp

const getContract = artifacts.require
const getEvent = (receipt, event, arg) => { return receipt.logs.filter(l => l.event == event)[0].args[arg] }

// to test getBlocknumber and getTimestamp, to achieve 100% coverage
contract('Staking app, Real one (no mock)', accounts => {
  let app, token
  const owner = accounts[0]
  const other = accounts[1]
  const balance = 1000
  const amount = 100

  const zeroBytes32 = "0x0000000000000000000000000000000000000000000000000000000000000000"
  let ANY_ENTITY
  const TIME_UNIT_BLOCKS = 0
  const TIME_UNIT_SECONDS = 1
  const OVERLOCKING = false

  beforeEach(async () => {
    app = await getContract('Staking').new()
    ANY_ENTITY = await app.ANY_ENTITY.call()
    token = await getContract('StandardTokenMock').new(owner, balance)
    // allow Staking app to move owner tokens
    await token.approve(app.address, amount)
    await app.initialize(OVERLOCKING, token.address, '', '', '')
  })

  it('locks using seconds', async () => {
    const time = 1000
    await app.stake(amount, '')
    const startTime = await getTimestamp()
    const endTime = startTime + time
    const r = await app.lockNow(amount / 2, TIME_UNIT_SECONDS, endTime, other, '', '')
    const lockId = getEvent(r, 'Locked', 'lockId')

    // check lock values
    const lock = await app.getLock.call(owner, lockId)
    assert.equal(lock[0], amount / 2, "locked amount should match")
    assert.equal(lock[1], TIME_UNIT_SECONDS, "lock time unit should match")
    assert.equal(lock[3], endTime, "lock time end should match")
    assert.equal(lock[4], other, "unlocker should match")
    assert.equal(lock[5], zeroBytes32, "lock metadata should match")
    assert.equal(lock[6], 0, "next lock id should match")

    // can not unlock
    assert.isFalse(await app.canUnlock.call(owner, lockId))
    assert.equal((await app.unlockedBalanceOf.call(owner, ANY_ENTITY)).valueOf(), amount / 2, "Unlocked balance should match")
    assert.equal((await app.unlockedBalanceOf.call(owner, other)).valueOf(), amount / 2, "Unlocked balance should match for unlocker")
    assert.equal((await app.locksCount.call(owner)).valueOf(), parseInt(lockId, 10), "last lock id should match")
  })

  it('locks using blocks', async () => {
    const blocks = 2
    await app.stake(amount, '')
    const startBlock = web3.eth.blockNumber
    const endBlock = startBlock + blocks
    const r = await app.lockNow(amount / 2, TIME_UNIT_BLOCKS, endBlock, other, '', '')
    const lockId = getEvent(r, 'Locked', 'lockId')

    // check lock values
    const lock = await app.lastLock.call(owner)
    assert.equal(lock[0], amount / 2, "locked amount should match")
    assert.equal(lock[1], TIME_UNIT_BLOCKS, "lock time unit should match")
    assert.equal(lock[3], endBlock, "end block end should match")
    assert.equal(lock[4], other, "unlocker should match")
    assert.equal(lock[5], "0x0000000000000000000000000000000000000000000000000000000000000000", "lock metadata should match")
    assert.equal(lock[6], 0, "next lock id should match")

    // can not unlock
    assert.isFalse(await app.canUnlock.call(owner, lockId))
    assert.equal((await app.unlockedBalanceOf.call(owner, ANY_ENTITY)).valueOf(), amount / 2, "Unlocked balance should match")
    assert.equal((await app.unlockedBalanceOf.call(owner, other)).valueOf(), amount / 2, "Unlocked balance should match for unlocker")
    assert.equal((await app.locksCount.call(owner)).valueOf(), parseInt(lockId, 10), "last lock id should match")
  })
})
