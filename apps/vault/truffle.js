const x = require("@aragon/os/truffle-config")

x.networks.rpc.gas = 100e6 // fuck solidity tests

module.exports = x
