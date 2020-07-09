/*
 * SPDX-License-Identifier:    GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/apps/disputable/DisputableAragonApp.sol";
import "@aragon/os/contracts/common/IForwarder.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";
import "@aragon/minime/contracts/MiniMeToken.sol";


contract DisputableVoting is DisputableAragonApp, IForwarder {
    using SafeMath for uint256;
    using SafeMath64 for uint64;

    // bytes32 public constant CREATE_VOTES_ROLE = keccak256("CREATE_VOTES_ROLE");
    bytes32 public constant CREATE_VOTES_ROLE = 0xe7dcd7275292e064d090fbc5f3bd7995be23b502c1fed5cd94cfddbbdcd32bbc;

    // bytes32 public constant MODIFY_SUPPORT_ROLE = keccak256("MODIFY_SUPPORT_ROLE");
    bytes32 public constant MODIFY_SUPPORT_ROLE = 0xda3972983e62bdf826c4b807c4c9c2b8a941e1f83dfa76d53d6aeac11e1be650;

    // bytes32 public constant MODIFY_QUORUM_ROLE = keccak256("MODIFY_QUORUM_ROLE");
    bytes32 public constant MODIFY_QUORUM_ROLE = 0xad15e7261800b4bb73f1b69d3864565ffb1fd00cb93cf14fe48da8f1f2149f39;

    // bytes32 public constant MODIFY_OVERRULE_WINDOW_ROLE = keccak256("MODIFY_OVERRULE_WINDOW_ROLE");
    bytes32 public constant MODIFY_OVERRULE_WINDOW_ROLE = 0x703200758fea823fd0c9d36774ba318b14f6c50c4ef6dff34f394e8f2c7d2d99;

    // bytes32 public constant MODIFY_EXECUTION_DELAY_ROLE = keccak256("MODIFY_EXECUTION_DELAY_ROLE");
    bytes32 public constant MODIFY_EXECUTION_DELAY_ROLE = 0x69a0bddd05e66b7ae81cce9994caef3b5c660de549fd2fd3597a9e2c3046e446;

    uint256 public constant PCT_BASE = 10 ** 18; // 0% = 0; 1% = 10^16; 100% = 10^18
    uint256 public constant MAX_VOTES_DELEGATION_SET_LENGTH = 70;

    // Validation errors
    string private constant ERROR_NO_VOTE = "VOTING_NO_VOTE";
    string private constant ERROR_VOTE_TIME_ZERO = "VOTING_VOTE_TIME_ZERO";
    string private constant ERROR_TOKEN_NOT_CONTRACT = "VOTING_TOKEN_NOT_CONTRACT";
    string private constant ERROR_CHANGE_QUORUM_PCTS = "VOTING_CHANGE_QUORUM_PCTS";
    string private constant ERROR_CHANGE_SUPPORT_PCTS = "VOTING_CHANGE_SUPPORT_PCTS";
    string private constant ERROR_CHANGE_SUPPORT_TOO_BIG = "VOTING_CHANGE_SUPP_TOO_BIG";
    string private constant ERROR_INVALID_OVERRULE_WINDOW = "VOTING_INVALID_OVERRULE_WINDOW";
    string private constant ERROR_DELEGATES_EXCEEDS_MAX_LEN = "VOTING_DELEGATES_EXCEEDS_MAX_LEN";

    // Workflow errors
    string private constant ERROR_CANNOT_VOTE = "VOTING_CANNOT_VOTE";
    string private constant ERROR_CANNOT_EXECUTE = "VOTING_CANNOT_EXECUTE";
    string private constant ERROR_CANNOT_FORWARD = "VOTING_CANNOT_FORWARD";
    string private constant ERROR_CANNOT_PAUSE_VOTE = "VOTING_CANNOT_PAUSE_VOTE";
    string private constant ERROR_NO_VOTING_POWER = "VOTING_NO_VOTING_POWER";
    string private constant ERROR_VOTE_NOT_PAUSED = "VOTING_VOTE_NOT_PAUSED";
    string private constant ERROR_NOT_REPRESENTATIVE = "VOTING_NOT_REPRESENTATIVE";
    string private constant ERROR_WITHIN_OVERRULE_WINDOW = "VOTING_WITHIN_OVERRULE_WINDOW";

    enum VoterState { Absent, Yea, Nay }

    enum VoteStatus {
        Active,                         // An ongoing vote
        Paused,                         // A vote that is being challenged
        Cancelled,                      // A vote that has been cancelled since it was refused after a challenge or dispute
        Executed                        // A vote that has been executed
    }

    struct Vote {
        uint64 startDate;
        uint64 snapshotBlock;
        uint64 supportRequiredPct;
        uint64 minAcceptQuorumPct;
        uint256 yea;
        uint256 nay;
        uint256 votingPower;
        bytes executionScript;
        mapping (address => VoterState) voters;

        // Delegation state
        // The `casters` mapping is only used for voting delegation to store
        // the address of the representative that voted on behalf of a principal
        mapping (address => address) casters;
        uint64 overruleWindow;
        uint64 executionDelay;

        // Disputable state
        uint64 pausedAt;                        // Datetime when the vote was paused
        uint64 pauseDuration;                   // Duration in seconds while the vote has been paused
        VoteStatus status;                      // Status of the disputable vote
        uint256 actionId;                       // Identification number of the disputable action in the context of the agreement
    }

    MiniMeToken public token;                   // We assume the governance token is not malicious
    uint64 public supportRequiredPct;
    uint64 public minAcceptQuorumPct;
    uint64 public voteTime;
    uint64 public executionDelay;

    // We are mimicing an array, we use a mapping instead to make app upgrades more graceful
    mapping (uint256 => Vote) internal votes;
    uint256 public votesLength;

    uint64 public overruleWindow;
    mapping (address => address) internal representatives;

    event StartVote(uint256 indexed voteId, address indexed creator, bytes context);
    event CastVote(uint256 indexed voteId, address indexed voter, bool supports, uint256 stake);
    event PauseVote(uint256 indexed voteId, uint256 indexed challengeId);
    event ResumeVote(uint256 indexed voteId);
    event CancelVote(uint256 indexed voteId);
    event ProxyVoteFailure(uint256 indexed voteId, address indexed voter, address indexed representative);
    event ProxyVoteSuccess(uint256 indexed voteId, address indexed voter, address indexed representative, bool supports);
    event ExecuteVote(uint256 indexed voteId);
    event ChangeSupportRequired(uint64 supportRequiredPct);
    event ChangeMinQuorum(uint64 minAcceptQuorumPct);
    event ChangeOverruleWindow(uint64 overruleWindow);
    event ChangeExecutionDelay(uint64 executionDelay);
    event ChangeRepresentative(address indexed voter, address indexed newRepresentative);

    modifier voteExists(uint256 _voteId) {
        require(_voteExists(_voteId), ERROR_NO_VOTE);
        _;
    }

    /**
    * @notice Initialize DisputableVoting app with `_token.symbol(): string` for governance, minimum support of `@formatPct(_supportRequiredPct)`%, minimum acceptance quorum of `@formatPct(_minAcceptQuorumPct)`%, a voting duration of `@transformTime(_voteTime)`, an overrule window of `@transformTime(_overruleWindow), and a execution delay of `@transformTime(_executionDelay)`
    * @param _token MiniMeToken Address that will be used as governance token
    * @param _supportRequiredPct Percentage of yeas in cast votes for a vote to succeed (expressed as a percentage of 10^18; eg. 10^16 = 1%, 10^18 = 100%)
    * @param _minAcceptQuorumPct Percentage of yeas in total possible votes for a vote to succeed (expressed as a percentage of 10^18; eg. 10^16 = 1%, 10^18 = 100%)
    * @param _voteTime Seconds that a vote will be open for token holders to vote
    * @param _overruleWindow New overrule window in seconds
    */
    function initialize(
        MiniMeToken _token,
        uint64 _supportRequiredPct,
        uint64 _minAcceptQuorumPct,
        uint64 _voteTime,
        uint64 _overruleWindow,
        uint64 _executionDelay
    )
        external
    {
        initialized();

        require(isContract(_token), ERROR_TOKEN_NOT_CONTRACT);
        require(_voteTime > 0, ERROR_VOTE_TIME_ZERO);

        token = _token;
        voteTime = _voteTime;

        _changeSupportRequiredPct(_supportRequiredPct);
        _changeMinAcceptQuorumPct(_minAcceptQuorumPct);
        _changeOverruleWindow(_overruleWindow);
        _changeExecutionDelay(_executionDelay);
    }

    /**
    * @notice Change required support to `@formatPct(_supportRequiredPct)`%
    * @param _supportRequiredPct New required support
    */
    function changeSupportRequiredPct(uint64 _supportRequiredPct)
        external
        authP(MODIFY_SUPPORT_ROLE, arr(uint256(_supportRequiredPct), uint256(supportRequiredPct)))
    {
        _changeSupportRequiredPct(_supportRequiredPct);
    }

    /**
    * @notice Change minimum acceptance quorum to `@formatPct(_minAcceptQuorumPct)`%
    * @param _minAcceptQuorumPct New acceptance quorum
    */
    function changeMinAcceptQuorumPct(uint64 _minAcceptQuorumPct)
        external
        authP(MODIFY_QUORUM_ROLE, arr(uint256(_minAcceptQuorumPct), uint256(minAcceptQuorumPct)))
    {
        _changeMinAcceptQuorumPct(_minAcceptQuorumPct);
    }

    /**
    * @notice Change overrule window to `@transformTime(_overruleWindow)`
    * @param _overruleWindow New overrule window in seconds
    */
    function changeOverruleWindow(uint64 _overruleWindow)
        external
        authP(MODIFY_OVERRULE_WINDOW_ROLE, arr(uint256(_overruleWindow), uint256(overruleWindow)))
    {
        _changeOverruleWindow(_overruleWindow);
    }

    /**
    * @notice Change execution delay to `@transformTime(_executionDelay)`
    * @param _executionDelay New execution delay in seconds
    */
    function changeExecutionDelay(uint64 _executionDelay)
        external
        authP(MODIFY_EXECUTION_DELAY_ROLE, arr(uint256(_executionDelay), uint256(executionDelay)))
    {
        _changeExecutionDelay(_executionDelay);
    }

    /**
    * @notice `_representative == 0x0 ? 'Set your voting representative to ' + _representative : 'Remove your representative'`
    * @param _representative Address of the representative who is allowed to vote on behalf of the sender. Use the zero address for none.
    */
    function setRepresentative(address _representative) external isInitialized {
        representatives[msg.sender] = _representative;
        emit ChangeRepresentative(msg.sender, _representative);
    }

    /**
    * @notice Create a new vote about "`_context`"
    * @param _executionScript EVM script to be executed on approval
    * @param _context Vote context
    * @return voteId Id for newly created vote
    */
    function newVote(bytes _executionScript, bytes _context) external auth(CREATE_VOTES_ROLE) returns (uint256 voteId) {
        return _newVote(_executionScript, _context);
    }

    /**
    * @notice Vote `_supports ? 'yes' : 'no'` in vote #`_voteId`
    * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Id for vote
    * @param _supports Whether voter supports the vote
    */
    function vote(uint256 _voteId, bool _supports) external voteExists(_voteId) {
        Vote storage vote_ = votes[_voteId];
        require(_canVote(vote_, msg.sender), ERROR_CANNOT_VOTE);

        _castVote(vote_, _voteId, _supports, msg.sender);
        _removeCasterIfNecessary(vote_, msg.sender);
    }

    /**
    * @notice Vote `_supports ? 'yes' : 'no'` in vote #`_voteId` on behalf of multiple voters
    * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Id for vote
    * @param _supports Whether the representative supports the vote
    * @param _voters Addresses of the voters to vote on behalf of
    */
    function voteOnBehalfOf(uint256 _voteId, bool _supports, address[] _voters) external voteExists(_voteId) {
        require(_voters.length <= MAX_VOTES_DELEGATION_SET_LENGTH, ERROR_DELEGATES_EXCEEDS_MAX_LEN);
        _voteOnBehalfOf(_voteId, _supports, _voters);
    }

    /**
    * @notice Execute vote #`_voteId`
    * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Id for vote
    */
    function executeVote(uint256 _voteId) external voteExists(_voteId) {
        Vote storage vote_ = votes[_voteId];
        require(_canExecute(vote_), ERROR_CANNOT_EXECUTE);

        vote_.status = VoteStatus.Executed;
        // TODO: check agreement action is not closed
        _closeAgreementAction(vote_.actionId);

        // Add Agreement to blacklist to disallow the stored EVMScript from directly calling the
        // linked Agreement from this app's context (e.g. maliciously creating a new action)
        address[] memory blacklist = new address[](1);
        blacklist[0] = address(_getAgreement());
        runScript(vote_.executionScript, new bytes(0), blacklist);
        emit ExecuteVote(_voteId);
    }

    // Disputable getter fns

    /**
    * @dev Tells whether vote #`_voteId` can be challenged
    * @param _voteId Id for vote
    * @return True if the given vote can be challenged
    */
    function canChallenge(uint256 _voteId) external view voteExists(_voteId) returns (bool) {
        Vote storage vote_ = votes[_voteId];
        return _isVoteOpenForVoting(vote_) && vote_.pausedAt == 0;
    }

    /**
    * @dev Tells whether vote #`_voteId` can be closed
    * @param _voteId Id for vote
    * @return True if the given vote can be closed
    */
    function canClose(uint256 _voteId) external view voteExists(_voteId) returns (bool) {
        Vote storage vote_ = votes[_voteId];
        return (_isActive(vote_) || _isExecuted(vote_)) && getTimestamp64() >= _voteEndDate(vote_);
    }

    // Getter fns

    /**
    * @dev Tells whether vote #`_voteId` can be executed
    *      Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Id for vote
    * @return True if the given vote can be executed
    */
    function canExecute(uint256 _voteId) external view voteExists(_voteId) returns (bool) {
        return _canExecute(votes[_voteId]);
    }

    /**
    * @dev Tells whether `_sender` can participate in the vote #`_voteId`
    *      Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Id for vote
    * @param _voter Address of the voter
    * @return True if the given voter can participate a certain vote
    */
    function canVote(uint256 _voteId, address _voter) external view voteExists(_voteId) returns (bool) {
        return _canVote(votes[_voteId], _voter);
    }

    /**
    * @dev Tells whether `_representative` can vote on behalf of `_voters` in vote #`_voteId`
    *      Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Id for vote
    * @param _voters List of addresses of the voters
    * @param _representative Address of the representative
    * @return True if the given representative can vote on behalf of the given voter in a certain vote
    */
    function canVoteOnBehalfOf(uint256 _voteId, address[] _voters, address _representative) external view voteExists(_voteId) returns (bool) {
        Vote storage vote_ = votes[_voteId];

        if (_withinOverruleWindow(vote_)) {
            return false;
        }

        for (uint256 i = 0; i < _voters.length; i++) {
            address voter = _voters[i];
            if (!_canVote(vote_, voter) || !_isRepresentativeOf(voter, _representative) || !_hasNotVotedYet(vote_, voter)) {
                return false;
            }
        }

        return true;
    }

    /**
    * @dev Return the main information for vote #`_voteId`
    *      Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Vote identifier
    * @return Vote executed status
    * @return Vote start date
    * @return Vote snapshot block
    * @return Vote support required
    * @return Vote minimum acceptance quorum
    * @return Vote overrule window period
    * @return Vote yeas amount
    * @return Vote nays amount
    * @return Vote power
    * @return Vote script
    */
    function getVote(uint256 _voteId)
        external
        view
        voteExists(_voteId)
        returns (
            bool executed,
            uint64 startDate,
            uint64 snapshotBlock,
            uint64 supportRequired,
            uint64 minAcceptQuorum,
            uint64 voteOverruleWindow,
            uint64 voteExecutionDelay,
            uint256 yea,
            uint256 nay,
            uint256 votingPower,
            bytes script
        )
    {
        Vote storage vote_ = votes[_voteId];

        executed = _isExecuted(vote_);
        startDate = vote_.startDate;
        snapshotBlock = vote_.snapshotBlock;
        supportRequired = vote_.supportRequiredPct;
        minAcceptQuorum = vote_.minAcceptQuorumPct;
        voteOverruleWindow = vote_.overruleWindow;
        voteExecutionDelay = vote_.executionDelay;
        yea = vote_.yea;
        nay = vote_.nay;
        votingPower = vote_.votingPower;
        script = vote_.executionScript;
    }

    /**
    * @dev Return the disputable information for vote #`_voteId`
    *      Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Vote identifier
    * @return Vote agreement action ID
    * @return Vote paused date
    * @return Vote paused duration
    * @return Vote status
    */
    function getVoteDisputableInfo(uint256 _voteId)
        external
        view
        voteExists(_voteId)
        returns (uint256 actionId, uint64 pausedAt, uint64 pauseDuration, VoteStatus status)
    {
        Vote storage vote_ = votes[_voteId];
        actionId = vote_.actionId;
        pausedAt = vote_.pausedAt;
        pauseDuration = vote_.pauseDuration;
        status = vote_.status;
    }

    /**
    * @dev Tells whether vote #`_voteId` is open for voting
    *      Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Id for vote
    * @return True if the vote is still open
    */
    function isVoteOpen(uint256 _voteId) external view voteExists(_voteId) returns (bool) {
        return _isVoteOpenForVoting(votes[_voteId]);
    }

    /**
    * @dev Return the state of a voter for a given vote by its ID
    *      Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Vote identifier
    * @param _voter Address of the voter
    * @return VoterState of the requested voter for a certain vote
    */
    function getVoterState(uint256 _voteId, address _voter) external view voteExists(_voteId) returns (VoterState) {
        return _voterState(votes[_voteId], _voter);
    }

    /**
    * @dev Return the caster of a given voter's vote
    *      Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Vote identifier
    * @param _voter Address of the voter
    * @return Address of the caster of the voter's vote
    */
    function getVoteCaster(uint256 _voteId, address _voter) external view voteExists(_voteId) returns (address) {
        return _voteCaster(votes[_voteId], _voter);
    }

    /**
    * @dev Tells whether `_representative` is `_voter`'s representative
    * @param _voter Address of the voter
    * @param _representative Address of the representative
    * @return True if the given representative was allowed by a certain voter
    */
    function isRepresentativeOf(address _voter, address _representative) external view isInitialized returns (bool) {
        return _isRepresentativeOf(_voter, _representative);
    }

    /**
    * @dev Tells whether vote #`_voteId` is within the overrule period for delegated votes
    *      Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Vote identifier
    * @return True if the requested vote is within the overrule window for delegated votes
    */
    function withinOverruleWindow(uint256 _voteId) external view voteExists(_voteId) returns (bool) {
        Vote storage vote_ = votes[_voteId];
        return _isVoteOpenForVoting(vote_) && _withinOverruleWindow(vote_);
    }

    // Forwarding fns

    /**
    * @dev Tells whether the DisputableVoting app is a forwarder
    * @dev IForwarder interface conformance
    * @return Always true
    */
    function isForwarder() external pure returns (bool) {
        return true;
    }

    /**
    * @notice Creates a vote to execute the desired action
    * @dev IForwarder interface conformance
    *      Disputable apps are required to be the initial step in the forwarding chain
    * @param _evmScript EVM script to be executed on approval
    */
    function forward(bytes _evmScript) public {
        require(canForward(msg.sender, _evmScript), ERROR_CANNOT_FORWARD);
        // TODO: Use new forwarding interface with context information
        _newVote(_evmScript, new bytes(0));
    }

    /**
    * @dev Tells whether `_sender` can forward actions
    * @dev IForwarder interface conformance
    * @param _sender Address of the account intending to forward an action
    * @return True if the given address can create votes
    */
    function canForward(address _sender, bytes) public view returns (bool) {
        // TODO: Handle the case where a Disputable app doesn't have an Agreement set
        // Note that `canPerform()` implicitly does an initialization check itself
        return canPerform(_sender, CREATE_VOTES_ROLE, arr(_sender));
    }

    // DisputableAragonApp callback implementations

    /**
    * @dev Challenge a vote
    * @param _voteId Id for vote to be challenged
    * @param _challengeId Identification number of the challenge associated to the vote in the Agreement app
    */
    function _onDisputableActionChallenged(uint256 _voteId, uint256 _challengeId, address /* _challenger */) internal {
        Vote storage vote_ = votes[_voteId];
        require(_isActive(vote_), ERROR_CANNOT_PAUSE_VOTE);

        vote_.status = VoteStatus.Paused;
        vote_.pausedAt = getTimestamp64();
        emit PauseVote(_voteId, _challengeId);
    }

    /**
    * @dev Allow a vote
    * @param _voteId Id for vote to be allowed
    */
    function _onDisputableActionAllowed(uint256 _voteId) internal {
        Vote storage vote_ = votes[_voteId];
        require(_isPaused(vote_), ERROR_VOTE_NOT_PAUSED);

        vote_.status = VoteStatus.Active;
        vote_.pauseDuration = getTimestamp64().sub(vote_.pausedAt);
        emit ResumeVote(_voteId);
    }

    /**
    * @dev Reject a vote
    * @param _voteId Id for vote to be rejected
    */
    function _onDisputableActionRejected(uint256 _voteId) internal {
        Vote storage vote_ = votes[_voteId];
        require(_isPaused(vote_), ERROR_VOTE_NOT_PAUSED);

        vote_.status = VoteStatus.Cancelled;
        vote_.pauseDuration = getTimestamp64().sub(vote_.pausedAt);
        emit CancelVote(_voteId);
    }

    /**
    * @dev Void a vote
    * @param _voteId Id for vote to be voided
    */
    function _onDisputableActionVoided(uint256 _voteId) internal {
        // When a challenged vote is voided, it is considered as being allowed.
        // This could be the case for challenges where the arbitrator refuses to rule.
        _onDisputableActionAllowed(_voteId);
    }

    // Internal fns

    /**
    * @dev Internal function to change the required support
    * @param _supportRequiredPct New required support
    */
    function _changeSupportRequiredPct(uint64 _supportRequiredPct) internal {
        require(minAcceptQuorumPct <= _supportRequiredPct, ERROR_CHANGE_SUPPORT_PCTS);
        require(_supportRequiredPct < PCT_BASE, ERROR_CHANGE_SUPPORT_TOO_BIG);
        supportRequiredPct = _supportRequiredPct;
        emit ChangeSupportRequired(_supportRequiredPct);
    }

    /**
    * @dev Internal function to change the minimum acceptance quorum
    * @param _minAcceptQuorumPct New acceptance quorum
    */
    function _changeMinAcceptQuorumPct(uint64 _minAcceptQuorumPct) internal {
        require(_minAcceptQuorumPct <= supportRequiredPct, ERROR_CHANGE_QUORUM_PCTS);
        minAcceptQuorumPct = _minAcceptQuorumPct;
        emit ChangeMinQuorum(_minAcceptQuorumPct);
    }

    /**
    * @dev Internal function to change the overrule window
    * @param _overruleWindow New overrule window in seconds
    */
    function _changeOverruleWindow(uint64 _overruleWindow) internal {
        require(_overruleWindow <= voteTime, ERROR_INVALID_OVERRULE_WINDOW);
        overruleWindow = _overruleWindow;
        emit ChangeOverruleWindow(_overruleWindow);
    }

    /**
    * @dev Internal function to change the execution delay
    * @param _executionDelay New execution delay in seconds
    */
    function _changeExecutionDelay(uint64 _executionDelay) internal {
        executionDelay = _executionDelay;
        emit ChangeExecutionDelay(_executionDelay);
    }

    /**
    * @dev Internal function to create a new vote
    * @return voteId id for newly created vote
    */
    function _newVote(bytes _executionScript, bytes _context) internal returns (uint256 voteId) {
        uint64 snapshotBlock = getBlockNumber64() - 1; // avoid double voting in this very block
        uint256 votingPower = token.totalSupplyAt(snapshotBlock);
        require(votingPower > 0, ERROR_NO_VOTING_POWER);

        voteId = votesLength++;

        Vote storage vote_ = votes[voteId];
        vote_.startDate = getTimestamp64();
        vote_.snapshotBlock = snapshotBlock;
        vote_.overruleWindow = overruleWindow;
        vote_.executionDelay = executionDelay;
        vote_.supportRequiredPct = supportRequiredPct;
        vote_.minAcceptQuorumPct = minAcceptQuorumPct;
        vote_.votingPower = votingPower;
        vote_.executionScript = _executionScript;
        vote_.status = VoteStatus.Active;

        // Notify the Agreement app tied to the current voting app about the vote created.
        // This is mandatory to make the vote disputable, by storing a reference to it on the Agreement app.
        vote_.actionId = _newAgreementAction(voteId, _context, msg.sender);

        emit StartVote(voteId, msg.sender, _context);
    }

    /**
    * @dev Internal function for a representative to cast a vote on behalf of many voters. It assumes the queried vote exists.
    */
    function _voteOnBehalfOf(uint256 _voteId, bool _supports, address[] _voters) internal {
        Vote storage vote_ = votes[_voteId];
        require(_isVoteOpenForVoting(vote_), ERROR_CANNOT_VOTE);
        require(!_withinOverruleWindow(vote_), ERROR_WITHIN_OVERRULE_WINDOW);

        for (uint256 i = 0; i < _voters.length; i++) {
            address voter = _voters[i];
            require(_hasVotingPower(vote_, voter), ERROR_CANNOT_VOTE);
            require(_isRepresentativeOf(voter, msg.sender), ERROR_NOT_REPRESENTATIVE);

            if (_hasNotVotedYet(vote_, voter)) {
                _castVote(vote_, _voteId, _supports, voter);
                vote_.casters[voter] = msg.sender;
                emit ProxyVoteSuccess(_voteId, voter, msg.sender, _supports);
            } else {
                emit ProxyVoteFailure(_voteId, voter, msg.sender);
            }
        }
    }

    /**
    * @dev Internal function to check if a vote can be executed
    *      It assumes the pointer to the vote is valid
    * @return True if the given vote can be executed
    */
    function _canExecute(Vote storage vote_) internal view returns (bool) {
        // If vote is already executed, it cannot be executed again
        if (_isExecuted(vote_)) {
            return false;
        }

        // If the vote is still open, it cannot be executed
        if (_isVoteOpenForVoting(vote_)) {
            return false;
        }

        // If the vote is within its execution delay window, it cannot be executed
        if (_withinExecutionDelayWindow(vote_)) {
            return false;
        }

        // If the vote does not have enough support, it cannot be executed
        uint256 totalVotes = vote_.yea.add(vote_.nay);
        if (!_isValuePct(vote_.yea, totalVotes, vote_.supportRequiredPct)) {
            return false;
        }

        // If the vote has not reached min quorum, it cannot be executed
        if (!_isValuePct(vote_.yea, vote_.votingPower, vote_.minAcceptQuorumPct)) {
            return false;
        }

        // If none of the above conditions are met, it can be executed.
        return true;
    }

    /**
    * @dev Internal function to check if a voter can participate in a vote
    *      It assumes the pointer to the vote is valid
    * @return True if the given voter can participate a certain vote
    */
    function _canVote(Vote storage vote_, address _voter) internal view returns (bool) {
        return _isVoteOpenForVoting(vote_) && _hasVotingPower(vote_, _voter);
    }

    /**
    * @dev Internal function to check if a voter has voting power for a vote
    *      It assumes the pointer to the vote is valid
    * @return True if the given voter has voting power for a certain vote
    */
    function _hasVotingPower(Vote storage vote_, address _voter) internal view returns (bool) {
        return token.balanceOfAt(_voter, vote_.snapshotBlock) > 0;
    }

    /**
    * @dev Internal function to check if a voter has already voted on a certain vote
    *      It assumes the pointer to the vote is valid
    * @return True if the given voter has not voted on the requested vote
    */
    function _hasNotVotedYet(Vote storage vote_, address _voter) internal view returns (bool) {
        return _voteCaster(vote_, _voter) != _voter;
    }

    /**
    * @dev Internal function to check if a representative is allowed to vote on behalf of a voter
    * @return True if the given representative is allowed by a certain voter
    */
    function _isRepresentativeOf(address _voter, address _representative) internal view returns (bool) {
        return representatives[_voter] == _representative;
    }

    /**
    * @dev Tell whether a vote is active
    *      It assumes the pointer to the vote is valid
    * @param vote_ Vote action instance being queried
    * @return True if the given vote is active
    */
    function _isActive(Vote storage vote_) internal view returns (bool) {
        return vote_.status == VoteStatus.Active;
    }

    /**
    * @dev Tell whether a vote is executed
    *      It assumes the pointer to the vote is valid
    * @param vote_ Vote action instance being queried
    * @return True if the given vote is executed
    */
    function _isExecuted(Vote storage vote_) internal view returns (bool) {
        return vote_.status == VoteStatus.Executed;
    }

    /**
    * @dev Tell whether a vote is paused
    *      It assumes the pointer to the vote is valid
    * @param vote_ Vote action instance being queried
    * @return True if the given vote is paused
    */
    function _isPaused(Vote storage vote_) internal view returns (bool) {
        return vote_.status == VoteStatus.Paused;
    }

    /**
    * @dev Internal function to check if a vote is still open for voting
    *      It assumes the pointer to the vote is valid
    * @return True if the given vote is open
    */
    function _isVoteOpenForVoting(Vote storage vote_) internal view returns (bool) {
        return _isActive(vote_) && getTimestamp64() < _voteEndDate(vote_);
    }

    /**
    * @dev Internal function to check if a vote is within its execution delay window
    *      It assumes the pointer to the vote is valid
    * @return True if the given vote is within its execution delay window
    */
    function _withinExecutionDelayWindow(Vote storage vote_) internal view returns (bool) {
        return getTimestamp64() < _voteEndDate(vote_).add(vote_.executionDelay);
    }

    /**
    * @dev Internal function to check if a vote is within its overrule window
    *      It assumes the pointer to the vote is valid.
    *      This function doesn't ensure whether the vote is open or not. Note that it must always be used along with `_isVoteOpenForVoting()`
    * @return True if the given vote is within its overrule window
    */
    function _withinOverruleWindow(Vote storage vote_) internal view returns (bool) {
        return getTimestamp64() >= _voteEndDate(vote_).sub(vote_.overruleWindow);
    }

    /**
    * @dev Internal function to calculate the end date of a vote
    *      The pause duration will be included only after the vote has "returned" from being paused
    *      It assumes the pointer to the vote is valid
    */
    function _voteEndDate(Vote storage vote_) internal view returns (uint64) {
        uint64 endDate = vote_.startDate.add(voteTime);
        return endDate.add(vote_.pauseDuration);
    }

    /**
    * @dev Internal function to get the state of a voter
    *      It assumes the pointer to the vote is valid
    */
    function _voterState(Vote storage vote_, address _voter) internal view returns (VoterState) {
        return vote_.voters[_voter];
    }

    /**
    * @dev Internal function to get the caster of a vote
    *      It assumes the pointer to the vote is valid
    */
    function _voteCaster(Vote storage vote_, address _voter) internal view returns (address) {
        if (_voterState(vote_, _voter) == VoterState.Absent) {
            return address(0);
        }

        address _caster = vote_.casters[_voter];
        return _caster == address(0) ? _voter : _caster;
    }

    /**
    * @dev Internal function to check if a certain vote id exists
    * @return True if the given vote id was already registered
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

    /**
    * @dev Private function to cast a vote
    *      It assumes the pointer to the vote is valid
    */
    function _castVote(Vote storage vote_, uint256 _voteId, bool _supports, address _voter) private {
        uint256 voterStake = token.balanceOfAt(_voter, vote_.snapshotBlock);
        VoterState state = _voterState(vote_, _voter);

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
    }

    /**
    * @dev Private function to remove any previous caster state when voting directly
    *      It assumes the pointer to the vote is valid
    */
    function _removeCasterIfNecessary(Vote storage vote_, address _voter) private {
        address _currentCaster = vote_.casters[_voter];
        if (_currentCaster != address(0)) {
            vote_.casters[_voter] = address(0);
        }
    }
}
