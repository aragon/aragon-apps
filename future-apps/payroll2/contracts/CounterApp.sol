pragma solidity ^0.4.4;

import "@aragon/os/contracts/apps/AragonApp.sol";

contract CounterApp is AragonApp {
    /// Events
    event Increment(address indexed entity, int step);
    event Decrement(address indexed entity, int step);

    /// State
    int public value;

    /// ACL
    bytes32 constant public INCREMENT_ROLE = keccak256("INCREMENT_ROLE");
    bytes32 constant public DECREMENT_ROLE = keccak256("DECREMENT_ROLE");
    
    function increment(int step) auth(INCREMENT_ROLE) external {
        value += step;
        Increment(msg.sender, step);
    }

    function decrement(int step) auth(DECREMENT_ROLE) external {
        value -= step;
        Decrement(msg.sender, -step);
    }
}
