pragma solidity 0.4.24;

import "../helpers/TimeHelpersMock.sol";
import "../../../disputable/apps/Delay.sol";


contract DelayMock is Delay, TimeHelpersMock {}
