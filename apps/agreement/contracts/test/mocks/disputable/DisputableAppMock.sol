pragma solidity 0.4.24;

import "../helpers/TimeHelpersMock.sol";
import "../../../disputable/DisputableApp.sol";


contract DisputableAppMock is DisputableApp, TimeHelpersMock {
    bytes4 public constant ERC165_INTERFACE = ERC165_INTERFACE_ID;
    bytes4 public constant DISPUTABLE_INTERFACE = DISPUTABLE_INTERFACE_ID;

    /* Validation errors */
    string internal constant ERROR_CANNOT_SUBMIT = "DISPUTABLE_CANNOT_SUBMIT";

    // bytes32 public constant SUBMIT_ROLE = keccak256("SUBMIT_ROLE");
    bytes32 public constant SUBMIT_ROLE = 0x8a8601cc8e9efb544266baca5bffc5cea11aed5de937dc37810fd002b4010eac;

    event DisputableSubmitted(uint256 indexed id);
    event DisputableChallenged(uint256 indexed id);
    event DisputableAllowed(uint256 indexed id);
    event DisputableRejected(uint256 indexed id);
    event DisputableVoided(uint256 indexed id);
    event DisputableClosed(uint256 indexed id);

    uint256[] private actionsByEntryId;

    /**
    * @notice Compute Disputable interface ID
    */
    function interfaceId() external pure returns (bytes4) {
        IDisputable iDisputable;
        return iDisputable.setAgreement.selector ^
               iDisputable.onDisputableChallenged.selector ^
               iDisputable.onDisputableAllowed.selector ^
               iDisputable.onDisputableRejected.selector ^
               iDisputable.onDisputableVoided.selector ^
               iDisputable.getAgreement.selector;
    }

    /**
    * @notice Initialize app
    */
    function initialize() external {
        initialized();
    }

    /**
    * @dev Close action
    */
    function closeAction(uint256 _id) public {
        _closeAction(actionsByEntryId[_id]);
        emit DisputableClosed(_id);
    }

    /**
    * @dev IForwarder interface conformance
    */
    function forward(bytes memory data) public {
        require(canForward(msg.sender, data), ERROR_CANNOT_SUBMIT);

        uint256 id = actionsByEntryId.length++;
        actionsByEntryId[id] = _newAction(id, msg.sender, data);
        emit DisputableSubmitted(id);
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
    */
    function _onDisputableChallenged(uint256 _id, address /* _challenger */) internal {
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
}
