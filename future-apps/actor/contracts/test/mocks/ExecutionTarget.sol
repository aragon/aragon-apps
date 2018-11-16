pragma solidity 0.4.24;


contract ExecutionTarget {
    uint public counter;
    string constant public REASON = "FUNDS_ARE_NOT_SAFU";

    function execute() payable public returns (uint256) {
        counter += 1;
        emit Executed(counter);
        return counter;
    }

    function setCounter(uint x) payable public {
        counter = x;
    }

    function fail() public {
    	revert(REASON);
    }

    function () payable {}

    event Executed(uint x);
}
