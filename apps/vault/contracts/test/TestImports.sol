pragma solidity 0.4.24;

import "@aragon/os/contracts/acl/ACL.sol";
import "@aragon/os/contracts/apps/AppProxyBase.sol";
import "@aragon/os/contracts/factory/DAOFactory.sol";
import "@aragon/os/contracts/kernel/Kernel.sol";
import "@aragon/os/contracts/kernel/KernelProxy.sol";

import "@aragon/contract-helpers-test/contracts/0.4/aragonOS/EtherTokenConstantMock.sol";
import "@aragon/contract-helpers-test/contracts/0.4/token/TokenMock.sol";
import "@aragon/contract-helpers-test/contracts/0.4/token/TokenReturnFalseMock.sol";
import "@aragon/contract-helpers-test/contracts/0.4/token/TokenReturnMissingMock.sol";

// You might think this file is a bit odd, but let me explain.
// We only use these contract in our tests, which means
// Truffle will not compile it for us, because it is
// from an external dependency.
//
// We are now left with some options:
// - Copy/paste these contracts
// - Or trick Truffle by claiming we use it in a Solidity test
//
// You know which one I went for.


contract TestImports {
    constructor() public {
        // solium-disable-previous-line no-empty-blocks
    }
}
