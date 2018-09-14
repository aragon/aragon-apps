/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 */

pragma solidity 0.4.18;

import "@aragon/os/contracts/apps/AragonApp.sol";

import "@aragon/os/contracts/common/IForwarder.sol";

import "@aragon/os/contracts/lib/minime/MiniMeToken.sol";
import "@aragon/os/contracts/lib/zeppelin/math/SafeMath.sol";
import "@aragon/os/contracts/lib/zeppelin/math/SafeMath64.sol";
import "@aragon/os/contracts/lib/misc/Migrations.sol";


contract Voting is IForwarder, AragonApp {
    using SafeMath for uint256;
    using SafeMath64 for uint64;

    MiniMeToken public token;
    uint256 public supportRequiredPct;
    uint256 public minAcceptQuorumPct;
    uint64 public voteTime;

    uint256 constant public PCT_BASE = 10 ** 18; // 0% = 0; 1% = 10^16; 100% = 10^18

    bytes32 constant public CREATE_VOTES_ROLE = keccak256("CREATE_VOTES_ROLE");
    bytes32 constant public MODIFY_QUORUM_ROLE = keccak256("MODIFY_QUORUM_ROLE");

    enum VoterState { Absent, Yea, Nay }

    struct Vote {
        address creator;
        uint64 startDate;
        uint256 snapshotBlock;
        uint256 minAcceptQuorumPct;
        uint256 yea;
        uint256 nay;
        uint256 totalVoters;
        string metadata;
        bytes executionScript;
        bool executed;
        mapping (address => VoterState) voters;
    }

    Vote[] internal votes; // first index is 1

    event StartVote(uint256 indexed voteId);
    event CastVote(uint256 indexed voteId, address indexed voter, bool supports, uint256 stake);
    event ExecuteVote(uint256 indexed voteId);
    event ChangeMinQuorum(uint256 minAcceptQuorumPct);

    /**
    * @notice Initializes Voting app with `_token.symbol(): string` for governance, minimum support of `(_supportRequiredPct - _supportRequiredPct % 10^16) / 10^14`, minimum acceptance quorum of `(_minAcceptQuorumPct - _minAcceptQuorumPct % 10^16) / 10^14` and vote duations of `(_voteTime - _voteTime % 86400) / 86400` day `_voteTime >= 172800 ? 's' : ''`
    * @param _token MiniMeToken Address that will be used as governance token
    * @param _supportRequiredPct Percentage of yeas in casted votes for a vote to succeed (expressed as a percentage of 10^18; eg. 10^16 = 1%, 10^18 = 100%)
    * @param _minAcceptQuorumPct Percentage of yeas in total possible votes for a vote to succeed (expressed as a percentage of 10^18; eg. 10^16 = 1%, 10^18 = 100%)
    * @param _voteTime Seconds that a vote will be open for token holders to vote (unless enough yeas or nays have been cast to make an early decision)
    */
    function initialize(
        MiniMeToken _token,
        uint256 _supportRequiredPct,
        uint256 _minAcceptQuorumPct,
        uint64 _voteTime
    ) onlyInit external
    {
        initialized();

        require(_minAcceptQuorumPct > 0);
        require(_supportRequiredPct <= PCT_BASE);
        require(_supportRequiredPct >= _minAcceptQuorumPct);

        token = _token;
        supportRequiredPct = _supportRequiredPct;
        minAcceptQuorumPct = _minAcceptQuorumPct;
        voteTime = _voteTime;

        votes.length += 1;
    }

    /**
    * @notice Change minimum acceptance quorum to `(_minAcceptQuorumPct - _minAcceptQuorumPct % 10^16) / 10^14`%
    * @param _minAcceptQuorumPct New acceptance quorum
    */
    function changeMinAcceptQuorumPct(uint256 _minAcceptQuorumPct) authP(MODIFY_QUORUM_ROLE, arr(_minAcceptQuorumPct, minAcceptQuorumPct)) isInitialized external {
        require(_minAcceptQuorumPct > 0);
        require(supportRequiredPct >= _minAcceptQuorumPct);
        minAcceptQuorumPct = _minAcceptQuorumPct;

        ChangeMinQuorum(_minAcceptQuorumPct);
    }

    /**
    * @notice Create a new vote about "`_metadata`"
    * @param _executionScript EVM script to be executed on approval
    * @param _metadata Vote metadata
    * @return voteId Id for newly created vote
    */
    function newVote(bytes _executionScript, string _metadata) auth(CREATE_VOTES_ROLE) external returns (uint256 voteId) {
        return _newVote(_executionScript, _metadata, true);
    }

    /**
     * @notice Create a new vote about "`_metadata`"
     * @param _executionScript EVM script to be executed on approval
     * @param _metadata Vote metadata
     * @param _castVote Whether to also cast newly created vote
     * @return voteId id for newly created vote
     */
    function newVote(bytes _executionScript, string _metadata, bool _castVote) auth(CREATE_VOTES_ROLE) external returns (uint256 voteId) {
        return _newVote(_executionScript, _metadata, _castVote);
    }

    /**
    * @notice Vote `_supports ? 'yea' : 'nay'` in vote #`_voteId`
    * @param _voteId Id for vote
    * @param _supports Whether voter supports the vote
    * @param _executesIfDecided Whether the vote should execute its action if it becomes decided
    */
    function vote(uint256 _voteId, bool _supports, bool _executesIfDecided) isInitialized external {
        require(canVote(_voteId, msg.sender));
        _vote(
            _voteId,
            _supports,
            msg.sender,
            _executesIfDecided
        );
    }

    /**
    * @notice Execute the result of vote #`_voteId`
    * @param _voteId Id for vote
    */
    function executeVote(uint256 _voteId) isInitialized external {
        require(canExecute(_voteId));
        _executeVote(_voteId);
    }

    function isForwarder() public pure returns (bool) {
        return true;
    }

    /**
    * @notice Creates a vote to execute the desired action, and casts a support vote
    * @dev IForwarder interface conformance
    * @param _evmScript Start vote with script
    */
    function forward(bytes _evmScript) public {
        require(canForward(msg.sender, _evmScript));
        _newVote(_evmScript, "", true);
    }

    function canForward(address _sender, bytes _evmCallScript) public view returns (bool) {
        return canPerform(_sender, CREATE_VOTES_ROLE, arr());
    }

    function canVote(uint256 _voteId, address _voter) public view returns (bool) {
        Vote storage vote = votes[_voteId];

        return _isVoteOpen(vote) && token.balanceOfAt(_voter, vote.snapshotBlock) > 0;
    }

    function canExecute(uint256 _voteId) public view returns (bool) {
        Vote storage vote = votes[_voteId];

        if (vote.executed)
            return false;

        // Voting is already decided
        if (_isValuePct(vote.yea, vote.totalVoters, supportRequiredPct))
            return true;

        uint256 totalVotes = vote.yea.add(vote.nay);

        // vote ended?
        if (_isVoteOpen(vote))
            return false;
        // has Support?
        if (!_isValuePct(vote.yea, totalVotes, supportRequiredPct))
            return false;
        // has Min Quorum?
        if (!_isValuePct(vote.yea, vote.totalVoters, vote.minAcceptQuorumPct))
            return false;

        return true;
    }

    function getVote(uint256 _voteId) public view returns (bool open, bool executed, address creator, uint64 startDate, uint256 snapshotBlock, uint256 minAcceptQuorum, uint256 yea, uint256 nay, uint256 totalVoters, bytes script) {
        Vote storage vote = votes[_voteId];

        open = _isVoteOpen(vote);
        executed = vote.executed;
        creator = vote.creator;
        startDate = vote.startDate;
        snapshotBlock = vote.snapshotBlock;
        minAcceptQuorum = vote.minAcceptQuorumPct;
        yea = vote.yea;
        nay = vote.nay;
        totalVoters = vote.totalVoters;
        script = vote.executionScript;
    }

    function getVoteMetadata(uint256 _voteId) public view returns (string) {
        return votes[_voteId].metadata;
    }

    function getVoterState(uint256 _voteId, address _voter) public view returns (VoterState) {
        return votes[_voteId].voters[_voter];
    }

    function _newVote(bytes _executionScript, string _metadata, bool _castVote) isInitialized internal returns (uint256 voteId) {
        voteId = votes.length++;
        Vote storage vote = votes[voteId];
        vote.executionScript = _executionScript;
        vote.creator = msg.sender;
        vote.startDate = uint64(now);
        vote.metadata = _metadata;
        vote.snapshotBlock = getBlockNumber() - 1; // avoid double voting in this very block
        vote.totalVoters = token.totalSupplyAt(vote.snapshotBlock);
        vote.minAcceptQuorumPct = minAcceptQuorumPct;

        StartVote(voteId);

        if (_castVote && canVote(voteId, msg.sender)) {
            _vote(
                voteId,
                true,
                msg.sender,
                true
            );
        }
    }

    function _vote(
        uint256 _voteId,
        bool _supports,
        address _voter,
        bool _executesIfDecided
    ) internal
    {
        Vote storage vote = votes[_voteId];

        // this could re-enter, though we can assume the governance token is not malicious
        uint256 voterStake = token.balanceOfAt(_voter, vote.snapshotBlock);
        VoterState state = vote.voters[_voter];

        // if voter had previously voted, decrease count
        if (state == VoterState.Yea)
            vote.yea = vote.yea.sub(voterStake);
        if (state == VoterState.Nay)
            vote.nay = vote.nay.sub(voterStake);

        if (_supports)
            vote.yea = vote.yea.add(voterStake);
        else
            vote.nay = vote.nay.add(voterStake);

        vote.voters[_voter] = _supports ? VoterState.Yea : VoterState.Nay;

        CastVote(
            _voteId,
            _voter,
            _supports,
            voterStake
        );

        if (_executesIfDecided && canExecute(_voteId))
            _executeVote(_voteId);
    }

    function _executeVote(uint256 _voteId) internal {
        Vote storage vote = votes[_voteId];

        vote.executed = true;

        bytes memory input = new bytes(0); // TODO: Consider input for voting scripts
        runScript(vote.executionScript, input, new address[](0));

        ExecuteVote(_voteId);
    }

    function _isVoteOpen(Vote storage vote) internal view returns (bool) {
        return uint64(now) < vote.startDate.add(voteTime) && !vote.executed;
    }

    /**
    * @dev Calculates whether `_value` is at least a percentage `_pct` of `_total`
    */
    function _isValuePct(uint256 _value, uint256 _total, uint256 _pct) internal pure returns (bool) {
        if (_total == 0) {
            return false;
        }

        uint256 computedPct = _value.mul(PCT_BASE) / _total;

        return computedPct >= _pct;
    }
}
