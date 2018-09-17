pragma solidity 0.4.24;

import "../../Voting.sol";


contract VotingMock is Voting {
    /* Ugly hack to work around this issue:
     * https://github.com/trufflesuite/truffle/issues/569
     * https://github.com/trufflesuite/truffle/issues/737
     */
    function newVoteExt(bytes _executionScript, string _metadata, bool _castVote, bool _executesIfDecided)
        external
        returns (uint256 voteId)
    {
        voteId = _newVote(_executionScript, _metadata, _castVote, _executesIfDecided);
        emit StartVote(voteId);
    }

    // _isValuePct public wrapper
    function isValuePct(uint256 _value, uint256 _total, uint256 _pct) external pure returns (bool) {
        return _isValuePct(_value, _total, _pct);
    }
}
