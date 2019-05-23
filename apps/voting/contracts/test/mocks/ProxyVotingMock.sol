pragma solidity ^0.4.24;

import "../../ProxyVoting.sol";
import "@aragon/test-helpers/contracts/TimeHelpersMock.sol";


contract ProxyVotingMock is ProxyVoting, TimeHelpersMock {
    constructor(address _principal, uint64 _overruleWindow) ProxyVoting(_principal, _overruleWindow) public {
        // solium-disable-previous-line no-empty-blocks
    }
}
