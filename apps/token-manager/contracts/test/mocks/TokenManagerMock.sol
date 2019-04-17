pragma solidity 0.4.24;

import "../../TokenManager.sol";
import "@aragon/test-helpers/contracts/TimeHelpersMock.sol";


/* solium-disable-next-line no-empty-blocks */
contract TokenManagerMock is TokenManager, TimeHelpersMock {}
