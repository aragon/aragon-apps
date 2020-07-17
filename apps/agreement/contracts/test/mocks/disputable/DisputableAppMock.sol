pragma solidity 0.4.24;

import "@aragon/os/contracts/lib/math/SafeMath64.sol";
import "@aragon/os/contracts/apps/disputable/DisputableAragonApp.sol";
import "../helpers/TimeHelpersMock.sol";


contract DisputableAppMock is DisputableAragonApp, TimeHelpersMock {
    using SafeMath64 for uint64;

    bytes4 public constant ERC165_INTERFACE = ERC165_INTERFACE_ID;
    bytes4 public constant DISPUTABLE_INTERFACE = DISPUTABLE_INTERFACE_ID;

    uint64 internal constant MAX_UINT64 = uint64(-1);

    /* Validation errors */
    string internal constant ERROR_CANNOT_SUBMIT = "DISPUTABLE_CANNOT_SUBMIT";
    string internal constant ERROR_CANNOT_CHALLENGE = "DISPUTABLE_CANNOT_CHALLENGE";
    string internal constant ERROR_ENTRY_DOES_NOT_EXIST = "DISPUTABLE_ENTRY_DOES_NOT_EXIST";
    string internal constant ERROR_CALLBACK_REVERTED = "DISPUTABLE_CALLBACK_REVERTED";

    // bytes32 public constant SUBMIT_ROLE = keccak256("SUBMIT_ROLE");
    bytes32 public constant SUBMIT_ROLE = 0x8a8601cc8e9efb544266baca5bffc5cea11aed5de937dc37810fd002b4010eac;

    event DisputableSubmitted(uint256 indexed id);
    event DisputableChallenged(uint256 indexed id);
    event DisputableAllowed(uint256 indexed id);
    event DisputableRejected(uint256 indexed id);
    event DisputableVoided(uint256 indexed id);

    struct Entry {
        bool challenged;
        uint256 actionId;
    }

    bool internal mockCanClose;
    bool internal mockCanChallenge;

    uint256 private entriesLength;
    mapping (uint256 => Entry) private entries;
    bool private callbacksRevert;

    /**
    * @dev Initialize app
    */
    function initialize() external {
        initialized();
        mockCanClose = true;
        mockCanChallenge = true;
    }

    /**
    * @dev Mock can close or can challenge checks
    */
    function mockDisputable(bool _canClose, bool _canChallenge) external {
        mockCanClose = _canClose;
        mockCanChallenge = _canChallenge;
    }

    /**
    * @dev Mock callbacks revert configuration
    */
    function mockSetCallbacksRevert(bool _callbacksRevert) external {
        callbacksRevert = _callbacksRevert;
    }

    /**
    * @dev Helper function to close actions
    */
    function closeAction(uint256 _id) external {
        _closeAgreementAction(entries[_id].actionId);
    }

    /**
    * @dev IForwarder interface conformance
    */
    function forward(bytes memory data) public {
        // TODO: use new forwarding interface with context data
        require(canForward(msg.sender, data), ERROR_CANNOT_SUBMIT);

        uint256 id = entriesLength++;
        entries[id].actionId = _newAgreementAction(id, data, msg.sender);

        emit DisputableSubmitted(id);
    }

    /**
    * @dev Tell whether a disputable action can be challenged or not
    * @return True if the queried disputable action can be challenged, false otherwise
    */
    function canChallenge(uint256 /* _id */) external view returns (bool) {
        return mockCanChallenge;
    }

    /**
    * @dev Tell whether a disputable action can be closed by the agreement or not
    * @return True if the queried disputable action can be closed, false otherwise
    */
    function canClose(uint256 /* _id */) external view returns (bool) {
        return mockCanClose;
    }

    /**
    * @notice Tells whether `_sender` can forward actions or not
    * @dev IForwarder interface conformance
    * @param _sender Address of the account intending to forward an action
    * @return True if the given address can submit actions, false otherwise
    */
    function canForward(address _sender, bytes) public view returns (bool) {
        return canPerform(_sender, SUBMIT_ROLE, arr());
    }

    /**
    * @dev Challenge an entry
    * @param _id Identification number of the entry to be challenged
    */
    function _onDisputableActionChallenged(uint256 _id, uint256 /* _challengeId */, address /* _challenger */) internal {
        require(!callbacksRevert, ERROR_CALLBACK_REVERTED);

        entries[_id].challenged = true;
        emit DisputableChallenged(_id);
    }

    /**
    * @dev Allow an entry
    * @param _id Identification number of the entry to be allowed
    */
    function _onDisputableActionAllowed(uint256 _id) internal {
        require(!callbacksRevert, ERROR_CALLBACK_REVERTED);

        entries[_id].challenged = false;
        emit DisputableAllowed(_id);
    }

    /**
    * @dev Reject an entry
    * @param _id Identification number of the entry to be rejected
    */
    function _onDisputableActionRejected(uint256 _id) internal {
        require(!callbacksRevert, ERROR_CALLBACK_REVERTED);

        entries[_id].challenged = false;
        emit DisputableRejected(_id);
    }

    /**
    * @dev Void an entry
    * @param _id Identification number of the entry to be voided
    */
    function _onDisputableActionVoided(uint256 _id) internal {
        require(!callbacksRevert, ERROR_CALLBACK_REVERTED);

        entries[_id].challenged = false;
        emit DisputableVoided(_id);
    }
}
