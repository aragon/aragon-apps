pragma solidity 0.4.24;

import "../../PermissionAgreement.sol";
import "@aragon/test-helpers/contracts/TimeHelpersMock.sol";


contract PermissionAgreementMock is PermissionAgreement, TimeHelpersMock {}
