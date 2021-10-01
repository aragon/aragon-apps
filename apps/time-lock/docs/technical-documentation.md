# Time Lock App Technical Docs

This doc goes through `TimeLock.sol`, explaining every function and it's intended functionality.

<br />

## TimeLock.sol

`TimeLock.sol` is an Aragon [forwarder](https://hack.aragon.org/docs/forwarding-intro). By granting the Time Lock app a permission like `Create Votes` the user will be prompted and required to lock tokens before the user's intent can be forwarded.

### Solidity Version

`TimeLock.sol` is dependent on many Aragon apps that use solidity 0.4.24. In the future these may be upgraded.

```
pragma solidity ^0.4.24;
```

### Dependencies

Our dependencies are fairly straight forward

```

// pre audited contracts
import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/common/IForwarder.sol";
import "@aragon/os/contracts/common/IForwarderFee.sol";
import "@aragon/os/contracts/common/SafeERC20.sol";
import "@aragon/os/contracts/lib/token/ERC20.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
```

### Global Variables

Locks are encoded in a `WithdrawLock` struct that keeps track of the `unlockTime` (when the lock is unlocked) and `lockAmount` (how many tokens were locked).

```
struct WithdrawLock {
	uint256 unlockTime;
	uint256 lockAmount;
}

// the type of token to be locked
// - in the future this may include ETH as well as ERC20 tokens
ERC20 public token;
// the amount of time to lock the token
uint256 public lockDuration;
// the amount of that token to be locked
uint256 public lockAmount;
// a multiplier that increases the amount and time locked depending on how many locks you already have (spam deterent)
uint256 public spamPenaltyFactor;
// the spamPenaltyFactor is divided by `PCT_BASE` to create a fractional percentage
// example: the app's standard `lockDuration` multiplied by the user's active locks multiplied by the `spamPenaltyFactor` on this lock, all divided by PCT_BASE to either create a multiplier or fractional percentage of the standard `lockDuration`
// - note: since this is a constant it can be set here rather than in the `initialize()` function
// The spam penalty value is expressed between zero and a maximum of 10^18 (that represents 100%). As a consequence, it's important to consider that 1% is actually represented by 10^16.
uint256 public constant PCT_BASE = 10 ** 18;

```

### Spam penalty Variables Explained

The spam penalty calculation does not reflect how many tokens should be locked and for how long, but rather the amount and duration to add to the base lockAmount and lockDuration. The `spamPenaltyFactor` is a % of the base lock amount and duration values set on the app. This value increases the more locks an account has, making it more and more expensive to create many locks.

When an account wants to submit a proposal they will have to lock `lockAmount` + (`lockAmount` _ `totalActiveLocks` _ `spamPenaltyFactor`/ `PCT_BASE`) for a duration of `lockDuration` + (`lockDuration` _ `totalActiveLocks` _ `spamPenaltyFactor` / `PCT_BASE`)

e.g. if the `lockAmount` = 20 tokens, `lockDuration` = 6 days and `spamPenaltyFactor` is 50%, and the account submitting a proposal has 2 active locks, they will have to lock 40 tokens for 12 days.

The idea behind this is to prevent spamming of proposals.

> Note: this only works if permissions on the Time Lock App are set so that only members of the DAO `canForward()`. If _anyone_ can submit proposals or DAO members can easily transfer their membership tokens between accounts the spam penalty mechanism is much less effective.

### Mapping Addresses to Locks

`addressesWithdawLocks` maps an address to it's locks. Since an address can have multiple locks, these locks are stored in a `WithdrawLock[]` dynamically sized array. Each lock is a `WithdrawLock` struct that has an `unlockAmount` and `unlockTime`. Each address is mapped to a `WithdrawLock[]` array that holds that address's `WithdrawLock` stucts.

```

// Using an array of WithdrawLocks instead of a mapping here means we cannot add fields to the WithdrawLock struct in an upgrade of this contract. If we want to be able to add to the WithdrawLock structure in future we must use a mapping instead.
mapping(address => WithdrawLock[]) public addressesWithdrawLocks;

```

### Emitting Events

```
event ChangeLockDuration(uint256 newLockDuration);
event ChangeLockAmount(uint256 newLockAmount);
event ChangeSpamPenaltyFactor(uint256 newSpamPenaltyFactor);
event NewLock(address lockAddress, uint256 unlockTime, uint256 lockAmount);
event Withdrawal(address withdrawalAddress ,uint256 withdrawalLockCount);
```

### Initializing The Time Lock App

```
/**
* @notice Initialize the Time Lock app
* @param _token The token which will be locked when forwarding actions
* @param _lockDuration The duration tokens will be locked before being able to be withdrawn
* @param _lockAmount The amount of the token that is locked for each forwarded action
* @param _spamPenaltyFactor The spam penalty factor (`_spamPenaltyFactor / PCT_BASE`)
*/
function initialize(address _token, uint256 _lockDuration, uint256 _lockAmount, uint256 _spamPenaltyFactor) external onlyInit {
    require(isContract(_token), ERROR_NOT_CONTRACT);

    token = ERC20(_token);
    lockDuration = _lockDuration;
    lockAmount = _lockAmount;
    spamPenaltyFactor = _spamPenaltyFactor;

    scriptRunnerBlacklist.push(address(this));
    scriptRunnerBlacklist.push(address(token));

    initialized();
}
```

### Changing Global Parameters

These functions allow changes to the standard parameters for the Time Lock app. We anticipate the `CHANGE_DURATION_ROLE`, `CHANGE_AMOUNT_ROLE`, and `CHANGE_SPAM_PENALTY_ROLE` to be set to the `Voting` app or to an administrative member of the DAO.

```
/**
* @notice Change lock duration to `_lockDuration`
* @param _lockDuration The new lock duration
*/
function changeLockDuration(uint256 _lockDuration) external auth(CHANGE_DURATION_ROLE) {
    lockDuration = _lockDuration;
    emit ChangeLockDuration(lockDuration);
}

/**
* @notice Change lock amount to `_lockAmount`
* @param _lockAmount The new lock amount
*/
function changeLockAmount(uint256 _lockAmount) external auth(CHANGE_AMOUNT_ROLE) {
    lockAmount = _lockAmount;
    emit ChangeLockAmount(lockAmount);
}

/**
* @notice Change spam penalty factor to `_spamPenaltyFactor`
* @param _spamPenaltyFactor The new spam penalty factor
*/
function changeSpamPenaltyFactor(uint256 _spamPenaltyFactor) external auth(CHANGE_SPAM_PENALTY_ROLE) {
    spamPenaltyFactor = _spamPenaltyFactor;
    emit ChangeSpamPenaltyFactor(_spamPenaltyFactor);
}
```

### Withdrawing Locks

`withdrawTokens()` allows the caller to withdraw all unlocked tokens while the `withdrawTokens(uint256 _numberWithdrawLocks)` allows the callers to specify how many locks to withdraw.

```
/**
* @notice Withdraw all withdrawable tokens
*/
function withdrawAllTokens() external {
    WithdrawLock[] storage addressWithdrawLocks = addressesWithdrawLocks[msg.sender];
    _withdrawTokens(addressWithdrawLocks.length);
}

/**
* @notice Withdraw all withdrawable tokens from the `_numberWithdrawLocks` oldest withdraw lock's
* @param _numberWithdrawLocks The number of withdraw locks to attempt withdrawal from
*/
function withdrawTokens(uint256 _numberWithdrawLocks) external {
    _withdrawTokens(_numberWithdrawLocks);
}
```

### Forwarding Intent

`forwardFee()` returns the amount that a user must lock in order to forward an intent. This function is generally called by the [Aragon wrapper](https://github.com/aragon/aragon.js/blob/852d39b4411e415fd88d089041f2a6baf87a83ab/packages/aragon-wrapper/src/utils/transactions.js#L66) to check what token contract should be the user interacting with to perform an approve and for what amount before forwarding the intent.

While this function is unopinionated as to what that intent is, in the context of Dandelion Orgs we expect this to be a proposal for the group to vote on.
Note that the Time Lock app has to be the first forwarder in the transaction path, it must be called by an EOA not another forwarder, in order for the spam penalty mechanism to work.

```
/**
* @notice Returns the forward fee token and required lock amount
* @dev IFeeForwarder interface conformance
*      Note that the Time Lock app has to be the first forwarder in the transaction path, it must be called by an
*      EOA not another forwarder, in order for the spam penalty mechanism to work
* @return Forwarder token address
* @return Forwarder lock amount
*/
function forwardFee() external view returns (address, uint256) {
    (uint256 _spamPenaltyAmount, ) = getSpamPenalty(msg.sender);

    uint256 totalLockAmountRequired = lockAmount.add(_spamPenaltyAmount);

    return (address(token), totalLockAmountRequired);
}
```

`isForwarder()` ensures that the Time Lock app can forward intents

```
/**
* @notice Returns whether the Time Lock app is a forwarder or not
* @dev IForwarder interface conformance
* @return Always true
*/
function isForwarder() external pure returns (bool) {
    return true;
}
```

`canForward()` checks if the `msg.sender` can forward an intent. We check if the `msg.sender` has the `LOCK_TOKENS_ROLE` which can be set to any app, but in the Dandelion Org Template we set it to a [Token Balance Oracle](https://github.com/1Hive/token-oracle) that checks if the address that is trying to forward an intent is also a DAO token holder.

```
/**
* @notice Returns whether the `_sender` can forward actions or not
* @dev IForwarder interface conformance
* @return True if _sender has LOCK_TOKENS_ROLE role
*/
function canForward(address _sender, bytes) public view returns (bool) {
    return canPerform(_sender, LOCK_TOKENS_ROLE, arr(_sender));
}
```

`forward()` checks the amount that a user has to lock and for how long, to forward an intent, gets that amount (asumming the user approved the contract to transfer that amount of tokens to itself prior to this transaction) from the user and creates the lock, then forwards the intent.

```
/**
* @notice Locks `@tokenAmount(self.token(): address, self.getSpamPenalty(msg.sender): uint + self.lockAmount(): uint)` tokens for `@transformTime(self.getSpamPenalty(msg.sender): (uint, <uint>) + self.lockDuration(): uint)` and executes desired action
* @dev IForwarder interface conformance.
*      Note that the Time Lock app has to be the first forwarder in the transaction path, it must be called by an
*      EOA not another forwarder, in order for the spam penalty mechanism to work
* @param _evmCallScript Script to execute
*/
function forward(bytes _evmCallScript) public {
    require(canForward(msg.sender, _evmCallScript), ERROR_CAN_NOT_FORWARD);
    _ensureOnlyOneScript(_evmCallScript);

    WithdrawLock[] storage addressWithdrawLocks = addressesWithdrawLocks[msg.sender];
    (uint256 spamPenaltyAmount, uint256 spamPenaltyDuration) = getSpamPenalty(msg.sender);

    uint256 totalAmount = lockAmount.add(spamPenaltyAmount);
    uint256 totalDuration = lockDuration.add(spamPenaltyDuration);
    uint256 unlockTime = getTimestamp().add(totalDuration);

    addressWithdrawLocks.push(WithdrawLock(unlockTime, totalAmount));
    require(token.safeTransferFrom(msg.sender, address(this), totalAmount), ERROR_TRANSFER_REVERTED);

    emit NewLock(msg.sender, unlockTime, totalAmount);
    runScript(_evmCallScript, new bytes(0), scriptRunnerBlacklist);
}
```

### Getters

`getWithdrawLocksCount()` returns the amount of locks a user has

```
function getWithdrawLocksCount(address _lockAddress) public view returns (uint256) {
    return addressesWithdrawLocks[_lockAddress].length;
}
```

`getSpamPenalty()` calculates the amount and duration penalty of `_sender`

```
/**
* @notice Get the amount and duration penalty based on the number of current locks `_sender` has
* @dev Potential out of gas issue is considered acceptable. In this case a user would just have to wait and withdraw()
*      some tokens before this function and forward() could be called again.
* @return amount penalty
* @return duration penalty
*/
function getSpamPenalty(address _sender) public view returns (uint256, uint256) {
    WithdrawLock[] memory addressWithdrawLocks = addressesWithdrawLocks[_sender];

    uint256 activeLocks = 0;
    for (uint256 withdrawLockIndex = 0; withdrawLockIndex < addressWithdrawLocks.length; withdrawLockIndex++) {
        if (getTimestamp() < addressWithdrawLocks[withdrawLockIndex].unlockTime) {
            activeLocks += 1;
        }
    }

    uint256 totalAmount = lockAmount.mul(activeLocks).mul(spamPenaltyFactor).div(PCT_BASE);
    uint256 totalDuration = lockDuration.mul(activeLocks).mul(spamPenaltyFactor).div(PCT_BASE);

    return (totalAmount, totalDuration);
}
```

### Withdrawing Locked Tokens

`withdrawTokens()` internal function to withdraw `_numberWithdrawLocks` of `msg.sender` locks.

This function assumes the array of locks of `msg.sender` is in ascending order by `unlockTime`, so it will remove the `_numberWithdrawLocks` first locks from the array (assuming `msg.sender` has that many unlocked locks).
After deletion of locks we shift right the remaining locks to ensure the array keeps ordered.

```
function _withdrawTokens(uint256 _numberWithdrawLocks) internal {
    WithdrawLock[] storage addressWithdrawLocks = addressesWithdrawLocks[msg.sender];
    require(_numberWithdrawLocks <= addressWithdrawLocks.length, ERROR_TOO_MANY_WITHDRAW_LOCKS);

    uint256 amountOwed = 0;
    uint256 withdrawLockCount = 0;
    uint256 addressWithdrawLocksLength = addressWithdrawLocks.length;

    for (uint256 i = _numberWithdrawLocks; i > 0; i--) {

        uint256 withdrawLockIndex = i - 1;
        WithdrawLock memory withdrawLock = addressWithdrawLocks[withdrawLockIndex];

        if (getTimestamp() > withdrawLock.unlockTime) {
            amountOwed = amountOwed.add(withdrawLock.lockAmount);
            withdrawLockCount += 1;
            delete addressWithdrawLocks[withdrawLockIndex];
        }
    }

    uint256 newAddressWithdrawLocksLength = addressWithdrawLocksLength - withdrawLockCount;
    for (uint256 shiftIndex = 0; shiftIndex < newAddressWithdrawLocksLength; shiftIndex++) {
        addressWithdrawLocks[shiftIndex] = addressWithdrawLocks[shiftIndex + withdrawLockCount];
    }

    addressWithdrawLocks.length = newAddressWithdrawLocksLength;

    token.transfer(msg.sender, amountOwed);

    emit Withdrawal(msg.sender, withdrawLockCount);
}
```

### Ensuring that only onw script is forwarded

`_ensureOnlyOneScript` is an internal function to ensure that only one script is forwarded in an intent.
This is to prevent for example in the context of Dandelion Orgs from members creating multiple scripts with several proposals.

```
function _ensureOnlyOneScript(bytes _evmScript) internal {
    uint256 specIdLength = 0x4;
    uint256 addressLength = 0x14;
    uint256 dataSizeLength = 0x4;
    uint256 dataSizeLocation = 0x18;

    IEVMScriptExecutor scriptExecutor = getEVMScriptExecutor(_evmScript);
    require(scriptExecutor.executorType() == CALLS_SCRIPT_EXECUTOR_TYPE, ERROR_USE_CALLS_SCRIPT_EXECUTOR);

    uint256 calldataLength = uint256(_evmScript.uint32At(dataSizeLocation));
    uint256 scriptExpectedLength = specIdLength + addressLength + dataSizeLength + calldataLength;
    require(scriptExpectedLength == _evmScript.length, ERROR_SCRIPT_INCORRECT_LENGTH);
}
```
