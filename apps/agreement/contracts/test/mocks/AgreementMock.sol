pragma solidity 0.4.24;

import "../../Agreement.sol";
import "@aragon/contract-helpers-test/contracts/0.4/aragonOS/SharedTimeHelpersMock.sol";


contract AgreementMock is Agreement, SharedTimeHelpersMock {}
