const StandardBounties = artifacts.require("../contacts/StandardBounties.sol");

module.exports = function(deployer) {
  console.log('test')
  deployer.deploy(StandardBounties)
  .then(instance => {
    console.log(instance.address )
  })
};
