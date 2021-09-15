var App = artifacts.require('./TimeLock.sol')

module.exports = function(deployer) {
  deployer.deploy(App)
}
