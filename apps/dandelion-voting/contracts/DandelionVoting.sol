/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/common/IForwarder.sol";
import "@aragon/os/contracts/acl/IACLOracle.sol";

import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";

import "@aragon/minime/contracts/MiniMeToken.sol";
import "@1hive/apps-token-manager/contracts/TokenManagerHook.sol";


contract DandelionVoting is IForwarder, IACLOracle, TokenManagerHook, AragonApp {
    using SafeMath for uint256;
    using SafeMath64 for uint64;

    bytes32 public constant CREATE_VOTES_ROLE = keccak256("CREATE_VOTES_ROLE");
    bytes32 public constant MODIFY_SUPPORT_ROLE = keccak256("MODIFY_SUPPORT_ROLE");
    bytes32 public constant MODIFY_QUORUM_ROLE = keccak256("MODIFY_QUORUM_ROLE");
    bytes32 public constant MODIFY_BUFFER_BLOCKS_ROLE = keccak256("MODIFY_BUFFER_BLOCKS_ROLE");
    bytes32 public constant MODIFY_EXECUTION_DELAY_ROLE = keccak256("MODIFY_EXECUTION_DELAY_ROLE");

    uint64 public constant PCT_BASE = 10 ** 18; // 0% = 0; 1% = 10^16; 100% = 10^18
    uint8 private constant EXECUTION_PERIOD_FALLBACK_DIVISOR = 2;

    string private constant ERROR_VOTE_ID_ZERO = "DANDELION_VOTING_VOTE_ID_ZERO";
    string private constant ERROR_NO_VOTE = "DANDELION_VOTING_NO_VOTE";
    string private constant ERROR_INIT_PCTS = "DANDELION_VOTING_INIT_PCTS";
    string private constant ERROR_CHANGE_SUPPORT_PCTS = "DANDELION_VOTING_CHANGE_SUPPORT_PCTS";
    string private constant ERROR_CHANGE_QUORUM_PCTS = "DANDELION_VOTING_CHANGE_QUORUM_PCTS";
    string private constant ERROR_INIT_SUPPORT_TOO_BIG = "DANDELION_VOTING_INIT_SUPPORT_TOO_BIG";
    string private constant ERROR_CHANGE_SUPPORT_TOO_BIG = "DANDELION_VOTING_CHANGE_SUPP_TOO_BIG";
    string private constant ERROR_CAN_NOT_VOTE = "DANDELION_VOTING_CAN_NOT_VOTE";
    string private constant ERROR_CAN_NOT_EXECUTE = "DANDELION_VOTING_CAN_NOT_EXECUTE";
    string private constant ERROR_CAN_NOT_FORWARD = "DANDELION_VOTING_CAN_NOT_FORWARD";
    string private constant ERROR_ORACLE_SENDER_MISSING = "DANDELION_VOTING_ORACLE_SENDER_MISSING";
    string private constant ERROR_ORACLE_SENDER_TOO_BIG = "DANDELION_VOTING_ORACLE_SENDER_TOO_BIG";
    string private constant ERROR_ORACLE_SENDER_ZERO = "DANDELION_VOTING_ORACLE_SENDER_ZERO";

    enum VoterState { Absent, Yea, Nay }

    struct Vote {
        bool executed;
        uint64 startBlock;
        uint64 executionBlock;
        uint64 snapshotBlock;
        uint64 supportRequiredPct;
        uint64 minAcceptQuorumPct;
        uint256 yea;
        uint256 nay;
        bytes executionScript;
        mapping (address => VoterState) voters;
    }

    MiniMeToken public token;
    uint64 public supportRequiredPct;
    uint64 public minAcceptQuorumPct;
    uint64 public durationBlocks;
    uint64 public bufferBlocks;
    uint64 public executionDelayBlocks;

    // We are mimicing an array, we use a mapping instead to make app upgrade more graceful
    mapping (uint256 => Vote) internal votes;
    uint256 public votesLength;
    mapping (address => uint256) public latestYeaVoteId;

    event StartVote(uint256 indexed voteId, address indexed creator, string metadata);
    event CastVote(uint256 indexed voteId, address indexed voter, bool supports, uint256 stake);
    event ExecuteVote(uint256 indexed voteId);
    event ChangeSupportRequired(uint64 supportRequiredPct);
    event ChangeMinQuorum(uint64 minAcceptQuorumPct);
    event ChangeBufferBlocks(uint64 bufferBlocks);
    event ChangeExecutionDelayBlocks(uint64 executionDelayBlocks);

    modifier voteExists(uint256 _voteId) {
        require(_voteId != 0, ERROR_VOTE_ID_ZERO);
        require(_voteId <= votesLength, ERROR_NO_VOTE);
        _;
    }

    /**
    * @notice Initialize Voting app with `_token.symbol(): string` for governance, minimum support of `@formatPct(_supportRequiredPct)`%, minimum acceptance quorum of `@formatPct(_minAcceptQuorumPct)`%, a voting duration of `_voteDurationBlocks` blocks, and a vote buffer of `_voteBufferBlocks` blocks
    * @param _token MiniMeToken Address that will be used as governance token
    * @param _supportRequiredPct Percentage of yeas in casted votes for a vote to succeed (expressed as a percentage of 10^18; eg. 10^16 = 1%, 10^18 = 100%)
    * @param _minAcceptQuorumPct Percentage of yeas in total possible votes for a vote to succeed (expressed as a percentage of 10^18; eg. 10^16 = 1%, 10^18 = 100%)
    * @param _durationBlocks Blocks that a vote will be open for token holders to vote
    * @param _bufferBlocks Minimum number of blocks between the start block of each vote
    * @param _executionDelayBlocks Minimum number of blocks between the end of a vote and when it can be executed
    */
    function initialize(
        MiniMeToken _token,
        uint64 _supportRequiredPct,
        uint64 _minAcceptQuorumPct,
        uint64 _durationBlocks,
        uint64 _bufferBlocks,
        uint64 _executionDelayBlocks
    )
        external
        onlyInit
    {
        initialized();

        require(_minAcceptQuorumPct <= _supportRequiredPct, ERROR_INIT_PCTS);
        require(_supportRequiredPct < PCT_BASE, ERROR_INIT_SUPPORT_TOO_BIG);

        token = _token;
        supportRequiredPct = _supportRequiredPct;
        minAcceptQuorumPct = _minAcceptQuorumPct;
        durationBlocks = _durationBlocks;
        bufferBlocks = _bufferBlocks;
        executionDelayBlocks = _executionDelayBlocks;
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
    * @notice Change vote buffer to `_voteBufferBlocks` blocks
    * @param _bufferBlocks New vote buffer defined in blocks
    */
    function changeBufferBlocks(uint64 _bufferBlocks) external auth(MODIFY_BUFFER_BLOCKS_ROLE) {
        bufferBlocks = _bufferBlocks;
        emit ChangeBufferBlocks(_bufferBlocks);
    }

    /**
    * @notice Change execution delay to `_executionDelayBlocks` blocks
    * @param _executionDelayBlocks New vote execution delay defined in blocks
    */
    function changeExecutionDelayBlocks(uint64 _executionDelayBlocks) external auth(MODIFY_EXECUTION_DELAY_ROLE) {
        executionDelayBlocks = _executionDelayBlocks;
        emit ChangeExecutionDelayBlocks(_executionDelayBlocks);
    }

    /**
    * @notice Create a new vote about "`_metadata`"
    * @param _executionScript EVM script to be executed on approval
    * @param _metadata Vote metadata
    * @param _castVote Whether to also cast newly created vote
    * @return voteId id for newly created vote
    */
    function newVote(bytes _executionScript, string _metadata, bool _castVote)
        external
        auth(CREATE_VOTES_ROLE)
        returns (uint256 voteId)
    {
        return _newVote(_executionScript, _metadata, _castVote);
    }

    /**
    * @notice Vote `_supports ? 'yes' : 'no'` in vote #`_voteId`
    * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote(),` which requires initialization
    * @param _voteId Id for vote
    * @param _supports Whether voter supports the vote
    */
    function vote(uint256 _voteId, bool _supports) external voteExists(_voteId) {
        require(_canVote(_voteId, msg.sender), ERROR_CAN_NOT_VOTE);
        _vote(_voteId, _supports, msg.sender);
    }

    /**
    * @notice Execute vote #`_voteId`
    * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote(),` which requires initialization
    * @param _voteId Id for vote
    */
    function executeVote(uint256 _voteId) external {
        require(_canExecute(_voteId), ERROR_CAN_NOT_EXECUTE);

        Vote storage vote_ = votes[_voteId];

        vote_.executed = true;

        bytes memory input = new bytes(0); // TODO: Consider input for voting scripts
        runScript(vote_.executionScript, input, new address[](0));

        emit ExecuteVote(_voteId);
    }

    // Forwarding fns

    /**
    * @notice Returns whether the Voting app is a forwarder or not
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
        _newVote(_evmScript, "", true);
    }

    /**
    * @notice Returns whether `_sender` can forward actions or not
    * @dev IForwarder interface conformance
    * @param _sender Address of the account intending to forward an action
    * @return True if the given address can create votes, false otherwise
    */
    function canForward(address _sender, bytes) public view returns (bool) {
        // Note that `canPerform()` implicitly does an initialization check itself
        return canPerform(_sender, CREATE_VOTES_ROLE, arr());
    }

    // ACL Oracle fns

    /**
    * @dev IACLOracle interface conformance. The ACLOracle permissioned function should specify the sender
    *      with 'authP(SOME_ACL_ROLE, arr(sender))', where sender is typically set to 'msg.sender'.
    * @param _how Array passed by Kernel when using 'authP()'. First item should be the address to check can perform.
    * return False if the sender has voted on the most recent open vote or closed unexecuted vote, true if they haven't.
    */
    function canPerform(address, address, bytes32, uint256[] _how) external view returns (bool) {
        require(_how.length > 0, ERROR_ORACLE_SENDER_MISSING);
        require(_how[0] < 2**160, ERROR_ORACLE_SENDER_TOO_BIG);
        require(_how[0] != 0, ERROR_ORACLE_SENDER_ZERO);

        return _noRecentPositiveVotes(address(_how[0]));
    }

    // Token Manager Hook fns

    /**
    * @dev TokenManagerHook interface conformance.
    * @param _from The address from which funds will be transferred
    * return False if `_from` has voted on the most recent open vote or closed unexecuted vote, true if they haven't.
    */
    function _onTransfer(address _from, address _to, uint256 _amount) internal returns (bool) {
        return _noRecentPositiveVotes(_from);
    }

    // Getter fns

    /**
    * @notice Tells whether a vote #`_voteId` can be executed or not
    * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote(),` which requires initialization
    * @return True if the given vote can be executed, false otherwise
    */
    function canExecute(uint256 _voteId) public view returns (bool) {
        return _canExecute(_voteId);
    }

    /**
    * @notice Tells whether `_sender` can participate in the vote #`_voteId` or not
    * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
    *      created via `newVote(),` which requires initialization
    * @return True if the given voter can participate a certain vote, false otherwise
    */
    function canVote(uint256 _voteId, address _voter) public view voteExists(_voteId) returns (bool) {
        return _canVote(_voteId, _voter);
    }

    /**
    * @dev Return all information for a vote by its ID
    * @param _voteId Vote identifier
    * @return Vote open status
    * @return Vote executed status
    * @return Vote start block
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
            uint64 startBlock,
            uint64 executionBlock,
            uint64 snapshotBlock,
            uint64 supportRequired,
            uint64 minAcceptQuorum,
            uint256 votingPower,
            uint256 yea,
            uint256 nay,
            bytes script
        )
    {
        Vote storage vote_ = votes[_voteId];

        open = _isVoteOpen(vote_);
        executed = vote_.executed;
        startBlock = vote_.startBlock;
        executionBlock = vote_.executionBlock;
        snapshotBlock = vote_.snapshotBlock;
        votingPower = token.totalSupplyAt(vote_.snapshotBlock);
        supportRequired = vote_.supportRequiredPct;
        minAcceptQuorum = vote_.minAcceptQuorumPct;
        yea = vote_.yea;
        nay = vote_.nay;
        script = vote_.executionScript;
    }

    /**
    * @dev Return the state of a voter for a given vote by its ID
    * @param _voteId Vote identifier
    * @return VoterState of the requested voter for a certain vote
    */
    function getVoterState(uint256 _voteId, address _voter) public view voteExists(_voteId) returns (VoterState) {
        return votes[_voteId].voters[_voter];
    }

    // Internal fns

    /**
    * @dev Internal function to create a new vote
    * @return voteId id for newly created vote
    */
    function _newVote(bytes _executionScript, string _metadata, bool _castVote) internal returns (uint256 voteId) {
        voteId = ++votesLength; // Increment votesLength before assigning to votedId. The first voteId is 1.

        uint64 previousVoteStartBlock = votes[voteId - 1].startBlock;
        uint64 earliestStartBlock = previousVoteStartBlock == 0 ? 0 : previousVoteStartBlock.add(bufferBlocks);
        uint64 startBlock = earliestStartBlock < getBlockNumber64() ? getBlockNumber64() : earliestStartBlock;

        uint64 executionBlock = startBlock.add(durationBlocks).add(executionDelayBlocks);

        Vote storage vote_ = votes[voteId];
        vote_.startBlock = startBlock;
        vote_.executionBlock = executionBlock;
        vote_.snapshotBlock = startBlock - 1; // avoid double voting in this very block
        vote_.supportRequiredPct = supportRequiredPct;
        vote_.minAcceptQuorumPct = minAcceptQuorumPct;
        vote_.executionScript = _executionScript;

        emit StartVote(voteId, msg.sender, _metadata);

        if (_castVote && _canVote(voteId, msg.sender)) {
            _vote(voteId, true, msg.sender);
        }
    }

    /**
    * @dev Internal function to cast a vote. It assumes the queried vote exists.
    */
    function _vote(uint256 _voteId, bool _supports, address _voter) internal {
        Vote storage vote_ = votes[_voteId];

        uint256 voterStake = _voterStake(vote_, _voter);

        if (_supports) {
            vote_.yea = vote_.yea.add(voterStake);
            if (latestYeaVoteId[_voter] < _voteId) {
                latestYeaVoteId[_voter] = _voteId;
            }
        } else {
            vote_.nay = vote_.nay.add(voterStake);
        }

        vote_.voters[_voter] = _supports ? VoterState.Yea : VoterState.Nay;

        emit CastVote(_voteId, _voter, _supports, voterStake);
    }

    /**
    * @dev Internal function to check if a vote can be executed. It assumes the queried vote exists.
    * @return True if the given vote can be executed, false otherwise
    */
    function _canExecute(uint256 _voteId) internal view voteExists(_voteId) returns (bool) {
        Vote storage vote_ = votes[_voteId];

        if (vote_.executed) {
            return false;
        }

        // This will always be later than the end of the previous vote
        if (getBlockNumber64() < vote_.executionBlock) {
            return false;
        }

        return _votePassed(vote_);
    }

    /**
    * @dev Internal function to check if a vote has passed. It assumes the vote period has passed.
    * @return True if the given vote has passed, false otherwise.
    */
    function _votePassed(Vote storage vote_) internal view returns (bool) {
        uint256 totalVotes = vote_.yea.add(vote_.nay);
        uint256 votingPowerAtSnapshot = token.totalSupplyAt(vote_.snapshotBlock);

        bool hasSupportRequired = _isValuePct(vote_.yea, totalVotes, vote_.supportRequiredPct);
        bool hasMinQuorum = _isValuePct(vote_.yea, votingPowerAtSnapshot, vote_.minAcceptQuorumPct);

        return hasSupportRequired && hasMinQuorum;
    }

    /**
    * @dev Internal function to check if a voter can participate on a vote. It assumes the queried vote exists.
    * @return True if the given voter can participate a certain vote, false otherwise
    */
    function _canVote(uint256 _voteId, address _voter) internal view returns (bool) {
        Vote storage vote_ = votes[_voteId];

        uint256 voterStake = _voterStake(vote_, _voter);
        bool hasNotVoted = vote_.voters[_voter] == VoterState.Absent;

        return _isVoteOpen(vote_) && voterStake > 0 && hasNotVoted;
    }

    /**
    * @dev Internal function to determine a voters stake which is the minimum of snapshot balance and current balance.
    * @return Voters current stake.
    */
    function _voterStake(Vote storage vote_, address _voter) internal view returns (uint256) {
        uint256 balanceAtSnapshot = token.balanceOfAt(_voter, vote_.snapshotBlock);
        uint256 currentBalance = token.balanceOf(_voter);

        return balanceAtSnapshot < currentBalance ? balanceAtSnapshot : currentBalance;
    }

    /**
    * @dev Internal function to check if a vote is still open
    * @return True if the given vote is open, false otherwise
    */
    function _isVoteOpen(Vote storage vote_) internal view returns (bool) {
        uint256 votingPowerAtSnapshot = token.totalSupplyAt(vote_.snapshotBlock);
        uint64 blockNumber = getBlockNumber64();
        return votingPowerAtSnapshot > 0 && blockNumber >= vote_.startBlock && blockNumber < vote_.startBlock.add(durationBlocks);
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
    * @notice Returns whether the sender has voted on the most recent open vote or closed unexecuted vote.
    * @dev IACLOracle interface conformance. The ACLOracle permissioned function should specify the sender
    *      with 'authP(SOME_ACL_ROLE, arr(sender))', where sender is typically set to 'msg.sender'.
    * @param _sender Voter to check if they can vote
    * return False if the sender has voted on the most recent open vote or closed unexecuted vote, true if they haven't.
    */
    function _noRecentPositiveVotes(address _sender) internal returns (bool) {
        if (votesLength == 0) {
            return true;
        }

        uint256 senderLatestYeaVoteId = latestYeaVoteId[_sender];
        Vote storage senderLatestYeaVote_ = votes[senderLatestYeaVoteId];
        uint64 blockNumber = getBlockNumber64();

        bool senderLatestYeaVoteFailed = !_votePassed(senderLatestYeaVote_);
        bool senderLatestYeaVoteExecutionBlockPassed = blockNumber >= senderLatestYeaVote_.executionBlock;

        uint64 fallbackPeriodLength = bufferBlocks / EXECUTION_PERIOD_FALLBACK_DIVISOR;
        bool senderLatestYeaVoteFallbackPeriodPassed = blockNumber > senderLatestYeaVote_.executionBlock.add(fallbackPeriodLength);

        return senderLatestYeaVoteFailed && senderLatestYeaVoteExecutionBlockPassed || senderLatestYeaVote_.executed || senderLatestYeaVoteFallbackPeriodPassed;
    }
}
