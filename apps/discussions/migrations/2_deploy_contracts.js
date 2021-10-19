/* global artifacts */
var DiscussionApp = artifacts.require('DiscussionApp.sol')

module.exports = function(deployer) {
  deployer.deploy(DiscussionApp)
}
