pragma solidity 0.4.15;

import "../../contracts/Payroll.sol";

contract PayrollMock is Payroll {
        uint _mockTime = now;

        function getTimestamp() internal constant returns (uint256) { return _mockTime; }
        function getTimestampPublic() public constant returns (uint256) { return _mockTime; }
        function mock_updateTimestamp() { _mockTime = now; }
        function mock_setTimestamp(uint i) { _mockTime = i; }
}
