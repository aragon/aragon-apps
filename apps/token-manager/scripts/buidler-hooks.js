let minime, accounts

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

module.exports = {
  postDao: async function({ _experimentalAppInstaller, log }, bre) {
    const bigExp = (x, y) =>
      bre.web3.utils
        .toBN(x)
        .mul(bre.web3.utils.toBN(10).pow(web3.utils.toBN(y)))
    const pct16 = (x) => bigExp(x, 16)

    // Retrieve accounts.
    accounts = await bre.web3.eth.getAccounts()

    // Deploy a minime token an generate tokens to root account
    minime = await _deployMinimeToken(bre)
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

async function _deployMinimeToken(bre) {
  const MiniMeTokenFactory = await bre.artifacts.require('MiniMeTokenFactory')
  const MiniMeToken = await bre.artifacts.require('MiniMeToken')
  const factory = await MiniMeTokenFactory.new()
  const token = await MiniMeToken.new(
    factory.address,
    ZERO_ADDRESS,
    0,
    'MiniMe Test Token',
    18,
    'MMT',
    true
  )
  return token
}
