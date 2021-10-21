var Migrations = artifacts.require("../contracts/inherited/Migrations.sol");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
};
