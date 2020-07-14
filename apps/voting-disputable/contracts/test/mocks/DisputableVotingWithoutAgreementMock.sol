pragma solidity 0.4.24;

import "./DisputableVotingMock.sol";
import "@aragon/contract-helpers-test/contracts/TimeHelpersMock.sol";


/**
* @dev This mock basically ignores the integration with the Agreement app.
*      It's being used only to assert voting core functionality to ensure a fast setup.
*      Note that the rest of the tests in charge of asserting the voting lifecycle actually depend on `DisputableVotingMock` directly.
*/
contract DisputableVotingWithoutAgreementMock is DisputableVotingMock {
    uint256 private actionsLength;

    function _newAgreementAction(uint256 /* _disputableActionId */, bytes /* _context */, address /* _submitter */)
        internal
        returns (uint256)
    {
        return actionsLength++;
    }

    function _closeAgreementAction(uint256 /* _actionId */) internal {
        // do nothing
    }
}
