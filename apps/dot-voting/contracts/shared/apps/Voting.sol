/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "./AragonApp.sol";
import "../common/IForwarder.sol";

import "../lib/math/SafeMath.sol";
import "../lib/math/SafeMath64.sol";

import "../lib/minime/MiniMeToken.sol";


contract Voting is IForwarder, AragonApp {
    using SafeMath for uint256;
    using SafeMath64 for uint64;

    bytes32 public constant ROLE_CREATE_VOTES = keccak256("ROLE_CREATE_VOTES");
    bytes32 public constant MODIFY_SUPPORT_ROLE = keccak256("MODIFY_SUPPORT_ROLE");
    bytes32 public constant ROLE_MODIFY_QUORUM_ROLE = keccak256("ROLE_MODIFY_QUORUM_ROLE");

    uint256 public constant PCT_BASE = 10 ** 18; // 0% = 0; 1% = 10^16; 100% = 10^18

    enum VoterState { Absent, Yea, Nay }

    struct Vote {
        address creator;
        uint64 startDate;
        uint256 snapshotBlock;
        uint256 supportRequiredPct;
        uint256 minAcceptQuorumPct;
        uint256 yea;
        uint256 nay;
        uint256 totalVoters;
        string metadata;
        bytes executionScript;
        bool executed;
        mapping (address => VoterState) voters;
    }

    MiniMeToken public token;
    uint256 public supportRequiredPct;
    uint256 public minAcceptQuorumPct;
    uint64 public voteTime;

    // We are mimicing an array, we use a mapping instead to make app upgrade more graceful
    mapping (uint256 => Vote) internal votes;
    uint256 public votesLength;

    event StartVote(uint256 indexed voteId);
    event CastVote(uint256 indexed voteId, address indexed voter, bool supports, uint256 stake);
    event ExecuteVote(uint256 indexed voteId);
    event ChangeSupportRequired(uint256 supportRequiredPct);
    event ChangeMinQuorum(uint256 minAcceptQuorumPct);

    modifier voteExists(uint256 _voteId) {
        require(_voteId < votesLength);
        _;
    }

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
    )
        external
        onlyInit
    {
        initialized();

        require(_minAcceptQuorumPct <= _supportRequiredPct);
        require(_supportRequiredPct < PCT_BASE);

        token = _token;
        supportRequiredPct = _supportRequiredPct;
        minAcceptQuorumPct = _minAcceptQuorumPct;
        voteTime = _voteTime;
    }

    /**
    * @notice Change required support to `(_supportRequiredPct - _supportRequiredPct % 10^16) / 10^14`%
    * @param _supportRequiredPct New required support
    */
    function changeSupportRequiredPct(uint256 _supportRequiredPct)
        external
        authP(MODIFY_SUPPORT_ROLE, arr(_supportRequiredPct, supportRequiredPct))
    {
        require(minAcceptQuorumPct <= _supportRequiredPct);
        require(_supportRequiredPct < PCT_BASE);
        supportRequiredPct = _supportRequiredPct;

        emit ChangeSupportRequired(_supportRequiredPct);
    }

    /**
    * @notice Change minimum acceptance quorum to `(_minAcceptQuorumPct - _minAcceptQuorumPct % 10^16) / 10^14`%
    * @param _minAcceptQuorumPct New acceptance quorum
    */
    function changeMinAcceptQuorumPct(uint256 _minAcceptQuorumPct)
        external
        authP(ROLE_MODIFY_QUORUM_ROLE, arr(_minAcceptQuorumPct, minAcceptQuorumPct))
    {
        require(_minAcceptQuorumPct <= supportRequiredPct);
        minAcceptQuorumPct = _minAcceptQuorumPct;

        emit ChangeMinQuorum(_minAcceptQuorumPct);
    }

    /**
    * @notice Create a new vote about "`_metadata`"
    * @param _executionScript EVM script to be executed on approval
    * @param _metadata Vote metadata
    * @return voteId Id for newly created vote
    */
    function newVote(bytes _executionScript, string _metadata) external auth(ROLE_CREATE_VOTES) returns (uint256 voteId) {
        return _newVote(_executionScript, _metadata, true, true);
    }

    /**
     * @notice Create a new vote about "`_metadata`"
     * @param _executionScript EVM script to be executed on approval
     * @param _metadata Vote metadata
     * @param _castVote Whether to also cast newly created vote
     * @param _executesIfDecided Whether to also immediately execute newly created vote if decided
     * @return voteId id for newly created vote
     */
    function newVote(bytes _executionScript, string _metadata, bool _castVote, bool _executesIfDecided)
        external
        auth(ROLE_CREATE_VOTES)
        returns (uint256 voteId)
    {
        return _newVote(_executionScript, _metadata, _castVote, _executesIfDecided);
    }

    /**
    * @notice Vote `_supports ? 'yea' : 'nay'` in vote #`_voteId`
    * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote(),` which requires initialization
    * @param _voteId Id for vote
    * @param _supports Whether voter supports the vote
    * @param _executesIfDecided Whether the vote should execute its action if it becomes decided
    */
    function vote(uint256 _voteId, bool _supports, bool _executesIfDecided) external voteExists(_voteId) {
        require(canVote(_voteId, msg.sender));
        _vote(_voteId, _supports, msg.sender, _executesIfDecided);
    }

    /**
    * @notice Execute the result of dot vote #`_voteId`
    * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote(),` which requires initialization
    * @param _voteId Id for vote
    */
    function executeVote(uint256 _voteId) external voteExists(_voteId) {
        require(canExecute(_voteId));
        _executeVote(_voteId);
    }

    function isForwarder() public pure returns (bool) {
        return true;
    }

    /**
    * @notice Creates a vote to execute the desired action
    * @dev IForwarder interface conformance
    * @param _evmScript Start vote with script
    */
    function forward(bytes _evmScript) public {
        require(canForward(msg.sender, _evmScript));
        _newVote(_evmScript, "", true, true);
    }

    function canForward(address _sender, bytes) public view returns (bool) {
        // Note that `canPerform()` implicitly does an initialization check itself
        return canPerform(_sender, ROLE_CREATE_VOTES, arr());
    }

    function canVote(uint256 _voteId, address _voter) public view voteExists(_voteId) returns (bool) {
        Vote storage vote_ = votes[_voteId];

        return _isVoteOpen(vote_) && token.balanceOfAt(_voter, vote_.snapshotBlock) > 0;
    }

    function canExecute(uint256 _voteId) public view voteExists(_voteId) returns (bool) {
        Vote storage vote_ = votes[_voteId];

        if (vote_.executed) {
            return false;
        }

        // Voting is already decided
        if (_isValuePct(vote_.yea, vote_.totalVoters, vote_.supportRequiredPct)) {
            return true;
        }

        uint256 totalVotes = vote_.yea.add(vote_.nay);

        // Vote ended?
        if (_isVoteOpen(vote_)) {
            return false;
        }
        // Has enough support?
        if (!_isValuePct(vote_.yea, totalVotes, vote_.supportRequiredPct)) {
            return false;
        }
        // Has min quorum?
        if (!_isValuePct(vote_.yea, vote_.totalVoters, vote_.minAcceptQuorumPct)) {
            return false;
        }

        return true;
    }

    function getVote(uint256 _voteId)
        public
        view
        voteExists(_voteId)
        returns (
            bool open,
            bool executed,
            address creator,
            uint64 startDate,
            uint256 snapshotBlock,
            uint256 supportRequired,
            uint256 minAcceptQuorum,
            uint256 yea,
            uint256 nay,
            uint256 totalVoters,
            bytes script
        )
    {
        Vote storage vote_ = votes[_voteId];

        open = _isVoteOpen(vote_);
        executed = vote_.executed;
        creator = vote_.creator;
        startDate = vote_.startDate;
        snapshotBlock = vote_.snapshotBlock;
        supportRequired = vote_.supportRequiredPct;
        minAcceptQuorum = vote_.minAcceptQuorumPct;
        yea = vote_.yea;
        nay = vote_.nay;
        totalVoters = vote_.totalVoters;
        script = vote_.executionScript;
    }

    function getVoteMetadata(uint256 _voteId) public view voteExists(_voteId) returns (string) {
        return votes[_voteId].metadata;
    }

    function getVoterState(uint256 _voteId, address _voter) public view voteExists(_voteId) returns (VoterState) {
        return votes[_voteId].voters[_voter];
    }

    function _newVote(bytes _executionScript, string _metadata, bool _castVote, bool _executesIfDecided)
        internal
        returns (uint256 voteId)
    {
        voteId = votesLength++;
        Vote storage vote_ = votes[voteId];
        vote_.executionScript = _executionScript;
        vote_.creator = msg.sender;
        vote_.startDate = getTimestamp64();
        vote_.metadata = _metadata;
        vote_.snapshotBlock = getBlockNumber() - 1; // avoid double voting in this very block
        vote_.totalVoters = token.totalSupplyAt(vote_.snapshotBlock);
        vote_.supportRequiredPct = supportRequiredPct;
        vote_.minAcceptQuorumPct = minAcceptQuorumPct;

        emit StartVote(voteId);

        if (_castVote && canVote(voteId, msg.sender)) {
            _vote(voteId, true, msg.sender, _executesIfDecided);
        }
    }

    function _vote(
        uint256 _voteId,
        bool _supports,
        address _voter,
        bool _executesIfDecided
    ) internal
    {
        Vote storage vote_ = votes[_voteId];

        // This could re-enter, though we can assume the governance token is not malicious
        uint256 voterStake = token.balanceOfAt(_voter, vote_.snapshotBlock);
        VoterState state = vote_.voters[_voter];

        // If voter had previously voted, decrease count
        if (state == VoterState.Yea) {
            vote_.yea = vote_.yea.sub(voterStake);
        } else if (state == VoterState.Nay) {
            vote_.nay = vote_.nay.sub(voterStake);
        }

        if (_supports) {
            vote_.yea = vote_.yea.add(voterStake);
        } else {
            vote_.nay = vote_.nay.add(voterStake);
        }

        vote_.voters[_voter] = _supports ? VoterState.Yea : VoterState.Nay;

        emit CastVote(_voteId, _voter, _supports, voterStake);

        if (_executesIfDecided && canExecute(_voteId)) {
            _executeVote(_voteId);
        }
    }

    function _executeVote(uint256 _voteId) internal {
        Vote storage vote_ = votes[_voteId];

        vote_.executed = true;

        bytes memory input = new bytes(0); // TODO: Consider input for voting scripts
        runScript(vote_.executionScript, input, new address[](0));

        emit ExecuteVote(_voteId);
    }

    function _isVoteOpen(Vote storage vote_) internal view returns (bool) {
        return getTimestamp64() < vote_.startDate.add(voteTime) && !vote_.executed;
    }

    /**
    * @dev Calculates whether `_value` is more than a percentage `_pct` of `_total`
    */
    function _isValuePct(uint256 _value, uint256 _total, uint256 _pct) internal pure returns (bool) {
        if (_total == 0) {
            return false;
        }

        uint256 computedPct = _value.mul(PCT_BASE) / _total;

        return computedPct > _pct;
    }
}
