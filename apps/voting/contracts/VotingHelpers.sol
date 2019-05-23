pragma solidity 0.4.24;

import "./Voting.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";


library VotingHelpers {
    using SafeMath64 for uint64;

    function isVoteAbsent(Voting self, uint256 voteId, address voter) internal view returns (bool) {
        Voting.VoterState state = self.getVoterState(voteId, voter);
        return state == Voting.VoterState.Absent;
    }

    function isVoteOpen(Voting self, uint256 voteId) internal view returns (bool open) {
        (open, , , , , , , , , ) = self.getVote(voteId);
    }

    function getVoteEndDate(Voting self, uint256 voteId) internal view returns (uint64) {
        uint64 startDate;
        (, , startDate, , , , , , , ) = self.getVote(voteId);

        return startDate.add(self.voteTime());
    }
}
