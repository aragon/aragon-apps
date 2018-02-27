pragma solidity 0.4.18;

/*
import "@aragon/os/contracts/factory/ENSFactory.sol";
import "@aragon/os/contracts/factory/APMRegistryFactory.sol";
import "@aragon/os/contracts/factory/EVMScriptRegistryFactory.sol";
import "@aragon/os/contracts/common/EtherToken.sol";
*/
import "@aragon/id/contracts/FIFSResolvingRegistrar.sol";

// You might think this file is a bit odd, but let me explain.
// We only use these contracts in our tests, which
// means Truffle will not compile it for us, because it is
// from an external dependency.
//
// We are now left with three options:
// - Copy/paste the MiniMeToken contract
// - Run the tests with `truffle compile --all` on
// - Or trick Truffle by claiming we use it in a Solidity test
//
// You know which one I went for.

contract TestTemplates {
    // ...
}
