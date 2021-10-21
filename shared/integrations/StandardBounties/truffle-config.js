const HDWalletProvider = require('truffle-hdwallet-provider')
const fs = require('fs')

// First read in the secrets.json to get our mnemonic
let secrets
let mnemonic
if (fs.existsSync('secrets.json')) {
  secrets = JSON.parse(fs.readFileSync('secrets.json', 'utf8'))
  mnemonic = secrets.mnemonic
} else {
  console.log('No secrets.json found. If you are trying to publish EPM ' +
              'this will fail. Otherwise, you can ignore this message!')
  mnemonic = ''
}

module.exports = {
  networks: {
    rpc: {
      network_id: 15,
      host: 'localhost',
      port: 8545,
      gas: 8.2e6,
    },
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*',
      gas: 8.2e6,
      gasPrice: 2000000000, // same as latest on Mainnet https://ethstats.net/
    },
    coverage: {
      host: 'localhost',
      network_id: '*',
      port: 8555,
      gas: 0xfffffffffff,
      gasPrice: 0x01,
    },
    live: {
      network_id: 1, // Ethereum public network,
      gas: 4600000
      // optional config values
      // host - defaults to "localhost"
      // port - defaults to 8545
      // gas
      // gasPrice
      // from - default address to use for any transaction Truffle makes during migrations
    },
    ropsten: {
      provider: new HDWalletProvider(mnemonic, 'https://ropsten.infura.io'),
      network_id: '3',
      gas: 4600000
    },
    testrpc: {
      network_id: 'default',
      gas: 4000000000
    }
  },
  mocha: {

    reporter: 'eth-gas-reporter',
    reporterOptions: {
      currency: 'USD',
      gasPrice: 6
    }

  },

  compilers: {
    solc: {
      version: "0.5.0"
    }
  }
}
