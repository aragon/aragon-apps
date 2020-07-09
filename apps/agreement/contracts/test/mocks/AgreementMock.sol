pragma solidity 0.4.24;

import "../../Agreement.sol";
import "@aragon/contract-helpers-test/contracts/time/TimeHelpersMock.sol";


contract AgreementMock is Agreement, TimeHelpersMock {}
