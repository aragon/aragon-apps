/*
 * SPDX-License-Identifier:    GPL-3.0-or-later
 */

pragma solidity 0.4.24;

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

    // bytes32 public constant MODIFY_QUIET_ENDING_ROLE = keccak256("MODIFY_QUIET_ENDING_ROLE");
    bytes32 public constant MODIFY_QUIET_ENDING_ROLE = 0xd1e2974c80e3190749a0c11e5887a3d42877cf632fe25477926c2407f04a1b80;

    uint256 public constant PCT_BASE = 10 ** 18; // 0% = 0; 1% = 10^16; 100% = 10^18
    uint256 public constant MAX_VOTES_DELEGATION_SET_LENGTH = 70;

    // Validation errors
    string private constant ERROR_NO_VOTE = "VOTING_NO_VOTE";
    string private constant ERROR_VOTE_TIME_ZERO = "VOTING_VOTE_TIME_ZERO";
    string private constant ERROR_TOKEN_NOT_CONTRACT = "VOTING_TOKEN_NOT_CONTRACT";
    string private constant ERROR_SETTING_DOES_NOT_EXIST = "VOTING_SETTING_DOES_NOT_EXIST";
    string private constant ERROR_CHANGE_QUORUM_TOO_BIG = "VOTING_CHANGE_QUORUM_TOO_BIG";
    string private constant ERROR_CHANGE_SUPPORT_TOO_SMALL = "VOTING_CHANGE_SUPPORT_TOO_SMALL";
    string private constant ERROR_CHANGE_SUPPORT_TOO_BIG = "VOTING_CHANGE_SUPPORT_TOO_BIG";
    string private constant ERROR_INVALID_OVERRULE_WINDOW = "VOTING_INVALID_OVERRULE_WINDOW";
    string private constant ERROR_INVALID_QUIET_ENDING_PERIOD = "VOTING_INVALID_QUIET_END_PERIOD";

    // Workflow errors
    string private constant ERROR_CANNOT_FORWARD = "VOTING_CANNOT_FORWARD";
    string private constant ERROR_NO_VOTING_POWER = "VOTING_NO_VOTING_POWER";
    string private constant ERROR_CANNOT_VOTE = "VOTING_CANNOT_VOTE";
    string private constant ERROR_NOT_REPRESENTATIVE = "VOTING_NOT_REPRESENTATIVE";
    string private constant ERROR_PAST_REPRESENTATIVE_VOTING_WINDOW = "VOTING_PAST_REP_VOTING_WINDOW";
    string private constant ERROR_DELEGATES_EXCEEDS_MAX_LEN = "VOTING_DELEGATES_EXCEEDS_MAX_LEN";
    string private constant ERROR_CANNOT_PAUSE_VOTE = "VOTING_CANNOT_PAUSE_VOTE";
    string private constant ERROR_VOTE_NOT_PAUSED = "VOTING_VOTE_NOT_PAUSED";
    string private constant ERROR_CANNOT_EXECUTE = "VOTING_CANNOT_EXECUTE";

    enum VoterState { Absent, Yea, Nay }

    enum VoteStatus {
        Active,                         // An ongoing vote
        Paused,                         // A vote that is paused due to it having an open challenge or dispute
        Cancelled,                      // A vote that has been explicitly cancelled due to a challenge or dispute
        Executed                        // A vote that has been executed
    }

    struct Setting {
        // Required voter support % (yes power / voted power) for a vote to pass
        // Expressed as a percentage of 10^18; eg. 10^16 = 1%, 10^18 = 100%
        uint64 supportRequiredPct;

        // Required voter quorum % (yes power / total power) for a vote to pass
        // Expressed as a percentage of 10^18; eg. 10^16 = 1%, 10^18 = 100%
        // Must be <= supportRequiredPct to avoid votes being impossible to pass
        uint64 minAcceptQuorumPct;

        // Duration before the end of a vote to stop allowing representatives to vote and for principals to override their representative's vote
        // Must be <= voteTime
        uint64 overruleWindow;

        // Duration before the end of a vote to detect non-quiet endings
        // Must be <= voteTime
        uint64 quietEndingPeriod;

        // Duration to extend a vote in case of non-quiet ending
        uint64 quietEndingExtension;

        // Duration to wait before a passed vote can be executed
        uint64 executionDelay;
    }

    struct VoteCast {
        VoterState state;
        address caster;                                     // Caster of the vote (only stored if caster was not the representative)
    }

    struct Vote {
        uint256 yea;                                        // Voting power for
        uint256 nay;                                        // Voting power against
        uint256 votingPower;                                // Total voting power (based on the snapshot block)
        uint256 settingId;                                  // Identification number of the setting applicable to the vote
        uint256 actionId;                                   // Identification number of the associated disputable action on the attached Agreement
        VoteStatus status;                                  // Status of the vote
        uint64 startDate;                                   // Datetime when the vote was created
        uint64 snapshotBlock;                               // Block number used to check voting power on attached token
        uint64 pausedAt;                                    // Datetime when the vote was paused
        uint64 pauseDuration;                               // Duration of the pause (only updated once resumed)
        uint64 quietEndingExtendedSeconds;                  // Total number of seconds a vote was extended due to quiet ending
        VoterState quietEndingSnapshotSupport;              // Snapshot of the vote's support at the beginning of the first quiet ending period
        bytes executionScript;                              // EVM script attached to the vote
        mapping (address => VoteCast) castVotes;            // Mapping of voter address => more information about their cast vote
    }

    uint64 public voteTime;                                 // "Base" duration of each vote -- vote lifespans may be adjusted by pause and extension durations
    MiniMeToken public token;                               // Token for determining voting power; we assume it's not malicious

    uint256 internal settingsLength;                        // Number of settings created
    mapping (uint256 => Setting) internal settings;         // List of settings indexed by ID (starting at 0)

    uint256 public votesLength;                             // Number of votes created
    mapping (uint256 => Vote) internal votes;               // List of votes indexed by ID (starting at 0)
    mapping (address => address) internal representatives;  // Mapping of voter => allowed representative

    event NewSetting(uint256 settingId);
    event ChangeSupportRequired(uint64 supportRequiredPct);
    event ChangeMinQuorum(uint64 minAcceptQuorumPct);
    event ChangeExecutionDelay(uint64 executionDelay);
    event ChangeOverruleWindow(uint64 overruleWindow);
    event ChangeQuietEndingPeriod(uint64 quietEndingPeriod, uint64 quietEndingExtension);

    event StartVote(uint256 indexed voteId, address indexed creator, bytes context);
    event PauseVote(uint256 indexed voteId, uint256 indexed challengeId);
    event ResumeVote(uint256 indexed voteId);
    event CancelVote(uint256 indexed voteId);
    event ExecuteVote(uint256 indexed voteId);
    event VoteQuietEndingExtension(uint256 indexed voteId, bool passing);

    event CastVote(uint256 indexed voteId, address indexed voter, bool supports, uint256 stake);
    event ChangeRepresentative(address indexed voter, address indexed newRepresentative);
    event ProxyVoteFailure(uint256 indexed voteId, address indexed voter, address indexed representative);
    event ProxyVoteSuccess(uint256 indexed voteId, address indexed voter, address indexed representative, bool supports);

    /**
    * @notice Initialize Disputable Voting with `_token.symbol(): string` for governance, minimum support of `@formatPct(_supportRequiredPct)`%, minimum acceptance quorum of `@formatPct(_minAcceptQuorumPct)`%, a voting duration of `@transformTime(_voteTime)`, an overrule window of `@transformTime(_overruleWindow), and a execution delay of `@transformTime(_executionDelay)`
    * @param _token MiniMeToken Address that will be used as governance token
    * @param _supportRequiredPct Required support % (yes power / voted power) for a vote to pass; expressed as a percentage of 10^18
    * @param _minAcceptQuorumPct Required quorum % (yes power / total power) for a vote to pass; expressed as a percentage of 10^18
    * @param _voteTime Base duration a vote will be open for voting
    * @param _overruleWindow Duration of overrule window
    * @param _quietEndingPeriod Duration to detect non-quiet endings
    * @param _quietEndingExtension Duration to extend a vote in case of non-quiet ending
    * @param _executionDelay Duration to wait before a passed vote can be executed
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
        _changeQuietEndingPeriod(setting, _quietEndingPeriod, _quietEndingExtension);
        _changeExecutionDelay(setting, _executionDelay);
    }

    /**
    * @notice Change required support to `@formatPct(_supportRequiredPct)`%
    * @param _supportRequiredPct New required support; expressed as a percentage of 10^18
    */
    function changeSupportRequiredPct(uint64 _supportRequiredPct) external authP(MODIFY_SUPPORT_ROLE, arr(uint256(_supportRequiredPct))) {
        Setting storage setting = _newCopiedSettings();
        _changeSupportRequiredPct(setting, _supportRequiredPct);
    }

    /**
    * @notice Change minimum acceptance quorum to `@formatPct(_minAcceptQuorumPct)`%
    * @param _minAcceptQuorumPct New minimum acceptance quorum; expressed as a percentage of 10^18
    */
    function changeMinAcceptQuorumPct(uint64 _minAcceptQuorumPct) external authP(MODIFY_QUORUM_ROLE, arr(uint256(_minAcceptQuorumPct))) {
        Setting storage setting = _newCopiedSettings();
        _changeMinAcceptQuorumPct(setting, _minAcceptQuorumPct);
    }

    /**
    * @notice Change overrule window to `@transformTime(_overruleWindow)`
    * @param _overruleWindow New overrule window
    */
    function changeOverruleWindow(uint64 _overruleWindow) external authP(MODIFY_OVERRULE_WINDOW_ROLE, arr(uint256(_overruleWindow))) {
        Setting storage setting = _newCopiedSettings();
        _changeOverruleWindow(setting, _overruleWindow);
    }

    /**
    * @notice Change quiet ending period to `@transformTime(_quietEndingPeriod)` with extensions of `@transformTime(_quietEndingExtension)`
    * @param _quietEndingPeriod New quiet ending period
    * @param _quietEndingExtension New quiet ending extension
    */
    function changeQuietEndingPeriod(uint64 _quietEndingPeriod, uint64 _quietEndingExtension)
        external
        authP(MODIFY_QUIET_ENDING_ROLE, arr(uint256(_quietEndingPeriod), uint256(_quietEndingExtension)))
    {
        Setting storage setting = _newCopiedSettings();
        _changeQuietEndingPeriod(setting, _quietEndingPeriod, _quietEndingExtension);
    }

    /**
    * @notice Change execution delay to `@transformTime(_executionDelay)`
    * @param _executionDelay New execution delay
    */
    function changeExecutionDelay(uint64 _executionDelay) external authP(MODIFY_EXECUTION_DELAY_ROLE, arr(uint256(_executionDelay))) {
        Setting storage setting = _newCopiedSettings();
        _changeExecutionDelay(setting, _executionDelay);
    }

    /**
    * @notice Create a new vote about "`_context`"
    * @param _executionScript Action (encoded as an EVM script) that will be allowed to execute if the vote passes
    * @param _context Additional context for the vote, also used as the disputable action's context on the attached Agreement
    * @return Identification number of the newly created vote
    */
    function newVote(bytes _executionScript, bytes _context) external auth(CREATE_VOTES_ROLE) returns (uint256) {
        return _newVote(_executionScript, _context);
    }

    /**
    * @notice Vote `_supports ? 'yes' : 'no'` in vote #`_voteId`
    * @dev Initialization check is implicitly provided by `_getVote()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Identification number of the vote
    * @param _supports Whether voter supports the vote
    */
    function vote(uint256 _voteId, bool _supports) external {
        Vote storage vote_ = _getVote(_voteId);
        require(_canVote(vote_, msg.sender), ERROR_CANNOT_VOTE);

        _castVote(vote_, _voteId, _supports, msg.sender, address(0));
    }

    /**
    * @notice Vote `_supports ? 'yes' : 'no'` in vote #`_voteId` on behalf of delegated voters
    * @dev Initialization check is implicitly provided by `_getVote()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Identification number of the vote
    * @param _supports Whether the representative supports the vote
    * @param _voters Addresses of the delegated voters to vote on behalf of
    */
    function voteOnBehalfOf(uint256 _voteId, bool _supports, address[] _voters) external {
        require(_voters.length <= MAX_VOTES_DELEGATION_SET_LENGTH, ERROR_DELEGATES_EXCEEDS_MAX_LEN);
        _voteOnBehalfOf(_voteId, _supports, _voters);
    }

    /**
    * @notice Execute vote #`_voteId`
    * @dev Initialization check is implicitly provided by `_getVote()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Identification number of the vote
    */
    function executeVote(uint256 _voteId) external {
        Vote storage vote_ = _getVote(_voteId);
        require(_canExecute(vote_), ERROR_CANNOT_EXECUTE);

        vote_.status = VoteStatus.Executed;
        _closeDisputableAction(vote_.actionId);

        // Add attached Agreement to blacklist to disallow the stored EVMScript from directly calling
        // the Agreement from this app's context (e.g. maliciously closing a different action)
        address[] memory blacklist = new address[](1);
        blacklist[0] = address(_getAgreement());
        runScript(vote_.executionScript, new bytes(0), blacklist);
        emit ExecuteVote(_voteId);
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
    * @notice Create a vote to execute the desired action
    * @dev IForwarderWithContext interface conformance.
    *      This app (as a DisputableAragonApp) is required to be the initial step in the forwarding chain.
    * @param _evmScript Action (encoded as an EVM script) that will be allowed to execute if the vote passes
    * @param _context Additional context for the vote, also used as the disputable action's context on the attached Agreement
    */
    function forward(bytes _evmScript, bytes _context) external {
        require(_canForward(msg.sender, _evmScript), ERROR_CANNOT_FORWARD);
        _newVote(_evmScript, _context);
    }

    // Forwarding getter fns

    /**
    * @dev Tell if an address can forward actions (by creating a vote)
    *      IForwarderWithContext interface conformance
    * @param _sender Address intending to forward an action
    * @param _evmScript EVM script being forwarded
    * @return True if the address is allowed create a vote containing the action
    */
    function canForward(address _sender, bytes _evmScript) external view returns (bool) {
        return _canForward(_sender, _evmScript);
    }

    // Disputable getter fns

    /**
    * @dev Tell if a vote can be challenged
    *      Called by the attached Agreement when a challenge is requested for the associated vote
    * @param _voteId Identification number of the vote being queried
    * @return True if the vote can be challenged
    */
    function canChallenge(uint256 _voteId) external view returns (bool) {
        Vote storage vote_ = _getVote(_voteId);
        // Votes can only be challenged once
        return _isVoteOpenForVoting(vote_) && vote_.pausedAt == 0;
    }

    /**
    * @dev Tell if a vote can be closed
    *      Called by the attached Agreement when the action associated with the vote is requested to be manually closed
    * @param _voteId Identification number of the vote being queried
    * @return True if the vote can be closed
    */
    function canClose(uint256 _voteId) external view returns (bool) {
        Vote storage vote_ = _getVote(_voteId);
        return (_isActive(vote_) || _isExecuted(vote_)) && _hasEnded(vote_);
    }

    // Getter fns

    /**
    * @dev Tell the information for a setting
    *      Initialization check is implicitly provided by `_getSetting()` as new settings can only be
    *      created via `change*()` functions which require initialization
    * @param _settingId Identification number of the setting
    * @return supportRequiredPct Required support % (yes power / voted power) for a vote to pass; expressed as a percentage of 10^18
    * @return minAcceptQuorumPct Required quorum % (yes power / total power) for a vote to pass; expressed as a percentage of 10^18
    * @return executionDelay Duration to wait before a passed vote can be executed
    * @return overruleWindow Duration of overrule window
    * @return quietEndingPeriod Duration to detect non-quiet endings
    * @return quietEndingExtension Duration to extend a vote in case of non-quiet ending
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
    * @dev Tell the identification number of the current setting
    * @return Identification number of the current setting
    */
    function getCurrentSettingId() external view isInitialized returns (uint256) {
        return _getCurrentSettingId();
    }

    /**
    * @dev Tell the information for a vote
    *      Initialization check is implicitly provided by `_getVote()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Identification number of the vote
    * @return yea Voting power for
    * @return nay Voting power against
    * @return votingPower Total voting power available (based on the snapshot block)
    * @return settingId Identification number of the setting applicable to the vote
    * @return actionId Identification number of the associated disputable action on the attached Agreement
    * @return status Status of the vote
    * @return startDate Datetime when the vote was created
    * @return snapshotBlock Block number used to check voting power on attached token
    * @return pausedAt Datetime when the vote was paused
    * @return pauseDuration Duration of the pause (only updated once resumed)
    * @return quietEndingExtendedSeconds Total number of seconds a vote was extended due to quiet ending
    * @return quietEndingSnapshotSupport Snapshot of the vote's support at the beginning of the first quiet ending period
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
            VoterState quietEndingSnapshotSupport,
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
        quietEndingSnapshotSupport = vote_.quietEndingSnapshotSupport;
        executionScript = vote_.executionScript;
    }

    /**
    * @dev Tell the state of a voter for a vote
    *      Initialization check is implicitly provided by `_getVote()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Identification number of the vote
    * @param _voter Address of the voter being queried
    * @return state Voter's cast state being queried
    * @return caster Address of the vote's caster
    */
    function getCastVote(uint256 _voteId, address _voter) external view returns (VoterState state, address caster) {
        Vote storage vote_ = _getVote(_voteId);
        state = _voterState(vote_, _voter);
        caster = _voteCaster(vote_, _voter);
    }

    /**
    * @dev Tell if a voter can participate in a vote
    *      Initialization check is implicitly provided by `_getVote()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Identification number of the vote being queried
    * @param _voter Address of the voter being queried
    * @return True if the voter can participate in the vote
    */
    function canVote(uint256 _voteId, address _voter) external view returns (bool) {
        return _canVote(_getVote(_voteId), _voter);
    }

    /**
    * @dev Tell if a representative can vote on behalf of delegated voters in a vote
    *      Initialization check is implicitly provided by `_getVote()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Identification number of the vote being queried
    * @param _voters Addresses of the delegated voters being queried
    * @param _representative Address of the representative being queried
    * @return True if the representative can vote on behalf of the delegated voters in the vote
    */
    function canVoteOnBehalfOf(uint256 _voteId, address[] _voters, address _representative) external view returns (bool) {
        Vote storage vote_ = _getVote(_voteId);

        if (!_canRepresentativesVote(vote_)) {
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
    * @dev Tell if a vote can be executed
    *      Initialization check is implicitly provided by `_getVote()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Identification number of the vote being queried
    * @return True if the vote can be executed
    */
    function canExecute(uint256 _voteId) external view returns (bool) {
        return _canExecute(_getVote(_voteId));
    }

    /**
    * @dev Tell if a vote is open for voting
    *      Initialization check is implicitly provided by `_getVote()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Identification number of the vote being queried
    * @return True if the vote is open for voting
    */
    function isVoteOpen(uint256 _voteId) external view returns (bool) {
        return _isVoteOpenForVoting(_getVote(_voteId));
    }

    /**
    * @dev Tell if a vote is within its overrule window
    *      Initialization check is implicitly provided by `_getVote()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Vote identifier
    * @return True if the vote is within its overrule window
    */
    function withinOverruleWindow(uint256 _voteId) external view returns (bool) {
        Vote storage vote_ = _getVote(_voteId);
        return _isVoteOpenForVoting(vote_) && _withinOverruleWindow(vote_);
    }

    /**
    * @dev Tell if a representative currently represents another voter
    * @param _voter Address of the delegated voter being queried
    * @param _representative Address of the representative being queried
    * @return True if the representative currently represents the voter
    */
    function isRepresentativeOf(address _voter, address _representative) external view isInitialized returns (bool) {
        return _isRepresentativeOf(_voter, _representative);
    }

    // DisputableAragonApp callback implementations

    /**
    * @dev Received when a vote is challenged
    * @param _voteId Identification number of the vote
    * @param _challengeId Identification number of the challenge associated to the vote on the attached Agreement
    */
    function _onDisputableActionChallenged(uint256 _voteId, uint256 _challengeId, address /* _challenger */) internal {
        Vote storage vote_ = _getVote(_voteId);
        require(_isActive(vote_), ERROR_CANNOT_PAUSE_VOTE);

        vote_.status = VoteStatus.Paused;
        vote_.pausedAt = getTimestamp64();
        emit PauseVote(_voteId, _challengeId);
    }

    /**
    * @dev Received when a vote was ruled in favour of the submitter
    * @param _voteId Identification number of the vote
    */
    function _onDisputableActionAllowed(uint256 _voteId) internal {
        Vote storage vote_ = _getVote(_voteId);
        require(_isPaused(vote_), ERROR_VOTE_NOT_PAUSED);

        vote_.status = VoteStatus.Active;
        vote_.pauseDuration = getTimestamp64().sub(vote_.pausedAt);
        emit ResumeVote(_voteId);
    }

    /**
    * @dev Received when a vote was ruled in favour of the challenger
    * @param _voteId Identification number of the vote
    */
    function _onDisputableActionRejected(uint256 _voteId) internal {
        Vote storage vote_ = _getVote(_voteId);
        require(_isPaused(vote_), ERROR_VOTE_NOT_PAUSED);

        vote_.status = VoteStatus.Cancelled;
        vote_.pauseDuration = getTimestamp64().sub(vote_.pausedAt);
        emit CancelVote(_voteId);
    }

    /**
    * @dev Received when a vote was ruled as void
    * @param _voteId Identification number of the vote
    */
    function _onDisputableActionVoided(uint256 _voteId) internal {
        // When a challenged vote is ruled as voided, it is considered as being allowed.
        // This could be the case for challenges where the attached Agreement's arbitrator refuses to rule the case.
        _onDisputableActionAllowed(_voteId);
    }

    // Internal fns

    /**
    * @dev Create a new empty setting instance
    * @return New setting's instance
    * @return New setting's identification number
    */
    function _newSetting() internal returns (Setting storage setting, uint256 settingId) {
        settingId = settingsLength++;
        setting = settings[settingId];
        emit NewSetting(settingId);
    }

    /**
    * @dev Change the required support
    * @param _setting Setting instance to update
    * @param _supportRequiredPct New required support; expressed as a percentage of 10^18
    */
    function _changeSupportRequiredPct(Setting storage _setting, uint64 _supportRequiredPct) internal {
        require(_setting.minAcceptQuorumPct <= _supportRequiredPct, ERROR_CHANGE_SUPPORT_TOO_SMALL);
        require(_supportRequiredPct < PCT_BASE, ERROR_CHANGE_SUPPORT_TOO_BIG);

        _setting.supportRequiredPct = _supportRequiredPct;
        emit ChangeSupportRequired(_supportRequiredPct);
    }

    /**
    * @dev Change the minimum acceptance quorum
    * @param _setting Setting instance to update
    * @param _minAcceptQuorumPct New acceptance quorum; expressed as a percentage of 10^18
    */
    function _changeMinAcceptQuorumPct(Setting storage _setting, uint64 _minAcceptQuorumPct) internal {
        require(_minAcceptQuorumPct <= _setting.supportRequiredPct, ERROR_CHANGE_QUORUM_TOO_BIG);

        _setting.minAcceptQuorumPct = _minAcceptQuorumPct;
        emit ChangeMinQuorum(_minAcceptQuorumPct);
    }

    /**
    * @dev Change the overrule window
    * @param _setting Setting instance to update
    * @param _overruleWindow New overrule window
    */
    function _changeOverruleWindow(Setting storage _setting, uint64 _overruleWindow) internal {
        require(_overruleWindow <= voteTime, ERROR_INVALID_OVERRULE_WINDOW);

        _setting.overruleWindow = _overruleWindow;
        emit ChangeOverruleWindow(_overruleWindow);
    }

    /**
    * @dev Change the quiet ending configuration
    * @param _setting Setting instance to update
    * @param _quietEndingPeriod New quiet ending period
    * @param _quietEndingExtension New quiet ending extension
    */
    function _changeQuietEndingPeriod(Setting storage _setting, uint64 _quietEndingPeriod, uint64 _quietEndingExtension) internal {
        require(_quietEndingPeriod <= voteTime, ERROR_INVALID_QUIET_ENDING_PERIOD);

        _setting.quietEndingPeriod = _quietEndingPeriod;
        _setting.quietEndingExtension = _quietEndingExtension;
        emit ChangeQuietEndingPeriod(_quietEndingPeriod, _quietEndingExtension);
    }

    /**
    * @dev Change the execution delay
    * @param _setting Setting instance to update
    * @param _executionDelay New execution delay
    */
    function _changeExecutionDelay(Setting storage _setting, uint64 _executionDelay) internal {
        _setting.executionDelay = _executionDelay;
        emit ChangeExecutionDelay(_executionDelay);
    }

    /**
    * @dev Create a new vote
    * @param _executionScript Action (encoded as an EVM script) that will be allowed to execute if the vote passes
    * @param _context Additional context for the vote, also used as the disputable action's context on the attached Agreement
    * @return voteId Identification number for the newly created vote
    */
    function _newVote(bytes _executionScript, bytes _context) internal returns (uint256 voteId) {
        uint64 snapshotBlock = getBlockNumber64() - 1; // avoid double voting in this very block
        uint256 votingPower = token.totalSupplyAt(snapshotBlock);
        require(votingPower > 0, ERROR_NO_VOTING_POWER);

        voteId = votesLength++;

        Vote storage vote_ = votes[voteId];
        vote_.status = VoteStatus.Active;
        vote_.startDate = getTimestamp64();
        vote_.snapshotBlock = snapshotBlock;
        vote_.votingPower = votingPower;
        vote_.settingId = _getCurrentSettingId();
        vote_.executionScript = _executionScript;

        // Notify the attached Agreement about the new vote; this is mandatory in making the vote disputable
        // Note that we send `msg.sender` as the action's submitter--the attached Agreement may expect to be able to pull funds from this account
        vote_.actionId = _registerDisputableAction(voteId, _context, msg.sender);

        emit StartVote(voteId, msg.sender, _context);
    }

    /**
    * @dev Cast votes on behalf of delegated voters as a representative.
    */
    function _voteOnBehalfOf(uint256 _voteId, bool _supports, address[] _voters) internal {
        Vote storage vote_ = _getVote(_voteId);
        // Note that the period for representatives to vote can never go into a quiet ending
        // extension, and so we don't need to check other timing-based pre-conditions
        require(_canRepresentativesVote(vote_), ERROR_PAST_REPRESENTATIVE_VOTING_WINDOW);

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
    * @dev Fetch a setting's instance by identification number
    * @return Identification number of the current setting
    */
    function _getSetting(uint256 _settingId) internal view returns (Setting storage) {
        require(_settingId < settingsLength, ERROR_SETTING_DOES_NOT_EXIST);
        return settings[_settingId];
    }

    /**
    * @dev Tell the identification number of the current setting
    * @return Identification number of the current setting
    */
    function _getCurrentSettingId() internal view returns (uint256) {
        // No need for SafeMath, note that a new setting is created during initialization
        return settingsLength - 1;
    }

    /**
    * @dev Fetch a vote instance by identification number
    * @param _voteId Identification number of the vote
    * @return Vote instance
    */
    function _getVote(uint256 _voteId) internal view returns (Vote storage) {
        require(_voteId < votesLength, ERROR_NO_VOTE);
        return votes[_voteId];
    }

    /**
    * @dev Tell if a voter can participate in a vote.
    *      Note that a voter cannot change their vote once cast, except for the principal voter
    *      overruling their representative's vote during the overrule window.
    * @param _vote Vote instance being queried
    * @param _voter Address of the voter being queried
    * @return True if the voter can participate a certain vote
    */
    function _canVote(Vote storage _vote, address _voter) internal view returns (bool) {
        return _isVoteOpenForVoting(_vote) && _hasVotingPower(_vote, _voter) && _voteCaster(_vote, _voter) != _voter;
    }

    /**
    * @dev Tell if a vote currently allows representatives to vote for delegated voters
    * @param _vote Vote instance being queried
    * @return True if the vote currently allows representatives to vote
    */
    function _canRepresentativesVote(Vote storage _vote) internal view returns (bool) {
        return _isActive(_vote) && !_withinOverruleWindow(_vote);
    }

    /**
    * @dev Tell if a vote can be executed
    * @param _vote Vote instance being queried
    * @return True if the vote can be executed
    */
    function _canExecute(Vote storage _vote) internal view returns (bool) {
        // If the vote is executed, paused, or cancelled, it cannot be executed
        if (!_isActive(_vote)) {
            return false;
        }

        // If the vote is still open, it cannot be executed
        if (!_hasEnded(_vote)) {
            return false;
        }

        // If the vote is within its execution delay window, it cannot be executed
        Setting storage setting = settings[_vote.settingId];
        if (_withinExecutionDelayWindow(_vote, setting)) {
            return false;
        }

        // Check the vote has enough support and has reached the min quorum
        return _isAccepted(_vote, setting);
    }

    /**
    * @dev Tell if a vote is active
    * @param _vote Vote instance being queried
    * @return True if the vote is active
    */
    function _isActive(Vote storage _vote) internal view returns (bool) {
        return _vote.status == VoteStatus.Active;
    }

    /**
    * @dev Tell if a vote is paused
    * @param _vote Vote instance being queried
    * @return True if the vote is paused
    */
    function _isPaused(Vote storage _vote) internal view returns (bool) {
        return _vote.status == VoteStatus.Paused;
    }

    /**
    * @dev Tell if a vote was executed
    * @param _vote Vote instance being queried
    * @return True if the vote was executed
    */
    function _isExecuted(Vote storage _vote) internal view returns (bool) {
        return _vote.status == VoteStatus.Executed;
    }

    /**
    * @dev Tell if a vote is currently accepted
    * @param _vote Vote instance being queried
    * @param _setting Setting instance applicable to the vote
    * @return True if the vote is accepted
    */
    function _isAccepted(Vote storage _vote, Setting storage _setting) internal view returns (bool) {
        uint256 yeas = _vote.yea;
        uint256 nays = _vote.nay;
        return _isValuePct(yeas, yeas.add(nays), _setting.supportRequiredPct) &&
               _isValuePct(yeas, _vote.votingPower, _setting.minAcceptQuorumPct);
    }

    /**
    * @dev Tell if a vote is open for voting
    * @param _vote Vote instance being queried
    * @return True if the vote is open for voting
    */
    function _isVoteOpenForVoting(Vote storage _vote) internal view returns (bool) {
        return _isActive(_vote) && !_hasEnded(_vote);
    }

    /**
    * @dev Tell if a vote has ended
    * @param _vote Vote instance being queried
    * @return True if the vote has ended
    */
    function _hasEnded(Vote storage _vote) internal view returns (bool) {
        return getTimestamp64() >= _finalVoteEndDate(_vote) && !_wasFlipped(_vote);
    }

    /**
    * @dev Tell if a vote was flipped in its most recent quiet ending period
    *      This function assumes that it will only be called after the most recent quiet ending period has already ended
    * @param _vote Vote instance being queried
    * @return True if the vote was flipped
    */
    function _wasFlipped(Vote storage _vote) internal view returns (bool) {
        // If there was no snapshot taken, it means no one voted during the quiet ending period. Thus, it cannot have been flipped.
        VoterState snapshotSupport = _vote.quietEndingSnapshotSupport;
        if (snapshotSupport == VoterState.Absent) {
            return false;
        }

        // Otherwise, we calculate if the vote was flipped by comparing its current acceptance state to its last state at the start of the extension period
        bool wasInitiallyAccepted = snapshotSupport == VoterState.Yea;
        Setting storage setting = settings[_vote.settingId];
        uint256 currentExtensions = _vote.quietEndingExtendedSeconds / setting.quietEndingExtension;
        bool wasAcceptedBeforeLastFlip = wasInitiallyAccepted != (currentExtensions % 2 != 0);
        return wasAcceptedBeforeLastFlip != _isAccepted(_vote, setting);
    }

    /**
    * @dev Tell if a vote is within its overrule window
    *      This function doesn't ensure whether the vote is open or not
    * @param _vote Vote instance being queried
    * @return True if the vote is within its overrule window
    */
    function _withinOverruleWindow(Vote storage _vote) internal view returns (bool) {
        Setting storage setting = settings[_vote.settingId];
        return getTimestamp64() >= _durationStartDate(_vote, setting.overruleWindow);
    }

    /**
    * @dev Tell if a vote is within its quiet ending period
    *      This function doesn't ensure whether the vote is open or not
    * @param _vote Vote instance being queried
    * @param _setting Setting instance applicable to the vote
    * @return True if the vote is within its quiet ending period
    */
    function _withinQuietEndingPeriod(Vote storage _vote, Setting storage _setting) internal view returns (bool) {
        return getTimestamp64() >= _durationStartDate(_vote, _setting.quietEndingPeriod);
    }

    /**
    * @dev Tell if a vote is within its execution delay window
    * @param _vote Vote instance being queried
    * @param _setting Setting instance applicable to the vote
    * @return True if the vote is within its execution delay window
    */
    function _withinExecutionDelayWindow(Vote storage _vote, Setting storage _setting) internal view returns (bool) {
        return getTimestamp64() < _finalVoteEndDate(_vote).add(_setting.executionDelay);
    }

    /**
    * @dev Calculate the original end date of a vote
    *      It does not consider extensions from pauses or the quiet ending mechanism
    * @param _vote Vote instance being queried
    * @return Datetime of the vote's original end date
    */
    function _originalVoteEndDate(Vote storage _vote) internal view returns (uint64) {
        return _vote.startDate.add(voteTime);
    }

    /**
    * @dev Calculate the end date of a vote.
    *      It considers extensions from pauses and the quiet ending mechanism.
    *      The pause duration will only be included after the vote has "resumed" from its pause, as we do not know how long the pause will be in advance.
    * @param _vote Vote instance being queried
    * @return Datetime of the vote's end date
    */
    function _finalVoteEndDate(Vote storage _vote) internal view returns (uint64) {
        uint64 endDateAfterPause = _originalVoteEndDate(_vote).add(_vote.pauseDuration);
        return endDateAfterPause.add(_vote.quietEndingExtendedSeconds);
    }

    /**
    * @dev Tell if a voter has voting power for a vote
    * @param _vote Vote instance being queried
    * @param _voter Address of the voter being queried
    * @return True if the voter has voting power for a certain vote
    */
    function _hasVotingPower(Vote storage _vote, address _voter) internal view returns (bool) {
        return token.balanceOfAt(_voter, _vote.snapshotBlock) > 0;
    }

    /**
    * @dev Tell if a voter has cast their choice in a vote (by themselves or via a representative)
    * @param _vote Vote instance being queried
    * @param _voter Address of the voter being queried
    * @return True if the voter has cast their choice in the vote
    */
    function _hasCastVote(Vote storage _vote, address _voter) internal view returns (bool) {
        return _voterState(_vote, _voter) != VoterState.Absent;
    }

    /**
    * @dev Tell the state of a voter for a vote
    * @param _vote Vote instance being queried
    * @param _voter Address of the voter being queried
    * @return Voting state of the voter
    */
    function _voterState(Vote storage _vote, address _voter) internal view returns (VoterState) {
        return _vote.castVotes[_voter].state;
    }

    /**
    * @dev Tell the caster of a voter on a vote
    * @param _vote Vote instance being queried
    * @param _voter Address of the voter being queried
    * @return Address of the vote's caster
    */
    function _voteCaster(Vote storage _vote, address _voter) internal view returns (address) {
        if (!_hasCastVote(_vote, _voter)) {
            return address(0);
        }

        address _caster = _vote.castVotes[_voter].caster;
        return _caster == address(0) ? _voter : _caster;
    }

    /**
    * @dev Tell if a representative currently represents another voter
    * @param _voter Address of the delegated voter being queried
    * @param _representative Address of the representative being queried
    * @return True if the representative currently represents the voter
    */
    function _isRepresentativeOf(address _voter, address _representative) internal view returns (bool) {
        return representatives[_voter] == _representative;
    }

    /**
    * @dev Tell if an address can forward actions
    * @param _sender Address intending to forward an action
    * @return True if the address can create votes
    */
    function _canForward(address _sender, bytes) internal view returns (bool) {
        IAgreement agreement = _getAgreement();
        // To make sure the sender address is reachable by ACL oracles, we need to pass it as the first argument.
        // Permissions set with ANY_ENTITY do not provide the original sender's address into the ACL Oracle's `grantee` argument.
        return agreement != IAgreement(0) && canPerform(_sender, CREATE_VOTES_ROLE, arr(_sender));
    }

    /**
    * @dev Calculates whether a given value is greater than a percentage of its total
    * @param _value Numerator
    * @param _total Divisor
    * @param _pct Required percentage necessary, expressed as a percentage of 10^18
    * @return True if the value is above the required percentage
    */
    function _isValuePct(uint256 _value, uint256 _total, uint256 _pct) internal pure returns (bool) {
        if (_total == 0) {
            return false;
        }

        uint256 computedPct = _value.mul(PCT_BASE) / _total;
        return computedPct > _pct;
    }

    /**
    * @dev Cast a vote
    *      Assumes all eligibility checks have passed for the given vote and voter
    * @param _vote Vote instance
    * @param _voteId Identification number of vote
    * @param _supports Whether principal voter supports the vote
    * @param _voter Address of principal voter
    * @param _caster Address of vote caster, if voting via representative
    */
    function _castVote(Vote storage _vote, uint256 _voteId, bool _supports, address _voter, address _caster) private {
        Setting storage setting = settings[_vote.settingId];
        bool wasAccepted = _isAccepted(_vote, setting);

        uint256 yeas = _vote.yea;
        uint256 nays = _vote.nay;
        uint256 voterStake = token.balanceOfAt(_voter, _vote.snapshotBlock);

        VoteCast storage castVote = _vote.castVotes[_voter];
        VoterState previousVoterState = castVote.state;

        // If voter had previously voted, reset their vote
        // Note that votes can only be changed once by the principal voter overruling their representative's
        // vote during the overrule window
        if (previousVoterState == VoterState.Yea) {
            yeas = yeas.sub(voterStake);
        } else if (previousVoterState == VoterState.Nay) {
            nays = nays.sub(voterStake);
        }

        if (_supports) {
            yeas = yeas.add(voterStake);
        } else {
            nays = nays.add(voterStake);
        }

        _vote.yea = yeas;
        _vote.nay = nays;
        castVote.state = _voterStateFor(_supports);
        castVote.caster = _caster;
        emit CastVote(_voteId, _voter, _supports, voterStake);

        if (_withinQuietEndingPeriod(_vote, setting)) {
            _ensureQuietEnding(_vote, setting, _voteId, wasAccepted);
        }
    }

    /**
    * @dev Ensure we keep track of the information related for detecting a quiet ending
    * @param _vote Vote instance
    * @param _setting Setting instance applicable to the vote
    * @param _voteId Identification number of the vote
    * @param _wasAccepted Whether the vote is currently accepted
    */
    function _ensureQuietEnding(Vote storage _vote, Setting storage _setting, uint256 _voteId, bool _wasAccepted) private {
        if (_vote.quietEndingSnapshotSupport == VoterState.Absent) {
            // If we do not have a snapshot of the support yet, simply store the given value.
            // Note that if there are no votes during the quiet ending period, it is obviously impossible for the vote to be flipped and
            // this snapshot is never stored.
            _vote.quietEndingSnapshotSupport = _voterStateFor(_wasAccepted);
        } else {
            // First, we make sure the extension is persisted, if are voting within the extension and it was not considered yet, we store it.
            // Note that we are trusting `_canVote()`, if we reached this point, it means the vote's flip was already confirmed.
            if (getTimestamp64() >= _finalVoteEndDate(_vote)) {
                _vote.quietEndingExtendedSeconds = _vote.quietEndingExtendedSeconds.add(_setting.quietEndingExtension);
                emit VoteQuietEndingExtension(_voteId, _wasAccepted);
            }
        }
    }

    /**
    * @dev Create a copy of the current settings as a new setting instance
    * @return New setting's instance
    */
    function _newCopiedSettings() private returns (Setting storage) {
        (Setting storage setting, uint256 settingId) = _newSetting();
        _copySettings(_getSetting(settingId - 1), setting);
        return setting;
    }

    /**
    * @dev Copy settings from one storage pointer to another
    */
    function _copySettings(Setting storage _from, Setting storage _to) private {
        _to.supportRequiredPct = _from.supportRequiredPct;
        _to.minAcceptQuorumPct = _from.minAcceptQuorumPct;
        _to.executionDelay = _from.executionDelay;
        _to.quietEndingPeriod = _from.quietEndingPeriod;
        _to.quietEndingExtension = _from.quietEndingExtension;
        _to.overruleWindow = _from.overruleWindow;
    }

    /**
    * @dev Compute the start date of time duration from the original vote's end date.
    *      It considers the pause duration only if the vote has resumed from being paused,
    *      and if the pause occurred before the start date of the time duration being queried.
    *
    *                                                  [   queried duration   ]
    *      [   vote active    ][   vote paused    ][   .   vote active        ]
    *      ^                                           ^                      ^
    *      |                                           |                      |
    *  vote starts                            duration start date         vote ends
    */
    function _durationStartDate(Vote storage _vote, uint64 _duration) private view returns (uint64) {
        uint64 pausedAt = _vote.pausedAt;
        uint64 originalDurationStartDate = _originalVoteEndDate(_vote).sub(_duration);
        bool pausedBeforeDurationStarts = pausedAt != 0 && pausedAt < originalDurationStartDate;
        return pausedBeforeDurationStarts ? originalDurationStartDate.add(_vote.pauseDuration) : originalDurationStartDate;
    }

    /**
    * @dev Translate a voter's support into a voter state
    * @param _supports Whether voter supports the vote
    * @return Voter state, as an enum
    */
    function _voterStateFor(bool _supports) private pure returns (VoterState) {
        return _supports ? VoterState.Yea : VoterState.Nay;
    }
}
