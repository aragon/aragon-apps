pragma solidity 0.4.24;

import "../../TokenManager.sol";


contract TokenManagerMock is TokenManager {
    uint64 mockTime = uint64(now);

    function mock_setTimestamp(uint64 i) public { mockTime = i; }
    function getTimestamp64() internal view returns (uint64) { return mockTime; }
}
