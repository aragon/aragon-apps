pragma solidity 0.4.18;

import "./interfaces/ERCStaking.sol";
import "./interfaces/IStaking.sol";

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/lib/misc/Migrations.sol";
import "@aragon/os/contracts/lib/zeppelin/token/ERC20.sol";
import "@aragon/os/contracts/lib/zeppelin/math/SafeMath.sol";


contract Staking is ERCStaking, IStaking, AragonApp {
  using SafeMath for uint256;

  uint64 constant public MAX_UINT64 = uint64(-1);
  address constant public ANY_ENTITY = address(0);

  struct Account {
    uint256 amount;
    Lock[] locks;
  }

  struct Lock {
    uint256 amount;
    Timespan timespan;
    address unlocker;
    bytes32 metadata;
  }

  struct Timespan {
    uint64 start;
    uint64 end;
    TimeUnit unit;
  }

  enum TimeUnit { Blocks, Seconds }

  bool public overlocking; // if true, an unlocker can use the same stake in different locks
  ERC20 private stakingToken; // it already has a getter, conforming ERCStaking interface
  bytes public stakeScript;
  bytes public unstakeScript;
  bytes public lockScript;

  mapping (address => Account) accounts;

  // TODO: figure out a way to get lock from metadata, given changing lock ids
  // mapping (bytes32 => LockLocation) lockByMetadata;

  event Locked(address indexed account, uint256 lockId, uint256 amount, bytes32 metadata);
  event Unlocked(address indexed account, address indexed unlocker, uint256 oldLockId);
  event UnlockedPartial(address indexed account, address indexed unlocker, uint256 lockId, uint256 amount);
  event MovedTokens(address indexed from, address indexed to, uint256 amount);

  bytes32 constant public STAKE_ROLE = keccak256("STAKE_ROLE");
  bytes32 constant public UNSTAKE_ROLE = keccak256("UNSTAKE_ROLE");
  bytes32 constant public LOCK_ROLE = keccak256("LOCK_ROLE");
  bytes32 constant public GOD_ROLE = keccak256("GOD_ROLE");

  modifier checkUnlocked(uint256 amount, address unlocker) {
    require(unlockedBalanceOf(msg.sender, unlocker) >= amount);
    _;
  }

  // TODO: Implement forwarder interface

  function initialize(bool _overlocking, ERC20 _stakingToken, bytes _stakeScript, bytes _unstakeScript, bytes _lockScript) onlyInit external {
    overlocking = _overlocking;
    stakingToken = _stakingToken;
    stakeScript = _stakeScript;
    unstakeScript = _unstakeScript;
    lockScript = _lockScript;

    initialized();
  }

  function stake(uint256 amount, bytes data) authP(STAKE_ROLE, arr(amount)) public {
    stakeFor(msg.sender, amount, data);
  }

  function stakeFor(address acct, uint256 amount, bytes data) authP(STAKE_ROLE, arr(amount)) public {
    // stake 0 tokens makes no sense
    require(amount > 0);
    // From needs to be msg.sender to avoid token stealing by front-running
    require(stakingToken.transferFrom(msg.sender, this, amount));

    // process Stake
    accounts[acct].amount = accounts[acct].amount.add(amount);

    Staked(acct, amount, totalStakedFor(acct), data);

    if (stakeScript.length > 0) {
      runScript(stakeScript, data, new address[](0));
    }
  }

  function unstake(uint256 amount, bytes data) authP(UNSTAKE_ROLE, arr(amount)) checkUnlocked(amount, ANY_ENTITY) public {
    // unstake 0 tokens makes no sense
    require(amount > 0);

    accounts[msg.sender].amount = accounts[msg.sender].amount.sub(amount);

    require(stakingToken.transfer(msg.sender, amount));

    Unstaked(msg.sender, amount, totalStakedFor(msg.sender), data);

    if (unstakeScript.length > 0) {
      runScript(unstakeScript, data, new address[](0));
    }
  }

  function lockIndefinitely(uint256 amount, address unlocker, bytes32 metadata, bytes data) public returns(uint256 lockId) {
    return lock(amount, uint8(TimeUnit.Seconds), getTimestamp(), MAX_UINT64, unlocker, metadata, data);
  }

  function lockNow(
    uint256 amount,
    uint8 lockUnit,
    uint64 lockEnds,
    address unlocker,
    bytes32 metadata,
    bytes data
  )
    public
    returns(uint256 lockId)
  {
    uint64 lockStarts = lockUnit == uint8(TimeUnit.Blocks) ? getBlocknumber() : getTimestamp();
    return lock(amount, lockUnit, lockStarts, lockEnds, unlocker, metadata, data);
  }

  function lock(
    uint256 amount,
    uint8 lockUnit,
    uint64 lockStarts,
    uint64 lockEnds,
    address unlocker,
    bytes32 metadata,
    bytes data
  )
    authP(LOCK_ROLE, arr(amount, uint256(lockUnit), uint256(lockEnds)))
    checkUnlocked(amount, unlocker)
    public
    returns(uint256 lockId)
  {
    // lock 0 tokens makes no sense
    require(amount > 0);

    // TODO: should we prevent startin locks in the past?
    // require(lockStarts >= (TimeUnit(lockUnit) == TimeUnit.Blocks ? getBlocknumber() : getTimestamp()));

    Lock memory newLock = Lock(amount, Timespan(lockStarts, lockEnds, TimeUnit(lockUnit)), unlocker, metadata);
    lockId = accounts[msg.sender].locks.push(newLock) - 1;

    Locked(msg.sender, lockId, amount, metadata);

    if (lockScript.length > 0) {
      runScript(lockScript, data, new address[](0));
    }
  }

  function stakeAndLock(
    uint256 amount,
    uint8 lockUnit,
    uint64 lockStarts,
    uint64 lockEnds,
    address unlocker,
    bytes32 metadata,
    bytes stakeData,
    bytes lockData
  )
    authP(STAKE_ROLE, arr(amount))
    authP(LOCK_ROLE, arr(amount, uint256(lockUnit), uint256(lockEnds)))
    public
    returns(uint256 lockId)
  {
    stake(amount, stakeData);
    return lock(amount, lockUnit, lockStarts, lockEnds, unlocker, metadata, lockData);
  }

  function unlockAllOrNone(address acct) external {
    for (uint256 i = accounts[acct].locks.length; i > 0; i--) {
      unlock(acct, i - 1);
    }
  }

  function unlockAll(address acct) public {
    for (uint256 i = accounts[acct].locks.length; i > 0; i--) {
      if (canUnlock(acct, i - 1)) {
        unlock(acct, i - 1);
      }
    }
  }

  function unlock(address acct, uint256 lockId) public {
    require(canUnlock(acct, lockId));

    uint256 lastAccountLock = accounts[acct].locks.length - 1;
    if (lockId < lastAccountLock) {
      accounts[acct].locks[lockId] = accounts[acct].locks[lastAccountLock];
    }

    accounts[acct].locks.length -= 1;

    Unlocked(acct, msg.sender, lockId);
  }

  function unlockPartial(address acct, uint256 lockId, uint256 amount) public {
    require(canUnlock(acct, lockId));

    Lock storage acctLock = accounts[acct].locks[lockId];
    acctLock.amount = acctLock.amount.sub(amount);

    UnlockedPartial(acct, msg.sender, lockId, amount);

    if (acctLock.amount == 0) {
      unlock(acct, lockId);
    }
  }

  function unlockAndUnstake(uint256 amount, bytes data) public {
    unlockAll(msg.sender);
    unstake(amount, data);
  }

  function moveTokens(address from, address to, uint256 amount) authP(GOD_ROLE, arr(from, to, amount)) public {
    // move 0 tokens makes no sense
    require(amount > 0);

    // make sure we don't move locked tokens, to avoid inconsistency
    require(unlockedBalanceOf(from) >= amount);

    accounts[from].amount = accounts[from].amount.sub(amount);
    accounts[to].amount = accounts[to].amount.add(amount);

    MovedTokens(from, to, amount);
  }

  function unlockPartialAndMoveTokens(address from, uint256 lockId, address to, uint256 amount) external {
    unlockPartial(from, lockId, amount);
    moveTokens(from, to, amount);
  }

  // ERCStaking

  function token() public view returns (address) {
    return stakingToken;
  }

  function supportsHistory() public pure returns (bool) {
    return false;
  }

  function totalStakedFor(address addr) public view returns (uint256) {
    return accounts[addr].amount;
  }

  function totalStaked() public view returns (uint256) {
    return stakingToken.balanceOf(this);
  }

  function unlockedBalanceOf(address acct) public view returns (uint256) {
    return unlockedBalanceOf(acct, ANY_ENTITY);
  }

  function unlockedBalanceOf(address acct, address unlocker) public view returns (uint256) {
    uint256 unlockedTokens = accounts[acct].amount;

    Lock[] storage locks = accounts[acct].locks;
    for (uint256 i = 0; i < locks.length; i++) {
      if (!canUnlock(acct, i)) {
        if (overlocking) { // with ovelocking underflow is possible
          if (locks[i].unlocker == ANY_ENTITY || locks[i].unlocker != unlocker) {
            if (locks[i].amount > unlockedTokens) {
              return 0;
            }
            unlockedTokens -= locks[i].amount;
          }
        } else { // without overlocking locks must be always subtracted and no underflow is allowed
          unlockedTokens = unlockedTokens.sub(locks[i].amount);
        }
      }
    }

    return unlockedTokens;
  }

  function locksCount(address acct) public view returns (uint256) {
    return accounts[acct].locks.length;
  }

  function getLock(address acct, uint256 lockId) public view returns (uint256 amount, uint8 lockUnit, uint64 lockEnds, address unlocker, bytes32 metadata) {
    Lock memory acctLock = accounts[acct].locks[lockId];

    return (acctLock.amount, uint8(acctLock.timespan.unit), uint64(acctLock.timespan.end), acctLock.unlocker, acctLock.metadata);
  }

  function lastLock(address acct) public view returns (uint256 amount, uint8 lockUnit, uint64 lockEnds, address unlocker, bytes32 metadata) {
    Lock memory acctLock = accounts[acct].locks[locksCount(acct) - 1];
    return (acctLock.amount, uint8(acctLock.timespan.unit), uint64(acctLock.timespan.end), acctLock.unlocker, acctLock.metadata);
  }

  function canUnlock(address acct, uint256 lockId) public view returns (bool) {
    Lock memory acctLock = accounts[acct].locks[lockId];

    return outOfTimespan(acctLock.timespan) || msg.sender == acctLock.unlocker;
  }

  function outOfTimespan(Timespan memory timespan) internal view returns (bool) {
    uint64 comparingValue = timespan.unit == TimeUnit.Blocks ? getBlocknumber() : getTimestamp();

    return comparingValue < timespan.start || comparingValue > timespan.end;
  }

  function getTimestamp() internal view returns (uint64) {
    return uint64(block.timestamp);
  }

  // TODO: Use getBlockNumber from Initializable.sol - issue with solidity-coverage
  function getBlocknumber() internal view returns (uint64) {
    return uint64(block.number);
  }
}
