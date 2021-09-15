const { usePlugin } = require('@nomiclabs/buidler/config')
const hooks = require('./scripts/buidler-hooks')
const homedir = require('homedir')
const path = require('path')

usePlugin('@aragon/buidler-aragon')
usePlugin('@nomiclabs/buidler-solhint')
usePlugin('buidler-gas-reporter')
usePlugin('solidity-coverage')

const configFilePath = filename => path.join(homedir(), `.aragon/${filename}`)
const settingsForNetwork = network => {
  try {
    const {rpc, keys} = require(configFilePath(`${network}_key.json`))
    return { url: rpc, accounts: keys}
  } catch (e) {
    return { url: '' }
  }
}

module.exports = {
  defaultNetwork: 'localhost',
  networks: {
    localhost: {
      url: 'http://localhost:8545',
      accounts: {
        mnemonic: "explain tackle mirror kit van hammer degree position ginger unfair soup bonus"
      }
    },
    coverage: {
      url: 'http://localhost:8555',
    },
    xdai: {
      url: 'https://xdai.poanetwork.dev/'
    },
    rinkeby: settingsForNetwork("rinkeby"),
    mainnet: settingsForNetwork("mainnet"),
    mumbai: settingsForNetwork("mumbai"),
    matic: settingsForNetwork('matic')
  },
  solc: {
    version: '0.4.24',
    optimizer: {
      enabled: true,
      runs: 10000,
    },
  },
  gasReporter: {
    enabled: process.env.GAS_REPORTER ? true : false,
  },
  aragon: {
    appServePort: 3001,
    clientServePort: 3000,
    appSrcPath: 'app/',
    appBuildOutputPath: 'dist/',
    hooks,
  },
}
