const Web3 = require('web3')

const EMPTY_ADDR = '0x0000000000000000000000000000000000000000'

let token

module.exports = {
  postDao: async function(dao, bre) {
    await _deployToken(bre.artifacts)
    await _mintTokens(bre.web3)

    console.log(`> Token deployed: ${token.address}`)
  },

  preInit: async function(proxy, bre) {
    await token.changeController(proxy.address)

    console.log(`> Changed token controller to ${proxy.address}`)
  },

  getInitParams: async function(bre) {
    return [
      token.address,
      _bigExp(50, 16), /* supportRequiredPct */
      _bigExp(20, 16), /* minAcceptQuorumPct */
      1000,                  /* voteTime */
    ]
  }
}

async function _mintTokens(web3) {
  const accounts = await web3.eth.getAccounts()

  await token.generateTokens(accounts[0], _bigExp(100, 18))
  await token.generateTokens(accounts[1], _bigExp(100, 18))
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

function _bigExp(value, exp) {
  const EXP = Web3.utils.toBN(10).pow(Web3.utils.toBN(exp))
  return Web3.utils.toBN(value).mul(EXP)
}
