/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/lib/token/ERC20.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";

import "./IDisputable.sol";
import "../IAgreement.sol";


contract DisputableApp is IDisputable, AragonApp {
    /* Validation errors */
    string internal constant ERROR_SENDER_NOT_AGREEMENT = "DISPUTABLE_SENDER_NOT_AGREEMENT";
    string internal constant ERROR_AGREEMENT_NOT_SET = "DISPUTABLE_AGREEMENT_NOT_SET";
    string internal constant ERROR_AGREEMENT_ALREADY_SET = "DISPUTABLE_AGREEMENT_ALREADY_SET";

    // bytes32 public constant SET_AGREEMENT_ROLE = keccak256("SET_AGREEMENT_ROLE");
    bytes32 public constant SET_AGREEMENT_ROLE = 0x8dad640ab1b088990c972676ada708447affc660890ec9fc9a5483241c49f036;

    // bytes32 internal constant AGREEMENT_POSITION = keccak256("aragonOS.appStorage.agreement");
    bytes32 internal constant AGREEMENT_POSITION = 0x6dbe80ccdeafbf5f3fff5738b224414f85e9370da36f61bf21c65159df7409e9;

    event AgreementSet(IAgreement indexed agreement);

    modifier onlyAgreement() {
        require(address(_getAgreement()) == msg.sender, ERROR_SENDER_NOT_AGREEMENT);
        _;
    }

    /**
    * @notice Set disputable agreements to `_agreement`
    * @param _agreement Agreement instance to be linked
    */
    function setAgreement(IAgreement _agreement) external auth(SET_AGREEMENT_ROLE) {
        IAgreement currentAgreement = _getAgreement();
        bool settingNewAgreement = currentAgreement == IAgreement(0) && _agreement != IAgreement(0);
        bool unsettingAgreement = currentAgreement != IAgreement(0) && _agreement == IAgreement(0);
        require(settingNewAgreement || unsettingAgreement, ERROR_AGREEMENT_ALREADY_SET);

        AGREEMENT_POSITION.setStorageAddress(address(_agreement));
        emit AgreementSet(_agreement);
    }

    /**
    * @notice Challenge disputable #`_disputableId`
    * @param _disputableId Identification number of the disputable to be challenged
    * @param _challenger Address challenging the disputable
    */
    function onDisputableChallenged(uint256 _disputableId, address _challenger) external onlyAgreement {
        _onDisputableChallenged(_disputableId, _challenger);
    }

    /**
    * @notice Allow disputable #`_disputableId`
    * @param _disputableId Identification number of the disputable to be allowed
    */
    function onDisputableAllowed(uint256 _disputableId) external onlyAgreement {
        _onDisputableAllowed(_disputableId);
    }

    /**
    * @notice Reject disputable #`_disputableId`
    * @param _disputableId Identification number of the disputable to be rejected
    */
    function onDisputableRejected(uint256 _disputableId) external onlyAgreement {
        _onDisputableRejected(_disputableId);
    }

    /**
    * @notice Void disputable #`_disputableId`
    * @param _disputableId Identification number of the disputable to be voided
    */
    function onDisputableVoided(uint256 _disputableId) external onlyAgreement {
        _onDisputableVoided(_disputableId);
    }

    /**
    * @notice Tells whether the Agreement app is a forwarder or not
    * @dev IForwarder interface conformance
    * @return Always true
    */
    function isForwarder() external pure returns (bool) {
        return true;
    }

    /**
    * @dev Tell the agreement linked to the disputable instance
    * @return Agreement linked to the disputable instance
    */
    function getAgreement() external view returns (IAgreement) {
        return _getAgreement();
    }

    /**
    * @notice Create a new action
    * @dev IForwarder interface conformance
    */
    function forward(bytes) public;

    /**
    * @notice Tells whether `_sender` can forward actions or not
    * @dev IForwarder interface conformance
    * @param _sender Address of the account intending to forward an action
    * @return True if the given address can submit actions, false otherwise
    */
    function canForward(address _sender, bytes) public view returns (bool);

    /**
    * @dev Create a new action in the agreement
    * @param _disputableId Identification number of the disputable action in the context of the disputable
    * @param _submitter Address of the user that has submitted the action
    * @param _context Link to a human-readable text giving context for the given action
    * @return Unique identification number for the created action in the context of the agreement
    */
    function _newAction(uint256 _disputableId, address _submitter, bytes _context) internal returns (uint256) {
        IAgreement agreementApp = _getAgreement();
        require(agreementApp != IAgreement(0), ERROR_AGREEMENT_NOT_SET);
        return agreementApp.newAction(_disputableId, _submitter, _context);
    }

    /**
    * @dev Close action in the agreement
    * @param _actionId Identification number of the disputable action in the context of the agreement
    */
    function _closeAction(uint256 _actionId) internal {
        IAgreement agreementApp = _getAgreement();
        require(agreementApp != IAgreement(0), ERROR_AGREEMENT_NOT_SET);
        agreementApp.closeAction(_actionId);
    }

    /**
    * @dev Reject disputable
    * @param _disputableId Identification number of the disputable to be rejected
    */
    function _onDisputableRejected(uint256 _disputableId) internal;

    /**
    * @dev Challenge disputable
    * @param _disputableId Identification number of the disputable to be challenged
    * @param _challenger Address challenging the disputable
    */
    function _onDisputableChallenged(uint256 _disputableId, address _challenger) internal;

    /**
    * @dev Allow disputable
    * @param _disputableId Identification number of the disputable to be allowed
    */
    function _onDisputableAllowed(uint256 _disputableId) internal;

    /**
    * @dev Void disputable
    * @param _disputableId Identification number of the disputable to be voided
    */
    function _onDisputableVoided(uint256 _disputableId) internal;

    /**
    * @dev Tell the agreement linked to the disputable instance
    * @return Agreement linked to the disputable instance
    */
    function _getAgreement() internal view returns (IAgreement) {
        return IAgreement(AGREEMENT_POSITION.getStorageAddress());
    }
}
