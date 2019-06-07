/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/common/IForwarder.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";
import "@aragon/apps-shared-minime/contracts/MiniMeToken.sol";


contract Voting is IForwarder, AragonApp {
    using SafeMath for uint256;
    using SafeMath64 for uint64;

    bytes32 public constant CREATE_VOTES_ROLE = keccak256("CREATE_VOTES_ROLE");
    bytes32 public constant MODIFY_SUPPORT_ROLE = keccak256("MODIFY_SUPPORT_ROLE");
    bytes32 public constant MODIFY_QUORUM_ROLE = keccak256("MODIFY_QUORUM_ROLE");
    bytes32 public constant MODIFY_OVERRULE_WINDOW_ROLE = keccak256("MODIFY_OVERRULE_WINDOW_ROLE");

    uint64 public constant PCT_BASE = 10 ** 18; // 0% = 0; 1% = 10^16; 100% = 10^18
    uint256 public constant MAX_VOTES_DELEGATION_SET_LENGTH = 100;

    string private constant ERROR_NO_VOTE = "VOTING_NO_VOTE";
    string private constant ERROR_INIT_PCTS = "VOTING_INIT_PCTS";
    string private constant ERROR_CHANGE_SUPPORT_PCTS = "VOTING_CHANGE_SUPPORT_PCTS";
    string private constant ERROR_CHANGE_QUORUM_PCTS = "VOTING_CHANGE_QUORUM_PCTS";
    string private constant ERROR_INIT_SUPPORT_TOO_BIG = "VOTING_INIT_SUPPORT_TOO_BIG";
    string private constant ERROR_CHANGE_SUPPORT_TOO_BIG = "VOTING_CHANGE_SUPP_TOO_BIG";
    string private constant ERROR_CAN_NOT_VOTE = "VOTING_CAN_NOT_VOTE";
    string private constant ERROR_REPRESENTATIVE_CANT_VOTE = "VOTING_REPRESENTATIVE_CANT_VOTE";
    string private constant ERROR_CAN_NOT_EXECUTE = "VOTING_CAN_NOT_EXECUTE";
    string private constant ERROR_CAN_NOT_FORWARD = "VOTING_CAN_NOT_FORWARD";
    string private constant ERROR_NO_VOTING_POWER = "VOTING_NO_VOTING_POWER";
    string private constant ERROR_INVALID_OVERRULE_WINDOW = "VOTING_INVALID_OVERRULE_WINDOW";
    string private constant ERROR_DELEGATES_EXCEEDS_MAX_LEN = "VOTING_DELEGATES_EXCEEDS_MAX_LEN";
    string private constant ERROR_INVALID_DELEGATES_INPUT_LEN = "VOTING_INVALID_DELEGATES_INPUT_LEN";

    enum VoterState { Absent, Yea, Nay }

    struct Vote {
        bool executed;
        uint64 startDate;
        uint64 snapshotBlock;
        uint64 supportRequiredPct;
        uint64 minAcceptQuorumPct;
        uint256 yea;
        uint256 nay;
        uint256 votingPower;
        bytes executionScript;
        mapping (address => VoterState) voters;
        mapping (address => address) issuers;
    }

    MiniMeToken public token;
    uint64 public supportRequiredPct;
    uint64 public minAcceptQuorumPct;
    uint64 public voteTime;

    // We are mimicing an array, we use a mapping instead to make app upgrade more graceful
    mapping (uint256 => Vote) internal votes;
    uint256 public votesLength;

    uint64 public overruleWindow;
    mapping (address => address) internal representatives;

    event StartVote(uint256 indexed voteId, address indexed creator, string metadata);
    event CastVote(uint256 indexed voteId, address indexed voter, bool supports, uint256 stake);
    event ProxyVote(address indexed principal, address indexed representative, uint256 indexed voteId, bool supports, bool succeed);
    event ExecuteVote(uint256 indexed voteId);
    event ChangeSupportRequired(uint64 supportRequiredPct);
    event ChangeMinQuorum(uint64 minAcceptQuorumPct);
    event ChangeOverruleWindow(uint64 previousOverruleWindow, uint64 newOverruleWindow);
    event ChangeRepresentative(address indexed principal, address indexed previousRepresentative, address indexed newRepresentative);

    modifier voteExists(uint256 _voteId) {
        require(_voteExists(_voteId), ERROR_NO_VOTE);
        _;
    }

    /**
    * @notice Initialize Voting app with `_token.symbol(): string` for governance, minimum support of `@formatPct(_supportRequiredPct)`%, minimum acceptance quorum of `@formatPct(_minAcceptQuorumPct)`%, and a voting duration of `@transformTime(_voteTime)`
    * @param _token MiniMeToken Address that will be used as governance token
    * @param _supportRequiredPct Percentage of yeas in casted votes for a vote to succeed (expressed as a percentage of 10^18; eg. 10^16 = 1%, 10^18 = 100%)
    * @param _minAcceptQuorumPct Percentage of yeas in total possible votes for a vote to succeed (expressed as a percentage of 10^18; eg. 10^16 = 1%, 10^18 = 100%)
    * @param _voteTime Seconds that a vote will be open for token holders to vote (unless enough yeas or nays have been cast to make an early decision)
    * @param _overruleWindow Seconds representing the period where a principal will be able to override a representative's decision on a vote
    */
    function initialize(MiniMeToken _token, uint64 _supportRequiredPct, uint64 _minAcceptQuorumPct, uint64 _voteTime, uint64 _overruleWindow)
        external
        onlyInit
    {
        initialized();

        require(_minAcceptQuorumPct <= _supportRequiredPct, ERROR_INIT_PCTS);
        require(_supportRequiredPct < PCT_BASE, ERROR_INIT_SUPPORT_TOO_BIG);
        require(_overruleWindow <= _voteTime, ERROR_INVALID_OVERRULE_WINDOW);

        token = _token;
        supportRequiredPct = _supportRequiredPct;
        minAcceptQuorumPct = _minAcceptQuorumPct;
        voteTime = _voteTime;
        overruleWindow = _overruleWindow;
    }

    /**
    * @notice Change required support to `@formatPct(_supportRequiredPct)`%
    * @param _supportRequiredPct New required support
    */
    function changeSupportRequiredPct(uint64 _supportRequiredPct)
        external
        authP(MODIFY_SUPPORT_ROLE, arr(uint256(_supportRequiredPct), uint256(supportRequiredPct)))
    {
        require(minAcceptQuorumPct <= _supportRequiredPct, ERROR_CHANGE_SUPPORT_PCTS);
        require(_supportRequiredPct < PCT_BASE, ERROR_CHANGE_SUPPORT_TOO_BIG);
        supportRequiredPct = _supportRequiredPct;

        emit ChangeSupportRequired(_supportRequiredPct);
    }

    /**
    * @notice Change minimum acceptance quorum to `@formatPct(_minAcceptQuorumPct)`%
    * @param _minAcceptQuorumPct New acceptance quorum
    */
    function changeMinAcceptQuorumPct(uint64 _minAcceptQuorumPct)
        external
        authP(MODIFY_QUORUM_ROLE, arr(uint256(_minAcceptQuorumPct), uint256(minAcceptQuorumPct)))
    {
        require(_minAcceptQuorumPct <= supportRequiredPct, ERROR_CHANGE_QUORUM_PCTS);
        minAcceptQuorumPct = _minAcceptQuorumPct;

        emit ChangeMinQuorum(_minAcceptQuorumPct);
    }

    /**
    * @notice Change overrule window to a duration of `@transformTime(_newOverruleWindow)`
    * @param _newOverruleWindow New overrule window in seconds
    */
    function changeOverruleWindow(uint64 _newOverruleWindow)
        external
        authP(MODIFY_OVERRULE_WINDOW_ROLE, arr(uint256(_newOverruleWindow), uint256(overruleWindow)))
    {
        require(_newOverruleWindow <= voteTime, ERROR_INVALID_OVERRULE_WINDOW);
        emit ChangeOverruleWindow(overruleWindow, _newOverruleWindow);
        overruleWindow = _newOverruleWindow;
    }

    /**
    * @notice Create a new vote about "`_metadata`"
    * @param _executionScript EVM script to be executed on approval
    * @param _metadata Vote metadata
    * @return voteId Id for newly created vote
    */
    function newVote(bytes _executionScript, string _metadata) external auth(CREATE_VOTES_ROLE) returns (uint256 voteId) {
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
        auth(CREATE_VOTES_ROLE)
        returns (uint256 voteId)
    {
        return _newVote(_executionScript, _metadata, _castVote, _executesIfDecided);
    }

    /**
    * @notice Vote `_supports ? 'yes' : 'no'` in vote #`_voteId`
    * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote(),` which requires initialization
    * @param _voteId Id for vote
    * @param _supports Whether voter supports the vote
    * @param _executesIfDecided Whether the vote should execute its action if it becomes decided
    */
    function vote(uint256 _voteId, bool _supports, bool _executesIfDecided) external voteExists(_voteId) {
        require(_canVote(votes[_voteId], msg.sender), ERROR_CAN_NOT_VOTE);
        _vote(_voteId, _supports, msg.sender, msg.sender, _executesIfDecided);
    }

    /**
    * @notice Vote `_supports ? 'yes' : 'no'` in vote #`_voteId` on behalf of `_principal`
    * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote(),` which requires initialization
    * @param _principal Address of the principal voting on behalf of
    * @param _voteId Id for vote
    * @param _supports Whether the representative supports the vote
    */
    function voteOnBehalfOf(address _principal, uint256 _voteId, bool _supports) external voteExists(_voteId) {
        Vote storage vote_ = votes[_voteId];
        require(_canVoteOnBehalfOf(vote_, _principal, msg.sender), ERROR_REPRESENTATIVE_CANT_VOTE);
        _voteOnBehalfOf(_voteId, _supports, _principal, msg.sender);
    }

    /**
    * @notice Vote `_supports ? 'yes' : 'no'` in vote #`_voteId` on behalf of many principals
    * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote(),` which requires initialization
    * @param _principals Addresses of the principals voting on behalf of
    * @param _voteId Id for vote
    * @param _supports Whether the representative supports the vote
    */
    function voteOnBehalfOfMany(address[] _principals, uint256 _voteId, bool _supports) external voteExists(_voteId) {
        require(_principals.length <= MAX_VOTES_DELEGATION_SET_LENGTH, ERROR_DELEGATES_EXCEEDS_MAX_LEN);

        Vote storage vote_ = votes[_voteId];
        for (uint256 i = 0; i < _principals.length; i++) {
            address principal = _principals[i];
            if (_canVoteOnBehalfOf(vote_, principal, msg.sender)) {
                _voteOnBehalfOf(_voteId, _supports, principal, msg.sender);
            } else {
                emit ProxyVote(principal, msg.sender, _voteId, _supports, false);
            }
        }
    }

    /**
    * @notice Execute vote #`_voteId`
    * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote(),` which requires initialization
    * @param _voteId Id for vote
    */
    function executeVote(uint256 _voteId) external voteExists(_voteId) {
        _executeVote(_voteId);
    }

    /**
    * @notice `_allowed ? 'Set' : 'Remove'` `_representative` as the representative
    * @param _representative Address of the representative to be allowed on behalf of the sender. Use the zero address for none.
    */
    function setRepresentative(address _representative) external isInitialized {
        emit ChangeRepresentative(msg.sender, representatives[msg.sender], _representative);
        representatives[msg.sender] = _representative;
    }

    // Forwarding fns

    /**
    * @notice Tells whether the Voting app is a forwarder or not
    * @dev IForwarder interface conformance
    * @return Always true
    */
    function isForwarder() external pure returns (bool) {
        return true;
    }

    /**
    * @notice Creates a vote to execute the desired action, and casts a support vote if possible
    * @dev IForwarder interface conformance
    * @param _evmScript Start vote with script
    */
    function forward(bytes _evmScript) public {
        require(canForward(msg.sender, _evmScript), ERROR_CAN_NOT_FORWARD);
        _newVote(_evmScript, "", true, true);
    }

    /**
    * @notice Tells whether `_sender` can forward actions or not
    * @dev IForwarder interface conformance
    * @param _sender Address of the account intending to forward an action
    * @return True if the given address can create votes, false otherwise
    */
    function canForward(address _sender, bytes) public view returns (bool) {
        // Note that `canPerform()` implicitly does an initialization check itself
        return canPerform(_sender, CREATE_VOTES_ROLE, arr());
    }

    // Getter fns

    /**
    * @notice Tells whether a vote #`_voteId` can be executed or not
    * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote(),` which requires initialization
    * @return True if the given vote can be executed, false otherwise
    */
    function canExecute(uint256 _voteId) public view voteExists(_voteId) returns (bool) {
        return _canExecute(votes[_voteId]);
    }

    /**
    * @notice Tells whether `_sender` can participate in the vote #`_voteId` or not
    * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote(),` which requires initialization
    * @return True if the given voter can participate a certain vote, false otherwise
    */
    function canVote(uint256 _voteId, address _voter) public view voteExists(_voteId) returns (bool) {
        return _canVote(votes[_voteId], _voter);
    }

    /**
    * @notice Tells whether `_representative` can vote on behalf of `_principal` in the vote #`_voteId` or not
    * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote(),` which requires initialization
    * @return True if the given representative can vote on behalf of the given principal in a certain vote, false otherwise
    */
    function canVoteOnBehalfOf(uint256 _voteId, address _principal, address _representative) public view voteExists(_voteId) returns (bool) {
        return _canVoteOnBehalfOf(votes[_voteId], _principal, _representative);
    }

    /**
    * @notice Tells whether the vote #`_voteId` is within the overrule period for delegated votes or not
    * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote(),` which requires initialization
    * @return True if the requested vote is within the overrule window for delegated votes, false otherwise
    */
    function withinOverruleWindow(uint256 _voteId) public view voteExists(_voteId) returns (bool) {
        Vote storage vote_ = votes[_voteId];
        return _isVoteOpen(vote_) && _withinOverruleWindow(vote_);
    }

    /**
    * @notice Tells whether `_representative` is allowed by `_principal` as representative or not
    * @return True if the given representative was allowed by a certain principal, false otherwise
    */
    function isRepresentativeOf(address _principal, address _representative) public view isInitialized returns (bool) {
        return _isRepresentativeOf(_principal, _representative);
    }

    /**
    * @dev Return all information for a vote by its ID
    * @param _voteId Vote identifier
    * @return Vote open status
    * @return Vote executed status
    * @return Vote start date
    * @return Vote snapshot block
    * @return Vote support required
    * @return Vote minimum acceptance quorum
    * @return Vote yeas amount
    * @return Vote nays amount
    * @return Vote power
    * @return Vote script
    */
    function getVote(uint256 _voteId)
        public
        view
        voteExists(_voteId)
        returns (
            bool open,
            bool executed,
            uint64 startDate,
            uint64 snapshotBlock,
            uint64 supportRequired,
            uint64 minAcceptQuorum,
            uint256 yea,
            uint256 nay,
            uint256 votingPower,
            bytes script
        )
    {
        Vote storage vote_ = votes[_voteId];

        open = _isVoteOpen(vote_);
        executed = vote_.executed;
        startDate = vote_.startDate;
        snapshotBlock = vote_.snapshotBlock;
        supportRequired = vote_.supportRequiredPct;
        minAcceptQuorum = vote_.minAcceptQuorumPct;
        yea = vote_.yea;
        nay = vote_.nay;
        votingPower = vote_.votingPower;
        script = vote_.executionScript;
    }

    /**
    * @dev Return the state of a voter for a given vote by its ID
    * @param _voteId Vote identifier
    * @param _voter Address of the voter
    * @return VoterState of the requested voter for a certain vote
    */
    function getVoterState(uint256 _voteId, address _voter) public view voteExists(_voteId) returns (VoterState) {
        return _voterState(votes[_voteId], _voter);
    }

    /**
    * @dev Return the issuer of a given vote by its ID
    * @param _voteId Vote identifier
    * @param _voter Address of the voter
    * @return Address of the issuer of the voter's vote
    */
    function getVoteIssuer(uint256 _voteId, address _voter) public view voteExists(_voteId) returns (address) {
        return _voteIssuer(votes[_voteId], _voter);
    }

    // Internal fns

    /**
    * @dev Internal function to create a new vote
    * @return voteId id for newly created vote
    */
    function _newVote(bytes _executionScript, string _metadata, bool _castVote, bool _executesIfDecided) internal returns (uint256 voteId) {
        uint64 snapshotBlock = getBlockNumber64() - 1; // avoid double voting in this very block
        uint256 votingPower = token.totalSupplyAt(snapshotBlock);
        require(votingPower > 0, ERROR_NO_VOTING_POWER);

        voteId = votesLength++;

        Vote storage vote_ = votes[voteId];
        vote_.startDate = getTimestamp64();
        vote_.snapshotBlock = snapshotBlock;
        vote_.supportRequiredPct = supportRequiredPct;
        vote_.minAcceptQuorumPct = minAcceptQuorumPct;
        vote_.votingPower = votingPower;
        vote_.executionScript = _executionScript;

        emit StartVote(voteId, msg.sender, _metadata);

        if (_castVote && _canVote(vote_, msg.sender)) {
            _vote(voteId, true, msg.sender, msg.sender, _executesIfDecided);
        }
    }

    /**
    * @dev Internal function to cast a vote. It assumes the queried vote exists.
    */
    function _vote(uint256 _voteId, bool _supports, address _voter, address _issuer, bool _executesIfDecided) internal {
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
        vote_.issuers[_voter] = _issuer;

        emit CastVote(_voteId, _voter, _supports, voterStake);

        if (_executesIfDecided && _canExecute(vote_)) {
            // We've already checked if the vote can be executed with `_canExecute()`
            _unsafeExecuteVote(_voteId);
        }
    }

    /**
    * @dev Internal function to check if a representative can vote on behalf of a principal. It assumes the queried vote exists.
    */
    function _voteOnBehalfOf(uint256 _voteId, bool _supports, address _principal, address _representative) internal {
        _vote(_voteId, _supports, _principal, _representative, false);
        emit ProxyVote(_principal, _representative, _voteId, _supports, true);
    }

    /**
    * @dev Internal function to execute a vote. It assumes the queried vote exists.
    */
    function _executeVote(uint256 _voteId) internal {
        require(_canExecute(votes[_voteId]), ERROR_CAN_NOT_EXECUTE);
        _unsafeExecuteVote(_voteId);
    }

    /**
    * @dev Internal unsafe version of _executeVote that assumes you have already checked if the vote can be executed and exists
    */
    function _unsafeExecuteVote(uint256 _voteId) internal {
        Vote storage vote_ = votes[_voteId];

        vote_.executed = true;

        bytes memory input = new bytes(0); // TODO: Consider input for voting scripts
        runScript(vote_.executionScript, input, new address[](0));

        emit ExecuteVote(_voteId);
    }

    /**
    * @dev Internal function to check if a vote can be executed. It assumes the queried vote exists.
    * @return True if the given vote can be executed, false otherwise
    */
    function _canExecute(Vote storage vote_) internal view returns (bool) {
        if (vote_.executed) {
            return false;
        }

        // Voting is already decided
        if (_isValuePct(vote_.yea, vote_.votingPower, vote_.supportRequiredPct)) {
            return true;
        }

        // Vote ended?
        if (_isVoteOpen(vote_)) {
            return false;
        }

        // Has enough support?
        uint256 totalVotes = vote_.yea.add(vote_.nay);
        if (!_isValuePct(vote_.yea, totalVotes, vote_.supportRequiredPct)) {
            return false;
        }

        // Has min quorum?
        if (!_isValuePct(vote_.yea, vote_.votingPower, vote_.minAcceptQuorumPct)) {
            return false;
        }

        return true;
    }

    /**
    * @dev Internal function to check if a voter can participate on a vote. It assumes the queried vote exists.
    * @return True if the given voter can participate a certain vote, false otherwise
    */
    function _canVote(Vote storage vote_, address _voter) internal view returns (bool) {
        return _isVoteOpen(vote_) && token.balanceOfAt(_voter, vote_.snapshotBlock) > 0;
    }

    /**
    * @dev Internal function to check if a representative can vote on behalf of a principal on a certain vote. It assumes the queried vote exists.
    * @return True if the given representative can vote on behalf of a principal on a certain vote, false otherwise
    */
    function _canVoteOnBehalfOf(Vote storage vote_, address _principal, address _representative) internal view returns (bool) {
        return _canVote(vote_, _principal) &&
               _isRepresentativeOf(_principal, _representative) &&
               _hasNotVotedYet(vote_, _principal) &&
               !_withinOverruleWindow(vote_);
    }

    /**
    * @dev Internal function to check if a representative is allowed to vote on behalf of a principal
    * @return True if the given representative is allowed by a certain principal, false otherwise
    */
    function _isRepresentativeOf(address _principal, address _representative) internal view returns (bool) {
        return representatives[_principal] == _representative;
    }

    /**
    * @dev Internal function to check if a voter has already voted on a certain vote. It assumes the queried vote exists.
    * @return True if the given voter has not voted on the requested vote, false otherwise
    */
    function _hasNotVotedYet(Vote storage vote_, address _principal) internal view returns (bool) {
        return _voteIssuer(vote_, _principal) != _principal;
    }

    /**
    * @dev Internal function to check if a vote is still open. It assumes the queried vote exists.
    * @return True if the given vote is open, false otherwise
    */
    function _isVoteOpen(Vote storage vote_) internal view returns (bool) {
        return getTimestamp64() < _voteEndDate(vote_) && !vote_.executed;
    }

    /**
    * @dev Internal function to check if a vote is within its overrule window. It assumes the queried vote exists.
    * @return True if the given vote is within its overrule window, false otherwise
    */
    function _withinOverruleWindow(Vote storage vote_) internal view returns (bool) {
        return getTimestamp64() >= _voteEndDate(vote_).sub(overruleWindow);
    }

    /**
    * @dev Internal function to calculate the end date of a vote. It assumes the queried vote exists.
    */
    function _voteEndDate(Vote storage vote_) internal view returns (uint64) {
        return vote_.startDate.add(voteTime);
    }

    /**
    * @dev Internal function to get the state of a voter. It assumes the queried vote exists.
    */
    function _voterState(Vote storage vote_, address _voter) internal view returns (VoterState) {
        return vote_.voters[_voter];
    }

    /**
    * @dev Internal function to get the issuer of a vote. It assumes the queried vote exists.
    */
    function _voteIssuer(Vote storage vote_, address _voter) internal view returns (address) {
        return vote_.issuers[_voter];
    }

    /**
    * @dev Internal function to check if a certain vote id exists
    * @return True if the given vote id was already registered, false otherwise
    */
    function _voteExists(uint256 _voteId) internal view returns (bool) {
        return _voteId < votesLength;
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
