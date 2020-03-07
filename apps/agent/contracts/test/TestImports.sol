pragma solidity 0.4.24;

import "@aragon/os/contracts/acl/ACL.sol";
import "@aragon/os/contracts/apps/AppProxyBase.sol";
import "@aragon/os/contracts/factory/DAOFactory.sol";
import "@aragon/os/contracts/kernel/Kernel.sol";
import "@aragon/os/contracts/kernel/KernelProxy.sol";
import "@aragon/os/contracts/factory/APMRegistryFactory.sol";
import "@aragon/os/contracts/factory/ENSFactory.sol";
import "@aragon/os/contracts/apm/APMRegistry.sol";
import "@aragon/os/contracts/apm/Repo.sol";
import "@aragon/os/contracts/ens/ENSSubdomainRegistrar.sol";
import "@aragon/os/contracts/lib/ens/ENS.sol";
import "@aragon/os/contracts/lib/ens/AbstractENS.sol";
import "@aragon/os/contracts/lib/ens/PublicResolver.sol";

import "@aragon/apps-shared-minime/contracts/MiniMeToken.sol";
import "@aragon/contract-test-helpers/contracts/EtherTokenConstantMock.sol";
import "@aragon/contract-test-helpers/contracts/TokenMock.sol";
import "@aragon/contract-test-helpers/contracts/TokenReturnFalseMock.sol";
import "@aragon/contract-test-helpers/contracts/TokenReturnMissingMock.sol";
import "@aragon/contract-test-helpers/contracts/TokenReturnMissingMock.sol";


// You might think this file is a bit odd, but let me explain.
// We only use some contracts in our tests, which means Truffle
// will not compile it for us, because it is from an external
// dependency.
//
// We are now left with three options:
// - Copy/paste these contracts
// - Run the tests with `truffle compile --all` on
// - Or trick Truffle by claiming we use it in a Solidity test
//
// You know which one I went for.


contract TestImports {
  constructor() public {
    // to avoid lint error
  }
}
