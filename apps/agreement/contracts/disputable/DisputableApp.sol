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
    using SafeERC20 for ERC20;
    using SafeMath64 for uint64;

    /* Validation errors */
    string internal constant ERROR_TOKEN_NOT_CONTRACT = "DISPUTABLE_TOKEN_NOT_CONTRACT";
    string internal constant ERROR_AGREEMENT_ALREADY_SET = "DISPUTABLE_AGREEMENT_ALREADY_SET";
    string internal constant ERROR_AGREEMENT_NOT_CONTRACT = "DISPUTABLE_AGREEMENT_NOT_CONTRACT";
    string internal constant ERROR_MISSING_COLLATERAL_REQUIREMENT = "DISPUTABLE_MISSING_COLLATER_REQ";

    // bytes32 public constant DISPUTABLE_REJECTED_ROLE = keccak256("DISPUTABLE_REJECTED_ROLE");
    bytes32 public constant DISPUTABLE_REJECTED_ROLE = 0x59ddf03a96238fd076e91284fa7f96c10f6071441134d2b0c7edb8b0a6077d1c;

    // bytes32 public constant DISPUTABLE_CHALLENGED_ROLE = keccak256("DISPUTABLE_CHALLENGED_ROLE");
    bytes32 public constant DISPUTABLE_CHALLENGED_ROLE = 0xb4f78b62cb29310440f642306412fc1ed42ab054accadd4853544ffaaea1c4ca;

    // bytes32 public constant DISPUTABLE_ALLOWED_ROLE = keccak256("DISPUTABLE_ALLOWED_ROLE");
    bytes32 public constant DISPUTABLE_ALLOWED_ROLE = 0x127b75e771b93d274dc1af8f33ea214c94ec9cd597c1609ae2aa0f4c6c013b0d;

    // bytes32 public constant DISPUTABLE_VOIDED_ROLE = keccak256("DISPUTABLE_VOIDED_ROLE");
    bytes32 public constant DISPUTABLE_VOIDED_ROLE = 0x3c4df9ad03966cf31c4edc1700cbda26c9ae87ff88b98aa9bf29fc84989031de;

    // bytes32 public constant SET_AGREEMENT_ROLE = keccak256("SET_AGREEMENT_ROLE");
    bytes32 public constant SET_AGREEMENT_ROLE = 0x8dad640ab1b088990c972676ada708447affc660890ec9fc9a5483241c49f036;

    // bytes32 public constant CHANGE_COLLATERAL_REQUIREMENTS_ROLE = keccak256("CHANGE_COLLATERAL_REQUIREMENTS_ROLE");
    bytes32 public constant CHANGE_COLLATERAL_REQUIREMENTS_ROLE = 0xf8e1e0f3a5d2cfcc5046b79ce871218ff466f2f37c782b9923261b92e20a1496;

    event AgreementSet(IAgreement indexed agreement);
    event CollateralRequirementChanged(uint256 id, ERC20 token, uint256 actionAmount, uint256 challengeAmount, uint64 challengeDuration);

    struct CollateralRequirement {
        uint256 actionAmount;       // Amount of collateral token that will be locked every time an action is created
        uint256 challengeAmount;    // Amount of collateral token that will be locked every time an action is challenged
        ERC20 token;                // ERC20 token to be used for collateral
        uint64 challengeDuration;   // Duration in seconds of the challenge, during this time window the submitter can answer the challenge
    }

    IAgreement private agreement;                                      // Agreement app associated to the disputable
    CollateralRequirement[] private collateralRequirements;            // Current collateral requirements

    /**
    * @notice Challenge disputable #`_disputableId`
    * @param _disputableId Identification number of the disputable to be paused
    */
    function onDisputableChallenged(uint256 _disputableId) external auth(DISPUTABLE_CHALLENGED_ROLE) {
        _onDisputableChallenged(_disputableId);
    }

    /**
    * @notice Allow disputable #`_disputableId`
    * @param _disputableId Identification number of the disputable to be resumed
    */
    function onDisputableAllowed(uint256 _disputableId) external auth(DISPUTABLE_ALLOWED_ROLE) {
        _onDisputableAllowed(_disputableId);
    }

    /**
    * @notice Reject disputable #`_disputableId`
    * @param _disputableId Identification number of the disputable to be cancelled
    */
    function onDisputableRejected(uint256 _disputableId) external auth(DISPUTABLE_REJECTED_ROLE) {
        _onDisputableRejected(_disputableId);
    }

    /**
    * @notice Void disputable #`_disputableId`
    * @param _disputableId Identification number of the disputable to be voided
    */
    function onDisputableVoided(uint256 _disputableId) external auth(DISPUTABLE_VOIDED_ROLE) {
        _onDisputableVoided(_disputableId);
    }

    /**
    * @notice Set disputable agreements to `_agreement`
    * @param _agreement Agreement instance to be linked
    */
    function setAgreement(IAgreement _agreement) external auth(SET_AGREEMENT_ROLE) {
        _setAgreement(_agreement);
    }

    /**
    * @notice Change collateral requirements to:
    * @notice - `@tokenAmount(_collateralToken: address, _actionAmount)` for submitting collateral
    * @notice - `@tokenAmount(_collateralToken: address, _challengeAmount)` for challenging collateral
    * @param _collateralToken Address of the ERC20 token to be used for collateral
    * @param _actionAmount Amount of collateral tokens that will be locked every time an action is submitted
    * @param _challengeAmount Amount of collateral tokens that will be locked every time an action is challenged
    * @param _challengeDuration Duration in seconds of the challenge, during this time window the submitter can answer the challenge
    */
    function changeCollateralRequirement(ERC20 _collateralToken, uint256 _actionAmount, uint256 _challengeAmount, uint64 _challengeDuration)
        external
        auth(CHANGE_COLLATERAL_REQUIREMENTS_ROLE)
    {
        _newCollateralRequirement(_collateralToken, _actionAmount, _challengeAmount, _challengeDuration);
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
    * @dev Tell the identification number of the current collateral requirement
    * @return Identification number of the current collateral requirement
    */
    function getCurrentCollateralRequirementId() external view returns (uint256) {
        return _getCurrentCollateralRequirementId();
    }

    /**
    * @dev Tell the information related to a collateral requirement
    * @param _collateralId Identification number of the collateral being queried
    * @return collateralToken Address of the ERC20 token to be used for collateral
    * @return actionAmount Amount of collateral tokens that will be locked every time an action is created
    * @return challengeAmount Amount of collateral tokens that will be locked every time an action is challenged
    * @return challengeDuration Duration in seconds of the challenge, during this time window the submitter can answer the challenge
    */
    function getCollateralRequirement(uint256 /* _disputableId */, uint256 _collateralId) external view
        returns (
            ERC20 collateralToken,
            uint256 actionAmount,
            uint256 challengeAmount,
            uint64 challengeDuration
        )
    {
        CollateralRequirement storage collateral = _getCollateralRequirement(_collateralId);
        collateralToken = collateral.token;
        actionAmount = collateral.actionAmount;
        challengeAmount = collateral.challengeAmount;
        challengeDuration = collateral.challengeDuration;
    }

    /**
    * @dev Tell whether an address can challenge actions or not
    * @param _disputableId Identification number of the disputable being queried
    * @param _challenger Address being queried
    * @return True if the given address can challenge actions, false otherwise
    */
    function canChallenge(uint256 _disputableId, address _challenger) external view returns (bool) {
        return _canChallenge(_disputableId, _challenger);
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
        uint256 collateralId = _getCurrentCollateralRequirementId();
        return agreement.newAction(_disputableId, collateralId, _submitter, _context);
    }

    /**
    * @dev Close action in the agreement
    * @param _actionId Identification number of the disputable action in the context of the agreement
    */
    function _closeAction(uint256 _actionId) internal {
        agreement.closeAction(_actionId);
    }

    /**
    * @dev Reject disputable
    * @param _disputableId Identification number of the disputable to be rejected
    */
    function _onDisputableRejected(uint256 _disputableId) internal;

    /**
    * @dev Challenge disputable
    * @param _disputableId Identification number of the disputable to be challenged
    */
    function _onDisputableChallenged(uint256 _disputableId) internal;

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
    * @dev Set disputable agreements
    * @param _agreement Agreement instance to be linked
    */
    function _setAgreement(IAgreement _agreement) internal {
        require(isContract(address(_agreement)), ERROR_AGREEMENT_NOT_CONTRACT);
        require(address(agreement) == address(0), ERROR_AGREEMENT_ALREADY_SET);

        agreement = _agreement;
        emit AgreementSet(_agreement);
    }

    /**
    * @dev Change collateral requirements
    * @param _collateralToken Address of the ERC20 token to be used for collateral
    * @param _actionAmount Amount of collateral tokens that will be locked every time an action is submitted
    * @param _challengeAmount Amount of collateral tokens that will be locked every time an action is challenged
    * @param _challengeDuration Duration in seconds of the challenge, during this time window the submitter can answer the challenge
    */
    function _newCollateralRequirement(ERC20 _collateralToken, uint256 _actionAmount, uint256 _challengeAmount, uint64 _challengeDuration)
        internal
    {
        require(isContract(address(_collateralToken)), ERROR_TOKEN_NOT_CONTRACT);

        uint256 id = collateralRequirements.length++;
        collateralRequirements[id] = CollateralRequirement({
            token: _collateralToken,
            actionAmount: _actionAmount,
            challengeAmount: _challengeAmount,
            challengeDuration: _challengeDuration
        });

        emit CollateralRequirementChanged(id, _collateralToken, _actionAmount, _challengeAmount, _challengeDuration);
    }

    /**
    * @dev Tell whether an address can challenge actions or not
    * @param _disputableId Identification number of the disputable being queried
    * @param _challenger Address being queried
    * @return True if the given address can challenge actions, false otherwise
    */
    function _canChallenge(uint256 _disputableId, address _challenger) internal view returns (bool);

    /**
    * @dev Tell whether an action can proceed or not based on the agreement
    * @param _actionId Identification number of the action to be queried
    * @return True if the action can proceed, false otherwise
    */
    function _canProceed(uint256 _actionId) internal view returns (bool) {
        return agreement.canProceed(_actionId);
    }

    /**
    * @dev Tell the agreement linked to the disputable instance
    * @return Agreement linked to the disputable instance
    */
    function _getAgreement() internal view returns (IAgreement) {
        return agreement;
    }

    /**
    * @dev Tell the identification number of the current collateral requirement
    * @return Identification number of the current collateral requirement
    */
    function _getCurrentCollateralRequirementId() internal view returns (uint256) {
        return collateralRequirements.length - 1;
    }

    /**
    * @dev Tell the current collateral requirement instance
    * @return Current collateral requirement instance
    */
    function _getCurrentCollateralRequirement() internal view returns (CollateralRequirement storage) {
        return _getCollateralRequirement(_getCurrentCollateralRequirementId());
    }

    /**
    * @dev Tell the collateral requirement instance by identification number
    * @param _id Identification number of the collateral requirement being queried
    * @return Collateral requirement instance associated to the given identification number
    */
    function _getCollateralRequirement(uint256 _id) internal view returns (CollateralRequirement storage) {
        require(_id < collateralRequirements.length, ERROR_MISSING_COLLATERAL_REQUIREMENT);
        return collateralRequirements[_id];
    }
}
