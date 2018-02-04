let x = require("@aragon/os/truffle-config")

x.networks.rinkeby.gasPrice = 15000000001
x.networks.rinkeby.gasLimit = 6.99e6

module.exports = x
