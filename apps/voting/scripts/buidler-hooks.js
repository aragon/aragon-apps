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

let accounts, minime, tokens

module.exports = {
  postDao: async function({ _experimentalAppInstaller, log }, bre) {
    // Retrieve accounts.
    accounts = await bre.web3.eth.getAccounts()

    // Deploy a minime token an generate tokens to root account
    minime = await deployMinimeToken(bre)
    await minime.generateTokens(accounts[0], pct16(100))
    log(`> Minime token deployed: ${minime.address}`)

    tokens = await _experimentalAppInstaller('token-manager', {
      skipInitialize: true,
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
      60 * 60 * 24 * 7, // 7 days
    ]
  },
  postInit: async function ({ proxy }, bre) {
    await tokens.createPermission('MINT_ROLE', proxy.address)
  },
}
