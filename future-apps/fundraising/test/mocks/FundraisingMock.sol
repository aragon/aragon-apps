pragma solidity 0.4.18;

import "../../contracts/Fundraising.sol";

contract FundraisingMock is Fundraising {
    uint _mockTime = now;

    function getTimestamp() internal view returns (uint256) { return _mockTime; }
    function mock_setTimestamp(uint i) { _mockTime = i; }
}
