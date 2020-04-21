pragma solidity ^0.4.24;

import "@aragon/os/contracts/common/TimeHelpers.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";


contract TimeHelpersMock is TimeHelpers {
    uint256 internal mockedTimestamp;

    /**
    * @dev Sets a mocked timestamp value, used only for testing purposes
    */
    function mockSetTimestamp(uint256 _timestamp) public {
        mockedTimestamp = _timestamp;
    }

    /**
    * @dev Increases the mocked timestamp value, used only for testing purposes
    */
    function mockIncreaseTime(uint256 _seconds) public {
        if (mockedTimestamp != 0) mockedTimestamp = mockedTimestamp + _seconds;
        else mockedTimestamp = block.timestamp + _seconds;
    }

    /**
    * @dev Returns the mocked timestamp value
    */
    function getTimestampPublic() public view returns (uint64) {
        return getTimestamp64();
    }

    /**
    * @dev Returns the mocked timestamp if it was set, or current `block.timestamp`
    */
    function getTimestamp() internal view returns (uint256) {
        if (mockedTimestamp != 0) return mockedTimestamp;
        return super.getTimestamp();
    }
}
