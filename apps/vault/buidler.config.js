const { usePlugin } = require('@nomiclabs/buidler/config')

usePlugin('@nomiclabs/buidler-truffle5')
usePlugin('buidler-gas-reporter')
usePlugin('solidity-coverage')

module.exports = {
  networks: {
    coverage: {
      url: 'http://localhost:8555',
    },
    mainnet: {
      url: 'https://mainnet.eth.aragon.network',
      accounts: [
        process.env.ETH_KEY ||
          '0xa8a54b2d8197bc0b19bb8a084031be71835580a01e70a45a13babd16c9bc1563',
      ],
    },
    rinkeby: {
      url: 'https://rinkeby.eth.aragon.network',
      accounts: [
        process.env.ETH_KEY ||
          '0xa8a54b2d8197bc0b19bb8a084031be71835580a01e70a45a13babd16c9bc1563',
      ],
    },
    frame: {
      httpHeaders: { origin: 'buidler' },
      url: 'http://localhost:1248',
    },
    ganache: {
      url: 'http://localhost:8545',
      gasLimit: 6000000000,
      defaultBalanceEther: 100
    }
  },
  solc: {
    version: '0.4.24',
    optimizer: {
      enabled: true,
      runs: 1000,
    },
  },
  // The gas reporter plugin do not properly handle the buidlerevm
  // chain yet. In the mean time we should 'npx buidler node' and
  // then attach to running process using '--network localhost' as
  // explained in: https://buidler.dev/buidler-evm/#connecting-to-buidler-evm-from-wallets-and-other-software.
  // You can also ran 'yarn devchain' and on a separate window 'yarn test:gas'
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
  },
}
