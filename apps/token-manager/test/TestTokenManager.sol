pragma solidity 0.4.18;

import "@aragon/os/contracts/lib/minime/MiniMeToken.sol";

// You might think this file is a bit odd, but let me explain.
// We only use the MiniMeToken contract in our tests, which
// means Truffle will not compile it for us, because it is
// from an external dependency.
//
// We are now left with three options:
// - Copy/paste the MiniMeToken contract
// - Run the tests with `truffle compile --all` on
// - Or trick Truffle by claiming we use it in a Solidity test
//
// You know which one I went for.

contract TestTokenManager {
  // ...
}
