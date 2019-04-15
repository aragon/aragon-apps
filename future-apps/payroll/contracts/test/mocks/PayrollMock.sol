pragma solidity 0.4.24;

import "../../Payroll.sol";


contract PayrollMock is Payroll {
    uint64 private _mockTime = uint64(now);

    function mockUpdateTimestamp() public { _mockTime = uint64(now); }
    function mockSetTimestamp(uint64 i) public { _mockTime = i; }
    function mockAddTimestamp(uint64 i) public { _mockTime += i; require(_mockTime >= i); }
    function getTimestampPublic() public view returns (uint64) { return _mockTime; }
    function getMaxAllowedTokens() public view returns (uint256) { return MAX_ALLOWED_TOKENS; }
    function getAllowedTokensArrayLength() public view returns (uint256) { return allowedTokensArray.length; }
    function getTimestamp() internal view returns (uint256) { return uint256(_mockTime); }
    function getTimestamp64() internal view returns (uint64) { return _mockTime; }
}
