pragma solidity 0.4.18;

import "../../contracts/Payroll.sol";

contract PayrollMock is Payroll {
        uint _mockTime = now;

        function getTimestamp() internal constant returns (uint256) { return _mockTime; }
        function getTimestampPublic() public constant returns (uint256) { return _mockTime; }
        function mock_updateTimestamp() public { _mockTime = now; }
        function mock_setTimestamp(uint i) public { _mockTime = i; }
}
