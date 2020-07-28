const TruffleConfig = require('@aragon/truffle-config-v5')

TruffleConfig.compilers.solc.version = '0.4.24'
TruffleConfig.plugins = ["solidity-coverage"]

module.exports = TruffleConfig
