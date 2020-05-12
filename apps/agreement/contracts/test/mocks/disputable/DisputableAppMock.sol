pragma solidity 0.4.24;

import "../helpers/TimeHelpersMock.sol";
import "../../../disputable/DisputableApp.sol";


contract DisputableAppMock is DisputableApp, TimeHelpersMock {
    /* Validation errors */
    string internal constant ERROR_CANNOT_FORWARD = "DISPUTABLE_CANNOT_FORWARD";
    string internal constant ERROR_CANNOT_CHALLENGE = "DISPUTABLE_CANNOT_CHALLENGE";

    // bytes32 public constant SUBMIT_ROLE = keccak256("SUBMIT_ROLE");
    bytes32 public constant SUBMIT_ROLE = 0x8a8601cc8e9efb544266baca5bffc5cea11aed5de937dc37810fd002b4010eac;

    // bytes32 public constant CHALLENGE_ROLE = keccak256("CHALLENGE_ROLE");
    bytes32 public constant CHALLENGE_ROLE = 0xef025787d7cd1a96d9014b8dc7b44899b8c1350859fb9e1e05f5a546dd65158d;

    event DisputableChallenged(uint256 indexed id);
    event DisputableAllowed(uint256 indexed id);
    event DisputableRejected(uint256 indexed id);
    event DisputableVoided(uint256 indexed id);

    uint256[] private actionsByEntryId;

    /**
    * @notice Initialize Registry app linked to the Agreement `_agreement` with the following requirements:
    * @notice - `@tokenAmount(_collateralToken, _actionCollateral)` collateral for submitting actions
    * @notice - `@tokenAmount(_collateralToken, _challengeCollateral)` collateral for challenging actions
    * @notice - `@transformTime(_challengeDuration)` for the challenge duration
    * @param _agreement Agreement instance to be linked
    * @param _collateralToken Address of the ERC20 token to be used for collateral
    * @param _actionCollateral Amount of collateral tokens that will be locked every time an action is submitted
    * @param _challengeCollateral Amount of collateral tokens that will be locked every time an action is challenged
    * @param _challengeDuration Duration in seconds of the challenge, during this time window the submitter can answer the challenge
    */
    function initialize(
        IAgreement _agreement,
        ERC20 _collateralToken,
        uint256 _actionCollateral,
        uint256 _challengeCollateral,
        uint64 _challengeDuration
    )
        external
    {
        initialized();

        _setAgreement(_agreement);
        _newCollateralRequirement(_collateralToken, _actionCollateral, _challengeCollateral, _challengeDuration);
    }

    /**
    * @dev Close action
    */
    function closeAction(uint256 _actionId) public {
        _closeAction(_actionId);
    }

    /**
    * @dev IForwarder interface conformance
    */
    function forward(bytes memory data) public {
        require(canForward(msg.sender, data), ERROR_CANNOT_FORWARD);

        uint256 id = actionsByEntryId.length++;
        actionsByEntryId[id] = _newAction(id, msg.sender, data);
    }

    /**
    * @notice Tells whether `_sender` can forward actions or not
    * @dev IForwarder interface conformance
    * @param _sender Address of the account intending to forward an action
    * @return True if the given address can submit actions, false otherwise
    */
    function canForward(address _sender, bytes) public view returns (bool) {
        return canPerform(_sender, SUBMIT_ROLE, arr(_sender));
    }

    /**
    * @dev Challenge an entry
    * @param _id Identification number of the entry to be challenged
    * @param _challenger Address challenging the disputable
    */
    function _onDisputableChallenged(uint256 _id, address _challenger) internal {
        require(_canChallenge(_id, _challenger), ERROR_CANNOT_CHALLENGE);
        emit DisputableChallenged(_id);
    }

    /**
    * @dev Allow an entry
    * @param _id Identification number of the entry to be allowed
    */
    function _onDisputableAllowed(uint256 _id) internal {
        emit DisputableAllowed(_id);
    }

    /**
    * @dev Reject an entry
    * @param _id Identification number of the entry to be rejected
    */
    function _onDisputableRejected(uint256 _id) internal {
        emit DisputableRejected(_id);
    }

    /**
    * @dev Void an entry
    * @param _id Identification number of the entry to be voided
    */
    function _onDisputableVoided(uint256 _id) internal {
        emit DisputableVoided(_id);
    }

    /**
    * @dev Tell whether an entry can be challenged by an address or not
    * @param _id Identification number of the entry being queried
    * @param _challenger Address challenging the disputable
    * @return True if the given entry can be challenged by the given address, false otherwise
    */
    function _canChallenge(uint256 _id, address _challenger) internal view returns (bool) {
        return canPerform(_challenger, CHALLENGE_ROLE, arr(_challenger, _id));
    }
}
