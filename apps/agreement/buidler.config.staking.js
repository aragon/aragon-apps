// This buidler configuration is only used to compile the Staking contracts for testing, which are using solc 0.5.17

module.exports = {
  solc: {
    version: "0.5.17",
    optimizer: {
      enabled: true,
      runs: 10000,
    },
  },
  paths: {
    sources: "./mocks/staking",
  }
}
