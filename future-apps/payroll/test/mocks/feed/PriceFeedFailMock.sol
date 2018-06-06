pragma solidity ^0.4.18;

import "ppf-monorepo/packages/ppf-contracts/contracts/Feed.sol";


contract PriceFeedFailMock is Feed {
    event PriceFeedFailLogSetRate (address sender, address token, uint128 value);

    function get(address base, address quote) external view returns (uint128 xrt, uint64 when) {
        if (base == address(0)) {
            return (2*10**18, 0);
        }

        PriceFeedFailLogSetRate(msg.sender, quote, xrt);

        return (0, uint64(now));
    }

    function setRate(address pr, address token, uint256 rate) public {
    }

}
