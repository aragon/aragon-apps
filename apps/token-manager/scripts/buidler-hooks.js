const { pct16 } = require('@aragon/contract-helpers-test/src/numbers')
const { ZERO_ADDRESS } = require('@aragon/contract-helpers-test/src/addresses')

async function deployMinimeToken(bre) {
  const MiniMeToken = await bre.artifacts.require('MiniMeToken')
  const token = await MiniMeToken.new(
    ZERO_ADDRESS,
    ZERO_ADDRESS,
    0,
    'MiniMe Test Token',
    18,
    'MMT',
    true
  )
  return token
}

let minime, accounts

module.exports = {
  postDao: async function({ _experimentalAppInstaller, log }, bre) {
    // Retrieve accounts.
    accounts = await bre.web3.eth.getAccounts()

    // Deploy a minime token an generate tokens to root account
    minime = await deployMinimeToken(bre)
    await minime.generateTokens(accounts[1], pct16(100))
    log(`> Minime token deployed: ${minime.address}`)
  },
  preInit: async function({ proxy, log }, bre) {
    await minime.changeController(proxy.address)
    log(`> Change minime controller to tokens app`)
  },
  getInitParams: async function({}, bre) {
    return [minime.address, true, 0]
  },
}
