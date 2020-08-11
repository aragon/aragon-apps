const { usePlugin } = require('@nomiclabs/buidler/config')

usePlugin('@nomiclabs/buidler-truffle5')
usePlugin('buidler-gas-reporter')
usePlugin('solidity-coverage')

module.exports = {
  networks: {
    coverage: {
      url: 'http://localhost:8555',
    },
  },
  solc: {
    version: '0.4.24',
    optimizer: {
      enabled: true,
      runs: 1000,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
  },
}
