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

    // bytes32 public constant CANCEL_ROLE = keccak256("CANCEL_ROLE");
    bytes32 public constant CANCEL_ROLE = 0x9f959e00d95122f5cbd677010436cf273ef535b86b056afc172852144b9491d7;

    // bytes32 public constant PAUSE_ROLE = keccak256("PAUSE_ROLE");
    bytes32 public constant PAUSE_ROLE = 0x139c2898040ef16910dc9f44dc697df79363da767d8bc92f2e310312b816e46d;

    // bytes32 public constant RESUME_ROLE = keccak256("RESUME_ROLE");
    bytes32 public constant RESUME_ROLE = 0x2fc10cc8ae19568712f7a176fb4978616a610650813c9d05326c34abb62749c7;

    // bytes32 public constant VOID_ROLE = keccak256("VOID_ROLE");
    bytes32 public constant VOID_ROLE = 0xb74efb1331f2ac159f6a86c8c3fad56a75c3c91bdefeba4af6441cd313e03d46;

    // bytes32 public constant CHANGE_COLLATERAL_REQUIREMENTS_ROLE = keccak256("CHANGE_COLLATERAL_REQUIREMENTS_ROLE");
    bytes32 public constant CHANGE_COLLATERAL_REQUIREMENTS_ROLE = 0xf8e1e0f3a5d2cfcc5046b79ce871218ff466f2f37c782b9923261b92e20a1496;

    event CollateralRequirementsChanged(ERC20 token, uint256 actionAmount, uint256 challengeAmount, uint64 challengeDuration);

    struct CollateralRequirements {
        uint256 actionAmount;       // Amount of collateral token that will be locked every time an action is created
        uint256 challengeAmount;    // Amount of collateral token that will be locked every time an action is challenged
        ERC20 token;                // ERC20 token to be used for collateral
        uint64 challengeDuration;   // Duration in seconds of the challenge, during this time window the submitter can answer the challenge
    }

    IAgreement public agreement;                                        // Agreement app associated to the disputable
    CollateralRequirements private collateralRequirements;              // Current collateral requirements

    /**
    * @notice Cancel disputable #`_disputableId`
    * @param _disputableId Identification number of the disputable to be cancelled
    */
    function cancel(uint256 _disputableId) external auth(CANCEL_ROLE) {
        _cancel(_disputableId);
    }

    /**
    * @notice Pause disputable #`_disputableId`
    * @param _disputableId Identification number of the disputable to be paused
    */
    function pause(uint256 _disputableId) external auth(PAUSE_ROLE) {
        _pause(_disputableId);
    }

    /**
    * @notice Resume disputable #`_disputableId`
    * @param _disputableId Identification number of the disputable to be resumed
    */
    function resume(uint256 _disputableId) external auth(RESUME_ROLE) {
        _resume(_disputableId);
    }

    /**
    * @notice Vote disputable #`_disputableId`
    * @param _disputableId Identification number of the disputable to be voided
    */
    function void(uint256 _disputableId) external auth(VOID_ROLE) {
        _void(_disputableId);
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
    function changeCollateralRequirements(ERC20 _collateralToken, uint256 _actionAmount, uint256 _challengeAmount, uint64 _challengeDuration)
        external
        auth(CHANGE_COLLATERAL_REQUIREMENTS_ROLE)
    {
        _newCollateralRequirements(_collateralToken, _actionAmount, _challengeAmount, _challengeDuration);
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
    * @dev Tell the information related to collateral requirements
    * @return collateralToken Address of the ERC20 token to be used for collateral
    * @return actionAmount Amount of collateral tokens that will be locked every time an action is created
    * @return challengeAmount Amount of collateral tokens that will be locked every time an action is challenged
    * @return challengeDuration Duration in seconds of the challenge, during this time window the submitter can answer the challenge
    */
    function getCollateralRequirements() external view
        returns (
            ERC20 collateralToken,
            uint256 actionAmount,
            uint256 challengeAmount,
            uint64 challengeDuration
        )
    {
        CollateralRequirements storage collateral = collateralRequirements;
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
        CollateralRequirements storage collateral = collateralRequirements;
        return agreement.newAction(_disputableId, _submitter, collateral.actionAmount, collateral.token, _context);
    }

    /**
    * @dev Cancel disputable
    * @param _disputableId Identification number of the disputable to be cancelled
    */
    function _cancel(uint256 _disputableId) internal;

    /**
    * @dev Pause disputable
    * @param _disputableId Identification number of the disputable to be paused
    */
    function _pause(uint256 _disputableId) internal;

    /**
    * @dev Resume disputable
    * @param _disputableId Identification number of the disputable to be resumed
    */
    function _resume(uint256 _disputableId) internal;

    /**
    * @dev Void disputable
    * @param _disputableId Identification number of the disputable to be voided
    */
    function _void(uint256 _disputableId) internal;

    /**
    * @dev Change collateral requirements
    * @param _collateralToken Address of the ERC20 token to be used for collateral
    * @param _actionAmount Amount of collateral tokens that will be locked every time an action is submitted
    * @param _challengeAmount Amount of collateral tokens that will be locked every time an action is challenged
    * @param _challengeDuration Duration in seconds of the challenge, during this time window the submitter can answer the challenge
    */
    function _newCollateralRequirements(ERC20 _collateralToken, uint256 _actionAmount, uint256 _challengeAmount, uint64 _challengeDuration)
        internal
    {
        require(isContract(address(_collateralToken)), ERROR_TOKEN_NOT_CONTRACT);

        collateralRequirements = CollateralRequirements({
            token: _collateralToken,
            actionAmount: _actionAmount,
            challengeAmount: _challengeAmount,
            challengeDuration: _challengeDuration
        });

        emit CollateralRequirementsChanged(_collateralToken, _actionAmount, _challengeAmount, _challengeDuration);
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
}
