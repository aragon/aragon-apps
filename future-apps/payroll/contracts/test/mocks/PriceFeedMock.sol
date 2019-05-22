pragma solidity ^0.4.24;

import "@aragon/ppf-contracts/contracts/PPF.sol";
import "@aragon/test-helpers/contracts/TimeHelpersMock.sol";


contract PriceFeedMock is PPF, TimeHelpersMock {
    // Set operator to address(0) so invalid signatures can pass
    constructor () PPF(address(0), msg.sender) public {
        // solium-disable-previous-line no-empty-blocks
    }

    // Overriding function for testing purposes, removing check for zero address operator
    function _setOperator(address _operator) internal {
        // require(_operator != address(0));
        operator = _operator;
        emit SetOperator(_operator);
    }

    // Overwrite function using TimeHelpers and allowing to set past rates
    function update(address base, address quote, uint128 xrt, uint64 when, bytes sig) public {
        bytes32 pair = super.pairId(base, quote);

        // Remove check that ensures a given rate is more recent than the current value
        // require(when > feed[pair].when && when <= getTimestamp());
        require(xrt > 0); // Make sure xrt is not 0, as the math would break (Dividing by 0 sucks big time)
        require(base != quote); // Assumption that currency units are fungible and xrt should always be 1

        bytes32 h = super.setHash(base, quote, xrt, when);
        require(h.personalRecover(sig) == operator); // Make sure the update was signed by the operator

        feed[pair] = Price(super.pairXRT(base, quote, xrt), when);

        emit SetRate(base, quote, xrt, when);
    }
}
