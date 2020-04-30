const { usePlugin } = require('@nomiclabs/buidler/config')

usePlugin('@aragon/buidler-aragon')
usePlugin('buidler-gas-reporter')
usePlugin('solidity-coverage')

module.exports = {
  defaultNetwork: 'localhost',
  networks: {
    localhost: {
      url: 'http://localhost:8545',
      accounts: {
        mnemonic: 'explain tackle mirror kit van hammer degree position ginger unfair soup bonus'
      }
    },
    coverage: {
      url: 'http://localhost:8555',
    },
  },
  solc: {
    version: '0.4.24',
    optimizer: {
      enabled: true,
      runs: 1, // Agreements is hitting size limit with 10k runs
    },
  },
  gasReporter: {
    enabled: process.env.GAS_REPORTER ? true : false,
  },
  aragon: {
    appSrcPath: 'app/',
    appBuildOutputPath: 'dist/',
  },
}
