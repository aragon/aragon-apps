const table = require('console.table')
const getAccounts = require('./helpers/get-accounts')
const { tokens } = require('./helpers/get-tokens')

const globalArtifacts = this.artifacts // Not injected unless called directly via truffle
const globalWeb3 = this.web3 // Not injected unless called directly via truffle

const defaultOwner = process.env.OWNER
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const PROXY_APP_NAMESPACE = '0xd6f028ca0e8edb4a8c9757ca4fdccab25fa1e0317da1188108f7d2dee14902fb'
const KERNEL_DEFAULT_VAULT_APP_ID =
  '0x7e852e0fcfce6551c13800f1e7476f982525c2b5277ba14b24339c68416336d1'

module.exports = async (
  truffleExecCallback,
  { artifacts = globalArtifacts, web3 = globalWeb3, owner = defaultOwner, verbose = true } = {}
) => {
  const log = (...args) => {
    if (verbose) {
      console.log(...args)
    }
  }

  if (!owner) {
    const accounts = await getAccounts(web3)
    owner = accounts[0]
    log(`No OWNER environment variable passed, setting ENS owner to provider's account: ${owner}`)
  }

  const ERC20Token = artifacts.require('ERC20Token')
  const Kernel = artifacts.require('Kernel')
  const Vault = artifacts.require('Vault')

  // get Vault contract
  const daoAddress = process.argv.slice(4)[0]

  const kernel = await Kernel.at(daoAddress)
  const vaultAddress = await kernel.getApp(PROXY_APP_NAMESPACE, KERNEL_DEFAULT_VAULT_APP_ID)
  const vault = await Vault.at(vaultAddress)

  const { toWei, fromWei } = web3.utils || web3

  try {
    const data = []
    // Deposit test tokens
    let tokenContract
    for (const { amount, ...token } of tokens) {
      tokenContract = await ERC20Token.new(owner, ...Object.values(token))

      await tokenContract.approve(vaultAddress, amount)
      await vault.deposit(tokenContract.address, amount)

      const balance = await tokenContract.balanceOf(vaultAddress)
      data.push([token.symbol, tokenContract.address, fromWei(balance)])
    }

    // Deposit ETH
    const etherAmount = toWei('0.1', 'ether')
    await vault.deposit(ZERO_ADDRESS, etherAmount, { value: etherAmount })
    const balance = await web3.eth.getBalance(vaultAddress)
    data.push(['ETH', ZERO_ADDRESS, fromWei(balance)])

    console.table(['Token', 'Address', 'Balance'], data)
  } catch (err) {
    console.log(`Error depositing tokens: ${err}`)
  }

  if (typeof truffleExecCallback === 'function') {
    // Called directly via `truffle exec`
    truffleExecCallback()
  } else {
    return {}
  }
}
