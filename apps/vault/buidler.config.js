const { usePlugin } = require("@nomiclabs/buidler/config");

usePlugin("@aragon/buidler-aragon");
usePlugin("@nomiclabs/buidler-solhint");
usePlugin("buidler-gas-reporter");
usePlugin("solidity-coverage");

module.exports = {
  defaultNetwork: "localhost",
  networks: {
    localhost: {
      url: "http://localhost:8545"
    }
  },
  solc: {
    version: "0.4.24"
  },
  gasReporter: {
    enabled: process.env.GAS_REPORTER ? true : false
  },
  aragon: {
    appServePort: 8001,
    clientServePort: 3000,
    appSrcPath: "app/",
    appBuildOutputPath: "dist/"
  }
};
