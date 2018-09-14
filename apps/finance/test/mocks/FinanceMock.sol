pragma solidity 0.4.18;

import "../../contracts/Finance.sol";

contract FinanceMock is Finance {
    uint256 mockTime = now;
    uint256 mockMaxPeriodTransitions = MAX_UINT;

    function mock_setMaxPeriodTransitions(uint256 i) public { mockMaxPeriodTransitions = i; }
    function mock_setTimestamp(uint256 i) public { mockTime = i; }

    function getMaxPeriodTransitions() internal view returns (uint256) { return mockMaxPeriodTransitions; }
    function getTimestamp() internal view returns (uint256) { return mockTime; }
}
