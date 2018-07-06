pragma solidity 0.4.18;

import "../../contracts/Payroll.sol";


contract PayrollMock is Payroll {
    uint64 private _mockTime = uint64(now);

    function mockUpdateTimestamp() public { _mockTime = uint64(now); }
    function mockSetTimestamp(uint64 i) public { _mockTime = i; }
    function getTimestampPublic() public constant returns (uint64) { return _mockTime; }
    function getTimestamp() internal constant returns (uint64) { return _mockTime; }
}
