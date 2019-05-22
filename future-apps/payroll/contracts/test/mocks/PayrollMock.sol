pragma solidity 0.4.24;

import "../../Payroll.sol";
import "@aragon/test-helpers/contracts/TimeHelpersMock.sol";


contract PayrollMock is Payroll, TimeHelpersMock {
    function getMaxAllowedTokens() public pure returns (uint256) { return MAX_ALLOWED_TOKENS; }
    function getAllowedTokensArrayLength() public view returns (uint256) { return allowedTokensArray.length; }
}
