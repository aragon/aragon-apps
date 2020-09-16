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

    // bytes32 public constant CHANGE_VOTE_TIME_ROLE = keccak256("CHANGE_VOTE_TIME_ROLE");
    bytes32 public constant CHANGE_VOTE_TIME_ROLE = 0xbc5d8ebc0830a2fed8649987b8263de1397b7fa892f3b87dc2d8cad35c691f86;

    // bytes32 public constant CHANGE_SUPPORT_ROLE = keccak256("CHANGE_SUPPORT_ROLE");
    bytes32 public constant CHANGE_SUPPORT_ROLE = 0xf3a5f71f3cb50dae9454dd13cdf0fd1b559f7e20d63c08902592486e6d460c90;

    // bytes32 public constant CHANGE_QUORUM_ROLE = keccak256("CHANGE_QUORUM_ROLE");
    bytes32 public constant CHANGE_QUORUM_ROLE = 0xa3f675280fb3c54662067f92659ca1ee3ef7c1a7f2a6ff03a5c4228aa26b6a82;

    // bytes32 public constant CHANGE_DELEGATED_VOTING_PERIOD_ROLE = keccak256("CHANGE_DELEGATED_VOTING_PERIOD_ROLE");
    bytes32 public constant CHANGE_DELEGATED_VOTING_PERIOD_ROLE = 0x59ba415d96e104e6483d76b79d9cd09941d04e229adcd62d7dc672c93975a19d;

    // bytes32 public constant CHANGE_EXECUTION_DELAY_ROLE = keccak256("CHANGE_EXECUTION_DELAY_ROLE");
    bytes32 public constant CHANGE_EXECUTION_DELAY_ROLE = 0x5e3a3edc315e366a0cc5c94ca94a8f9bbc2f1feebb2ef7704bfefcff0cdc4ee7;

    // bytes32 public constant CHANGE_QUIET_ENDING_ROLE = keccak256("CHANGE_QUIET_ENDING_ROLE");
    bytes32 public constant CHANGE_QUIET_ENDING_ROLE = 0x4f885d966bcd49734218a6e280d58c840b86e8cc13610b21ebd46f0b1da362c2;

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
    string private constant ERROR_INVALID_DELEGATED_VOTING_PERIOD = "VOTING_INVALID_DLGT_VOTE_PERIOD";
    string private constant ERROR_INVALID_QUIET_ENDING_PERIOD = "VOTING_INVALID_QUIET_END_PERIOD";
    string private constant ERROR_INVALID_EXECUTION_SCRIPT = "VOTING_INVALID_EXECUTION_SCRIPT";

    // Workflow errors
    string private constant ERROR_CANNOT_FORWARD = "VOTING_CANNOT_FORWARD";
    string private constant ERROR_NO_TOTAL_VOTING_POWER = "VOTING_NO_TOTAL_VOTING_POWER";
    string private constant ERROR_CANNOT_VOTE = "VOTING_CANNOT_VOTE";
    string private constant ERROR_NOT_REPRESENTATIVE = "VOTING_NOT_REPRESENTATIVE";
    string private constant ERROR_PAST_REPRESENTATIVE_VOTING_WINDOW = "VOTING_PAST_REP_VOTING_WINDOW";
    string private constant ERROR_DELEGATES_EXCEEDS_MAX_LEN = "VOTING_DELEGATES_EXCEEDS_MAX_LEN";
    string private constant ERROR_CANNOT_PAUSE_VOTE = "VOTING_CANNOT_PAUSE_VOTE";
    string private constant ERROR_VOTE_NOT_PAUSED = "VOTING_VOTE_NOT_PAUSED";
    string private constant ERROR_CANNOT_EXECUTE = "VOTING_CANNOT_EXECUTE";

    enum VoterState { Absent, Yea, Nay }

    enum VoteStatus {
        Normal,                         // A vote in a "normal" state of operation (not one of the below)--note that this state is not related to the vote being open
        Paused,                         // A vote that is paused due to it having an open challenge or dispute
        Cancelled,                      // A vote that has been explicitly cancelled due to a challenge or dispute
        Executed                        // A vote that has been executed
    }

    struct Setting {
        // "Base" duration of each vote -- vote lifespans may be adjusted by pause and extension durations
        uint64 voteTime;

        // Required voter support % (yes power / voted power) for a vote to pass
        // Expressed as a percentage of 10^18; eg. 10^16 = 1%, 10^18 = 100%
        uint64 supportRequiredPct;

        // Required voter quorum % (yes power / total power) for a vote to pass
        // Expressed as a percentage of 10^18; eg. 10^16 = 1%, 10^18 = 100%
        // Must be <= supportRequiredPct to avoid votes being impossible to pass
        uint64 minAcceptQuorumPct;

        // Duration from the start of a vote that representatives are allowed to vote on behalf of principals
        // Must be <= voteTime; duration is bound as [)
        uint64 delegatedVotingPeriod;

        // Duration before the end of a vote to detect non-quiet endings
        // Must be <= voteTime; duration is bound as [)
        uint64 quietEndingPeriod;

        // Duration to extend a vote in case of non-quiet ending
        uint64 quietEndingExtension;

        // Duration to wait before a passed vote can be executed
        // Duration is bound as [)
        uint64 executionDelay;
    }

    struct VoteCast {
        VoterState state;
        address caster;                                     // Caster of the vote (only stored if caster was not the representative)
    }

    struct Vote {
        uint256 yea;                                        // Voting power for
        uint256 nay;                                        // Voting power against
        uint256 totalPower;                                 // Total voting power (based on the snapshot block)

        uint64 startDate;                                   // Datetime when the vote was created
        uint64 snapshotBlock;                               // Block number used to check voting power on attached token
        VoteStatus status;                                  // Status of the vote

        uint256 settingId;                                  // Identification number of the setting applicable to the vote
        uint256 actionId;                                   // Identification number of the associated disputable action on the linked Agreement

        uint64 pausedAt;                                    // Datetime when the vote was paused
        uint64 pauseDuration;                               // Duration of the pause (only updated once resumed)
        uint64 quietEndingExtensionDuration;                // Duration a vote was extended due to non-quiet endings
        VoterState quietEndingSnapshotSupport;              // Snapshot of the vote's support at the beginning of the first quiet ending period

        bytes32 executionScriptHash;                        // Hash of the EVM script attached to the vote
        mapping (address => VoteCast) castVotes;            // Mapping of voter address => more information about their cast vote
    }

    MiniMeToken public token;                               // Token for determining voting power; we assume it's not malicious

    uint256 public settingsLength;                          // Number of settings created
    mapping (uint256 => Setting) internal settings;         // List of settings indexed by ID (starting at 0)

    uint256 public votesLength;                             // Number of votes created
    mapping (uint256 => Vote) internal votes;               // List of votes indexed by ID (starting at 0)
    mapping (address => address) internal representatives;  // Mapping of voter => allowed representative

    event NewSetting(uint256 settingId);
    event ChangeVoteTime(uint64 voteTime);
    event ChangeSupportRequired(uint64 supportRequiredPct);
    event ChangeMinQuorum(uint64 minAcceptQuorumPct);
    event ChangeDelegatedVotingPeriod(uint64 delegatedVotingPeriod);
    event ChangeQuietEndingConfiguration(uint64 quietEndingPeriod, uint64 quietEndingExtension);
    event ChangeExecutionDelay(uint64 executionDelay);

    event StartVote(uint256 indexed voteId, address indexed creator, bytes context, bytes executionScript);
    event PauseVote(uint256 indexed voteId, uint256 indexed challengeId);
    event ResumeVote(uint256 indexed voteId);
    event CancelVote(uint256 indexed voteId);
    event ExecuteVote(uint256 indexed voteId);
    event QuietEndingExtendVote(uint256 indexed voteId, bool passing);

    event CastVote(uint256 indexed voteId, address indexed voter, bool supports, address caster);
    event ChangeRepresentative(address indexed voter, address indexed representative);
    event ProxyVoteFailure(uint256 indexed voteId, address indexed voter, address indexed representative);

    /**
    * @notice Initialize Disputable Voting with `_token.symbol(): string` for governance, a voting duration of `@transformTime(_voteTime)`, minimum support of `@formatPct(_supportRequiredPct)`%, minimum acceptance quorum of `@formatPct(_minAcceptQuorumPct)`%, a delegated voting period of `@transformTime(_delegatedVotingPeriod), and a execution delay of `@transformTime(_executionDelay)`
    * @param _token MiniMeToken Address that will be used as governance token
    * @param _voteTime Base duration a vote will be open for voting
    * @param _supportRequiredPct Required support % (yes power / voted power) for a vote to pass; expressed as a percentage of 10^18
    * @param _minAcceptQuorumPct Required quorum % (yes power / total power) for a vote to pass; expressed as a percentage of 10^18
    * @param _delegatedVotingPeriod Duration from the start of a vote that representatives are allowed to vote on behalf of principals
    * @param _quietEndingPeriod Duration to detect non-quiet endings
    * @param _quietEndingExtension Duration to extend a vote in case of non-quiet ending
    * @param _executionDelay Duration to wait before a passed vote can be executed
    */
    function initialize(
        MiniMeToken _token,
        uint64 _voteTime,
        uint64 _supportRequiredPct,
        uint64 _minAcceptQuorumPct,
        uint64 _delegatedVotingPeriod,
        uint64 _quietEndingPeriod,
        uint64 _quietEndingExtension,
        uint64 _executionDelay
    )
        external
    {
        initialized();

        require(isContract(_token), ERROR_TOKEN_NOT_CONTRACT);
        token = _token;

        (Setting storage setting, ) = _newSetting();
        _changeVoteTime(setting, _voteTime);
        _changeSupportRequiredPct(setting, _supportRequiredPct);
        _changeMinAcceptQuorumPct(setting, _minAcceptQuorumPct);
        _changeDelegatedVotingPeriod(setting, _delegatedVotingPeriod);
        _changeQuietEndingConfiguration(setting, _quietEndingPeriod, _quietEndingExtension);
        _changeExecutionDelay(setting, _executionDelay);
    }

    /**
    * @notice Change vote time to `@transformTime(_voteTime)`
    * @param _voteTime New vote time
    */
    function changeVoteTime(uint64 _voteTime) external authP(CHANGE_VOTE_TIME_ROLE, arr(uint256(_voteTime))) {
        Setting storage setting = _newCopiedSettings();
        _changeVoteTime(setting, _voteTime);
    }

    /**
    * @notice Change required support to `@formatPct(_supportRequiredPct)`%
    * @param _supportRequiredPct New required support; expressed as a percentage of 10^18
    */
    function changeSupportRequiredPct(uint64 _supportRequiredPct) external authP(CHANGE_SUPPORT_ROLE, arr(uint256(_supportRequiredPct))) {
        Setting storage setting = _newCopiedSettings();
        _changeSupportRequiredPct(setting, _supportRequiredPct);
    }

    /**
    * @notice Change minimum acceptance quorum to `@formatPct(_minAcceptQuorumPct)`%
    * @param _minAcceptQuorumPct New minimum acceptance quorum; expressed as a percentage of 10^18
    */
    function changeMinAcceptQuorumPct(uint64 _minAcceptQuorumPct) external authP(CHANGE_QUORUM_ROLE, arr(uint256(_minAcceptQuorumPct))) {
        Setting storage setting = _newCopiedSettings();
        _changeMinAcceptQuorumPct(setting, _minAcceptQuorumPct);
    }

    /**
    * @notice Change delegated voting period to `@transformTime(_delegatedVotingPeriod)`
    * @param _delegatedVotingPeriod New delegated voting period
    */
    function changeDelegatedVotingPeriod(uint64 _delegatedVotingPeriod)
        external
        authP(CHANGE_DELEGATED_VOTING_PERIOD_ROLE, arr(uint256(_delegatedVotingPeriod)))
    {
        Setting storage setting = _newCopiedSettings();
        _changeDelegatedVotingPeriod(setting, _delegatedVotingPeriod);
    }

    /**
    * @notice Change quiet ending period to `@transformTime(_quietEndingPeriod)` with extensions of `@transformTime(_quietEndingExtension)`
    * @param _quietEndingPeriod New quiet ending period
    * @param _quietEndingExtension New quiet ending extension
    */
    function changeQuietEndingConfiguration(uint64 _quietEndingPeriod, uint64 _quietEndingExtension)
        external
        authP(CHANGE_QUIET_ENDING_ROLE, arr(uint256(_quietEndingPeriod), uint256(_quietEndingExtension)))
    {
        Setting storage setting = _newCopiedSettings();
        _changeQuietEndingConfiguration(setting, _quietEndingPeriod, _quietEndingExtension);
    }

    /**
    * @notice Change execution delay to `@transformTime(_executionDelay)`
    * @param _executionDelay New execution delay
    */
    function changeExecutionDelay(uint64 _executionDelay) external authP(CHANGE_EXECUTION_DELAY_ROLE, arr(uint256(_executionDelay))) {
        Setting storage setting = _newCopiedSettings();
        _changeExecutionDelay(setting, _executionDelay);
    }

    /**
    * @notice Create a new vote about "`_context`"
    * @param _executionScript Action (encoded as an EVM script) that will be allowed to execute if the vote passes
    * @param _context Additional context for the vote, also used as the disputable action's context on the linked Agreement
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
            } else {
                emit ProxyVoteFailure(_voteId, voter, msg.sender);
            }
        }
    }

    /**
    * @notice Execute vote #`_voteId`
    * @dev Initialization check is implicitly provided by `_getVote()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Identification number of the vote
    * @param _executionScript Action (encoded as an EVM script) to be executed, must match the one used when the vote was created
    */
    function executeVote(uint256 _voteId, bytes _executionScript) external {
        Vote storage vote_ = _getVote(_voteId);
        require(_canExecute(vote_), ERROR_CANNOT_EXECUTE);
        require(vote_.executionScriptHash == keccak256(_executionScript), ERROR_INVALID_EXECUTION_SCRIPT);

        vote_.status = VoteStatus.Executed;
        _closeDisputableAction(vote_.actionId);

        // IMPORTANT! The linked Agreement is not blacklisted on purpose
        // It will be users responsibility to check the content of the EVMScripts submitted to the Disputable Voting app
        // to make sure these are not performing any malicious actions in the Agreement (e.g. maliciously closing a different action)
        runScript(_executionScript, new bytes(0), new address[](0));
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
    * @param _context Additional context for the vote, also used as the disputable action's context on the linked Agreement
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
    *      Called by the linked Agreement when a challenge is requested for the associated vote
    * @param _voteId Identification number of the vote being queried
    * @return True if the vote can be challenged
    */
    function canChallenge(uint256 _voteId) external view returns (bool) {
        Vote storage vote_ = _getVote(_voteId);
        // Votes can only be challenged once
        return vote_.pausedAt == 0 && _isVoteOpenForVoting(vote_, settings[vote_.settingId]);
    }

    /**
    * @dev Tell if a vote can be closed
    *      Called by the linked Agreement when the action associated with the vote is requested to be manually closed
    * @param _voteId Identification number of the vote being queried
    * @return True if the vote can be closed
    */
    function canClose(uint256 _voteId) external view returns (bool) {
        Vote storage vote_ = _getVote(_voteId);
        return (_isNormal(vote_) || _isExecuted(vote_)) && _hasEnded(vote_, settings[vote_.settingId]);
    }

    // Getter fns

    /**
    * @dev Tell the information for a setting
    *      Initialization check is implicitly provided by `_getSetting()` as new settings can only be
    *      created via `change*()` functions which require initialization
    * @param _settingId Identification number of the setting
    * @return voteTime Base vote duration
    * @return supportRequiredPct Required support % (yes power / voted power) for a vote to pass; expressed as a percentage of 10^18
    * @return minAcceptQuorumPct Required quorum % (yes power / total power) for a vote to pass; expressed as a percentage of 10^18
    * @return delegatedVotingPeriod Duration of the delegated voting period
    * @return quietEndingPeriod Duration to detect non-quiet endings
    * @return quietEndingExtension Duration to extend a vote in case of non-quiet ending
    * @return executionDelay Duration to wait before a passed vote can be executed
    */
    function getSetting(uint256 _settingId)
        external
        view
        returns (
            uint64 voteTime,
            uint64 supportRequiredPct,
            uint64 minAcceptQuorumPct,
            uint64 delegatedVotingPeriod,
            uint64 quietEndingPeriod,
            uint64 quietEndingExtension,
            uint64 executionDelay
        )
    {
        Setting storage setting = _getSetting(_settingId);
        voteTime = setting.voteTime;
        supportRequiredPct = setting.supportRequiredPct;
        minAcceptQuorumPct = setting.minAcceptQuorumPct;
        delegatedVotingPeriod = setting.delegatedVotingPeriod;
        quietEndingPeriod = setting.quietEndingPeriod;
        quietEndingExtension = setting.quietEndingExtension;
        executionDelay = setting.executionDelay;
    }

    /**
    * @dev Tell the information for a vote
    *      Initialization check is implicitly provided by `_getVote()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Identification number of the vote
    * @return yea Voting power for
    * @return nay Voting power against
    * @return totalPower Total voting power available (based on the snapshot block)
    * @return startDate Datetime when the vote was created
    * @return snapshotBlock Block number used to check voting power on attached token
    * @return status Status of the vote
    * @return settingId Identification number of the setting applicable to the vote
    * @return actionId Identification number of the associated disputable action on the linked Agreement
    * @return pausedAt Datetime when the vote was paused
    * @return pauseDuration Duration of the pause (only updated once resumed)
    * @return quietEndingExtensionDuration Duration a vote was extended due to non-quiet endings
    * @return quietEndingSnapshotSupport Snapshot of the vote's support at the beginning of the first quiet ending period
    * @return executionScriptHash Hash of the EVM script attached to the vote
    */
    function getVote(uint256 _voteId)
        external
        view
        returns (
            uint256 yea,
            uint256 nay,
            uint256 totalPower,
            uint64 startDate,
            uint64 snapshotBlock,
            VoteStatus status,
            uint256 settingId,
            uint256 actionId,
            uint64 pausedAt,
            uint64 pauseDuration,
            uint64 quietEndingExtensionDuration,
            VoterState quietEndingSnapshotSupport,
            bytes32 executionScriptHash
        )
    {
        Vote storage vote_ = _getVote(_voteId);

        yea = vote_.yea;
        nay = vote_.nay;
        totalPower = vote_.totalPower;
        startDate = vote_.startDate;
        snapshotBlock = vote_.snapshotBlock;
        status = vote_.status;
        settingId = vote_.settingId;
        actionId = vote_.actionId;
        pausedAt = vote_.pausedAt;
        pauseDuration = vote_.pauseDuration;
        quietEndingExtensionDuration = vote_.quietEndingExtensionDuration;
        quietEndingSnapshotSupport = vote_.quietEndingSnapshotSupport;
        executionScriptHash = vote_.executionScriptHash;
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
        require(_voters.length <= MAX_VOTES_DELEGATION_SET_LENGTH, ERROR_DELEGATES_EXCEEDS_MAX_LEN);

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
    function isVoteOpenForVoting(uint256 _voteId) external view returns (bool) {
        Vote storage vote_ = _getVote(_voteId);
        Setting storage setting = settings[vote_.settingId];
        return _isVoteOpenForVoting(vote_, setting);
    }

    /**
    * @dev Tell if a vote currently allows representatives to vote for delegated voters
    *      Initialization check is implicitly provided by `_getVote()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Vote identifier
    * @return True if the vote currently allows representatives to vote
    */
    function canRepresentativesVote(uint256 _voteId) external view returns (bool) {
        Vote storage vote_ = _getVote(_voteId);
        return _canRepresentativesVote(vote_);
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
    * @param _challengeId Identification number of the challenge associated to the vote on the linked Agreement
    */
    function _onDisputableActionChallenged(uint256 _voteId, uint256 _challengeId, address /* _challenger */) internal {
        Vote storage vote_ = _getVote(_voteId);
        require(_isNormal(vote_), ERROR_CANNOT_PAUSE_VOTE);

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

        vote_.status = VoteStatus.Normal;
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
        // When a challenged vote is ruled as voided, it is considered as being rejected.
        // This could be the case for challenges where the linked Agreement's arbitrator refuses to rule the case.
        _onDisputableActionRejected(_voteId);
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
    * @dev Create a copy of the current settings as a new setting instance
    * @return New setting's instance
    */
    function _newCopiedSettings() internal returns (Setting storage) {
        (Setting storage to, uint256 settingId) = _newSetting();
        Setting storage from = _getSetting(settingId - 1);
        to.voteTime = from.voteTime;
        to.supportRequiredPct = from.supportRequiredPct;
        to.minAcceptQuorumPct = from.minAcceptQuorumPct;
        to.delegatedVotingPeriod = from.delegatedVotingPeriod;
        to.quietEndingPeriod = from.quietEndingPeriod;
        to.quietEndingExtension = from.quietEndingExtension;
        to.executionDelay = from.executionDelay;
        return to;
    }

    /**
    * @dev Change vote time
    * @param _setting Setting instance to update
    * @param _voteTime New vote time
    */
    function _changeVoteTime(Setting storage _setting, uint64 _voteTime) internal {
        require(_voteTime > 0, ERROR_VOTE_TIME_ZERO);

        _setting.voteTime = _voteTime;
        emit ChangeVoteTime(_voteTime);
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
    * @dev Change the delegated voting period
    * @param _setting Setting instance to update
    * @param _delegatedVotingPeriod New delegated voting period
    */
    function _changeDelegatedVotingPeriod(Setting storage _setting, uint64 _delegatedVotingPeriod) internal {
        require(_delegatedVotingPeriod <= _setting.voteTime, ERROR_INVALID_DELEGATED_VOTING_PERIOD);

        _setting.delegatedVotingPeriod = _delegatedVotingPeriod;
        emit ChangeDelegatedVotingPeriod(_delegatedVotingPeriod);
    }

    /**
    * @dev Change the quiet ending configuration
    * @param _setting Setting instance to update
    * @param _quietEndingPeriod New quiet ending period
    * @param _quietEndingExtension New quiet ending extension
    */
    function _changeQuietEndingConfiguration(Setting storage _setting, uint64 _quietEndingPeriod, uint64 _quietEndingExtension) internal {
        require(_quietEndingPeriod <= _setting.voteTime, ERROR_INVALID_QUIET_ENDING_PERIOD);

        _setting.quietEndingPeriod = _quietEndingPeriod;
        _setting.quietEndingExtension = _quietEndingExtension;
        emit ChangeQuietEndingConfiguration(_quietEndingPeriod, _quietEndingExtension);
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
    * @param _context Additional context for the vote, also used as the disputable action's context on the linked Agreement
    * @return voteId Identification number for the newly created vote
    */
    function _newVote(bytes _executionScript, bytes _context) internal returns (uint256 voteId) {
        uint64 snapshotBlock = getBlockNumber64() - 1; // avoid double voting in this very block
        uint256 totalPower = token.totalSupplyAt(snapshotBlock);
        require(totalPower > 0, ERROR_NO_TOTAL_VOTING_POWER);

        voteId = votesLength++;

        Vote storage vote_ = votes[voteId];
        vote_.totalPower = totalPower;
        vote_.startDate = getTimestamp64();
        vote_.snapshotBlock = snapshotBlock;
        vote_.status = VoteStatus.Normal;
        vote_.settingId = _getCurrentSettingId();
        vote_.executionScriptHash = keccak256(_executionScript);

        // Notify the linked Agreement about the new vote; this is mandatory in making the vote disputable
        // Note that we send `msg.sender` as the action's submitter--the linked Agreement may expect to be able to pull funds from this account
        vote_.actionId = _registerDisputableAction(voteId, _context, msg.sender);

        emit StartVote(voteId, msg.sender, _context, _executionScript);
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
    function _castVote(Vote storage _vote, uint256 _voteId, bool _supports, address _voter, address _caster) internal {
        Setting storage setting = settings[_vote.settingId];
        if (_hasStartedQuietEndingPeriod(_vote, setting)) {
            _ensureQuietEnding(_vote, setting, _voteId);
        }

        uint256 yeas = _vote.yea;
        uint256 nays = _vote.nay;
        uint256 voterStake = token.balanceOfAt(_voter, _vote.snapshotBlock);

        VoteCast storage castVote = _vote.castVotes[_voter];
        VoterState previousVoterState = castVote.state;

        // If voter had previously voted, reset their vote
        // Note that votes can only be changed once by the principal voter to overrule their representative's vote
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
        emit CastVote(_voteId, _voter, _supports, _caster == address(0) ? _voter : _caster);
    }

    /**
    * @dev Ensure we keep track of the information related for detecting a quiet ending
    * @param _vote Vote instance
    * @param _setting Setting instance applicable to the vote
    * @param _voteId Identification number of the vote
    */
    function _ensureQuietEnding(Vote storage _vote, Setting storage _setting, uint256 _voteId) internal {
        bool isAccepted = _isAccepted(_vote, _setting);

        if (_vote.quietEndingSnapshotSupport == VoterState.Absent) {
            // If we do not have a snapshot of the support yet, simply store the given value.
            // Note that if there are no votes during the quiet ending period, it is obviously impossible for the vote to be flipped and
            // this snapshot is never stored.
            _vote.quietEndingSnapshotSupport = _voterStateFor(isAccepted);
        } else {
            // We are calculating quiet ending extensions via "rolling snapshots", and so we only update the vote's cached duration once
            // the last period is over and we've confirmed the flip.
            if (getTimestamp() >= _lastComputedVoteEndDate(_vote, _setting)) {
                _vote.quietEndingExtensionDuration = _vote.quietEndingExtensionDuration.add(_setting.quietEndingExtension);
                emit QuietEndingExtendVote(_voteId, isAccepted);
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
    *      Note that a voter cannot change their vote once cast, except by the principal voter to overrule their representative's vote.
    * @param _vote Vote instance being queried
    * @param _voter Address of the voter being queried
    * @return True if the voter can participate a certain vote
    */
    function _canVote(Vote storage _vote, address _voter) internal view returns (bool) {
        Setting storage setting = settings[_vote.settingId];
        return _isVoteOpenForVoting(_vote, setting) && _hasVotingPower(_vote, _voter) && _voteCaster(_vote, _voter) != _voter;
    }

    /**
    * @dev Tell if a vote currently allows representatives to vote for delegated voters
    * @param _vote Vote instance being queried
    * @return True if the vote currently allows representatives to vote
    */
    function _canRepresentativesVote(Vote storage _vote) internal view returns (bool) {
        return _isNormal(_vote) && !_hasFinishedDelegatedVotingPeriod(_vote, settings[_vote.settingId]);
    }

    /**
    * @dev Tell if a vote can be executed
    * @param _vote Vote instance being queried
    * @return True if the vote can be executed
    */
    function _canExecute(Vote storage _vote) internal view returns (bool) {
        // If the vote is executed, paused, or cancelled, it cannot be executed
        if (!_isNormal(_vote)) {
            return false;
        }

        Setting storage setting = settings[_vote.settingId];

        // If the vote is still open, it cannot be executed
        if (!_hasEnded(_vote, setting)) {
            return false;
        }

        // If the vote's execution delay has not finished yet, it cannot be executed
        if (!_hasFinishedExecutionDelay(_vote, setting)) {
            return false;
        }

        // Check the vote has enough support and has reached the min quorum
        return _isAccepted(_vote, setting);
    }

    /**
    * @dev Tell if a vote is in a "normal" non-exceptional state
    * @param _vote Vote instance being queried
    * @return True if the vote is normal
    */
    function _isNormal(Vote storage _vote) internal view returns (bool) {
        return _vote.status == VoteStatus.Normal;
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
        uint64 supportRequiredPct = _setting.supportRequiredPct;
        uint64 minimumAcceptanceQuorumPct = _setting.minAcceptQuorumPct;
        return _isValuePct(yeas, yeas.add(nays), supportRequiredPct) &&
               _isValuePct(yeas, _vote.totalPower, minimumAcceptanceQuorumPct);
    }

    /**
    * @dev Tell if a vote is open for voting
    * @param _vote Vote instance being queried
    * @param _setting Setting instance applicable to the vote
    * @return True if the vote is open for voting
    */
    function _isVoteOpenForVoting(Vote storage _vote, Setting storage _setting) internal view returns (bool) {
        return _isNormal(_vote) && !_hasEnded(_vote, _setting);
    }

    /**
    * @dev Tell if a vote has ended
    * @param _vote Vote instance being queried
    * @param _setting Setting instance applicable to the vote
    * @return True if the vote has ended
    */
    function _hasEnded(Vote storage _vote, Setting storage _setting) internal view returns (bool) {
        return getTimestamp() >= _currentVoteEndDate(_vote, _setting);
    }

    /**
    * @dev Tell if a vote's delegated voting period has finished
    *      This function doesn't ensure that the vote is still open
    * @param _vote Vote instance being queried
    * @param _setting Setting instance applicable to the vote
    * @return True if the vote's delegated voting period has finished
    */
    function _hasFinishedDelegatedVotingPeriod(Vote storage _vote, Setting storage _setting) internal view returns (bool) {
        uint64 baseDelegatedVotingPeriodEndDate = _vote.startDate.add(_setting.delegatedVotingPeriod);

        // If the vote was paused before the delegated voting period ended, we need to extend it
        uint64 pausedAt = _vote.pausedAt;
        uint64 pauseDuration = _vote.pauseDuration;
        uint64 actualDeletedVotingEndDate = pausedAt != 0 && pausedAt < baseDelegatedVotingPeriodEndDate
            ? baseDelegatedVotingPeriodEndDate.add(pauseDuration)
            : baseDelegatedVotingPeriodEndDate;

        return getTimestamp() >= actualDeletedVotingEndDate;
    }

    /**
    * @dev Tell if a vote's quiet ending period has started
    *      This function doesn't ensure that the vote is still open
    * @param _vote Vote instance being queried
    * @param _setting Setting instance applicable to the vote
    * @return True if the vote's quiet ending period has started
    */
    function _hasStartedQuietEndingPeriod(Vote storage _vote, Setting storage _setting) internal view returns (bool) {
        uint64 voteBaseEndDate = _baseVoteEndDate(_vote, _setting);
        uint64 baseQuietEndingPeriodStartDate = voteBaseEndDate.sub(_setting.quietEndingPeriod);

        // If the vote was paused before the quiet ending period started, we need to delay it
        uint64 pausedAt = _vote.pausedAt;
        uint64 pauseDuration = _vote.pauseDuration;
        uint64 actualQuietEndingPeriodStartDate = pausedAt != 0 && pausedAt < baseQuietEndingPeriodStartDate
            ? baseQuietEndingPeriodStartDate.add(pauseDuration)
            : baseQuietEndingPeriodStartDate;

        return getTimestamp() >= actualQuietEndingPeriodStartDate;
    }

    /**
    * @dev Tell if a vote's execution delay has finished
    * @param _vote Vote instance being queried
    * @param _setting Setting instance applicable to the vote
    * @return True if the vote's execution delay has finished
    */
    function _hasFinishedExecutionDelay(Vote storage _vote, Setting storage _setting) internal view returns (bool) {
        uint64 endDate = _currentVoteEndDate(_vote, _setting);
        return getTimestamp() >= endDate.add(_setting.executionDelay);
    }

    /**
    * @dev Calculate the original end date of a vote
    *      It does not consider extensions from pauses or the quiet ending mechanism
    * @param _vote Vote instance being queried
    * @param _setting Setting instance applicable to the vote
    * @return Datetime of the vote's original end date
    */
    function _baseVoteEndDate(Vote storage _vote, Setting storage _setting) internal view returns (uint64) {
        return _vote.startDate.add(_setting.voteTime);
    }

    /**
    * @dev Tell the last computed end date of a vote.
    *      It considers extensions from pauses and the quiet ending mechanism.
    *      We call this the "last computed end date" because we use the currently cached quiet ending extension, which may be off-by-one from reality
    *      because it is only updated on the first vote in a new extension (which may never happen).
    *      The pause duration will only be included after the vote has "resumed" from its pause, as we do not know how long the pause will be in advance.
    * @param _vote Vote instance being queried
    * @param _setting Setting instance applicable to the vote
    * @return Datetime of the vote's last computed end date
    */
    function _lastComputedVoteEndDate(Vote storage _vote, Setting storage _setting) internal view returns (uint64) {
        uint64 endDateAfterPause = _baseVoteEndDate(_vote, _setting).add(_vote.pauseDuration);
        return endDateAfterPause.add(_vote.quietEndingExtensionDuration);
    }

    /**
    * @dev Calculate the current end date of a vote.
    *      It considers extensions from pauses and the quiet ending mechanism.
    *      We call this the "current end date" because it takes into account a posssibly "missing" quiet ending extension that was not cached with the vote.
    *      The pause duration will only be included after the vote has "resumed" from its pause, as we do not know how long the pause will be in advance.
    * @param _vote Vote instance being queried
    * @param _setting Setting instance applicable to the vote
    * @return Datetime of the vote's current end date
    */
    function _currentVoteEndDate(Vote storage _vote, Setting storage _setting) internal view returns (uint64) {
        uint64 lastComputedEndDate = _lastComputedVoteEndDate(_vote, _setting);

        // The last computed end date is correct if we have not passed it yet or if no flip was detected in the last extension
        if (getTimestamp() < lastComputedEndDate || !_wasFlipped(_vote)) {
            return lastComputedEndDate;
        }

        // Otherwise, since the last computed end date was reached and included a flip, we need to extend the end date by one more period
        return lastComputedEndDate.add(_setting.quietEndingExtension);
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
        uint256 currentExtensions = _vote.quietEndingExtensionDuration / setting.quietEndingExtension;
        bool wasAcceptedBeforeLastFlip = wasInitiallyAccepted != (currentExtensions % 2 != 0);
        return wasAcceptedBeforeLastFlip != _isAccepted(_vote, setting);
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
    * @dev Translate a voter's support into a voter state
    * @param _supports Whether voter supports the vote
    * @return Voter state, as an enum
    */
    function _voterStateFor(bool _supports) internal pure returns (VoterState) {
        return _supports ? VoterState.Yea : VoterState.Nay;
    }
}
