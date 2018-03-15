const x = require("@aragon/os/truffle-config")

x.networks.rpc.gas = 50e6 // fuck solidity tests

module.exports = x
