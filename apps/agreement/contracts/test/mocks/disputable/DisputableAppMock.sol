pragma solidity 0.4.24;

import "@aragon/os/contracts/apps/disputable/DisputableAragonApp.sol";
import "@aragon/os/contracts/forwarding/IForwarderWithContext.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";
import "@aragon/contract-helpers-test/contracts/0.4/aragonOS/SharedTimeHelpersMock.sol";


contract DisputableAppMock is IForwarderWithContext, DisputableAragonApp, SharedTimeHelpersMock {
    using SafeMath64 for uint64;

    uint64 internal constant MAX_UINT64 = uint64(-1);

    /* Validation errors */
    string internal constant ERROR_CANNOT_SUBMIT = "DISPUTABLE_CANNOT_SUBMIT";
    string internal constant ERROR_CANNOT_CHALLENGE = "DISPUTABLE_CANNOT_CHALLENGE";
    string internal constant ERROR_ENTRY_DOES_NOT_EXIST = "DISPUTABLE_ENTRY_DOES_NOT_EXIST";
    string internal constant ERROR_CALLBACK_REVERTED = "DISPUTABLE_CALLBACK_REVERTED";

    // bytes32 public constant SUBMIT_ROLE = keccak256("SUBMIT_ROLE");
    bytes32 public constant SUBMIT_ROLE = 0x8a8601cc8e9efb544266baca5bffc5cea11aed5de937dc37810fd002b4010eac;

    modifier evalCallbacksRevert() {
        require(!mockCallbacksRevert, ERROR_CALLBACK_REVERTED);
        _;
    }

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
    bool internal mockCallbacksRevert;

    uint256 private entriesLength;
    // Note: should we expose a getter here and use it in tests?
    mapping (uint256 => Entry) private entries;

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
    function mockDisputable(bool _canClose, bool _canChallenge, bool _callbacksRevert) external {
        mockCanClose = _canClose;
        mockCanChallenge = _canChallenge;
        mockCallbacksRevert = _callbacksRevert;
    }

    /**
    * @dev Helper function to close actions
    */
    function closeAction(uint256 _id) external {
        _closeDisputableAction(entries[_id].actionId);
    }

    /**
    * @dev IForwarder interface conformance
    */
    function forward(bytes _evmScript, bytes _context) external {
        require(_canForward(msg.sender, _evmScript), ERROR_CANNOT_SUBMIT);

        uint256 id = entriesLength++;
        entries[id].actionId = _registerDisputableAction(id, _context, msg.sender);

        emit DisputableSubmitted(id);
    }

    /**
    * @dev Tell whether a disputable action can be challenged
    * @return True if the queried disputable action can be challenged, false otherwise
    */
    function canChallenge(uint256 /* _id */) external view returns (bool) {
        return mockCanChallenge;
    }

    /**
    * @dev Tell whether a disputable action can be closed by the agreement
    * @return True if the queried disputable action can be closed, false otherwise
    */
    function canClose(uint256 /* _id */) external view returns (bool) {
        return mockCanClose;
    }

    /**
    * @notice Tells whether `_sender` can forward actions
    * @dev IForwarder interface conformance
    * @param _sender Address of the account intending to forward an action
    * @return True if the given address can submit actions, false otherwise
    */
    function canForward(address _sender, bytes _evmScript) external view returns (bool) {
        return _canForward(_sender, _evmScript);
    }

    /**
    * @dev Challenge an entry
    * @param _id Identification number of the entry to be challenged
    */
    function _onDisputableActionChallenged(uint256 _id, uint256 /* _challengeId */, address /* _challenger */) internal evalCallbacksRevert {
        entries[_id].challenged = true;
        emit DisputableChallenged(_id);
    }

    /**
    * @dev Allow an entry
    * @param _id Identification number of the entry to be allowed
    */
    function _onDisputableActionAllowed(uint256 _id) internal evalCallbacksRevert {
        entries[_id].challenged = false;
        emit DisputableAllowed(_id);
    }

    /**
    * @dev Reject an entry
    * @param _id Identification number of the entry to be rejected
    */
    function _onDisputableActionRejected(uint256 _id) internal evalCallbacksRevert {
        entries[_id].challenged = false;
        emit DisputableRejected(_id);
    }

    /**
    * @dev Void an entry
    * @param _id Identification number of the entry to be voided
    */
    function _onDisputableActionVoided(uint256 _id) internal evalCallbacksRevert {
        entries[_id].challenged = false;
        emit DisputableVoided(_id);
    }

    /**
    * @dev Tells whether an address can forward actions
    * @param _sender Address of the account intending to forward an action
    * @return True if the given address can submit actions, false otherwise
    */
    function _canForward(address _sender, bytes) internal view returns (bool) {
        return canPerform(_sender, SUBMIT_ROLE, arr(_sender));
    }
}
