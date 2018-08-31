/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/common/IForwarder.sol";

import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";

import "@aragon-apps/minime/contracts/MiniMeToken.sol";


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
    ) external onlyInit
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
    function changeMinAcceptQuorumPct(uint256 _minAcceptQuorumPct)
        external
        authP(MODIFY_QUORUM_ROLE, arr(_minAcceptQuorumPct, minAcceptQuorumPct))
    {
        require(_minAcceptQuorumPct > 0);
        require(supportRequiredPct >= _minAcceptQuorumPct);
        minAcceptQuorumPct = _minAcceptQuorumPct;

        emit ChangeMinQuorum(_minAcceptQuorumPct);
    }

    /**
    * @notice Create a new vote about "`_metadata`"
    * @param _executionScript EVM script to be executed on approval
    * @param _metadata Vote metadata
    * @return voteId Id for newly created vote
    */
    function newVote(bytes _executionScript, string _metadata) external auth(CREATE_VOTES_ROLE) returns (uint256 voteId) {
        return _newVote(_executionScript, _metadata, true);
    }

    /**
     * @notice Create a new vote about "`_metadata`"
     * @param _executionScript EVM script to be executed on approval
     * @param _metadata Vote metadata
     * @param _castVote Whether to also cast newly created vote
     * @return voteId id for newly created vote
     */
    function newVote(bytes _executionScript, string _metadata, bool _castVote) external auth(CREATE_VOTES_ROLE) returns (uint256 voteId) {
        return _newVote(_executionScript, _metadata, _castVote);
    }

    /**
    * @notice Vote `_supports ? 'yea' : 'nay'` in vote #`_voteId`
    * @param _voteId Id for vote
    * @param _supports Whether voter supports the vote
    * @param _executesIfDecided Whether the vote should execute its action if it becomes decided
    */
    function vote(uint256 _voteId, bool _supports, bool _executesIfDecided) external isInitialized {
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
    function executeVote(uint256 _voteId) external isInitialized {
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
    function forward(bytes _evmScript) public isInitialized {
        require(canForward(msg.sender, _evmScript));
        _newVote(_evmScript, "", true);
    }

    function canForward(address _sender, bytes) public view returns (bool) {
        return canPerform(_sender, CREATE_VOTES_ROLE, arr());
    }

    function canVote(uint256 _voteId, address _voter) public view returns (bool) {
        Vote storage voteTmp = votes[_voteId];

        return _isVoteOpen(voteTmp) && token.balanceOfAt(_voter, voteTmp.snapshotBlock) > 0;
    }

    function canExecute(uint256 _voteId) public view returns (bool) {
        Vote storage voteTmp = votes[_voteId];

        if (voteTmp.executed)
            return false;

        // Voting is already decided
        if (_isValuePct(voteTmp.yea, voteTmp.totalVoters, supportRequiredPct))
            return true;

        uint256 totalVotes = voteTmp.yea.add(voteTmp.nay);

        // vote ended?
        if (_isVoteOpen(voteTmp))
            return false;
        // has Support?
        if (!_isValuePct(voteTmp.yea, totalVotes, supportRequiredPct))
            return false;
        // has Min Quorum?
        if (!_isValuePct(voteTmp.yea, voteTmp.totalVoters, voteTmp.minAcceptQuorumPct))
            return false;

        return true;
    }

    function getVote(uint256 _voteId)
        public
        view
        returns (
            bool open,
            bool executed,
            address creator,
            uint64 startDate,
            uint256 snapshotBlock,
            uint256 minAcceptQuorum,
            uint256 yea,
            uint256 nay,
            uint256 totalVoters,
            bytes script
        )
    {
        Vote storage voteTmp = votes[_voteId];

        open = _isVoteOpen(voteTmp);
        executed = voteTmp.executed;
        creator = voteTmp.creator;
        startDate = voteTmp.startDate;
        snapshotBlock = voteTmp.snapshotBlock;
        minAcceptQuorum = voteTmp.minAcceptQuorumPct;
        yea = voteTmp.yea;
        nay = voteTmp.nay;
        totalVoters = voteTmp.totalVoters;
        script = voteTmp.executionScript;
    }

    function getVoteMetadata(uint256 _voteId) public view returns (string) {
        return votes[_voteId].metadata;
    }

    function getVoterState(uint256 _voteId, address _voter) public view returns (VoterState) {
        return votes[_voteId].voters[_voter];
    }

    function _newVote(bytes _executionScript, string _metadata, bool _castVote) internal returns (uint256 voteId) {
        voteId = votes.length++;
        Vote storage voteTmp = votes[voteId];
        voteTmp.executionScript = _executionScript;
        voteTmp.creator = msg.sender;
        voteTmp.startDate = uint64(now);
        voteTmp.metadata = _metadata;
        voteTmp.snapshotBlock = getBlockNumber() - 1; // avoid double voting in this very block
        voteTmp.totalVoters = token.totalSupplyAt(voteTmp.snapshotBlock);
        voteTmp.minAcceptQuorumPct = minAcceptQuorumPct;

        emit StartVote(voteId);

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
        Vote storage voteTmp = votes[_voteId];

        // this could re-enter, though we can assume the governance token is not malicious
        uint256 voterStake = token.balanceOfAt(_voter, voteTmp.snapshotBlock);
        VoterState state = voteTmp.voters[_voter];

        // if voter had previously voted, decrease count
        if (state == VoterState.Yea)
            voteTmp.yea = voteTmp.yea.sub(voterStake);
        if (state == VoterState.Nay)
            voteTmp.nay = voteTmp.nay.sub(voterStake);

        if (_supports)
            voteTmp.yea = voteTmp.yea.add(voterStake);
        else
            voteTmp.nay = voteTmp.nay.add(voterStake);

        voteTmp.voters[_voter] = _supports ? VoterState.Yea : VoterState.Nay;

        emit CastVote(
            _voteId,
            _voter,
            _supports,
            voterStake
        );

        if (_executesIfDecided && canExecute(_voteId))
            _executeVote(_voteId);
    }

    function _executeVote(uint256 _voteId) internal {
        Vote storage voteTmp = votes[_voteId];

        voteTmp.executed = true;

        bytes memory input = new bytes(0); // TODO: Consider input for voting scripts
        runScript(voteTmp.executionScript, input, new address[](0));

        emit ExecuteVote(_voteId);
    }

    function _isVoteOpen(Vote storage voteTmp) internal view returns (bool) {
        return uint64(now) < voteTmp.startDate.add(voteTime) && !voteTmp.executed;
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
