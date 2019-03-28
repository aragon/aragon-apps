pragma solidity 0.4.24;

import "../../TokenManager.sol";


contract TokenManagerMock is TokenManager {
    uint256 mockTime;

    function mock_setTimestamp(uint256 i) public { mockTime = i; }
    function getTimestamp() internal view returns (uint256) { return mockTime; }
}
