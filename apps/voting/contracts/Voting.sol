pragma solidity 0.4.18;

import "@aragon/core/contracts/apps/App.sol";

import "@aragon/core/contracts/common/EVMCallScript.sol";
import "@aragon/core/contracts/common/Initializable.sol";
import "@aragon/core/contracts/common/MiniMeToken.sol";
import "@aragon/core/contracts/common/IForwarder.sol";

import "@aragon/core/contracts/zeppelin/math/SafeMath.sol";

import "@aragon/core/contracts/misc/Migrations.sol";


contract Voting is App, Initializable, EVMCallScriptRunner, EVMCallScriptDecoder, IForwarder {
    using SafeMath for uint256;

    MiniMeToken public token;
    uint256 public supportRequiredPct;
    uint256 public minAcceptQuorumPct;
    uint64 public voteTime;

    uint256 constant public PCT_BASE = 10 ** 18;

    bytes32 constant public CREATE_VOTES_ROLE = bytes32(1);
    bytes32 constant public MODIFY_QUORUM_ROLE = bytes32(2);

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

    Vote[] votes;

    event StartVote(uint256 indexed voteId);
    event CastVote(uint256 indexed voteId, address indexed voter, bool supports, uint256 stake);
    event ExecuteVote(uint256 indexed voteId);
    event ChangeMinQuorum(uint256 minAcceptQuorumPct);

    /**
    * @notice Initializes Voting app (some parameters won't be modifiable after being set)
    * @param _token MiniMeToken Address that will be used as governance token
    * @param _supportRequiredPct Percentage of yeas in casted votes for a vote to succeed (expressed as a percentage of 10^18 (eg 10^16 = 1%, 10^18 = 100%)
    * @param _minAcceptQuorumPct Percentage of yeas in total possible votes for a vote to succeed (expressed as a percentage of 10^18 (eg 10^16 = 1%, 10^18 = 100%)
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

        require(_supportRequiredPct > 1);
        require(_supportRequiredPct <= PCT_BASE);
        require(_supportRequiredPct >= _minAcceptQuorumPct);

        token = _token;
        supportRequiredPct = _supportRequiredPct;
        minAcceptQuorumPct = _minAcceptQuorumPct;
        voteTime = _voteTime;

        votes.length += 1;
    }

    /**
    * @notice Change minimum acceptance quorum to `_minAcceptQuorumPct`.
    * @param _minAcceptQuorumPct New acceptance quorum
    */
    function changeMinAcceptQuorumPct(uint256 _minAcceptQuorumPct) auth(MODIFY_QUORUM_ROLE) external {
        require(supportRequiredPct >= _minAcceptQuorumPct);
        minAcceptQuorumPct = _minAcceptQuorumPct;

        ChangeMinQuorum(_minAcceptQuorumPct);
    }

    /**
    * @notice Create new vote to execute `_executionScript`
    * @param _executionScript EVM script to be executed on approval
    * @return voteId Id for newly created vote
    */
    function newVote(bytes _executionScript, string _metadata) auth(CREATE_VOTES_ROLE) external returns (uint256 voteId) {
        return _newVote(_executionScript, _metadata);
    }

    /**
    * @notice Vote `_supports` in vote with id `_voteId`
    * @param _voteId Id for vote
    * @param _supports Whether voter supports the vote
    * @param _executesIfDecided Whether the vote should execute its action if it becomes decided
    */
    function vote(uint256 _voteId, bool _supports, bool _executesIfDecided) external {
        require(canVote(_voteId, msg.sender));
        _vote(
            _voteId,
            _supports,
            msg.sender,
            _executesIfDecided
        );
    }

    /**
    * @notice Execute the result of vote `_voteId`
    * @param _voteId Id for vote
    */
    function executeVote(uint256 _voteId) external {
        require(canExecute(_voteId));
        _executeVote(_voteId);
    }

    /**
    * @dev IForwarder interface conformance
    * @param _evmCallScript Start vote with script
    */
    function forward(bytes _evmCallScript) external {
        require(canForward(msg.sender, _evmCallScript));
        _newVote(_evmCallScript, "");
    }

    function canForward(address _sender, bytes _evmCallScript) public view returns (bool) {
        return canPerform(_sender, CREATE_VOTES_ROLE);
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

        uint256 totalVotes = vote.yea + vote.nay;

        bool voteEnded = !_isVoteOpen(vote);
        bool hasSupport = _isValuePct(vote.yea, totalVotes, supportRequiredPct);
        bool hasMinQuorum = _isValuePct(vote.yea, vote.totalVoters, vote.minAcceptQuorumPct);

        return voteEnded && hasSupport && hasMinQuorum;
    }

    function getVote(uint256 _voteId) public view returns (bool open, bool executed, address creator, uint64 startDate, uint256 snapshotBlock, uint256 minAcceptQuorum, uint256 yea, uint256 nay, uint256 totalVoters, bytes script, uint256 scriptActionsCount) {
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
        scriptActionsCount = getScriptActionsCount(vote.executionScript);
    }

    function getVoteMetadata(uint256 _voteId) public view returns (string metadata) {
        return votes[_voteId].metadata;
    }

    function getVoteScriptAction(uint256 _voteId, uint256 _scriptAction) public view returns (address, bytes) {
        return getScriptAction(votes[_voteId].executionScript, _scriptAction);
    }

    function _newVote(bytes _executionScript, string _metadata) internal returns (uint256 voteId) {
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

        if (canVote(voteId, msg.sender)) {
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

        runScript(vote.executionScript);

        ExecuteVote(_voteId);
    }

    function _isVoteOpen(Vote storage vote) internal returns (bool) {
        return uint64(now) < (vote.startDate + voteTime) && !vote.executed;
    }

    /**
    * @dev Calculates whether `_value` is at least a percentage `_pct` of `_total`
    */
    function _isValuePct(uint256 _value, uint256 _total, uint256 _pct) internal returns (bool) {
        if (_value == 0 && _total > 0)
            return false;

        uint256 m = _total * _pct;
        uint256 v = m / PCT_BASE;

        // If division is exact, allow same value, otherwise require value to be greater
        return m % PCT_BASE == 0 ? _value >= v : _value > v;
    }
}
