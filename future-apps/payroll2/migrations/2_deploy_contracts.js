var App = artifacts.require('./App.sol')

module.exports = function (deployer) {
  deployer.deploy(App)
}
