const { promisify } = require('util')

const getContract = artifacts.require

const StandardToken = artifacts.require('StandardTokenMock')
const StakingHistory = artifacts.require('StakingHistoryMock')

contract('StakingHistory app', accounts => {
  let app, token
  const owner = accounts[0]
  const other = accounts[1]
  const balance = 1000

  beforeEach(async () => {
    app = await StakingHistory.new()
    token = await StandardToken.new(owner, balance)
    
    await app.initialize(token.address, '', '', '')
    await app.disableBlockNumberMocking()
  })

  const getBlockNumber = promisify(web3.eth.getBlockNumber)

  it('stakes', async () => {
    const amount = 100
    const beforeBlock = await getBlockNumber()

    // allow Staking app to move owner tokens
    await token.approve(app.address, amount * 2)

    await app.stake(amount, '')
    const afterBlock1 = await getBlockNumber()

    await app.stake(amount, '')
    const afterBlock2 = await getBlockNumber()

    assert.equal(await app.totalStakedForAt(owner, beforeBlock), 0, "staked value be 0 before staking block")
    assert.equal(await app.totalStakedAt(beforeBlock), 0, "total staked value should be 0 before staking block")

    assert.equal(await app.totalStakedForAt(owner, afterBlock1), amount, "staked value after first stake should match")
    assert.equal(await app.totalStakedAt(afterBlock1), amount, "total staked value after first stake should match")

    assert.equal(await app.totalStakedForAt(owner, afterBlock2), amount * 2, "staked value after second stake should match")
    assert.equal(await app.totalStakedAt(afterBlock2), amount * 2, "total staked value after second stake should match")
  })

  it('stakes for', async () => {
    const amount = 100
    const beforeBlock = await getBlockNumber()

    // allow Staking app to move owner tokens
    await token.approve(app.address, amount)

    await app.stakeFor(other, amount, '')
    const afterBlock = await getBlockNumber()

    assert.equal(await app.totalStakedForAt(owner, beforeBlock), 0, "staked value be 0 before staking block")
    assert.equal(await app.totalStakedForAt(other, beforeBlock), 0, "staked value be 0 before staking block")
    assert.equal(await app.totalStakedAt(beforeBlock), 0, "total staked value should be 0 before staking block")

    assert.equal(await app.totalStakedForAt(owner, afterBlock), 0, "staked value be 0 for owner after staking for another account")
    assert.equal(await app.totalStakedForAt(other, afterBlock), amount, "staked value be correct for stake recipient")
    assert.equal(await app.totalStakedAt(afterBlock), amount, "total staked value should be correct")
  })

  it('unstakes', async () => {
    const amount = 100
    const unstakeAmount = amount / 2
    const beforeBlock = await getBlockNumber()

    // allow Staking app to move owner tokens
    await token.approve(app.address, amount)
    // stake tokens
    await app.stake(amount, '')
    const afterStakeBlock = await getBlockNumber()
    // unstake half of them
    await app.unstake(unstakeAmount, '')
    const afterUnstakeBlock = await getBlockNumber()

    assert.equal(await app.totalStakedForAt(owner, beforeBlock), 0, "staked value should be 0 before stake")
    assert.equal(await app.totalStakedForAt(owner, afterStakeBlock), amount, "staked value should be correct on stake")
    assert.equal(await app.totalStakedForAt(owner, afterUnstakeBlock), amount - unstakeAmount, "staked value should be correct after unstake")

    assert.equal(await app.totalStakedAt(beforeBlock), 0, "total staked value should be 0 before stake")
    assert.equal(await app.totalStakedAt(afterStakeBlock), amount, "total staked value should be correct on stake")
    assert.equal(await app.totalStakedAt(afterUnstakeBlock), amount - unstakeAmount, "total staked value should be correct after unstake")
  })

  it('moves tokens', async () => {
    const amount = 100
    const moveAmount = amount * 3 / 4
    const beforeBlock = await getBlockNumber()

    await token.approve(app.address, amount)
    await app.stake(amount, '')
    const afterStakeBlock = await getBlockNumber()

    await app.moveTokens(owner, other, moveAmount)
    const afterMoveBlock = await getBlockNumber()

    await app.unstake(moveAmount, '', { from: other })
    const afterUnstakeBlock = await getBlockNumber()

    assert.equal(await app.totalStakedForAt(owner, beforeBlock), 0, "staked value should be 0 before stake")
    assert.equal(await app.totalStakedForAt(owner, afterStakeBlock), amount, "owner staked value should be correct on stake")
    assert.equal(await app.totalStakedForAt(other, afterStakeBlock), 0, "other staked value should be 0 after owner stake")
    assert.equal(await app.totalStakedForAt(owner, afterMoveBlock), amount - moveAmount, "owner staked value should be correct after move")
    assert.equal(await app.totalStakedForAt(other, afterMoveBlock), moveAmount, "other staked value should be correct after move")
    assert.equal(await app.totalStakedForAt(owner, afterUnstakeBlock), amount - moveAmount, "owner staked value should be correct after other's unstake")
    assert.equal(await app.totalStakedForAt(other, afterUnstakeBlock), 0, "other staked value should be correct after unstake")

    assert.equal(await app.totalStakedAt(beforeBlock), 0, "total staked value should be 0 before stake")
    assert.equal(await app.totalStakedAt(afterStakeBlock), amount, "total staked value should be correct on stake")
    assert.equal(await app.totalStakedAt(afterMoveBlock), amount, "total staked value should be the same after moving tokens")
    assert.equal(await app.totalStakedAt(afterUnstakeBlock), amount - moveAmount, "total staked value should be correct after unstake")
    
    assert.equal(await token.balanceOf(other), moveAmount, 'account should have token balance')
  })
})
