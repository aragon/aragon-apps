pragma solidity 0.4.24;

import "../../Voting.sol";


contract VotingMockExt {
    Voting voting;

    constructor (Voting _voting) {
        voting = _voting;
    }

    /** Ugly hack to work around this issue:
     * https://github.com/trufflesuite/truffle/issues/569
     * https://github.com/trufflesuite/truffle/issues/737
     */
    function newVote(bytes _executionScript, string _metadata)
        external
        returns (uint256 voteId)
    {
        return voting.newVote(_executionScript, _metadata);
    }
}
