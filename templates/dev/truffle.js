let x = require("@aragon/os/truffle-config")

x.networks.rinkeby.gasPrice = 25000000001
x.networks.rinkeby.gas = 7e6
x.networks.rpc.gas = 10e6

module.exports = x
