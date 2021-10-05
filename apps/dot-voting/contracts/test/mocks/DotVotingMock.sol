pragma solidity ^0.4.24;

import "../../DotVoting.sol";


contract DotVotingMock is DotVoting {
    // _isValuePct public wrapper
    function isValuePct(uint256 _value, uint256 _total, uint256 _pct) external returns (bool) {
        return _isValuePct(_value, _total, _pct);
    }
}
