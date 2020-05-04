pragma solidity 0.4.24;


contract ExecutionTarget {
    uint256 public counter;

    event Executed(uint256 counter);

    function execute() external {
        counter += 1;
        emit Executed(counter);
    }
}
