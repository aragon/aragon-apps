let voting, accounts

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

module.exports = {
  postDao: async function ({ _experimentalAppInstaller, log }, bre) {
    const bigExp = (x, y) =>
      bre.web3.utils
        .toBN(x)
        .mul(bre.web3.utils.toBN(10).pow(web3.utils.toBN(y)))
    const pct16 = (x) => bigExp(x, 16)

    // Retrieve accounts.
    accounts = await bre.web3.eth.getAccounts()

    // Deploy a minime token an generate tokens to root account
    const minime = await _deployMinimeToken(bre)
    await minime.generateTokens(accounts[1], pct16(10))
    log(`> Minime token deployed: ${minime.address}`)

    const tokens = await _experimentalAppInstaller('token-manager', {
      skipInitialize: true,
    })

    await minime.changeController(tokens.address)
    log(`> Change minime controller to tokens app`)
    await tokens.initialize([minime.address, true, 0])
    log(`> Tokens app installed: ${tokens.address}`)

    voting = await _experimentalAppInstaller('voting', {
      initializeArgs: [
        tokens.address,
        pct16(50), // support 50%
        pct16(25), // quorum 15%
        604800, // 7 days
      ],
    })
    log(`> Voting app installed: ${voting.address}`)

    await tokens.createPermission('MINT_ROLE', voting.address)
    await voting.createPermission('CREATE_VOTES_ROLE', tokens.address)
  },
  postInit: async function ({ proxy, _experimentalAppInstaller, log }, bre) {
    const periodDuration = 60 * 60 * 24 * 30 // 30 days
    const finance = await _experimentalAppInstaller('finance', {
      initializeArgs: [proxy.address, periodDuration],
    })
    log(`Installed finance: ${finance.address}`)

    await finance.createPermission('CREATE_PAYMENTS_ROLE', voting.address)
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
