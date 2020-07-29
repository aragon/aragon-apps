/*
 * SPDX-License-Identifier:    GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/apps/disputable/DisputableAragonApp.sol";
import "@aragon/os/contracts/forwarding/IForwarderWithContext.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";
import "@aragon/minime/contracts/MiniMeToken.sol";


contract DisputableVoting is IForwarderWithContext, DisputableAragonApp {
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

    // bytes32 public constant MODIFY_QUIET_ENDING_CONFIGURATION = keccak256("MODIFY_QUIET_ENDING_CONFIGURATION");
    bytes32 public constant MODIFY_QUIET_ENDING_CONFIGURATION = 0xea5f8966ef2b8a76f5b366172243e44574d20863ab5b01eba9ee2713c3620c2f;

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
    string private constant ERROR_INVALID_QUIET_ENDING_PERIOD = "VOTING_INVALID_QUIET_ENDING_PERI";
    string private constant ERROR_DELEGATES_EXCEEDS_MAX_LEN = "VOTING_DELEGATES_EXCEEDS_MAX_LEN";
    string private constant ERROR_SETTING_DOES_NOT_EXIST = "VOTING_SETTING_DOES_NOT_EXIST";

    // Workflow errors
    string private constant ERROR_CANNOT_VOTE = "VOTING_CANNOT_VOTE";
    string private constant ERROR_CANNOT_EXECUTE = "VOTING_CANNOT_EXECUTE";
    string private constant ERROR_CANNOT_FORWARD = "VOTING_CANNOT_FORWARD";
    string private constant ERROR_CANNOT_PAUSE_VOTE = "VOTING_CANNOT_PAUSE_VOTE";
    string private constant ERROR_NO_VOTING_POWER = "VOTING_NO_VOTING_POWER";
    string private constant ERROR_VOTE_NOT_PAUSED = "VOTING_VOTE_NOT_PAUSED";
    string private constant ERROR_NOT_REPRESENTATIVE = "VOTING_NOT_REPRESENTATIVE";
    string private constant ERROR_CANNOT_DELEGATE_VOTE = "VOTING_CANNOT_DELEGATE_VOTE";

    enum VoterState { Absent, Yea, Nay }

    enum VoteStatus {
        Active,                         // An ongoing vote
        Paused,                         // A vote that is being challenged
        Cancelled,                      // A vote that has been cancelled since it was refused after a challenge or dispute
        Executed                        // A vote that has been executed
    }

    struct Setting {
        uint64 supportRequiredPct;
        uint64 minAcceptQuorumPct;
        uint64 executionDelay;
        uint64 overruleWindow;
        uint64 quietEndingPeriod;
        uint64 quietEndingExtension;
    }

    struct VoteCast {
        VoterState state;
        address caster;
    }

    struct Vote {
        uint256 yea;                                        // Cast vote power in favor
        uint256 nay;                                        // Cast vote power against
        uint256 votingPower;                                // Voting power at the moment the vote was created
        uint256 settingId;                                  // Identification number of the setting object at the moment the vote was created
        uint256 actionId;                                   // Identification number of the disputable action in the context of the agreement
        VoteStatus status;                                  // Status of the disputable vote
        uint64 startDate;                                   // Datetime when the vote was created
        uint64 snapshotBlock;                               // Block number when the vote was created
        uint64 pausedAt;                                    // Datetime when the vote was paused
        uint64 pauseDuration;                               // Duration in seconds while the vote has been paused
        uint64 quietEndingExtendedSeconds;                  // Total number of seconds a vote was extended due to quiet ending
        bytes executionScript;                              // EVM script attached to the vote
        mapping (address => VoteCast) castVotes;            // Cast votes information indexed by voter address: status and caster address
    }

    uint64 public voteTime;                                 // Duration of each vote
    MiniMeToken public token;                               // Token to be used for voting power, we assume it's not malicious

    uint256 internal settingsLength;                        // Number of existing settings
    mapping (uint256 => Setting) internal settings;         // List of settings indexed by ID

    // We are mimicking an array, we use a mapping instead to make app upgrades more graceful
    uint256 public votesLength;                             // Number of existing votes created
    mapping (uint256 => Vote) internal votes;               // List of votes indexed by ID
    mapping (address => address) internal representatives;  // List of representatives indexed by voter address

    event StartVote(uint256 indexed voteId, address indexed creator, bytes context);
    event CastVote(uint256 indexed voteId, address indexed voter, bool supports, uint256 stake);
    event PauseVote(uint256 indexed voteId, uint256 indexed challengeId);
    event ResumeVote(uint256 indexed voteId);
    event CancelVote(uint256 indexed voteId);
    event ProxyVoteFailure(uint256 indexed voteId, address indexed voter, address indexed representative);
    event ProxyVoteSuccess(uint256 indexed voteId, address indexed voter, address indexed representative, bool supports);
    event VoteQuietEndingExtension(uint256 indexed voteId, bool passing);
    event ExecuteVote(uint256 indexed voteId);
    event NewSetting(uint256 settingId);
    event ChangeSupportRequired(uint64 supportRequiredPct);
    event ChangeMinQuorum(uint64 minAcceptQuorumPct);
    event ChangeOverruleWindow(uint64 overruleWindow);
    event ChangeQuietEndingPeriod(uint64 quietEndingPeriod, uint64 quietEndingExtension);
    event ChangeExecutionDelay(uint64 executionDelay);
    event ChangeRepresentative(address indexed voter, address indexed newRepresentative);

    /**
    * @notice Initialize DisputableVoting app with `_token.symbol(): string` for governance, minimum support of `@formatPct(_supportRequiredPct)`%, minimum acceptance quorum of `@formatPct(_minAcceptQuorumPct)`%, a voting duration of `@transformTime(_voteTime)`, an overrule window of `@transformTime(_overruleWindow), and a execution delay of `@transformTime(_executionDelay)`
    * @param _token MiniMeToken Address that will be used as governance token
    * @param _supportRequiredPct Percentage of yeas in cast votes for a vote to succeed (expressed as a percentage of 10^18; eg. 10^16 = 1%, 10^18 = 100%)
    * @param _minAcceptQuorumPct Percentage of yeas in total possible votes for a vote to succeed (expressed as a percentage of 10^18; eg. 10^16 = 1%, 10^18 = 100%)
    * @param _voteTime Seconds that a vote will be open for token holders to vote
    * @param _overruleWindow Overrule window in seconds
    * @param _quietEndingPeriod Quiet ending period in seconds
    * @param _quietEndingExtension Quiet ending period extension in seconds
    * @param _executionDelay Execution delay in seconds
    */
    function initialize(
        MiniMeToken _token,
        uint64 _supportRequiredPct,
        uint64 _minAcceptQuorumPct,
        uint64 _voteTime,
        uint64 _overruleWindow,
        uint64 _quietEndingPeriod,
        uint64 _quietEndingExtension,
        uint64 _executionDelay
    )
        external
    {
        initialized();

        require(isContract(_token), ERROR_TOKEN_NOT_CONTRACT);
        require(_voteTime > 0, ERROR_VOTE_TIME_ZERO);

        token = _token;
        voteTime = _voteTime;

        (Setting storage setting, ) = _newSetting();
        _changeSupportRequiredPct(setting, _supportRequiredPct);
        _changeMinAcceptQuorumPct(setting, _minAcceptQuorumPct);
        _changeOverruleWindow(setting, _overruleWindow);
        _changeExecutionDelay(setting, _executionDelay);
        _changeQuietEndingPeriod(setting, _quietEndingPeriod, _quietEndingExtension);
    }

    /**
    * @notice Change required support to `@formatPct(_supportRequiredPct)`%
    * @param _supportRequiredPct New required support
    */
    function changeSupportRequiredPct(uint64 _supportRequiredPct) external authP(MODIFY_SUPPORT_ROLE, arr(uint256(_supportRequiredPct))) {
        Setting storage setting = _newCopiedSettings();
        _changeSupportRequiredPct(setting, _supportRequiredPct);
    }

    /**
    * @notice Change minimum acceptance quorum to `@formatPct(_minAcceptQuorumPct)`%
    * @param _minAcceptQuorumPct New acceptance quorum
    */
    function changeMinAcceptQuorumPct(uint64 _minAcceptQuorumPct) external authP(MODIFY_QUORUM_ROLE, arr(uint256(_minAcceptQuorumPct))) {
        Setting storage setting = _newCopiedSettings();
        _changeMinAcceptQuorumPct(setting, _minAcceptQuorumPct);
    }

    /**
    * @notice Change overrule window to `@transformTime(_overruleWindow)`
    * @param _overruleWindow New overrule window in seconds
    */
    function changeOverruleWindow(uint64 _overruleWindow) external authP(MODIFY_OVERRULE_WINDOW_ROLE, arr(uint256(_overruleWindow))) {
        Setting storage setting = _newCopiedSettings();
        _changeOverruleWindow(setting, _overruleWindow);
    }

    /**
    * @notice Change quiet ending period to `@transformTime(_quietEndingPeriod)` with extensions of `@transformTime(_quietEndingExtension)`
    * @param _quietEndingPeriod New quiet ending period in seconds
    * @param _quietEndingExtension New quiet ending extension in seconds
    */
    function changeQuietEndingPeriod(uint64 _quietEndingPeriod, uint64 _quietEndingExtension)
        external
        authP(MODIFY_QUIET_ENDING_CONFIGURATION, arr(uint256(_quietEndingPeriod), uint256(_quietEndingExtension)))
    {
        Setting storage setting = _newCopiedSettings();
        _changeQuietEndingPeriod(setting, _quietEndingPeriod, _quietEndingExtension);
    }

    /**
    * @notice Change execution delay to `@transformTime(_executionDelay)`
    * @param _executionDelay New execution delay in seconds
    */
    function changeExecutionDelay(uint64 _executionDelay) external authP(MODIFY_EXECUTION_DELAY_ROLE, arr(uint256(_executionDelay))) {
        Setting storage setting = _newCopiedSettings();
        _changeExecutionDelay(setting, _executionDelay);
    }

    /**
    * @notice `_representative == 0x0 ? 'Set your voting representative to ' + _representative : 'Remove your representative'`
    * @param _representative Address of the representative who is allowed to vote on behalf of the sender. Use the zero address for none.
    */
    function setRepresentative(address _representative) external isInitialized {
        representatives[msg.sender] = _representative;
        emit ChangeRepresentative(msg.sender, _representative);
    }

    // Forwarding external fns

    /**
    * @notice Creates a vote to execute the desired action
    * @dev IForwarderWithContext interface conformance
    *      Disputable apps are required to be the initial step in the forwarding chain
    * @param _evmScript EVM script to be executed on approval
    * @param _context Vote context
    */
    function forward(bytes _evmScript, bytes _context) external {
        require(_canForward(msg.sender, _evmScript), ERROR_CANNOT_FORWARD);
        _newVote(_evmScript, _context);
    }

    /**
    * @notice Create a new vote about "`_context`"
    * @param _executionScript EVM script to be executed on approval
    * @param _context Vote context
    * @return Id for newly created vote
    */
    function newVote(bytes _executionScript, bytes _context) external auth(CREATE_VOTES_ROLE) returns (uint256) {
        return _newVote(_executionScript, _context);
    }

    /**
    * @notice Vote `_supports ? 'yes' : 'no'` in vote #`_voteId`
    * @dev Initialization check is implicitly provided by `_getVote()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Id for vote
    * @param _supports Whether voter supports the vote
    */
    function vote(uint256 _voteId, bool _supports) external {
        Vote storage vote_ = _getVote(_voteId);
        require(_canVote(vote_, msg.sender), ERROR_CANNOT_VOTE);

        _castVote(vote_, _voteId, _supports, msg.sender, address(0));
    }

    /**
    * @notice Vote `_supports ? 'yes' : 'no'` in vote #`_voteId` on behalf of multiple voters
    * @dev Initialization check is implicitly provided by `_getVote()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Id for vote
    * @param _supports Whether the representative supports the vote
    * @param _voters Addresses of the voters to vote on behalf of
    */
    function voteOnBehalfOf(uint256 _voteId, bool _supports, address[] _voters) external {
        require(_voters.length <= MAX_VOTES_DELEGATION_SET_LENGTH, ERROR_DELEGATES_EXCEEDS_MAX_LEN);
        _voteOnBehalfOf(_voteId, _supports, _voters);
    }

    /**
    * @notice Execute vote #`_voteId`
    * @dev Initialization check is implicitly provided by `_getVote()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Id for vote
    */
    function executeVote(uint256 _voteId) external {
        Vote storage vote_ = _getVote(_voteId);
        require(_canExecute(vote_), ERROR_CANNOT_EXECUTE);

        vote_.status = VoteStatus.Executed;
        _closeAgreementAction(vote_.actionId);

        // Add Agreement to blacklist to disallow the stored EVMScript from directly calling the
        // linked Agreement from this app's context (e.g. maliciously creating a new action)
        address[] memory blacklist = new address[](1);
        blacklist[0] = address(_getAgreement());
        runScript(vote_.executionScript, new bytes(0), blacklist);
        emit ExecuteVote(_voteId);
    }

    // Forwarding getter fns

    /**
    * @dev Tells whether `_sender` can forward actions
    * @dev IForwarderWithContext interface conformance
    * @param _sender Address of the account intending to forward an action
    * @param _evmScript EVM script being forwarded
    * @return True if the given address can create votes
    */
    function canForward(address _sender, bytes _evmScript) external view returns (bool) {
        return _canForward(_sender, _evmScript);
    }

    // Disputable getter fns

    /**
    * @dev Tells whether vote #`_voteId` can be challenged
    * @param _voteId Id for vote
    * @return True if the given vote can be challenged
    */
    function canChallenge(uint256 _voteId) external view returns (bool) {
        Vote storage vote_ = _getVote(_voteId);
        return _isVoteOpenForVoting(vote_) && vote_.pausedAt == 0;
    }

    /**
    * @dev Tells whether vote #`_voteId` can be closed
    * @param _voteId Id for vote
    * @return True if the given vote can be closed
    */
    function canClose(uint256 _voteId) external view returns (bool) {
        Vote storage vote_ = _getVote(_voteId);
        return (_isActive(vote_) || _isExecuted(vote_)) && _hasEnded(vote_);
    }

    // Getter fns

    /**
    * @dev Tells whether vote #`_voteId` can be executed
    *      Initialization check is implicitly provided by `_getVote()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Id for vote
    * @return True if the given vote can be executed
    */
    function canExecute(uint256 _voteId) external view returns (bool) {
        return _canExecute(_getVote(_voteId));
    }

    /**
    * @dev Tells whether `_sender` can participate in the vote #`_voteId`
    *      Initialization check is implicitly provided by `_getVote()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Id for vote
    * @param _voter Address of the voter
    * @return True if the given voter can participate a certain vote
    */
    function canVote(uint256 _voteId, address _voter) external view returns (bool) {
        return _canVote(_getVote(_voteId), _voter);
    }

    /**
    * @dev Tells whether `_representative` can vote on behalf of `_voters` in vote #`_voteId`
    *      Initialization check is implicitly provided by `_getVote()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Id for vote
    * @param _voters List of addresses of the voters
    * @param _representative Address of the representative
    * @return True if the given representative can vote on behalf of the given voter in a certain vote
    */
    function canVoteOnBehalfOf(uint256 _voteId, address[] _voters, address _representative) external view returns (bool) {
        Vote storage vote_ = _getVote(_voteId);

        if (!_canDelegateVote(vote_)) {
            return false;
        }

        for (uint256 i = 0; i < _voters.length; i++) {
            address voter = _voters[i];
            if (!_hasVotingPower(vote_, voter) || !_isRepresentativeOf(voter, _representative) || _hasCastVote(vote_, voter)) {
                return false;
            }
        }

        return true;
    }

    /**
    * @dev Return the information for vote #`_voteId`
    *      Initialization check is implicitly provided by `_getVote()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Vote identifier
    * @return yea Cast vote power in favor
    * @return nay Cast vote power against
    * @return votingPower Voting power at the moment the vote was created
    * @return settingId Identification number of the setting object at the moment the vote was created
    * @return actionId Identification number of the disputable action in the context of the agreement
    * @return status Status of the disputable vote
    * @return startDate Datetime when the vote was created
    * @return snapshotBlock Block number when the vote was created
    * @return pausedAt Datetime when the vote was paused
    * @return pauseDuration Duration in seconds while the vote has been paused
    * @return quietEndingExtendedSeconds Total number of seconds a vote was extended due to quiet ending
    * @return executionScript EVM script attached to the vote
    */
    function getVote(uint256 _voteId)
        external
        view
        returns (
            uint256 yea,
            uint256 nay,
            uint256 votingPower,
            uint256 settingId,
            uint256 actionId,
            VoteStatus status,
            uint64 startDate,
            uint64 snapshotBlock,
            uint64 pausedAt,
            uint64 pauseDuration,
            uint64 quietEndingExtendedSeconds,
            bytes executionScript
        )
    {
        Vote storage vote_ = _getVote(_voteId);

        yea = vote_.yea;
        nay = vote_.nay;
        votingPower = vote_.votingPower;
        settingId = vote_.settingId;
        actionId = vote_.actionId;
        status = vote_.status;
        startDate = vote_.startDate;
        snapshotBlock = vote_.snapshotBlock;
        pausedAt = vote_.pausedAt;
        pauseDuration = vote_.pauseDuration;
        quietEndingExtendedSeconds = vote_.quietEndingExtendedSeconds;
        executionScript = vote_.executionScript;
    }

    /**
    * @dev Return the state of a voter for a given vote by its ID
    *      Initialization check is implicitly provided by `_getVote()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Vote identifier
    * @param _voter Address of the voter
    * @return state Voter state of the requested voter for a certain vote
    * @return caster Address of the caster of the voter's vote
    */
    function getCastVote(uint256 _voteId, address _voter) external view returns (VoterState state, address caster) {
        Vote storage vote_ = _getVote(_voteId);
        state = _voterState(vote_, _voter);
        caster = _voteCaster(vote_, _voter);
    }

    /**
    * @dev Return the information for setting #`_settingId`
    *      Initialization check is implicitly provided by `_getSetting()` as new settings can only be
    *      created via `change*()` functions which require initialization
    * @param _settingId Identification number of the setting being queried
    * @return supportRequiredPct Percentage of support required for the vote to pass
    * @return minAcceptQuorumPct Percentage of minimum acceptance quorum required for the vote to pass
    * @return executionDelay Number of seconds of delay the execution of the vote will have to wait until it is allowed in case it passes
    * @return overruleWindow Duration of the overrule window based on the original vote end date
    * @return quietEndingPeriod Duration of the quiet ending period
    * @return quietEndingExtension Number of seconds votes are extended every time a vote is flipped during the quiet ending period
    */
    function getSetting(uint256 _settingId)
        external
        view
        returns (
            uint64 supportRequiredPct,
            uint64 minAcceptQuorumPct,
            uint64 executionDelay,
            uint64 overruleWindow,
            uint64 quietEndingPeriod,
            uint64 quietEndingExtension
        )
    {
        Setting storage setting = _getSetting(_settingId);
        supportRequiredPct = setting.supportRequiredPct;
        minAcceptQuorumPct = setting.minAcceptQuorumPct;
        executionDelay = setting.executionDelay;
        overruleWindow = setting.overruleWindow;
        quietEndingPeriod = setting.quietEndingPeriod;
        quietEndingExtension = setting.quietEndingExtension;
    }

    /**
    * @dev Tell the identification number of the current vote setting
    * @return Identification number of the current vote setting
    */
    function getCurrentSettingId() external view isInitialized returns (uint256) {
        return _getCurrentSettingId();
    }

    /**
    * @dev Tells whether vote #`_voteId` is open for voting
    *      Initialization check is implicitly provided by `_getVote()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Id for vote
    * @return True if the vote is still open
    */
    function isVoteOpen(uint256 _voteId) external view returns (bool) {
        return _isVoteOpenForVoting(_getVote(_voteId));
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
    *      Initialization check is implicitly provided by `_getVote()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Vote identifier
    * @return True if the requested vote is within the overrule window for delegated votes
    */
    function withinOverruleWindow(uint256 _voteId) external view returns (bool) {
        Vote storage vote_ = _getVote(_voteId);
        return _isVoteOpenForVoting(vote_) && _withinOverruleWindow(vote_);
    }

    // DisputableAragonApp callback implementations

    /**
    * @dev Challenge a vote
    * @param _voteId Id for vote to be challenged
    * @param _challengeId Identification number of the challenge associated to the vote in the Agreement app
    */
    function _onDisputableActionChallenged(uint256 _voteId, uint256 _challengeId, address /* _challenger */) internal {
        Vote storage vote_ = _getVote(_voteId);
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
        Vote storage vote_ = _getVote(_voteId);
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
        Vote storage vote_ = _getVote(_voteId);
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
    function _changeSupportRequiredPct(Setting storage _setting, uint64 _supportRequiredPct) internal {
        require(_setting.minAcceptQuorumPct <= _supportRequiredPct, ERROR_CHANGE_SUPPORT_PCTS);
        require(_supportRequiredPct < PCT_BASE, ERROR_CHANGE_SUPPORT_TOO_BIG);

        _setting.supportRequiredPct = _supportRequiredPct;
        emit ChangeSupportRequired(_supportRequiredPct);
    }

    /**
    * @dev Internal function to change the minimum acceptance quorum
    * @param _minAcceptQuorumPct New acceptance quorum
    */
    function _changeMinAcceptQuorumPct(Setting storage _setting, uint64 _minAcceptQuorumPct) internal {
        require(_minAcceptQuorumPct <= _setting.supportRequiredPct, ERROR_CHANGE_QUORUM_PCTS);

        _setting.minAcceptQuorumPct = _minAcceptQuorumPct;
        emit ChangeMinQuorum(_minAcceptQuorumPct);
    }

    /**
    * @dev Internal function to change the overrule window
    * @param _overruleWindow New overrule window in seconds
    */
    function _changeOverruleWindow(Setting storage _setting, uint64 _overruleWindow) internal {
        require(_overruleWindow <= voteTime, ERROR_INVALID_OVERRULE_WINDOW);

        _setting.overruleWindow = _overruleWindow;
        emit ChangeOverruleWindow(_overruleWindow);
    }

    /**
    * @dev Internal function to change the quiet ending configuration
    * @param _quietEndingPeriod New quiet ending period in seconds
    * @param _quietEndingExtension New quiet ending extension in seconds
    */
    function _changeQuietEndingPeriod(Setting storage _setting, uint64 _quietEndingPeriod, uint64 _quietEndingExtension) internal {
        require(_quietEndingPeriod <= voteTime, ERROR_INVALID_QUIET_ENDING_PERIOD);

        _setting.quietEndingPeriod = _quietEndingPeriod;
        _setting.quietEndingExtension = _quietEndingExtension;
        emit ChangeQuietEndingPeriod(_quietEndingPeriod, _quietEndingExtension);
    }

    /**
    * @dev Internal function to change the execution delay
    * @param _executionDelay New execution delay in seconds
    */
    function _changeExecutionDelay(Setting storage _setting, uint64 _executionDelay) internal {
        _setting.executionDelay = _executionDelay;
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
        vote_.settingId = _getCurrentSettingId();
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
        Vote storage vote_ = _getVote(_voteId);
        require(_canDelegateVote(vote_), ERROR_CANNOT_DELEGATE_VOTE);

        for (uint256 i = 0; i < _voters.length; i++) {
            address voter = _voters[i];
            require(_hasVotingPower(vote_, voter), ERROR_CANNOT_VOTE);
            require(_isRepresentativeOf(voter, msg.sender), ERROR_NOT_REPRESENTATIVE);

            if (!_hasCastVote(vote_, voter)) {
                _castVote(vote_, _voteId, _supports, voter, msg.sender);
                emit ProxyVoteSuccess(_voteId, voter, msg.sender, _supports);
            } else {
                emit ProxyVoteFailure(_voteId, voter, msg.sender);
            }
        }
    }

    /**
    * @dev Internal function to create a new setting object
    * @return New setting object
    */
    function _newSetting() internal returns (Setting storage setting, uint256 settingId) {
        settingId = settingsLength++;
        setting = settings[settingId];
        emit NewSetting(settingId);
    }

    /**
    * @dev Internal function to tells whether an address can forward actions
    * @param _sender Address of the account intending to forward an action
    * @return True if the given address can create votes
    */
    function _canForward(address _sender, bytes) internal view returns (bool) {
        // TODO: Handle the case where a Disputable app doesn't have an Agreement set
        // Note that `canPerform()` implicitly does an initialization check itself
        return canPerform(_sender, CREATE_VOTES_ROLE, arr());
    }

    /**
    * @dev Internal function to check if a vote can be executed
    *      It assumes the pointer to the vote is valid
    * @return True if the given vote can be executed
    */
    function _canExecute(Vote storage vote_) internal view returns (bool) {
        // If vote is executed, paused, or cancelled, it cannot be executed
        if (!_isActive(vote_)) {
            return false;
        }

        // If the vote is still open, it cannot be executed
        if (!_hasEnded(vote_)) {
            return false;
        }

        // If the vote is within its execution delay window, it cannot be executed
        Setting storage setting = settings[vote_.settingId];
        if (_withinExecutionDelayWindow(vote_, setting)) {
            return false;
        }

        // Check the vote has enough support and has reached the min quorum
        uint256 yeas = vote_.yea;
        uint256 totalVotes = yeas.add(vote_.nay);
        return _isAccepted(yeas, totalVotes, vote_.votingPower, setting.supportRequiredPct, setting.minAcceptQuorumPct);
    }

    /**
    * @dev Internal function to check if a vote can receive delegated votes
    *      It assumes the pointer to the vote is valid
    * @return True if the given vote can receive delegated votes
    */
    function _canDelegateVote(Vote storage vote_) internal view returns (bool) {
        return _isActive(vote_) && !_withinOverruleWindow(vote_);
    }

    /**
    * @dev Internal function to check if a voter can participate in a vote
    *      It assumes the pointer to the vote is valid
    * @return True if the given voter can participate a certain vote
    */
    function _canVote(Vote storage vote_, address _voter) internal view returns (bool) {
        return _isVoteOpenForVoting(vote_) && _hasVotingPower(vote_, _voter) && _voteCaster(vote_, _voter) != _voter;
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
    * @dev Internal function to check if the vote for a voter has already been cast
    *      It assumes the pointer to the vote is valid
    * @return True if a vote for the given voter has already been cast
    */
    function _hasCastVote(Vote storage vote_, address _voter) internal view returns (bool) {
        return _voterState(vote_, _voter) != VoterState.Absent;
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
    * @dev Tell whether a vote has ended or not
    *      It assumes the pointer to the vote is valid
    * @param vote_ Vote action instance being queried
    * @return True if the given vote has ended
    */
    function _hasEnded(Vote storage vote_) internal view returns (bool) {
        return getTimestamp64() >= _finalVoteEndDate(vote_);
    }

    /**
    * @dev Internal function to check if a vote is still open for voting
    *      It assumes the pointer to the vote is valid
    * @return True if the given vote is open for voting
    */
    function _isVoteOpenForVoting(Vote storage vote_) internal view returns (bool) {
        return _isActive(vote_) && !_hasEnded(vote_);
    }

    /**
    * @dev Internal function to check if a vote is before its overrule window
    *      This function doesn't ensure whether the vote is open or not
    *      It assumes the pointer to the vote is valid
    * @return True if the given vote is within its overrule window
    */
    function _withinOverruleWindow(Vote storage vote_) internal view returns (bool) {
        Setting storage setting = settings[vote_.settingId];
        return getTimestamp64() >= _durationStartDate(vote_, setting.overruleWindow);
    }

    /**
    * @dev Internal function to check if a vote is within its quiet ending period
    *      This function doesn't ensure whether the vote is open or not
    *      It assumes the pointer to the vote is valid
    * @return True if the given vote is within its quiet ending period
    */
    function _withinQuietEndingPeriod(Vote storage vote_, Setting storage _setting) internal view returns (bool) {
        return getTimestamp64() >= _durationStartDate(vote_, _setting.quietEndingPeriod);
    }

    /**
    * @dev Internal function to check if a vote is within its execution delay window
    *      It assumes the pointer to the vote is valid
    * @return True if the given vote is within its execution delay window
    */
    function _withinExecutionDelayWindow(Vote storage vote_, Setting storage _setting) internal view returns (bool) {
        return getTimestamp64() < _finalVoteEndDate(vote_).add(_setting.executionDelay);
    }

    /**
    * @dev Internal function to calculate the original end date of a vote
    *      It does not consider the paused nor quiet ending extensions
    *      It assumes the pointer to the vote is valid
    */
    function _originalVoteEndDate(Vote storage vote_) internal view returns (uint64) {
        return vote_.startDate.add(voteTime);
    }

    /**
    * @dev Internal function to calculate the end date of a vote
    *      It considers the extensions due to quiet ending.
    *      The pause duration will be included only after the vote has "returned" from being paused
    *      It assumes the pointer to the vote is valid
    */
    function _finalVoteEndDate(Vote storage vote_) internal view returns (uint64) {
        uint64 endDateAfterPause = _originalVoteEndDate(vote_).add(vote_.pauseDuration);
        return endDateAfterPause.add(vote_.quietEndingExtendedSeconds);
    }

    /**
    * @dev Internal function to get the state of a voter
    *      It assumes the pointer to the vote is valid
    */
    function _voterState(Vote storage vote_, address _voter) internal view returns (VoterState) {
        return vote_.castVotes[_voter].state;
    }

    /**
    * @dev Internal function to get the caster of a vote
    *      It assumes the pointer to the vote is valid
    */
    function _voteCaster(Vote storage vote_, address _voter) internal view returns (address) {
        if (!_hasCastVote(vote_, _voter)) {
            return address(0);
        }

        address _caster = vote_.castVotes[_voter].caster;
        return _caster == address(0) ? _voter : _caster;
    }

    /**
    * @dev Internal function to get a vote object
    */
    function _getVote(uint256 _voteId) internal view returns (Vote storage) {
        require(_voteId < votesLength, ERROR_NO_VOTE);
        return votes[_voteId];
    }

    /**
    * @dev Internal function to get the identification number of the current vote setting
    * @return Identification number of the current vote setting
    */
    function _getCurrentSettingId() internal view returns (uint256) {
        // No need for SafeMath, note that a new setting is created during initialization
        return settingsLength - 1;
    }

    /**
    * @dev Internal function to get a settings object
    */
    function _getSetting(uint256 _settingId) internal view returns (Setting storage) {
        require(_settingId < settingsLength, ERROR_SETTING_DOES_NOT_EXIST);
        return settings[_settingId];
    }

    /**
    * @dev Tells whether a vote is accepted or not
    *      It checks there is enough support and the minimum acceptance quorum has been reached
    */
    function _isAccepted(uint256 _yeas, uint256 _totalVotes, uint256 _votingPower, uint64 _supportRequired, uint64 _minimumAcceptanceQuorum)
        internal
        pure
        returns (bool)
    {
        return _isValuePct(_yeas, _totalVotes, _supportRequired) &&
        _isValuePct(_yeas, _votingPower, _minimumAcceptanceQuorum);
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
    function _castVote(Vote storage vote_, uint256 _voteId, bool _supports, address _voter, address _caster) private {
        uint256 yeas = vote_.yea;
        uint256 nays = vote_.nay;
        uint256 votingPower = vote_.votingPower;
        Setting storage setting = settings[vote_.settingId];
        uint64 supportRequired = setting.supportRequiredPct;
        uint64 minimumAcceptanceQuorum = setting.minAcceptQuorumPct;

        bool wasAccepted = _isAccepted(yeas, yeas.add(nays), votingPower, supportRequired, minimumAcceptanceQuorum);
        (yeas, nays) = _computeCastVote(vote_, _voteId, yeas, nays, _supports, _voter, _caster);

        if (_withinQuietEndingPeriod(vote_, setting)) {
            bool isAccepted = _isAccepted(yeas, yeas.add(nays), votingPower, supportRequired, minimumAcceptanceQuorum);
            if (wasAccepted != isAccepted) {
                vote_.quietEndingExtendedSeconds = vote_.quietEndingExtendedSeconds.add(setting.quietEndingExtension);
                emit VoteQuietEndingExtension(_voteId, isAccepted);
            }
        }
    }

    /**
    * @dev Private function to compute a cast vote
    *      It assumes the pointer to the vote is valid
    */
    function _computeCastVote(Vote storage vote_, uint256 _voteId, uint256 _yeas, uint256 _nays, bool _supports, address _voter, address _caster)
        private
        returns (uint256, uint256)
    {
        uint256 voterStake = token.balanceOfAt(_voter, vote_.snapshotBlock);
        VoteCast storage castVote = vote_.castVotes[_voter];
        VoterState previousVoterState = castVote.state;

        // If voter had previously voted, decrease count
        // Note that votes can be changed only during the overrule window
        if (previousVoterState == VoterState.Yea) {
            _yeas = _yeas.sub(voterStake);
        } else if (previousVoterState == VoterState.Nay) {
            _nays = _nays.sub(voterStake);
        }

        if (_supports) {
            _yeas = _yeas.add(voterStake);
        } else {
            _nays = _nays.add(voterStake);
        }

        vote_.yea = _yeas;
        vote_.nay = _nays;
        castVote.state = _supports ? VoterState.Yea : VoterState.Nay;
        castVote.caster = _caster;
        emit CastVote(_voteId, _voter, _supports, voterStake);

        return (_yeas, _nays);
    }

    /**
    * @dev Private function to copy settings from one storage pointer to another
    */
    function _newCopiedSettings() private returns (Setting storage) {
        (Setting storage setting, uint256 settingId) = _newSetting();
        _copySettings(_getSetting(settingId - 1), setting);
        return setting;
    }

    /**
    * @dev Private function to copy settings from one storage pointer to another
    */
    function _copySettings(Setting storage _from, Setting storage _to) private {
        _to.supportRequiredPct = _from.supportRequiredPct;
        _to.minAcceptQuorumPct = _from.minAcceptQuorumPct;
        _to.executionDelay = _from.executionDelay;
        _to.overruleWindow = _from.overruleWindow;
        _to.quietEndingPeriod = _from.quietEndingPeriod;
        _to.quietEndingExtension = _from.quietEndingExtension;
    }

    /**
    * @dev Internal function to compute the start date of time duration from the original vote end date
    *      It considers the pause duration only if the vote has "returned" from being paused,
    *      and if the pause occurred before the start date of the time duration being queried
    *      It assumes the pointer to the vote is valid
    *
    *                                                  [   queried duration   ]
    *      [   vote active    ][   vote paused    ][   .   vote active        ]
    *      ^                                           ^                      ^
    *      |                                           |                      |
    *  vote starts                            duration start date         vote ends
    */
    function _durationStartDate(Vote storage vote_, uint64 _duration) private view returns (uint64) {
        uint64 pausedAt = vote_.pausedAt;
        uint64 originalDurationStartDate = _originalVoteEndDate(vote_).sub(_duration);
        bool pausedBeforeDurationStarts = pausedAt != 0 && pausedAt < originalDurationStartDate;
        return pausedBeforeDurationStarts ? originalDurationStartDate.add(vote_.pauseDuration) : originalDurationStartDate;
    }
}
