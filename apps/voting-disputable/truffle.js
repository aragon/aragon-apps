const TruffleConfig = require('@aragon/truffle-config-v5/truffle-config')

TruffleConfig.compilers.solc.version = '0.4.24'
TruffleConfig.compilers.solc.settings.optimizer.runs = 1000
// We are currently lowering the number of runs to avoid hitting the bytecode size limit

module.exports = TruffleConfig
