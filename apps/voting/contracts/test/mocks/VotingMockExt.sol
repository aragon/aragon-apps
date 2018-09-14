pragma solidity 0.4.24;

import "../../Voting.sol";


contract VotingMockExt {
    Voting voting;

    event StartVote(uint256 indexed voteId);

    constructor (Voting _voting) public {
        voting = _voting;
    }

    /* Ugly hack to work around this issue:
     * https://github.com/trufflesuite/truffle/issues/569
     * https://github.com/trufflesuite/truffle/issues/737
     */
    function newVote(bytes _executionScript, string _metadata, bool _castVote, bool _executesIfDecided)
        external
        returns (uint256 voteId)
    {
        voteId = voting.newVote(_executionScript, _metadata, _castVote, _executesIfDecided);
        emit StartVote(voteId);
    }
}
