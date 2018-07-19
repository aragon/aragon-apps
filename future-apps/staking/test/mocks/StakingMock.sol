pragma solidity 0.4.18;

import "../../contracts/Staking.sol";

contract StakingMock is Staking {
    uint64 _mockTime = uint64(now);
    uint64 _mockBlockNumber = uint64(block.number);

    function getTimestampExt() external view returns (uint64) {
        return getTimestamp();
    }

    function getBlockNumberExt() external view returns (uint64) {
        return getBlocknumber();
    }

    function setTimestamp(uint64 i) public {
        _mockTime = i;
    }

    function setBlockNumber(uint64 i) public {
        _mockBlockNumber = i;
    }

    function getTimestamp() internal view returns (uint64) {
        return _mockTime;
    }

    // TODO: Use getBlockNumber from Initializable.sol - issue with solidity-coverage
    function getBlocknumber() internal view returns (uint64) {
        return _mockBlockNumber;
    }
}
