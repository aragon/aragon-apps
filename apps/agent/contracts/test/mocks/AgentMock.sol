pragma solidity ^0.4.24;

import "../../Agent.sol";


contract AgentMock is Agent {
    function isValidSignatureBytes32(bytes32 _hash, bytes memory _signature) public view returns (bytes4) {
        return isValidSignature(_hash, _signature);
    }
}
