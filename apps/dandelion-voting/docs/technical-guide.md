<br />

## Overview

The Dandelion Voting app is a fork of the Original [Aragon Voting app](https://github.com/aragon/aragon-apps/tree/master/apps/voting).
It serves the same purpose as the original Voting app but also enables organizations to restrict actions to members who have expressed approval in recent votes. It basically means that by voting yes on a proposal you are committing to a decision in the Org.

The main changes that have been implemented which differ from the original Voting app are:

- Removed the ability for a user to change their vote.
- Added a buffer period which determines how much time in blocks must pass between the start of each vote.
- Added an execution delay period in blocks (this means that the `full vote duration` + `full execution delay period` must pass before being able to execute a vote in case it passes).
- Removed the early execution functionality.
- Changed the vote duration to blocks. The main reason for this is that since proposals are queued we do not necessarily know which block number to use for the vote snapshot (since we are not necessarily processing the transaction right when the vote starts).
- Keep track of the latest vote ids users have voted yes on.
- Make the app an [ACL Oracle](https://hack.aragon.org/docs/acl_IACLOracle).

<br />

## External Contract Dependencies

The Dandelion Voting app relies on the following external contracts.

### Audited External Contracts

```
import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/common/IForwarder.sol";
import "@aragon/os/contracts/acl/IACLOracle.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";
import "@aragon/apps-shared-minime/contracts/MiniMeToken.sol";
```

These contracts have been audited by 3rd parties. Information on past Aragon audits can be found at the following locations:

- https://github.com/aragon/security-review/blob/master/past-reports.md
- https://wiki.aragon.org/association/security/

<br />

## Roles and Permissions

The Dandelion Voting app has the following roles:

```
bytes32 public constant CREATE_VOTES_ROLE = keccak256("CREATE_VOTES_ROLE");
bytes32 public constant MODIFY_SUPPORT_ROLE = keccak256("MODIFY_SUPPORT_ROLE");
bytes32 public constant MODIFY_QUORUM_ROLE = keccak256("MODIFY_QUORUM_ROLE");
bytes32 public constant MODIFY_BUFFER_BLOCKS_ROLE = keccak256("MODIFY_BUFFER_BLOCKS_ROLE");
bytes32 public constant MODIFY_EXECUTION_DELAY_ROLE = keccak256("MODIFY_EXECUTION_DELAY_ROLE");
```

These roles can be set to another Aragon app or an individual address.

<br />

## Globally Scoped Variables

The following variables are globally scoped within the app.

```
// Possible vote states
enum VoterState { Absent, Yea, Nay }

// Vote structure
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

// Token that will be used to vote on proposals
MiniMeToken public token;

// Minimum % of support required for votes to pass
uint64 public supportRequiredPct;

// Minimum % of quorum required for votes to pass
uint64 public minAcceptQuorumPct;

// Vote duration in blocks (determines how long from the start of a vote till it ends)
uint64 public durationBlocks;

// Vote buffer in blocks (determines how much time in blocks must pass between the start of each vote)
uint64 public bufferBlocks;

// Vote execution delay in blocks (determines how much time in blocks must pass from when a vote is passed till it can be executed)
uint64 public executionDelayBlocks;

// Mapping that keeps track of votes
mapping (uint256 => Vote) internal votes;

// Variable that keeps track of the number of votes
uint256 public votesLength;

// Mapping that keeps track of the latest vote id for each user that have voted yes on a proposal
// Note that for users that have not voted yes yet on any proposal the corresponding id will be 0.
// Because of this, we must ensure the first vote starts with id 1 (unlike the original voting app where it starts with 0).
mapping (address => uint256) public latestYeaVoteId;

```

<br />

## Events

Events are emitted when the following functions are called.

```
// A new vote has been created
event StartVote(uint256 indexed voteId, address indexed creator, string metadata);
// An account has casted a vote
event CastVote(uint256 indexed voteId, address indexed voter, bool supports, uint256 stake);
// A vote has been executed
event ExecuteVote(uint256 indexed voteId);
// Minimum support required has been changed
event ChangeSupportRequired(uint64 supportRequiredPct);
// Minimum Quorum required has been changed
event ChangeMinQuorum(uint64 minAcceptQuorumPct);
// Buffer duration has been changed
event ChangeBufferBlocks(uint64 bufferBlocks);
// Execution delay duration has been changed
event ChangeExecutionDelayBlocks(uint64 executionDelayBlocks);
```

<br />

## Modifiers

The `voteExists` modifier checks that a vote id is valid and exists (note that we check the vote id is not equal to zero)

```
modifier voteExists(uint256 _voteId) {
    require(_voteId != 0, ERROR_VOTE_ID_ZERO);
    require(_voteId <= votesLength, ERROR_NO_VOTE);
    _;
}
```

<br />

## Initialization

The Dandelion Voting app is initialized with the `_token`, `_supportRequiredPct`, `_minAcceptQuorumPct`, `_durationBlocks`, `_bufferBlocks` and `_executionDelayBlocks` parameters.

```
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
```

<br />

## Changing configuration values

This are pretty much straight forward functions to change vote settings. (Note that changing this values will only affect subsequent votes)

```
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
```

### New vote

External function to create votes.
It calls an internal function that handles all the logic to create new votes.

```
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
```

Internal function that creates the votes:

```
/**
  * @dev Internal function to create a new vote
  * @return voteId id for newly created vote
  */
  function _newVote(bytes _executionScript, string _metadata, bool _castVote) internal returns (uint256 voteId) {
      voteId = ++votesLength; // Increment votesLength before assigning to votedId. The first voteId is 1.

      // Get the start block of the previous vote (if it's the first vote will be 0)
      uint64 previousVoteStartBlock = votes[voteId - 1].startBlock;
      // Here we ensure that the next vote created starts at least `bufferBlocks` blocks after the previous vote start block
      uint64 earliestStartBlock = previousVoteStartBlock == 0 ? 0 : previousVoteStartBlock.add(bufferBlocks);
      // Get the actual start block of the next vote created (if the bufferBlocks duration has already passes then get the current block number)
      uint64 startBlock = earliestStartBlock < getBlockNumber64() ? getBlockNumber64() : earliestStartBlock;

      // Get the block from where the vote will be able to be executed in case it passes
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
```

### Vote

External function that will be called when users cast a vote.
It calls an internal function that handles all the logic to cast a vote.

```
  /**
  * @notice Vote `_supports ? 'yes' : 'no'` in vote #`_voteId`
  * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
  *      created via `newVote(),` which requires initialization
  * @param _voteId Id for vote
  * @param _supports Whether voter supports the vote
  */
  function vote(uint256 _voteId, bool _supports) external voteExists(_voteId) {
      // Check the user can vote
      require(_canVote(_voteId, msg.sender), ERROR_CAN_NOT_VOTE);
      _vote(_voteId, _supports, msg.sender);
  }
```

Internal function that casts a vote:

```
  /**
  * @dev Internal function to cast a vote. It assumes the queried vote exists.
  */
  function _vote(uint256 _voteId, bool _supports, address _voter) internal {
      Vote storage vote_ = votes[_voteId];

      uint256 voterStake = _voterStake(vote_, _voter);

      if (_supports) {
          vote_.yea = vote_.yea.add(voterStake);
          if (latestYeaVoteId[_voter] < _voteId) {
              // Update latest vote id where voter voted yea
              latestYeaVoteId[_voter] = _voteId;
          }
      } else {
          vote_.nay = vote_.nay.add(voterStake);
      }

      vote_.voters[_voter] = _supports ? VoterState.Yea : VoterState.Nay;

      emit CastVote(_voteId, _voter, _supports, voterStake);
  }
```

## Forwarding functions

The Dandelion Voting app mantains all forwarding functionality as the Original Voting app:

```
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
```

<br />

### ACL Oracle function

This is the function that will be called by another app to check if an address can perform certain action.

In the context of [Dandelion Orgs](https://github.com/1Hive/dandelion-org), the redeem functionality will be guarded by a role set behind this ACL Oracle. This means that whenever a user wants to redeem some tokens, it will first call this function to check whether s/he can perform the action or not.

This functions tells if a user canPerform the function that is behind this ACL Oracle if one of this conditions is met:

- The latest vote in which the user voted yea failed (did not passed) and the execution delay for this vote has already passed.
- The latest vote in which the user voted yea passed and has been executed.
- The latest vote in which the user voted yea passed and the fallback period has passed (set to `bufferBlocks / 2`).

The fallback period is intended to ensure users are both locked in for votes they voted yes on, but still have an opportunity to exit before the next vote that they didn't vote yes on gets executed.
The idea here is that, the 1/2 buffer duration give other members an opportunity to execute the vote before anyone who voted yes on the proposal has the opportunity to exit.
It also takes into account the possibility of a vote to fail its execution due to reasons that are outside of the Org's control.

```
/**
* @notice Returns whether the sender has voted on the most recent open vote or closed unexecuted vote.
* @dev IACLOracle interface conformance. The ACLOracle permissioned function should specify the sender
*      with 'authP(SOME_ACL_ROLE, arr(sender))', where sender is typically set to 'msg.sender'.
* @param _how Array passed by Kernel when using 'authP()'. First item should be the address to check can perform.
* return False if the sender has voted on the most recent open vote or closed unexecuted vote, true if they haven't.
*/
function canPerform(address, address, bytes32, uint256[] _how) external view returns (bool) {
    if (votesLength == 0) {
        return true;
    }

    // Check param integrity for safety
    require(_how.length > 0, ERROR_ORACLE_SENDER_MISSING);
    require(_how[0] < 2**160, ERROR_ORACLE_SENDER_TOO_BIG);
    require(_how[0] != 0, ERROR_ORACLE_SENDER_ZERO);

    address sender = address(_how[0]);
    // get the sender's latest yea vote id
    uint256 senderLatestYeaVoteId = latestYeaVoteId[sender];
    Vote storage senderLatestYeaVote_ = votes[senderLatestYeaVoteId];
    uint64 blockNumber = getBlockNumber64();

    // get if the latest vote the sender voted yea on failed
    bool senderLatestYeaVoteFailed = !_votePassed(senderLatestYeaVote_);
    // get if the latest vote the sender voted yea on has already passed it's execution delay period
    bool senderLatestYeaVoteExecutionBlockPassed = blockNumber >= senderLatestYeaVote_.executionBlock;

    // get fallback period duration
    uint64 fallbackPeriodLength = bufferBlocks / EXECUTION_PERIOD_FALLBACK_DIVISOR;
    bool senderLatestYeaVoteFallbackPeriodPassed = blockNumber > senderLatestYeaVote_.executionBlock.add(fallbackPeriodLength);

    // tell wether sender can perform action or not based on the conditions listed above
    return senderLatestYeaVoteFailed && senderLatestYeaVoteExecutionBlockPassed || senderLatestYeaVote_.executed || senderLatestYeaVoteFallbackPeriodPassed;
}
```

<br />

### Getter functions

#### canExecute

Public function that Tells whether a vote can be executed or not
It calls an internal function that implements the actual logic.

```
  /**
  * @notice Tells whether a vote #`_voteId` can be executed or not
  * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
  *      created via `newVote(),` which requires initialization
  * @return True if the given vote can be executed, false otherwise
  */
  function canExecute(uint256 _voteId) public view returns (bool) {
      return _canExecute(_voteId);
  }
```

Internal function that checks if a vote can be executed or not:

```
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
```

#### canVote

Public function that Tells whether the sender can participate in a vote or not
It calls an internal function that implements the actual logic.

```
  /**
  * @notice Tells whether `_sender` can participate in the vote #`_voteId` or not
  * @dev Initialization check is implicitly provided by `voteExists()` as new votes can only be
  *      created via `newVote(),` which requires initialization
  * @return True if the given voter can participate a certain vote, false otherwise
  */
  function canVote(uint256 _voteId, address _voter) public view voteExists(_voteId) returns (bool) {
      return _canVote(_voteId, _voter);
  }
```

Internal function that checks if a voter can vote on a given vote or not.
A voter will be able to vote if:

- The vote is open.
- Voter has a positive stake.
- Voter has not yet voted in the vote in question.

```
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
```

#### getVote

Get all information of a vote by its ID

Note that the `voting power` is calculated dynamically since we cannot ensure that the `vote snapshot` has already passed or not.
In the case that it has not passed yet, the `voting power` will be the `total supply` at the `latest block`.

```
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
```

#### getVoterState

Public function that tells the state of a voter (Absent | Yea | Nay) for a given vote

```
  /**
  * @dev Return the state of a voter for a given vote by its ID
  * @param _voteId Vote identifier
  * @return VoterState of the requested voter for a certain vote
  */
  function getVoterState(uint256 _voteId, address _voter) public view voteExists(_voteId) returns (VoterState) {
      return votes[_voteId].voters[_voter];
  }
```

#### \_votePassed

Tells wether the vote has passed or not

```
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
```

#### \_voterStake

Function that returns a voter stake balance. This is the minimum between vote snapshot balance and current balance.

The main reason we are determining the minimum of these values for a voter's stake is that if we used only the snapshot balance
it would allow someone to get away with voting yes and exiting the org (in the Dandelion context) before a proposal is executed.
The user can wait for a vote to be created (and the balance snapshot taken), then redeem before voting yes, then voting (they will have voting weight because the balance snapshot is in the past).

```
  /**
  * @dev Internal function to determine a voters stake which is the minimum of snapshot balance and current balance.
  * @return Voters current stake.
  */
  function _voterStake(Vote storage vote_, address _voter) internal view returns (uint256) {
      uint256 balanceAtSnapshot = token.balanceOfAt(_voter, vote_.snapshotBlock);
      uint256 currentBalance = token.balanceOf(_voter);

      return balanceAtSnapshot < currentBalance ? balanceAtSnapshot : currentBalance;
  }
```

#### isVoteOpen

Tells wether a vote is open or not

```
  /**
  * @dev Internal function to check if a vote is still open
  * @return True if the given vote is open, false otherwise
  */
  function _isVoteOpen(Vote storage vote_) internal view returns (bool) {
      uint256 votingPowerAtSnapshot = token.totalSupplyAt(vote_.snapshotBlock);
      uint64 blockNumber = getBlockNumber64();
      return votingPowerAtSnapshot > 0 && blockNumber >= vote_.startBlock && blockNumber < vote_.startBlock.add(durationBlocks);
  }
```

```
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
```

## Questions, Comments, and Concerns

If you'd like to talk to us about this contract, please reach out to our dev team. The best place to reach us is the #dev channel on [1Hive Keybase chat](https://1hive.org/contribute/keybase).

<br />
