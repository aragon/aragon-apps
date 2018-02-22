const HDWalletProvider = require('truffle-hdwallet-provider')

const mnemonic = 'stumble story behind hurt patient ball whisper art swift tongue ice burger'

let kovanProvider, mainnetProvier = {}

if (process.env.LIVE_NETWORKS) {
  kovanProvider = new HDWalletProvider(mnemonic, 'https://kovan.infura.io')
  mainnetProvier = new HDWalletProvider(mnemonic, 'https://mainnet.infura.io')
}

module.exports = {
  networks: {
    mainnet: {
      network_id: 1,
      provider: mainnetProvier,
      gas: 1.5e6,
      gasPrice: 3000000001
    },
    kovan: {
      network_id: 42,
      provider: kovanProvider,
      gas: 6.9e6,
    },
    rpc: {
      network_id: 15,
      host: 'localhost',
      port: 8545,
      gas: 6.9e6,
    },
  },
  build: {},
}
