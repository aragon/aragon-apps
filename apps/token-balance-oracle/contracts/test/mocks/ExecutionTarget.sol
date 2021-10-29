pragma solidity 0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";


contract ExecutionTarget is AragonApp {
    bytes32 public constant SET_COUNTER_ROLE = keccak256("SET_COUNTER_ROLE");
    bytes32 public constant INCREASE_COUNTER_ROLE = keccak256("INCREASE_COUNTER_ROLE");
    bytes32 public constant DECREASE_COUNTER_ROLE = keccak256("DECREASE_COUNTER_ROLE");

    uint public counter;

    function initialize(uint _counter) external onlyInit {
        counter = _counter;

        initialized();
    }

    function setCounter(uint x) external auth(SET_COUNTER_ROLE) {
        counter = x;
    }

    function increaseCounter() external authP(INCREASE_COUNTER_ROLE, arr(msg.sender)) {
        counter += 1;
    }
}
