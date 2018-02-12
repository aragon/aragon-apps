pragma solidity 0.4.18;

contract ExecutionTarget {
    uint public counter;

    function execute() external {
        counter += 1;
        Executed(counter);
    }

    function setCounter(uint x) external {
        counter = x;
    }

    event Executed(uint x);
}
