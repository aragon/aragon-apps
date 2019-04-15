pragma solidity ^0.4.24;

import "@aragon/os/contracts/common/TimeHelpers.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";


contract TimeHelpersMock is TimeHelpers {
    using SafeMath for uint256;
    using SafeMath64 for uint64;

    uint256 mockedTimestamp;
    uint256 mockedBlockNumber;

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
        if (mockedTimestamp != 0) mockedTimestamp = mockedTimestamp.add(_seconds);
        else mockedTimestamp = block.timestamp.add(_seconds);
    }

    /**
    * @dev Advances the mocked block number value, used only for testing purposes
    */
    function mockAdvanceBlocks(uint256 _number) public {
        if (mockedBlockNumber != 0) mockedBlockNumber = mockedBlockNumber.add(_number);
        else mockedBlockNumber = block.number.add(_number);
    }

    /**
    * @dev Returns the mocked timestamp value
    */
    function getTimestampPublic() public view returns (uint64) {
        return getTimestamp64();
    }

    /**
    * @dev Returns the mocked block number value
    */
    function getBlockNumberPublic() public view returns (uint256) {
        return getBlockNumber();
    }

    /**
    * @dev Returns the mocked timestamp if it was set, or current `block.timestamp`
    */
    function getTimestamp() internal view returns (uint256) {
        if (mockedTimestamp != 0) return mockedTimestamp;
        return super.getTimestamp();
    }

    /**
    * @dev Returns the mocked block number if it was set, or current `block.number`
    */
    function getBlockNumber() internal view returns (uint256) {
        if (mockedBlockNumber != 0) return mockedBlockNumber;
        return super.getBlockNumber();
    }
}
