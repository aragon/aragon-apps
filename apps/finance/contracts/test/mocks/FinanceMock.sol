pragma solidity 0.4.24;

import "../../Finance.sol";
import "@aragon/contract-helpers-test/contracts/0.4/aragonOS/TimeHelpersMock.sol";


contract FinanceMock is Finance, TimeHelpersMock {
    uint64 mockMaxPeriodTransitions = MAX_UINT64;

    function getMaxUint64() public pure returns (uint64) { return MAX_UINT64; }

    function mock_setMaxPeriodTransitions(uint64 i) public { mockMaxPeriodTransitions = i; }

    function getMaxPeriodTransitions() internal view returns (uint64) { return mockMaxPeriodTransitions; }
}
