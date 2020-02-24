pragma solidity 0.4.24;

import "@aragon/test-helpers/contracts/TokenMock.sol";
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
