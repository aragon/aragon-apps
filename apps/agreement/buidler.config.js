const { usePlugin } = require('@nomiclabs/buidler/config')

usePlugin('@aragon/buidler-aragon')
usePlugin("@nomiclabs/buidler-etherscan");
usePlugin('buidler-gas-reporter')
usePlugin('solidity-coverage')

module.exports = {
  defaultNetwork: 'localhost',
  networks: {
    localhost: {
      url: 'http://localhost:8545'
    },
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
    enabled: process.env.GAS_REPORTER ? true : false,
  },
  etherscan: {
    // The url for the Etherscan API.
    url: "https://api.etherscan.io/api",
    // API key for Etherscan
    apiKey: process.env.ETHERSCAN_KEY
  },
  aragon: {
    appSrcPath: 'public/',
  },
}
