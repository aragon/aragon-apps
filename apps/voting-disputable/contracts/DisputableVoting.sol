/*
 * SPDX-License-Identifier:    GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/common/IForwarder.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";
import "@aragon/os/contracts/apps/disputable/DisputableAragonApp.sol";
import "@aragon/minime/contracts/MiniMeToken.sol";
import "../../agreement/contracts/Agreement.sol";


contract DisputableVoting is DisputableAragonApp {
    using SafeMath for uint256;
    using SafeMath64 for uint64;

    bytes32 public constant CREATE_VOTES_ROLE = keccak256("CREATE_VOTES_ROLE");
    bytes32 public constant MODIFY_SUPPORT_ROLE = keccak256("MODIFY_SUPPORT_ROLE");
    bytes32 public constant MODIFY_QUORUM_ROLE = keccak256("MODIFY_QUORUM_ROLE");
    bytes32 public constant MODIFY_OVERRULE_WINDOW_ROLE = keccak256("MODIFY_OVERRULE_WINDOW_ROLE");

    uint64 public constant PCT_BASE = 10 ** 18; // 0% = 0; 1% = 10^16; 100% = 10^18
    uint256 public constant MAX_VOTES_DELEGATION_SET_LENGTH = 70;

    // Validation errors
    string private constant ERROR_NO_VOTE = "VOTING_NO_VOTE";
    string private constant ERROR_INIT_PCTS = "VOTING_INIT_PCTS";
    string private constant ERROR_VOTE_TIME_ZERO = "VOTING_VOTE_TIME_ZERO";
    string private constant ERROR_TOKEN_NOT_CONTRACT = "VOTING_TOKEN_NOT_CONTRACT";
    string private constant ERROR_CHANGE_QUORUM_PCTS = "VOTING_CHANGE_QUORUM_PCTS";
    string private constant ERROR_CHANGE_SUPPORT_PCTS = "VOTING_CHANGE_SUPPORT_PCTS";
    string private constant ERROR_INIT_SUPPORT_TOO_BIG = "VOTING_INIT_SUPPORT_TOO_BIG";
    string private constant ERROR_CHANGE_SUPPORT_TOO_BIG = "VOTING_CHANGE_SUPP_TOO_BIG";
    string private constant ERROR_INVALID_OVERRULE_WINDOW = "VOTING_INVALID_OVERRULE_WINDOW";
    string private constant ERROR_DELEGATES_EXCEEDS_MAX_LEN = "VOTING_DELEGATES_EXCEEDS_MAX_LEN";
    string private constant ERROR_INVALID_DELEGATES_INPUT_LEN = "VOTING_INVALID_DELEGATES_INPUT_LEN";

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

    /**
    * These statuses are used only for caching purposes to avoid querying the Agreement app every time
    * we need to check if a vote is being challenged. Note that this is not mandatory, we could check
    * every time against the Agreement app but in order to save some gas, we are using this cache for
    * cases when there is not a huge risk in case the cache gets outdated. Although the cache is carefully
    * updated only within the disputable app callbacks, edge cases like an Agreement app upgrade could occur.
    */
    enum DisputableStatus {
        Active,                         // A vote that has been reported to the Agreement
        Paused,                         // A vote that is being challenged
        Cancelled,                      // A vote that has been cancelled since it was refused after a dispute
        Closed                          // A vote that has been executed
    }

    // The `casters` mapping is only used for voting delegation to store
    // the address of representative that voted on behalf of a principal
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
        mapping (address => address) casters;
        uint64 overruleWindow;
        uint64 pausedAt;                        // Datetime when the vote was paused
        uint64 pauseDuration;                   // Duration in seconds while the vote has been paused
        DisputableStatus disputableStatus;      // Status of the disputable vote
        uint256 actionId;                       // Identification number of the disputable action in the context of the agreement
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
    event PauseVote(uint256 indexed voteId);
    event ResumeVote(uint256 indexed voteId);
    event CancelVote(uint256 indexed voteId);
    event ProxyVoteFailure(uint256 indexed voteId, address indexed voter, address indexed representative);
    event ProxyVoteSuccess(uint256 indexed voteId, address indexed voter, address indexed representative, bool supports);
    event ExecuteVote(uint256 indexed voteId);
    event ChangeSupportRequired(uint64 supportRequiredPct);
    event ChangeMinQuorum(uint64 minAcceptQuorumPct);
    event ChangeOverruleWindow(uint64 newOverruleWindow);
    event ChangeRepresentative(address indexed voter, address indexed newRepresentative);

    modifier voteExists(uint256 _voteId) {
        require(_voteExists(_voteId), ERROR_NO_VOTE);
        _;
    }

    /**
    * @notice Initialize Voting app with `_token.symbol(): string` for governance, minimum support of `@formatPct(_supportRequiredPct)`%, minimum acceptance quorum of `@formatPct(_minAcceptQuorumPct)`%, and a voting duration of `@transformTime(_voteTime)`
    * @param _token MiniMeToken Address that will be used as governance token
    * @param _supportRequiredPct Percentage of yeas in cast votes for a vote to succeed (expressed as a percentage of 10^18; eg. 10^16 = 1%, 10^18 = 100%)
    * @param _minAcceptQuorumPct Percentage of yeas in total possible votes for a vote to succeed (expressed as a percentage of 10^18; eg. 10^16 = 1%, 10^18 = 100%)
    * @param _voteTime Seconds that a vote will be open for token holders to vote (unless enough yeas or nays have been cast to make an early decision)
    */
    function initialize(MiniMeToken _token, uint64 _supportRequiredPct, uint64 _minAcceptQuorumPct, uint64 _voteTime) external onlyInit {
        initialized();

        require(isContract(_token), ERROR_TOKEN_NOT_CONTRACT);
        require(_voteTime > 0, ERROR_VOTE_TIME_ZERO);
        require(_minAcceptQuorumPct <= _supportRequiredPct, ERROR_INIT_PCTS);
        require(_supportRequiredPct < PCT_BASE, ERROR_INIT_SUPPORT_TOO_BIG);

        token = _token;
        supportRequiredPct = _supportRequiredPct;
        minAcceptQuorumPct = _minAcceptQuorumPct;
        voteTime = _voteTime;
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
        overruleWindow = _newOverruleWindow;
        emit ChangeOverruleWindow(_newOverruleWindow);
    }

    /**
    * @notice `_representative == 0x0 ? 'Set your voting representative to ' + _representative : 'Remove your representative'`
    * @param _representative Address of the representative to be allowed on behalf of the sender. Use the zero address for none.
    */
    function setRepresentative(address _representative) external isInitialized {
        representatives[msg.sender] = _representative;
        emit ChangeRepresentative(msg.sender, _representative);
    }

    /**
    * @notice Create a new vote about "`_metadata`"
    * @param _executionScript EVM script to be executed on approval
    * @param _metadata Vote metadata
    * @return voteId id for newly created vote
    */
    function newVote(bytes _executionScript, string _metadata) external authP(CREATE_VOTES_ROLE, arr(msg.sender)) returns (uint256 voteId) {
        return _newVote(_executionScript, _metadata);
    }

    /**
    * @notice Vote `_supports ? 'yes' : 'no'` in vote #`_voteId`
    * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Id for vote
    * @param _supports Whether voter supports the vote
    */
    function vote(uint256 _voteId, bool _supports) external voteExists(_voteId) {
        require(_canVote(votes[_voteId], msg.sender), ERROR_CANNOT_VOTE);
        _vote(_voteId, _supports, msg.sender);
    }

    /**
    * @notice Vote `_supports ? 'yes' : 'no'` in vote #`_voteId` on behalf of a set of voters
    * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voters Addresses of the voters voting on behalf of
    * @param _voteId Id for vote
    * @param _supports Whether the representative supports the vote
    */
    function voteOnBehalfOf(address[] _voters, uint256 _voteId, bool _supports) external voteExists(_voteId) {
        require(_voters.length <= MAX_VOTES_DELEGATION_SET_LENGTH, ERROR_DELEGATES_EXCEEDS_MAX_LEN);
        _voteOnBehalfOf(_voters, _voteId, _supports);
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

        vote_.executed = true;
        vote_.disputableStatus = DisputableStatus.Closed;
        _closeAgreementAction(vote_.actionId);

        bytes memory input = new bytes(0); // TODO: Consider input for voting scripts
        address[] memory blacklist = new address[](1);
        blacklist[0] = address(_getAgreement());
        runScript(vote_.executionScript, input, blacklist);
        emit ExecuteVote(_voteId);
    }

    // Getter fns

    /**
    * @notice Tells whether a vote #`_voteId` can be executed or not
    * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @return True if the given vote can be executed, false otherwise
    */
    function canExecute(uint256 _voteId) external view voteExists(_voteId) returns (bool) {
        Vote storage vote_ = votes[_voteId];
        // Since we are relying on the vote's disputable state cache in `_canExecute`,
        // here we are manually checking against the Agreement app as well to double check.
        // Note that even in a super edge case where the cache gets outdated, the execution
        // will fail since it also tries to close the Agreement action through `_closeAgreementAction`.
        return _canExecute(vote_) && _canProceedAgreementAction(vote_.actionId);
    }

    /**
    * @notice Tells whether `_sender` can participate in the vote #`_voteId` or not
    * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @return True if the given voter can participate a certain vote, false otherwise
    */
    function canVote(uint256 _voteId, address _voter) external view voteExists(_voteId) returns (bool) {
        Vote storage vote_ = votes[_voteId];
        return _canVote(vote_, _voter);
    }

    /**
    * @notice Tells whether `_representative` can vote on behalf of `_voter` in vote #`_voteId` or not
    * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @return True if the given representative can vote on behalf of the given voter in a certain vote, false otherwise
    */
    function canVoteOnBehalfOf(uint256 _voteId, address _voter, address _representative) external view voteExists(_voteId) returns (bool) {
        Vote storage vote_ = votes[_voteId];
        return _canVote(vote_, _voter) &&
            _isRepresentativeOf(_voter, _representative) &&
            _hasNotVotedYet(vote_, _voter) &&
            !_withinOverruleWindow(vote_);
    }

    /**
    * @dev Return all information for a vote by its ID
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
            uint256 yea,
            uint256 nay,
            uint256 votingPower,
            bytes script
        )
    {
        Vote storage vote_ = votes[_voteId];

        executed = vote_.executed;
        startDate = vote_.startDate;
        snapshotBlock = vote_.snapshotBlock;
        supportRequired = vote_.supportRequiredPct;
        minAcceptQuorum = vote_.minAcceptQuorumPct;
        voteOverruleWindow = vote_.overruleWindow;
        yea = vote_.yea;
        nay = vote_.nay;
        votingPower = vote_.votingPower;
        script = vote_.executionScript;
    }

    /**
    * @dev Return the disputable information for a vote by its ID
    * @param _voteId Vote identifier
    * @return Vote agreement action ID
    * @return Vote paused date
    * @return Vote paused duration
    * @return Vote disputable status
    */
    function getDisputableInfo(uint256 _voteId)
        external
        view
        voteExists(_voteId)
        returns (
            uint256 actionId,
            uint64 pausedAt,
            uint64 pauseDuration,
            DisputableStatus status
        )
    {
        Vote storage vote_ = votes[_voteId];
        actionId = vote_.actionId;
        pausedAt = vote_.pausedAt;
        pauseDuration = vote_.pauseDuration;
        status = vote_.disputableStatus;
    }

    /**
    * @notice Tells whether a vote #`_voteId` is open or not
    * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote()`, which requires initialization
    * @param _voteId Id for vote
    * @return True if the vote is still open, false otherwise
    */
    function isVoteOpen(uint256 _voteId) external view voteExists(_voteId) returns (bool) {
        return _isVoteOpen(votes[_voteId]);
    }

    /**
    * @dev Return the state of a voter for a given vote by its ID
    * @param _voteId Vote identifier
    * @param _voter Address of the voter
    * @return VoterState of the requested voter for a certain vote
    */
    function getVoterState(uint256 _voteId, address _voter) external view voteExists(_voteId) returns (VoterState) {
        return _voterState(votes[_voteId], _voter);
    }

    /**
    * @dev Return the caster of a given vote by its ID
    * @param _voteId Vote identifier
    * @param _voter Address of the voter
    * @return Address of the caster of the voter's vote
    */
    function getVoteCaster(uint256 _voteId, address _voter) external view voteExists(_voteId) returns (address) {
        return _voteCaster(votes[_voteId], _voter);
    }

    /**
    * @notice Tells whether `_representative` is `_voter`'s representative or not
    * @return True if the given representative was allowed by a certain voter, false otherwise
    */
    function isRepresentativeOf(address _voter, address _representative) external view isInitialized returns (bool) {
        return _isRepresentativeOf(_voter, _representative);
    }

    /**
    * @notice Tells whether vote #`_voteId` is within the overrule period for delegated votes or not
    * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote(),` which requires initialization
    * @return True if the requested vote is within the overrule window for delegated votes, false otherwise
    */
    function withinOverruleWindow(uint256 _voteId) external view voteExists(_voteId) returns (bool) {
        Vote storage vote_ = votes[_voteId];
        return _isVoteOpen(vote_) && _withinOverruleWindow(vote_);
    }

    // Forwarding fns

    /**
    * @notice Creates a vote to execute the desired action, and casts a support vote if possible
    * @dev IForwarder interface conformance
    *      Disputable apps are required to be the initial step in the forwarding chain
    * @param _evmScript EVM script to be executed on approval
    */
    function forward(bytes _evmScript) public {
        require(canForward(msg.sender, _evmScript), ERROR_CANNOT_FORWARD);
        _newVote(_evmScript, "");
    }

    /**
    * @notice Tells whether `_sender` can forward actions or not
    * @dev IForwarder interface conformance
    * @param _sender Address of the account intending to forward an action
    * @return True if the given address can create votes, false otherwise
    */
    function canForward(address _sender, bytes) public view returns (bool) {
        // Note that `canPerform()` implicitly does an initialization check itself
        return canPerform(_sender, CREATE_VOTES_ROLE, arr(_sender));
    }

    // Disputable app callbacks

    /**
    * @dev Challenge a vote
    * @param _voteId Identification number of the vote to be challenged
    */
    function _onDisputableActionChallenged(uint256 _voteId, uint256 /* _challengeId */, address /* _challenger */) internal {
        Vote storage vote_ = votes[_voteId];
        require(_canPause(vote_), ERROR_CANNOT_PAUSE_VOTE);

        vote_.disputableStatus = DisputableStatus.Paused;
        vote_.pausedAt = getTimestamp64();
        emit PauseVote(_voteId);
    }

    /**
    * @dev Allow a vote
    * @param _voteId Identification number of the vote to be allowed
    */
    function _onDisputableActionAllowed(uint256 _voteId) internal {
        Vote storage vote_ = votes[_voteId];
        require(_isPaused(vote_), ERROR_VOTE_NOT_PAUSED);

        vote_.disputableStatus = DisputableStatus.Active;
        vote_.pauseDuration = getTimestamp64().sub(vote_.pausedAt);
        emit ResumeVote(_voteId);
    }

    /**
    * @dev Reject a vote
    * @param _voteId Identification number of the vote to be rejected
    */
    function _onDisputableActionRejected(uint256 _voteId) internal {
        Vote storage vote_ = votes[_voteId];
        require(_isPaused(vote_), ERROR_VOTE_NOT_PAUSED);

        vote_.disputableStatus = DisputableStatus.Cancelled;
        vote_.pauseDuration = getTimestamp64().sub(vote_.pausedAt);
        emit CancelVote(_voteId);
    }

    /**
    * @dev Void a vote
    * @param _voteId Identification number of the entry to be voided
    */
    function _onDisputableActionVoided(uint256 _voteId) internal {
        // When a vote that has been challenged gets voided, it is considered allowed for the current implementation.
        // This could be the case for challenges where the arbitrator refuses to rule.
        _onDisputableActionAllowed(_voteId);
    }

    // Internal fns

    /**
    * @dev Internal function to create a new vote
    * @return voteId id for newly created vote
    */
    function _newVote(bytes _executionScript, string _metadata) internal returns (uint256 voteId) {
        uint64 snapshotBlock = getBlockNumber64() - 1; // avoid double voting in this very block
        uint256 votingPower = token.totalSupplyAt(snapshotBlock);
        require(votingPower > 0, ERROR_NO_VOTING_POWER);

        voteId = votesLength++;

        Vote storage vote_ = votes[voteId];
        vote_.startDate = getTimestamp64();
        vote_.snapshotBlock = snapshotBlock;
        vote_.overruleWindow = overruleWindow;
        vote_.supportRequiredPct = supportRequiredPct;
        vote_.minAcceptQuorumPct = minAcceptQuorumPct;
        vote_.votingPower = votingPower;
        vote_.executionScript = _executionScript;
        vote_.disputableStatus = DisputableStatus.Active;

        // Notify the Agreement app tied to the current voting app about the vote created.
        // This is mandatory to make votes disputable, we then store its reference on the Agreement app.
        vote_.actionId = _newAgreementAction(voteId, msg.sender, bytes(_metadata));

        emit StartVote(voteId, msg.sender, _metadata);
    }

    /**
    * @dev Internal function to cast a vote. It assumes the queried vote exists.
    */
    function _vote(uint256 _voteId, bool _supports, address _voter) internal {
        // This could re-enter, though we can assume the governance token is not malicious
        Vote storage vote_ = votes[_voteId];
        _castVote(vote_, _voteId, _supports, _voter);
        _overwriteCasterIfNecessary(vote_, _voter);
    }

    /**
    * @dev Internal function for a representative to cast a vote on behalf of many voters. It assumes the queried vote exists.
    */
    function _voteOnBehalfOf(address[] _voters, uint256 _voteId, bool _supports) internal {
        Vote storage vote_ = votes[_voteId];
        for (uint256 i = 0; i < _voters.length; i++) {
            address voter = _voters[i];
            require(_canVote(vote_, voter), ERROR_CANNOT_VOTE);
            require(!_withinOverruleWindow(vote_), ERROR_WITHIN_OVERRULE_WINDOW);
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
    * @dev Internal function to check if a vote can be executed. It assumes the queried vote exists.
    * @return True if the given vote can be executed, false otherwise
    */
    function _canExecute(Vote storage vote_) internal view returns (bool) {
        // If vote is already executed, it cannot be executed again
        if (vote_.executed) {
            return false;
        }

        // If the vote is still open, it cannot be executed
        if (_isVoteOpen(vote_)) {
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
        // We are not checking if the vote can proceed against the Agreement app since it will
        // be tried to be closed when executed. This means the close call will fail in the Agreement
        // side if the vote's status cache on the voting app was outdated for some weird reason.
        return true;
    }

    /**
    * @dev Internal function to check if a voter can participate on a vote. It assumes the queried vote exists.
    * @return True if the given voter can participate a certain vote, false otherwise
    */
    function _canVote(Vote storage vote_, address _voter) internal view returns (bool) {
        // WARNING! Note that here we are relying entirely on the vote's disputable state cache.
        // This means that in case the cache gets outdated we will be allowing people to vote on
        // a vote being challenged. We are deciding not to consider this as a security risk based on
        // the probability of occurrence and the impact it can have. For instance, early execution is
        // not allowed in this app and users can change their vote withing the voting period. We prefer
        // prioritizing the gas costs for the rest of 99% of the cases.
        return _isVoteOpen(vote_) && token.balanceOfAt(_voter, vote_.snapshotBlock) > 0;
    }

    /**
    * @dev Internal function to check if a representative is allowed to vote on behalf of a voter
    * @return True if the given representative is allowed by a certain voter, false otherwise
    */
    function _isRepresentativeOf(address _voter, address _representative) internal view returns (bool) {
        return representatives[_voter] == _representative;
    }

    /**
    * @dev Tell whether a vote can be paused or not
    * @param vote_ Vote action instance being queried
    * @return True if the given vote can be paused, false otherwise
    */
    function _canPause(Vote storage vote_) internal view returns (bool) {
        return vote_.disputableStatus == DisputableStatus.Active && vote_.pausedAt == 0;
    }

    /**
    * @dev Tell whether a vote is paused or not
    * @param vote_ Vote action instance being queried
    * @return True if the given vote is paused, false otherwise
    */
    function _isPaused(Vote storage vote_) internal view returns (bool) {
        return vote_.disputableStatus == DisputableStatus.Paused;
    }

    /**
    * @dev Tell whether a vote is paused or cancelled, or not
    * @param vote_ Vote action instance being queried
    * @return True if the given vote is paused or cancelled, false otherwise
    */
    function _isPausedOrCancelled(Vote storage vote_) internal view returns (bool) {
        DisputableStatus status = vote_.disputableStatus;
        return status == DisputableStatus.Paused || status == DisputableStatus.Cancelled;
    }

    /**
    * @dev Internal function to check if a voter has already voted on a certain vote. It assumes the queried vote exists.
    * @return True if the given voter has not voted on the requested vote, false otherwise
    */
    function _hasNotVotedYet(Vote storage vote_, address _voter) internal view returns (bool) {
        return _voteCaster(vote_, _voter) != _voter;
    }

    /**
    * @dev Internal function to check if a vote is still open. It assumes the queried vote exists.
    * @return True if the given vote is open, false otherwise
    */
    function _isVoteOpen(Vote storage vote_) internal view returns (bool) {
        if (_isPausedOrCancelled(vote_)) {
            return false;
        }

        return getTimestamp64() < _voteEndDate(vote_) && !vote_.executed;
    }

    /**
    * @dev Internal function to check if a vote is within its overrule window. It assumes the queried vote exists.
    * @return True if the given vote is within its overrule window, false otherwise
    */
    function _withinOverruleWindow(Vote storage vote_) internal view returns (bool) {
        return getTimestamp64() >= _voteEndDate(vote_).sub(vote_.overruleWindow);
    }

    /**
    * @dev Internal function to calculate the end date of a vote. It assumes the queried vote exists.
    */
    function _voteEndDate(Vote storage vote_) internal view returns (uint64) {
        uint64 endDate = vote_.startDate.add(voteTime);
        DisputableStatus status = vote_.disputableStatus;

        if (status == DisputableStatus.Cancelled) {
            return vote_.pausedAt.add(vote_.pauseDuration);
        }

        return endDate.add(vote_.pauseDuration);
    }

    /**
    * @dev Internal function to get the state of a voter. It assumes the queried vote exists.
    */
    function _voterState(Vote storage vote_, address _voter) internal view returns (VoterState) {
        return vote_.voters[_voter];
    }

    /**
    * @dev Internal function to get the caster of a vote. It assumes the queried vote exists.
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

    function _overwriteCasterIfNecessary(Vote storage vote_, address _voter) private {
        address _currentCaster = vote_.casters[_voter];
        if (_currentCaster != address(0)) {
            vote_.casters[_voter] = address(0);
        }
    }
}
