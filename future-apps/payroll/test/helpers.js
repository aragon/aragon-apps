const getContract = name => artifacts.require(name)
const ETH = '0x0'

module.exports = {
  deployErc20TokenAndDeposit: async (sender, finance, vault, name="ERC20Token", decimals=18) => {
    const token = await getContract('MiniMeToken').new("0x0", "0x0", 0, name, decimals, 'E20', true) // dummy parameters for minime
    const amount = new web3.BigNumber(10**18).times(new web3.BigNumber(10**decimals))
    await token.generateTokens(sender, amount)
    await token.approve(finance.address, amount, {from: sender})
    await finance.deposit(token.address, amount, "Initial deployment", {from: sender})
    return token
  },

  addAllowedTokens: async(payroll, tokens) => {
    const currencies = [ETH].concat(tokens.map(c => c.address))
    await Promise.all(currencies.map(token => payroll.addAllowedToken(token)))
  },

  getTimePassed: async (payroll, employeeId) => {
    let employee = await payroll.getEmployee.call(employeeId)
    let currentTime = await payroll.getTimestampPublic.call()
    return currentTime - employee[4]
  },

  redistributeEth: async (accounts, finance) => {
    const amount = 10
    const split = 4
    // transfer ETH to owner
    for (let i = 1; i < split; i++)
      await web3.eth.sendTransaction({ from: accounts[i], to: accounts[0], value: web3.toWei(amount, 'ether') });
    // transfer ETH to Payroll contract
    for (let i = split; i < 10; i++)
      await finance.sendTransaction({ from: accounts[i], value: web3.toWei(amount, 'ether') });

  }
}
