pragma solidity 0.4.18;

library Checkpointing {
  struct Checkpoint {
    uint192 value;
    uint64 time;
  }

  struct History {
    Checkpoint[] history;
  }

  uint256 constant MAX_UINT192 = uint256(uint192(-1));
  uint256 constant MAX_UINT64 = uint256(uint64(-1));

  function add128(History storage self, uint192 value, uint64 time) internal {
    if (self.history.length == 0 || self.history[self.history.length - 1].time < time) {
      self.history.push(Checkpoint(value, time));
    } else {
      Checkpoint storage currentCheckpoint = self.history[self.history.length - 1];
      require(time == currentCheckpoint.time); // ensure list ordering
      
      currentCheckpoint.value = value;
    }
  }

  function get128(History storage self, uint64 time) internal view returns (uint192) {
    uint256 length = self.history.length;

    if (length == 0) {
      return 0;
    }
    
    uint256 lastIndex = length - 1;

    // short-circuit
    if (time >= self.history[lastIndex].time) {
      return self.history[lastIndex].value;
    }

    if (time < self.history[0].time) {
      return 0;
    }

    uint256 low = 0;
    uint256 high = lastIndex;

    while (high > low) {
      uint256 mid = (high + low + 1) / 2; // average, ceil round
      
      if (time >= self.history[mid].time) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }

    return self.history[low].value;
  }

  function lastUpdated(History storage self) internal view returns (uint256) {
    if (self.history.length > 0) {
      return uint256(self.history[self.history.length - 1].time);
    }

    return 0;
  }

  /*
  TODO: Modifiers in libraries werent fixed until solc 0.4.22
  https://github.com/ethereum/solidity/issues/2104
  modifier isUint128(uint256 v) {
    require(v <= MAX_UINT128);
    _;
  }
  */

  function add(History storage self, uint256 value, uint256 time) internal {
    require(time <= MAX_UINT64);
    require(value <= MAX_UINT192);

    add128(self, uint192(value), uint64(time));
  }

  function get(History storage self, uint256 time) internal view returns (uint256) {
    require(time <= MAX_UINT64);

    return uint256(get128(self, uint64(time)));
  }
}