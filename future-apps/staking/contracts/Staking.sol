pragma solidity 0.4.18;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/lib/zeppelin/token/ERC20.sol";


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
  bytes public stakeScript;
  bytes public unstakeScript;
  bytes public lockScript;

  mapping (address => Account) accounts;

  event Stake(address indexed account, uint256 amount);
  event Unstake(address indexed account, uint256 amount);

  event NewLock(address indexed account, uint256 lockId);
  event RemoveLock(address indexed account, address indexed unlocker, uint256 oldLockId);

  event MoveTokens(address indexed from, address indexed to, uint256 amount);

  bytes32 constant STAKE_ROLE = keccak256("STAKE_ROLE");
  bytes32 constant UNSTAKE_ROLE = keccak256("UNSTAKE_ROLE");
  bytes32 constant LOCK_ROLE = keccak256("LOCK_ROLE");
  bytes32 constant GOD_ROLE = keccak256("GOD_ROLE");

  modifier checkUnlocked(uint256 amount) {
    require(unlockedBalanceOf(msg.sender) >= amount);
    _;
  }

  function initialize(ERC20 _token, bytes _stakeScript, bytes _unstakeScript, bytes _lockScript) onlyInit external {
    token = _token;
    stakeScript = _stakeScript;
    unstakeScript = _unstakeScript;
    lockScript = _lockScript;

    initialized();
  }

  function stake(uint256 amount, bytes data) authP(STAKE_ROLE, arr(amount)) public {
    stakeFor(msg.sender, amount, data);
  }

  function stakeFor(address acct, uint256 amount, bytes data) authP(STAKE_ROLE, arr(amount)) public {
    // From needs to be msg.sender to avoid token stealing by front-running
    require(token.transferFrom(msg.sender, this, amount));
    processStake(acct, amount, data);

    if (stakeScript.length > 0) {
      runScript(stakeScript, data, new address[](0));
    }
  }

  function processStake(address acct, uint256 amount, bytes data) internal {
    accounts[acct].amount += amount; // overflow check in token contract
    assert(accounts[acct].amount >= amount);

    Stake(acct, amount);
  }

  function unstake(uint256 amount, bytes data) authP(UNSTAKE_ROLE, arr(amount)) checkUnlocked(amount) public {
    require(accounts[msg.sender].amount >= amount);
    accounts[msg.sender].amount -= amount;

    require(token.transfer(msg.sender, amount));

    Unstake(msg.sender, amount);

    if (unstakeScript.length > 0) {
      runScript(unstakeScript, data, new address[](0));
    }
  }

  function lock(
    uint256 amount,
    uint8 lockUnit,
    uint64 lockEnds,
    address unlocker,
    bytes data
  )
    authP(LOCK_ROLE, arr(amount, uint256(lockUnit), uint256(lockEnds)))
    checkUnlocked(amount)
    public
  {
    Lock memory newLock = Lock(amount, Timespan(lockEnds, TimeUnit(lockUnit)), unlocker);
    uint256 lockId = accounts[msg.sender].locks.push(newLock) - 1;

    NewLock(msg.sender, lockId);

    if (lockScript.length > 0) {
      runScript(lockScript, data, new address[](0));
    }
  }

  function stakeAndLock(
    uint256 amount,
    uint8 lockUnit,
    uint64 lockEnds,
    address unlocker,
    bytes stakeData,
    bytes lockData
  )
    authP(STAKE_ROLE, arr(amount))
    authP(LOCK_ROLE, arr(amount, uint256(lockUnit), uint256(lockEnds)))
    public
  {
    stake(amount, stakeData);
    lock(amount, lockUnit, lockEnds, unlocker, lockData);
  }

  function moveTokens(address from, address to, uint256 amount) authP(GOD_ROLE, arr(from, to, amount)) external {
    require(accounts[from].amount >= amount);

    accounts[from].amount -= amount;
    accounts[to].amount += amount;

    assert(accounts[to].amount >= amount);

    MoveTokens(from, to, amount);
  }

  function removeLocks(address acct) external {
    while (accounts[acct].locks.length > 0) {
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

    Lock[] storage locks = accounts[acct].locks;
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

  function lastLock(address acct) public view returns (Lock) {
    return accounts[acct].locks[locksCount(acct) - 1];
  }

  function canRemoveLock(address acct, uint256 lockId) public view returns (bool) {
    Lock memory l = accounts[acct].locks[lockId];

    return timespanEnded(l.timespan) || msg.sender == l.unlocker;
  }

  function timespanEnded(Timespan memory timespan) internal view returns (bool) {
    uint256 comparingValue = timespan.unit == TimeUnit.Blocks ? block.number : block.timestamp;

    return uint64(comparingValue) > timespan.end;
  }
}
