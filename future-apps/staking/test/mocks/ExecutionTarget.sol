pragma solidity 0.4.18;

contract ExecutionTarget {
    uint public stakeCounter;
    uint public unstakeCounter;
    uint public lockCounter;

    function executeStake() public {
        stakeCounter += 1;
        ExecutedStake(stakeCounter);
    }

    function executeUnstake() public {
        unstakeCounter += 1;
        ExecutedUnstake(unstakeCounter);
    }

    function executeLock() public {
        lockCounter += 1;
        ExecutedLock(lockCounter);
    }

    event ExecutedStake(uint x);
    event ExecutedUnstake(uint x);
    event ExecutedLock(uint x);
}
