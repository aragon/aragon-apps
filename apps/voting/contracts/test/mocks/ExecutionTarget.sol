pragma solidity 0.4.24;

contract ExecutionTarget {
    uint public counter;

    function execute() {
        counter += 1;
        emit Executed(counter);
    }

    function setCounter(uint x) {
        counter = x;
    }

    event Executed(uint x);
}
