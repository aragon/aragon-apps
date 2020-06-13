/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/apps/disputable/DisputableAragonApp.sol";


// TODO: Move this sample app to aragonOS
contract Registry is DisputableAragonApp {
    /* Validation errors */
    string internal constant ERROR_CANNOT_REGISTER = "REGISTRY_CANNOT_REGISTER";
    string internal constant ERROR_SENDER_NOT_ALLOWED = "REGISTRY_SENDER_NOT_ALLOWED";
    string internal constant ERROR_ENTRY_DOES_NOT_EXIST = "REGISTRY_ENTRY_DOES_NOT_EXIST";
    string internal constant ERROR_ENTRY_CHALLENGED = "REGISTRY_ENTRY_CHALLENGED";
    string internal constant ERROR_ENTRY_NOT_CHALLENGED = "REGISTRY_ENTRY_NOT_CHALLENGED";
    string internal constant ERROR_ENTRY_ALREADY_REGISTERED = "REGISTRY_ENTRY_ALREADY_REGISTER";
    string internal constant ERROR_CANNOT_DECODE_DATA = "REGISTRY_CANNOT_DECODE_DATA";

    // bytes32 public constant REGISTER_ENTRY_ROLE = keccak256("REGISTER_ENTRY_ROLE");
    bytes32 public constant REGISTER_ENTRY_ROLE = 0xd4d229f2cb59999331811228070dfa5d130949390a1b656eaacab6fb006f5b11;

    event Registered(bytes32 indexed id);
    event Unregistered(bytes32 indexed id);
    event Challenged(bytes32 indexed id, uint256 challengeId);
    event Allowed(bytes32 indexed id);

    struct Entry {
        bytes value;
        address submitter;
        bool challenged;
        uint256 actionId;
    }

    mapping (bytes32 => Entry) private entries;

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
        _agreement.activate(IDisputable(this), _collateralToken, _challengeDuration, _actionCollateral, _challengeCollateral);
    }

    /**
    * @notice Register entry `_id` with value `_value`
    * @param _id Entry identification number to be registered
    * @param _value Entry value to be registered
    * @param _context Link to a human-readable text giving context for the given action
    */
    function register(bytes32 _id, bytes _value, bytes _context) external authP(REGISTER_ENTRY_ROLE, arr(_id)) {
        _register(msg.sender, _id, _value, _context);
    }

    /**
    * @notice Unregister entry `_id`
    * @param _id Entry identification number to be unregistered
    */
    function unregister(bytes32 _id) external {
        Entry storage entry = entries[_id];
        require(!_isChallenged(entry), ERROR_ENTRY_CHALLENGED);
        require(entry.submitter == msg.sender, ERROR_SENDER_NOT_ALLOWED);

        _closeAgreementAction(entry.actionId);
        _unregister(_id, entry);
    }

    /**
    * @dev Tell the information associated to an entry identification number
    * @param _id Entry identification number being queried
    * @return submitter Address that has registered the entry
    * @return value Value associated to the given entry
    * @return challenged Whether or not the entry is challenged
    * @return actionId Identification number of the given entry in the context of the agreement
    */
    function getEntry(bytes32 _id) external view returns (address submitter, bytes value, uint256 actionId) {
        Entry storage entry = _getEntry(_id);
        submitter = entry.submitter;
        value = entry.value;
        actionId = entry.actionId;
    }

    /**
    * @dev Tell the disputable action information for a given action
    * @param _id Identification number of the entry being queried
    * @return endDate Timestamp when the disputable action ends so it cannot be challenged anymore, unless it's finished beforehand
    * @return challenged True if the disputable action is being challenged
    * @return finished True if the disputable action is finished
    */
    function getDisputableAction(uint256 _id) external view returns (uint64 endDate, bool challenged, bool finished) {
        Entry storage entry = entries[bytes32(_id)];
        endDate = 0;
        challenged = entry.challenged;
        finished = !_isRegistered(entry);
    }

    /**
    * @dev Tell whether a disputable action can be challenged or not
    * @param _id Identification number of the entry being queried
    * @return True if the queried disputable action can be challenged, false otherwise
    */
    function canChallenge(uint256 _id) external view returns (bool) {
        Entry storage entry = entries[bytes32(_id)];
        return _isRegistered(entry) && !_isChallenged(entry);
    }

    /**
    * @dev Tell whether a disputable action can be closed by the agreement or not
    * @param _id Identification number of the entry being queried
    * @return True if the queried disputable action can be closed, false otherwise
    */
    function canClose(uint256 _id) external view returns (bool) {
        Entry storage entry = entries[bytes32(_id)];
        return _isRegistered(entry) && !_isChallenged(entry);
    }

    /**
    * @notice Schedule a new entry
    * @dev IForwarder interface conformance
    * @param _data Data requested to be registered
    */
    function forward(bytes memory _data) public {
        require(canForward(msg.sender, _data), ERROR_CANNOT_REGISTER);

        (bytes32 id, bytes memory value) = _decodeData(_data);
        _register(msg.sender, id, value, new bytes(0));
    }

    /**
    * @notice Tells whether `_sender` can forward actions or not
    * @dev IForwarder interface conformance
    * @param _sender Address of the account intending to forward an action
    * @return True if the given address can submit actions, false otherwise
    */
    function canForward(address _sender, bytes _data) public view returns (bool) {
        (bytes32 id,) = _decodeData(_data);
        return canPerform(_sender, REGISTER_ENTRY_ROLE, arr(_sender, uint256(id)));
    }

    /**
    * @dev Challenge an entry
    * @param _id Identification number of the entry to be challenged
    */
    function _onDisputableActionChallenged(uint256 _id, uint256 _challengeId, address /* _challenger */) internal {
        bytes32 id = bytes32(_id);
        Entry storage entry = _getEntry(id);
        require(!_isChallenged(entry), ERROR_ENTRY_CHALLENGED);

        entry.challenged = true;
        emit Challenged(id, _challengeId);
    }

    /**
    * @dev Allow an entry
    * @param _id Identification number of the entry to be allowed
    */
    function _onDisputableActionAllowed(uint256 _id) internal {
        bytes32 id = bytes32(_id);
        Entry storage entry = _getEntry(id);
        require(_isChallenged(entry), ERROR_ENTRY_NOT_CHALLENGED);

        _allowed(id, entry);
    }

    /**
    * @dev Reject an entry
    * @param _id Identification number of the entry to be rejected
    */
    function _onDisputableActionRejected(uint256 _id) internal {
        bytes32 id = bytes32(_id);
        Entry storage entry = entries[id];
        require(_isChallenged(entry), ERROR_ENTRY_NOT_CHALLENGED);

        _unregister(id, entry);
    }

    /**
    * @dev Void an entry
    * @param _id Identification number of the entry to be voided
    */
    function _onDisputableActionVoided(uint256 _id) internal {
        _onDisputableActionAllowed(_id);
    }

    /**
    * @dev Register a new entry
    * @param _submitter Address registering the entry
    * @param _id Entry identification number to be registered
    * @param _value Entry value to be registered
    * @param _context Link to a human-readable text giving context for the given action
    */
    function _register(address _submitter, bytes32 _id, bytes _value, bytes _context) internal {
        Entry storage entry = entries[_id];
        require(!_isRegistered(entry), ERROR_ENTRY_ALREADY_REGISTERED);

        entry.actionId = _newAgreementAction(uint256(_id), _context, _submitter);
        entry.submitter = _submitter;
        entry.value = _value;
        emit Registered(_id);
    }

    /**
    * @dev Allow an entry
    * @param _id Identification number of the entry to be allowed
    * @param _entry Entry instance associated to the given identification number
    */
    function _allowed(bytes32 _id, Entry storage _entry) internal {
        _entry.challenged = false;
        emit Allowed(_id);
    }

    /**
    * @dev Unregister an entry
    * @param _id Identification number of the entry to be unregistered
    * @param _entry Entry instance associated to the given identification number
    */
    function _unregister(bytes32 _id, Entry storage _entry) internal {
        _entry.actionId = 0;
        _entry.challenged = false;
        _entry.submitter = address(0);
        _entry.value = new bytes(0);
        emit Unregistered(_id);
    }

    /**
    * @dev Tell whether an entry is registered or not
    * @param _entry Entry instance being queried
    * @return True if the entry is registered, false otherwise
    */
    function _isRegistered(Entry storage _entry) internal view returns (bool) {
        return _entry.submitter != address(0);
    }

    /**
    * @dev Tell whether an entry is challenged or not
    * @param _entry Entry instance being queried
    * @return True if the entry is challenged, false otherwise
    */
    function _isChallenged(Entry storage _entry) internal view returns (bool) {
        return _entry.challenged;
    }

    /**
    * @dev Fetch an entry instance by identification number
    * @param _id Entry identification number being queried
    * @return Entry instance associated to the given identification number
    */
    function _getEntry(bytes32 _id) internal view returns (Entry storage) {
        Entry storage entry = entries[_id];
        require(_isRegistered(entry), ERROR_ENTRY_DOES_NOT_EXIST);
        return entry;
    }

    /*
    * @dev Decode an arbitrary data array into an entry ID and value
    * @param _data Arbitrary data array
    * @return id Identification number of an entry
    * @return value Value for the entry
    */
    function _decodeData(bytes _data) internal pure returns (bytes32 id, bytes memory value) {
        require(_data.length >= 32, ERROR_CANNOT_DECODE_DATA);

        assembly {
            id := mload(add(_data, 32))
        }

        uint256 remainingDataLength = _data.length - 32;
        value = new bytes(remainingDataLength);
        for (uint256 i = 0; i < remainingDataLength; i++) {
            value[i] = _data[i + 32];
        }
    }
}
