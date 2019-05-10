pragma solidity 0.4.24;


contract ExecutionTarget {
    uint public counter;

    function execute() external {
        counter += 1;
        emit Executed(counter);
    }

    function setCounter(uint x) external {
        counter = x;
    }

    event Executed(uint x);
}
