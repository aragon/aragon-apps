const EMPTY_ADDR = '0x0000000000000000000000000000000000000000'

let token

module.exports = {
  postDao: async function(dao, bre) {
    await _deployToken(bre.artifacts)

    console.log(`> Token deployed: ${token.address}`)
  },

  preInit: async function(proxy, bre) {
    await token.changeController(proxy.address)

    console.log(`> Changed token controller to ${proxy.address}`)
  },

  getInitParams: async function(bre) {
    return [
      token.address,
      true, /* transferable */
      0     /* maxAccountTokens */
    ]
  }
}

async function _deployToken(artifacts) {
  const MiniMeToken = artifacts.require('MiniMeToken')

  token = await MiniMeToken.new(
    EMPTY_ADDR, /* Token factory */
    EMPTY_ADDR, /* Parent token  */
    0,          /* Parent token snapshot */
    'My Token', /* Token name */
    0,          /* Token decimals */
    'TKN',      /* Token symbol */
    true        /* Transfer enabled */
  )
}
