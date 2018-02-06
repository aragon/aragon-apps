pragma solidity 0.4.18;

import "../../contracts/Payroll.sol";


contract PayrollMock is Payroll {
    uint private _mockTime = now;

    function getTimestampPublic() public constant returns (uint256) { return _mockTime; }
    function mockUpdateTimestamp() public { _mockTime = now; }
    function mockSetTimestamp(uint i) public { _mockTime = i; }
    function getTimestamp() internal constant returns (uint256) { return _mockTime; }
}
