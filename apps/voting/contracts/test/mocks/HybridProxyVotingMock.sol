pragma solidity ^0.4.24;

import "../../HybridProxyVoting.sol";
import "@aragon/test-helpers/contracts/TimeHelpersMock.sol";


contract HybridProxyVotingMock is HybridProxyVoting, TimeHelpersMock {
    constructor(address _principal, uint64 _overruleWindow) HybridProxyVoting(_principal, _overruleWindow) public {
        // solium-disable-previous-line no-empty-blocks
    }
}


contract ProxyVotingRegistryMock is ProxyVotingRegistry {
    function newProxyVoting(uint64 _overruleWindow) external returns (HybridProxyVoting) {
        HybridProxyVotingMock proxyVoting = new HybridProxyVotingMock(msg.sender, _overruleWindow);
        address proxyVotingAddress = address(proxyVoting);
        proxyVotings[proxyVotingAddress] = true;
        emit NewProxyVoting(proxyVotingAddress);
        return HybridProxyVoting(proxyVoting);
    }
}
