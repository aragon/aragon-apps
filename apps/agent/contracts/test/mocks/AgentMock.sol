pragma solidity ^0.4.24;

import "../../Agent.sol";


contract AgentMock is Agent {
    // truffle doesn’t work well with Solidity function overloading, so we create this wrapper to make sure
    // the function in Agent is called, instead of the one in ERC1271Bytes
    function isValidSignatureBytes32(bytes32 _hash, bytes memory _signature) public view returns (bytes4) {
        return isValidSignature(_hash, _signature);
    }
}
