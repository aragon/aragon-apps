pragma solidity 0.4.24;

import "../../Finance.sol";


contract FinanceMock is Finance {
    uint64 mockTime = uint64(now);
    uint64 mockMaxPeriodTransitions = MAX_UINT64;

    function mock_setMaxPeriodTransitions(uint64 i) public { mockMaxPeriodTransitions = i; }
    function mock_setTimestamp(uint64 i) public { mockTime = i; }
    function getMaxUint64() public pure returns (uint64) { return MAX_UINT64; }

    function getMaxPeriodTransitions() internal view returns (uint64) { return mockMaxPeriodTransitions; }
    function getTimestamp64() internal view returns (uint64) { return mockTime; }
}
