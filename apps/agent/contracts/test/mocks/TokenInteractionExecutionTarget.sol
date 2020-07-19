pragma solidity 0.4.24;

import "@aragon/contract-helpers-test/contracts/0.4/token/TokenMock.sol";
import "../../Agent.sol";

contract TokenInteractionExecutionTarget {
    function transferTokenFrom(address _token) external {
        TokenMock(_token).transferFrom(msg.sender, this, 1);
    }

    function transferTokenTo(address _token) external {
        TokenMock(_token).transfer(msg.sender, 1);
    }

    function removeProtectedToken(address _token) external {
        Agent(msg.sender).removeProtectedToken(_token);
    }
}
