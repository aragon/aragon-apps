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

    // bytes32 public constant SUBMIT_ROLE = keccak256("SUBMIT_ROLE");
    bytes32 public constant SUBMIT_ROLE = 0x8a8601cc8e9efb544266baca5bffc5cea11aed5de937dc37810fd002b4010eac;

    event DisputableSubmitted(uint256 indexed id);
    event DisputableChallenged(uint256 indexed id);
    event DisputableAllowed(uint256 indexed id);
    event DisputableRejected(uint256 indexed id);
    event DisputableVoided(uint256 indexed id);
    event DisputableClosed(uint256 indexed id);

    struct Entry {
        bool closed;
        uint64 endDate;
        uint64 challengedAt;
        uint256 actionId;
    }

    uint64 public entryLifetime;
    uint256 private entriesLength;
    mapping (uint256 => Entry) private entries;

    /**
    * @dev Initialize app
    */
    function initialize() external {
        initialized();
    }

    /**
    * @dev Set entry lifetime duration
    */
    function setLifetime(uint64 _lifetime) external {
        entryLifetime = _lifetime;
    }

    /**
    * @dev Close action
    */
    function closeAction(uint256 _id) public {
        _closeAgreementAction(entries[_id].actionId);
        emit DisputableClosed(_id);
    }

    /**
    * @dev IForwarder interface conformance
    */
    function forward(bytes memory data) public {
        // TODO: use new forwarding interface with context data
        require(canForward(msg.sender, data), ERROR_CANNOT_SUBMIT);

        uint256 id = entriesLength++;
        uint256 actionId = _newAgreementAction(id, data, msg.sender);
        uint64 endDate = entryLifetime == 0 ? 0 : getTimestamp64().add(entryLifetime);
        entries[id] = Entry({ endDate: endDate, actionId: actionId, closed: false, challengedAt: 0 });

        emit DisputableSubmitted(id);
    }

    /**
    * @dev Tell the disputable action information for a given action
    * @param _id Identification number of the entry being queried
    * @return endDate Timestamp when the disputable action ends so it cannot be challenged anymore, unless it's closed beforehand
    * @return challenged True if the disputable action is being challenged
    * @return closed True if the disputable action is closed
    */
    function getDisputableAction(uint256 _id) external view returns (uint64 endDate, bool challenged, bool closed) {
        Entry storage entry = entries[_id];
        closed = entry.closed;
        endDate = entry.endDate;
        challenged = entry.challengedAt != 0;
    }

    /**
    * @dev Tell whether a disputable action can be challenged or not
    * @param _id Identification number of the entry being queried
    * @return True if the queried disputable action can be challenged, false otherwise
    */
    function canChallenge(uint256 _id) external view returns (bool) {
        return _existsEntry(_id) && _canChallenge(entries[_id]);
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
    function _onDisputableActionChallenged(uint256 _id, uint256 /* _challengeId */, address /* _challenger */) internal {
        Entry storage entry = _getEntry(_id);
        require(_canChallenge(entry), ERROR_CANNOT_CHALLENGE);

        entry.challengedAt = getTimestamp64();
        emit DisputableChallenged(_id);
    }

    /**
    * @dev Allow an entry
    * @param _id Identification number of the entry to be allowed
    */
    function _onDisputableActionAllowed(uint256 _id) internal {
        _updateChallengeDuration(_id);
        emit DisputableAllowed(_id);
    }

    /**
    * @dev Reject an entry
    * @param _id Identification number of the entry to be rejected
    */
    function _onDisputableActionRejected(uint256 _id) internal {
        _updateChallengeDuration(_id);
        emit DisputableRejected(_id);
    }

    /**
    * @dev Void an entry
    * @param _id Identification number of the entry to be voided
    */
    function _onDisputableActionVoided(uint256 _id) internal {
        _updateChallengeDuration(_id);
        emit DisputableVoided(_id);
    }

    /**
    * @dev Add the total challenge duration of a disputable action
    * @param _id Identification number of the entry to be updated
    */
    function _updateChallengeDuration(uint256 _id) internal {
        Entry storage entry = _getEntry(_id);
        uint64 currentEndDate = entry.endDate;

        if (currentEndDate != 0) {
            uint64 challengeDuration = getTimestamp64().sub(entry.challengedAt);
            uint64 newEndDate = currentEndDate + challengeDuration;

            // Cap action endDate to MAX_UINT64 to handle infinite action lifetimes
            entry.endDate = (newEndDate >= currentEndDate) ? newEndDate : MAX_UINT64;
        }

        entry.challengedAt = 0;
    }

    /**
    * @dev Tell whether an entry instance can be challenged or not
    * @param _entry Entry instance being queried
    * @return True if the queried entry can be challenged, false otherwise
    */
    function _canChallenge(Entry storage _entry) internal view returns (bool) {
        uint64 endDate = _entry.endDate;
        return (endDate == 0 || endDate > getTimestamp64()) && _entry.challengedAt == 0 && !_entry.closed;
    }

    /**
    * @dev Fetch an entry instance by identification number
    * @param _id Entry identification number being queried
    * @return Entry instance associated to the given identification number
    */
    function _getEntry(uint256 _id) internal view returns (Entry storage) {
        require(_existsEntry(_id), ERROR_ENTRY_DOES_NOT_EXIST);
        return entries[_id];
    }

    /**
    * @dev Tell weather an entry exists or not
    * @param _id Entry identification number being queried
    * @return True if the entry was registered, false otherwise
    */
    function _existsEntry(uint256 _id) internal view returns (bool) {
        return _id < entriesLength;
    }
}
