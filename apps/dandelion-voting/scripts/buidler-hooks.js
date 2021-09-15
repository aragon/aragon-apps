let pct16

let tokens, accounts, minime

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

module.exports = {
  postDao: async function({ _experimentalAppInstaller, log }, bre) {
    const bigExp = (x, y) =>
      bre.web3.utils
        .toBN(x)
        .mul(bre.web3.utils.toBN(10).pow(bre.web3.utils.toBN(y)))
    pct16 = (x) => bigExp(x, 16)

    // Retrieve accounts.
    accounts = await bre.web3.eth.getAccounts()

    // Deploy a minime token an generate tokens to root account
    minime = await _deployMinimeToken(bre)
    await minime.generateTokens(accounts[1], pct16(100))
    log(`> Minime token deployed: ${minime.address}`)

    tokens = await _experimentalAppInstaller('token-manager', {
      skipInitialize: true
    })

    await minime.changeController(tokens.address)
    log(`> Change minime controller to tokens app`)
    await tokens.initialize([minime.address, true, 0])
    log(`> Tokens app installed: ${tokens.address}`)
  },

  getInitParams: async function({}, bre) {
    return [
      minime.address,
      pct16(50), // support 50%
      pct16(25), // quorum 15%
      604800, // 7 days,
      10, // 10 seconds buffer between votes
      5 // 5 seconds execution delay
    ]
  },

  postInit: async function({ proxy }, bre) {
    await tokens.createPermission('MINT_ROLE', proxy.address)
  }
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
