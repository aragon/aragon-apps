pragma solidity ^0.4.18;


interface ERCStaking {
  event Staked(address indexed user, uint256 amount, uint256 total, bytes data);
  event Unstaked(address indexed user, uint256 amount, uint256 total, bytes data);

  function stake(uint256 amount, bytes data) public;
  function stakeFor(address user, uint256 amount, bytes data) public;
  function unstake(uint256 amount, bytes data) public;

  function totalStakedFor(address addr) public view returns (uint256);
  function totalStaked() public view returns (uint256);
  function token() public view returns (address);

  function supportsHistory() public pure returns (bool);
}

contract ERCFake {
  // to avoid coverage issue
}
