pragma solidity 0.4.24;

import "../../Agreement.sol";
import "./helpers/TimeHelpersMock.sol";


contract AgreementMock is Agreement, TimeHelpersMock {
    /**
    * @notice Execute ruling for action #`_actionId`
    * @param _actionId Identification number of the action to be ruled
    */
    function executeRuling(uint256 _actionId) external {
        Action storage action = _getAction(_actionId);
        require(_isDisputed(action), ERROR_CANNOT_RULE_ACTION);

        uint256 disputeId = action.challenge.disputeId;
        arbitrator.executeRuling(disputeId);
    }
}
