pragma solidity 0.4.18;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/lib/zeppelin/ERC20.sol";


contract Staking is AragonApp {
  struct Account {
    uint256 amount;
    Lock[] locks;
  }

  struct Lock {
    uint256 amount;
    Timespan timespan;
    address unlocker;
  }

  struct Timespan {
    //uint64 start; // exclusive
    uint64 end;     // inclusive
    TimeUnit unit;
  }

  enum TimeUnit { Blocks, Seconds }

  ERC20 public token;
  mapping (address => Account) accounts;

  event Stake(address indexed account, uint256 amount);
  event Unstake(address indexed account, uint256 amount);

  event NewLock(address indexed account, uint256 lockId);
  event RemoveLock(address indexed account, address indexed unlocker, uint256 oldLockId);

  modifier checkUnlocked(uint256 amount) {
    require(unlockedBalanceOf(msg.sender) >= amount);
    _;
  }

  function stake(uint256 amount) external {
    stakeFor(msg.sender, amount, new bytes(0));
  }

  function stakeFor(address acct, uint256 amount, bytes data) public {
    // From needs to be msg.sender to avoid token stealing by front-running
    require(token.transferFrom(msg.sender, this, amount));
    processStake(acct, amount, data);
  }

  function processStake(address acct, uint256 amount, bytes data) internal {
    accounts[acct].amount += amount; // overflow check in token contract
    assert(accounts[acct].amount >= amount);

    Stake(acct, amount);
  }

  function unstake(uint256 amount) external {
    unstakeFor(amount, new bytes(0));
  }

  function unstakeFor(uint256 amount, bytes data) checkUnlocked(amount) public {
    accounts[msg.sender].amount -= amount;
    assert(accounts[msg.sender].amount <= amount); // check underflows

    require(token.transfer(msg.sender, amount));

    Unstake(msg.sender, amount);
  }

  function lock(uint256 amount, Timespan timespan, address unlocker) checkUnlocked(amount) external {
    Lock newLock = Lock(amount, timespan, unlocker);
    uint256 lockId = accounts[msg.sender].locks.push(newLock) - 1;

    NewLock(msg.sender, lockId);
  }

  function removeLocks(address acct) external {
    while (accounts[acct].length > 0) {
      if (canRemoveLock(acct, 0)) {
        removeLock(acct, 0);
      }
    }
  }

  function removeLock(address acct, uint256 lockId) public {
    require(canRemoveLock(acct, lockId));

    uint256 lastAccountLock = accounts[acct].locks.length - 1;
    if (lockId < lastAccountLock) {
      accounts[acct].locks[lockId] = accounts[acct].locks[lastAccountLock];
    }

    accounts[acct].locks.length -= 1;

    RemoveLock(acct, msg.sender, lockId);
  }

  function unlockedBalanceOf(address acct) public view returns (uint256) {
    uint256 unlockedTokens = accounts[acct].amount;

    Lock[] locks = account[acct].locks;
    for (uint256 i = 0; i < locks.length; i++) {
      if (!canRemoveLock(acct, i)) {
        unlockedTokens -= locks[i].amount;
      }
    }

    return unlockedTokens;
  }

  function locksCount(address acct) public view returns (uint256) {
    return accounts[acct].locks.length;
  }

  function getLock(address acct, uint256 lockId) public view returns (Lock) {
    return accounts[acct].locks[lockId];
  }

  function canRemoveLock(address acct, uint256 lockId) public view returns (bool) {
    Lock lock = accounts[acct].locks[lockId];

    return timespanEnded(lock.timespan) || msg.sender == lock.unlocker;
  }

  function timespanEnded(Timespan memory timespan) internal pure returns (bool) {
    uint64 comparingValue = timespan.unit == TimeUnit.Blocks ? block.number : block.timestamp;

    return comparingValue > timespan.end;
  }
}
