pragma solidity 0.4.24;

import "./DisputableVotingMock.sol";
import "@aragon/contract-test-helpers/contracts/TimeHelpersMock.sol";


contract DisputableVotingWithoutAgreementMock is DisputableVotingMock {
    uint256 private actionsLength;

    function _newAgreementAction(uint256 /* _disputableActionId */, uint64 /* _lifetime */, address /* _submitter */, bytes /* _context */)
        internal
        returns (uint256)
    {
        return actionsLength++;
    }

    function _closeAgreementAction(uint256 /* _actionId */) internal {
        // do nothing
    }

    function _canProceedAgreementAction(uint256 /* _actionId */) internal view returns (bool) {
        return true;
    }
}
