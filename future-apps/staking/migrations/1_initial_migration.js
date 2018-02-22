var Migrations = artifacts.require("./Migrations.sol");

module.exports = function(deployer, n, accounts) {
  deployer.deploy(Migrations)
}
