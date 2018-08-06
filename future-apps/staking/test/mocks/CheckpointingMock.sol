pragma solidity 0.4.18;

import "../../contracts/Checkpointing.sol";


contract CheckpointingMock {
  using Checkpointing for Checkpointing.History;

  Checkpointing.History history;

  function add(uint128 value, uint128 time) public {
    history.add(value, time);
  }

  function get(uint128 time) public view returns (uint128) {
    return history.get(time);
  }

  function getHistorySize() public view returns (uint256) {
    return history.history.length;
  }
}