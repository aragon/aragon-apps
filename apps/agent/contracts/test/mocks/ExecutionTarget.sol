pragma solidity 0.4.24;

import "@aragon/test-helpers/contracts/TokenMock.sol";


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

    function transferTokenFrom(address _token) external {
        TokenMock(_token).transferFrom(msg.sender, this, 1);
    }

    function fail() external pure {
        revert(REASON);
    }

    function () external payable {
        execute();
    }

    event Executed(uint x);
}
