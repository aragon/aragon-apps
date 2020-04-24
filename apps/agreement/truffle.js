const TruffleConfig = require('@aragon/truffle-config-v5/truffle-config')

TruffleConfig.compilers.solc.version = '0.4.24'
TruffleConfig.compilers.solc.settings.optimizer.runs = 1 // Agreements is hitting size limit with 10k runs

module.exports = TruffleConfig
