pragma solidity 0.4.24;

import "../../Payroll.sol";


contract PayrollMock is Payroll {
    uint64 private _mockTime = uint64(now);

    /* Ugly hack to work around this issue:
     * https://github.com/trufflesuite/truffle/issues/569
     * https://github.com/trufflesuite/truffle/issues/737
     */
    function addEmployeeShort(
        address _accountAddress,
        uint256 _initialDenominationSalary,
        string _name,
        string _role
    )
        external
    {
        _addEmployee(
            _accountAddress,
            _initialDenominationSalary,
            _name,
            _role,
            getTimestamp64()
        );
    }

    function mockUpdateTimestamp() public { _mockTime = uint64(now); }
    function mockSetTimestamp(uint64 i) public { _mockTime = i; }
    function mockAddTimestamp(uint64 i) public { _mockTime += i; require(_mockTime >= i); }
    function getTimestampPublic() public view returns (uint64) { return _mockTime; }
    function getMaxAccruedValue() public view returns (uint256) { return MAX_ACCRUED_VALUE; }
    function getMaxAllowedTokens() public view returns (uint8) { return MAX_ALLOWED_TOKENS; }
    function getTimestamp64() internal view returns (uint64) { return _mockTime; }
}
