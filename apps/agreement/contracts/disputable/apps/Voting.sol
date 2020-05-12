/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "@aragon/apps-voting/contracts/Voting.sol";

import "../DisputableApp.sol";


contract DisputableVoting is DisputableApp, Voting {
    /* Validation errors */
    string internal constant ERROR_CANNOT_FORWARD = "VOTING_CANNOT_FORWARD";
    string internal constant ERROR_CANNOT_CHALLENGE = "VOTING_CANNOT_CHALLENGE";
    string internal constant ERROR_VOTE_PAUSED = "VOTING_VOTE_PAUSED";
    string internal constant ERROR_VOTE_NOT_PAUSED = "VOTING_VOTE_NOT_PAUSED";

    // bytes32 public constant CHALLENGE_VOTE_ROLE = keccak256("CHALLENGE_VOTE_ROLE");
    bytes32 public constant CHALLENGE_VOTE_ROLE = 0x267b57a6766d11cbded92ee4646aff2b492cdcf8f54007af1e39cd624e152d2c;

    enum VoteStatus {
        Invalid,
        Active,
        Paused,
        Cancelled
    }

    struct DisputableVote {
        uint256 actionId;       // Identification number of the disputable action in the context of the agreement
        uint64 pausedAt;        // Datetime when the vote instance was paused
        uint64 pauseDuration;   // Duration in seconds while the vote has been paused
        VoteStatus status;      // Status of the vote
    }

    event VotePaused(uint256 indexed id);
    event VoteResumed(uint256 indexed id);
    event VoteCancelled(uint256 indexed id);

    mapping (uint256 => DisputableVote) private disputableVotes;

    function getVoteDisputable(uint256 _id) external view returns (uint256 actionId, uint64 pausedAt, uint64 pauseDuration, VoteStatus status) {
        DisputableVote storage vote_ = disputableVotes[_id];
        actionId = vote_.actionId;
        pausedAt = vote_.pausedAt;
        pauseDuration = vote_.pauseDuration;
        status = vote_.status;
    }

    /**
    * @dev Tells whether a vote can be executed or not
    * @return True if the given vote can be executed, false otherwise
    */
    function canExecute(uint256 _id) public view returns (bool) {
        if (!super.canExecute(_id)) {
            return false;
        }

        DisputableVote storage vote_ = disputableVotes[_id];
        return vote_.status == VoteStatus.Invalid || _canProceed(vote_.actionId);
    }

    /**
    * @dev Internal function to create a new vote
    * @return voteId id for newly created vote
    */
    function _newVote(bytes _executionScript, string _metadata, bool _castVote, bool _executesIfDecided) internal returns (uint256) {
        uint256 voteId = super._newVote(_executionScript, _metadata, _castVote, _executesIfDecided);

        DisputableVote storage vote_ = disputableVotes[voteId];
        vote_.actionId = _newAction(voteId, msg.sender, bytes(_metadata));
        vote_.status = VoteStatus.Active;
        return voteId;
    }

    /**
    * @dev Unsafe version of _executeVote that assumes you have already checked if the vote can be executed and exists
    */
    function _unsafeExecuteVote(uint256 _id) internal {
        super._unsafeExecuteVote(_id);

        DisputableVote storage vote_ = disputableVotes[_id];
        if (vote_.status != VoteStatus.Invalid) {
            _closeAction(vote_.actionId);
        }
    }

    /**
    * @dev Challenge a vote
    * @param _id Identification number of the vote to be challenged
    * @param _challenger Address challenging the vote
    */
    function _onDisputableChallenged(uint256 _id, address _challenger) internal {
        require(_canChallenge(_id, _challenger), ERROR_CANNOT_CHALLENGE);

        DisputableVote storage vote_ = disputableVotes[_id];
        vote_.status = VoteStatus.Paused;
        vote_.pausedAt = getTimestamp64();
        emit VotePaused(_id);
    }

    /**
    * @dev Allow a vote
    * @param _id Identification number of the vote to be allowed
    */
    function _onDisputableAllowed(uint256 _id) internal {
        DisputableVote storage vote_ = disputableVotes[_id];
        require(_isPaused(vote_), ERROR_VOTE_NOT_PAUSED);

        vote_.status = VoteStatus.Active;
        vote_.pauseDuration = getTimestamp64() - vote_.pausedAt;
        emit VoteResumed(_id);
    }

    /**
    * @dev Reject a vote
    * @param _id Identification number of the vote to be rejected
    */
    function _onDisputableRejected(uint256 _id) internal {
        DisputableVote storage vote_ = disputableVotes[_id];
        require(_isPaused(vote_), ERROR_VOTE_NOT_PAUSED);

        vote_.status = VoteStatus.Cancelled;
        vote_.pauseDuration = getTimestamp64() - vote_.pausedAt;
        emit VoteCancelled(_id);
    }

    /**
    * @dev Void an entry
    * @param _id Identification number of the entry to be voided
    */
    function _onDisputableVoided(uint256 _id) internal {
        _onDisputableRejected(_id);
    }

    /**
    * @dev Tell whether an address can challenge an entry or not
    * @param _id Identification number of the entry being queried
    * @param _challenger Address being queried
    * @return True if the given address can challenge actions and the given entry is not challenged, false otherwise
    */
    function _canChallenge(uint256 _id, address _challenger) internal view returns (bool) {
        DisputableVote storage vote_ = disputableVotes[_id];
        return _canPause(vote_) && canPerform(_challenger, CHALLENGE_VOTE_ROLE, arr(_challenger, _id));
    }

    /**
    * @dev Internal function to check if a vote can be executed. It assumes the queried vote exists.
    * @return True if the given vote can be executed, false otherwise
    */
    function _canExecute(uint256 _id) internal view returns (bool) {
        DisputableVote storage vote_ = disputableVotes[_id];
        return _isPausedOrCancelled(vote_) ? false : super._canExecute(_id);
    }

    /**
    * @dev Internal function to check if a voter can participate on a vote. It assumes the queried vote exists.
    * @return True if the given voter can participate a certain vote, false otherwise
    */
    function _canVote(uint256 _id, address _voter) internal view returns (bool) {
        if (!super._canVote(_id, _voter)) {
            return false;
        }

        DisputableVote storage vote_ = disputableVotes[_id];
        return vote_.status == VoteStatus.Invalid || (_isPausedOrCancelled(vote_) && _canProceed(vote_.actionId));
    }

    /**
    * @dev Tell whether a vote can be paused or not
    * @param _vote Vote action instance being queried
    * @return True if the given vote can be paused, false otherwise
    */
    function _canPause(DisputableVote storage _vote) internal view returns (bool) {
        return _vote.status == VoteStatus.Active && _vote.pausedAt == 0;
    }

    /**
    * @dev Tell whether a vote is paused or not
    * @param _vote Vote action instance being queried
    * @return True if the given vote is paused, false otherwise
    */
    function _isPaused(DisputableVote storage _vote) internal view returns (bool) {
        return _vote.status == VoteStatus.Paused;
    }

    /**
    * @dev Tell whether a vote is paused or cancelled, or not
    * @param _vote Vote action instance being queried
    * @return True if the given vote is paused or cancelled, false otherwise
    */
    function _isPausedOrCancelled(DisputableVote storage _vote) internal view returns (bool) {
        VoteStatus status = _vote.status;
        return status == VoteStatus.Paused || status == VoteStatus.Cancelled;
    }

    /**
    * @dev Internal function to tell the end datetime of a vote
    */
    function _voteEndDate(uint256 _voteId) internal view returns (uint64) {
        DisputableVote storage vote_ = disputableVotes[_voteId];
        uint64 netEndDate = super._voteEndDate(_voteId);
        return (vote_.status == VoteStatus.Invalid) ? netEndDate : netEndDate.add(vote_.pauseDuration);
    }
}
