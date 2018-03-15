pragma solidity 0.4.18;

import "../../contracts/Finance.sol";

contract FinanceMock is Finance {
    uint _mockTime = now;

    function getTimestamp() internal view returns (uint256) { return _mockTime; }
    function mock_setTimestamp(uint i) public { _mockTime = i; }
}
