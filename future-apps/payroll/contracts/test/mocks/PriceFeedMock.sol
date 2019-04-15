pragma solidity ^0.4.24;

import "@aragon/ppf-contracts/contracts/IFeed.sol";
import "@aragon/test-helpers/contracts/TimeHelpersMock.sol";


contract PriceFeedMock is IFeed, TimeHelpersMock {

    event PriceFeedLogSetRate(address sender, address token, uint128 value);

    function get(address base, address quote) external view returns (uint128 xrt, uint64 when) {
        xrt = toInt(quote);
        when = getTimestamp64();

        emit PriceFeedLogSetRate(msg.sender, quote, xrt);
    }

    /// Gets the first byte of an address as an integer
    function toInt(address x) public pure returns(uint128 i) {
        uint256 j = uint256(x);
        j = j >> 152;
        if (j == 0)
            j = 10**15;
        else
            j = j * 10**18;
        i = uint128(j);
    }

}
