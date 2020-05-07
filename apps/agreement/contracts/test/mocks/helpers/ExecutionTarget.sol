pragma solidity 0.4.24;


contract ExecutionTarget {
    uint256 public counter;

    event TargetExecuted(uint256 counter);

    function execute() external {
        counter += 1;
        emit TargetExecuted(counter);
    }
}
