pragma solidity ^0.4.24;

import "../../RepresentativeProxy.sol";
import "@aragon/test-helpers/contracts/TimeHelpersMock.sol";


contract RepresentativeProxyMock is RepresentativeProxy, TimeHelpersMock {
    constructor(address _representative, uint64 _overruleWindow) RepresentativeProxy(_representative, _overruleWindow) public {
        // solium-disable-previous-line no-empty-blocks
    }
}
