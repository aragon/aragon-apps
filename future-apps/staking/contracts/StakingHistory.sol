pragma solidity 0.4.18;

import "./Staking.sol";
import "./Checkpointing.sol";


contract StakingHistory is ERCStakingHistory, Staking {

  using Checkpointing for Checkpointing.History;

  mapping (address => Checkpointing.History) stakeHistory;
  Checkpointing.History totalStakedHistory;
  
  function stakeFor(address acct, uint256 amount, bytes data) public {
    super.stakeFor(acct, amount, data);
    updateTotalStaked();
  }

  function unstake(uint256 amount, bytes data) public {
    super.unstake(amount, data);
    updateTotalStaked();
  }

  function totalStakedFor(address acct) public view returns (uint256) {
    return totalStakedForAt(acct, getBlocknumber());
  }

  function totalStaked() public view returns (uint256) {
    return totalStakedAt(getBlocknumber());
  }

  function lastStakedFor(address acct) public view returns (uint256) {
    return stakeHistory[acct].lastUpdated();
  }

  function totalStakedForAt(address acct, uint256 blockNumber) public view returns (uint256) {
    return stakeHistory[acct].get(blockNumber);
  }

  function totalStakedAt(uint256 blockNumber) public view returns (uint256) {
    return totalStakedHistory.get(blockNumber);
  }

  function supportsHistory() public pure returns (bool) {
    return true;
  }

  function setStakedFor(address acct, uint256 amount) internal {
    stakeHistory[acct].add(amount, getBlocknumber());
  }

  function updateTotalStaked() internal {
    totalStakedHistory.add(super.totalStaked(), getBlocknumber());
  }
}