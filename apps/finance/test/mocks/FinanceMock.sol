pragma solidity 0.4.18;

import "../../contracts/Finance.sol";

contract FinanceMock is Finance {
    uint64 mockTime = uint64(now);
    uint256 mockMaxPeriodTransitions = MAX_UINT;

    function mock_setMaxPeriodTransitions(uint256 i) public { mockMaxPeriodTransitions = i; }
    function mock_setTimestamp(uint64 i) public { mockTime = i; }

    function getMaxPeriodTransitions() internal view returns (uint256) { return mockMaxPeriodTransitions; }
    function getTimestamp64() internal view returns (uint64) { return mockTime; }
}
