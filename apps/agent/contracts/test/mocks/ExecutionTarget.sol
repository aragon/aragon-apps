pragma solidity 0.4.24;


contract ExecutionTarget {
    uint public counter;
    string constant public REASON = "FUNDS_ARE_NOT_SAFU";

    function execute() public payable returns (uint256) {
        counter += 1;
        emit Executed(counter);
        return counter;
    }

    function setCounter(uint x) external payable {
        counter = x;
    }

    function fail() external pure {
        revert(REASON);
    }

    function () external payable {
        execute();
    }

    event Executed(uint x);
}
