pragma solidity ^0.4.24;

import "@aragon/ppf-contracts/contracts/IFeed.sol";


contract PriceFeedFailMock is IFeed {
    event PriceFeedFailLogSetRate (address sender, address token, uint128 value);

    function get(address base, address quote) external view returns (uint128 xrt, uint64 when) {
        if (base == address(0)) {
            return (2*10**18, 0);
        }

        emit PriceFeedFailLogSetRate(msg.sender, quote, xrt);

        return (0, uint64(now));
    }

    function setRate(address pr, address token, uint256 rate) public {
    }

}
