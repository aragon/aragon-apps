const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const getTimestamp = async () => await web3.eth.getBlock(web3.eth.blockNumber).timestamp

const getContract = artifacts.require
const getEvent = (receipt, event, arg) => { return receipt.logs.filter(l => l.event == event)[0].args[arg] }

// to test token transfer on unstake, to achieve 100% coverage
contract('Staking app, with bad token', accounts => {
  let app, token
  const owner = accounts[0]
  const other = accounts[1]
  const balance = 1000
  const amount = 100

  const OVERLOCKING = false

  beforeEach(async () => {
    app = await getContract('Staking').new()
    token = await getContract('FailingTokenMock').new(owner, balance)
    // allow Staking app to move owner tokens
    await token.approve(app.address, amount)
    await app.initialize(OVERLOCKING, token.address, '', '', '')
  })

  it('fails unstaking because of bad token', async () => {
    // stake tokens
    await app.stake(amount, '')
    // try to unstake half of them
    return assertRevert(async () => {
      await app.unstake(amount / 2, '')
    })
  })
})
