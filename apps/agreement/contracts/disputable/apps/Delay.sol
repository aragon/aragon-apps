/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "../DisputableApp.sol";


contract Delay is DisputableApp {
    /* Validation errors */
    string internal constant ERROR_AUTH_FAILED = "APP_AUTH_FAILED";
    string internal constant ERROR_SENDER_NOT_ALLOWED = "DELAY_SENDER_NOT_ALLOWED";
    string internal constant ERROR_DELAYABLE_DOES_NOT_EXIST = "DELAY_DELAYABLE_DOES_NOT_EXIST";
    string internal constant ERROR_CANNOT_FORWARD = "DELAY_CANNOT_FORWARD";
    string internal constant ERROR_CANNOT_PAUSE_DELAYABLE = "DELAY_CANNOT_PAUSE_DELAYABLE";
    string internal constant ERROR_CANNOT_STOP_DELAYABLE = "DELAY_CANNOT_STOP_DELAYABLE";
    string internal constant ERROR_CANNOT_FAST_FORWARD_DELAYABLE = "DELAY_CANNOT_FAST_FORWARD";
    string internal constant ERROR_CANNOT_EXECUTE_DELAYABLE = "DELAY_CANNOT_EXECUTE_DELAYABLE";

    // bytes32 public constant SUBMIT_ROLE = keccak256("SUBMIT_ROLE");
    bytes32 public constant SUBMIT_ROLE = 0x8a8601cc8e9efb544266baca5bffc5cea11aed5de937dc37810fd002b4010eac;

    // bytes32 public constant CHALLENGE_ROLE = keccak256("CHALLENGE_ROLE");
    bytes32 public constant CHALLENGE_ROLE = 0xef025787d7cd1a96d9014b8dc7b44899b8c1350859fb9e1e05f5a546dd65158d;

    // bytes32 public constant CHANGE_DELAY_PERIOD_ROLE = keccak256("CHANGE_DELAY_PERIOD_ROLE");
    bytes32 public constant CHANGE_DELAY_PERIOD_ROLE = 0x239c4d8b23f1a84eb03655788406e459ac72157a65732b57fa0f2785d693bb0d;

    // bytes32 public constant CHANGE_TOKEN_BALANCE_PERMISSION_ROLE = keccak256("CHANGE_TOKEN_BALANCE_PERMISSION_ROLE");
    bytes32 public constant CHANGE_TOKEN_BALANCE_PERMISSION_ROLE = 0x4413cad936c22452a3bdddec48f42af1848858d1e8a8b62b7c0ba489d6d77286;

    event Scheduled(uint256 indexed id);
    event Paused(uint256 indexed id);
    event FastForwarded(uint256 indexed id);
    event Executed(uint256 indexed id);
    event Stopped(uint256 indexed id);
    event DelayPeriodChanged(uint64 delayPeriod);
    event TokenBalancePermissionChanged(ERC20 submitToken, uint256 submitBalance, ERC20 challengeToken, uint256 challengeBalance);

    enum DelayableState {
        Scheduled,
        Paused,
        FastForwarded,
        Executed,
        Stopped
    }

    struct Delayable {
        address submitter;              // Address of the delayable submitter
        uint64 executableAt;            // Date time when the delayable can be executed
        DelayableState state;           // Current state of the delayable
        uint256 actionId;               // Identification number of the action in the context of the agreement
        bytes script;                   // Action script to be executed
    }

    struct TokenBalancePermission {
        ERC20 token;                    // ERC20 token to be used for custom permissions based on token balance
        uint256 balance;                // Amount of tokens used for custom permissions
    }

    uint64 public delayPeriod;
    Delayable[] private delayables;

    TokenBalancePermission private submitTokenBalancePermission;
    TokenBalancePermission private challengeTokenBalancePermission;

    /**
    * @notice Initialize Delay app with `@transformTime(_delayPeriod)`, linked to the Agreement `_agreement` with the following requirements:
    * @notice - `@tokenAmount(_collateralToken, _actionCollateral)` collateral for submitting actions
    * @notice - `@tokenAmount(_collateralToken, _challengeCollateral)` collateral for challenging actions
    * @notice - `@transformTime(_challengeDuration)` for the challenge duration
    * @notice - Submit permission: `_submitPermissionToken == 0 ? 'None' : @tokenAmount(_submitPermissionToken, _submitPermissionBalance)`
    * @notice - Challenge per: `_challengePermissionBalance == 0 ? 'None' : @tokenAmount(_challengePermissionToken, _challengePermissionBalance)`
    * @param _delayPeriod Duration in seconds during which an action is delayed before being executed
    * @param _agreement Agreement instance to be linked
    * @param _collateralToken Address of the ERC20 token to be used for collateral
    * @param _actionCollateral Amount of collateral tokens that will be locked every time an delayable is submitted
    * @param _challengeCollateral Amount of collateral tokens that will be locked every time an delayable is challenged
    * @param _challengeDuration Duration in seconds of the challenge, during this time window the submitter can answer the challenge
    * @param _submitPermissionToken ERC20 token to be used for custom submitting permissions based on token balance
    * @param _submitPermissionBalance Amount of `_submitPermissionToken` tokens for custom signing permissions
    * @param _challengePermissionToken ERC20 token to be used for custom challenge permissions based on token balance
    * @param _challengePermissionBalance Amount of `_challengePermissionBalance` tokens for custom challenge permissions
    */
    function initialize(
        uint64 _delayPeriod,
        IAgreement _agreement,
        ERC20 _collateralToken,
        uint256 _actionCollateral,
        uint256 _challengeCollateral,
        uint64 _challengeDuration,
        ERC20 _submitPermissionToken,
        uint256 _submitPermissionBalance,
        ERC20 _challengePermissionToken,
        uint256 _challengePermissionBalance
    )
        external
    {
        initialized();

        _setAgreement(_agreement);
        _newDelayPeriod(_delayPeriod);
        _newCollateralRequirement(_collateralToken, _actionCollateral, _challengeCollateral, _challengeDuration);
        _newTokenBalancePermission(_submitPermissionToken, _submitPermissionBalance, _challengePermissionToken, _challengePermissionBalance);
    }

    /**
    * @notice Schedule a new delayable
    * @param _script Action script to be executed
    * @param _context Link to a human-readable text giving context for the given action
    */
    function schedule(bytes _script, bytes _context) external {
        require(_canSubmit(msg.sender), ERROR_AUTH_FAILED);
        _schedule(msg.sender, _script, _context);
    }

    /**
    * @notice Execute delayable #`_id`
    * @param _id Identification number of the delayable to be executed
    */
    function execute(uint256 _id) external {
        Delayable storage delayable = _getDelayable(_id);
        require(_canExecute(delayable), ERROR_CANNOT_EXECUTE_DELAYABLE);

        _closeAction(delayable.actionId);
        delayable.state = DelayableState.Executed;
        emit Executed(_id);

        // Add the agreement to the blacklist to disallow a user holder from executing actions on it
        address[] memory blacklist = new address[](1);
        blacklist[0] = address(_getAgreement());
        runScript(delayable.script, new bytes(0), blacklist);
    }

    /**
    * @notice Stop delayable #`_id`
    * @param _id Identification number of the delayable to be stopped
    */
    function stop(uint256 _id) external {
        Delayable storage delayable = _getDelayable(_id);
        address submitter = delayable.submitter;
        require(msg.sender == submitter, ERROR_SENDER_NOT_ALLOWED);
        require(_canStop(delayable), ERROR_CANNOT_STOP_DELAYABLE);

        _closeAction(delayable.actionId);
        delayable.state = DelayableState.Stopped;
        emit Stopped(_id);
    }

    /**
    * @notice Change delay period to `@transformTime(_delayPeriod)`
    * @param _delayPeriod Duration in seconds during which an action is delayed before being executed
    */
    function changeDelayPeriod(uint64 _delayPeriod) external auth(CHANGE_DELAY_PERIOD_ROLE) {
        _newDelayPeriod(_delayPeriod);
    }

    /**
    * @notice Change Agreement custom token balance permission parameters to:
    * @notice - `@tokenAmount(_submitToken, _submitBalance)` for submitting permissions
    * @notice - `@tokenAmount(_challengeToken, _challengeBalance)` for challenging permissions
    * @param _submitToken ERC20 token to be used for custom submitting permissions based on token balance
    * @param _submitBalance Amount of `_submitBalance` tokens for custom signing permissions
    * @param _challengeToken ERC20 token to be used for custom challenge permissions based on token balance
    * @param _challengeBalance Amount of `_challengeBalance` tokens for custom challenge permissions
    */
    function changeTokenBalancePermission(ERC20 _submitToken, uint256 _submitBalance, ERC20 _challengeToken, uint256 _challengeBalance)
        external
        auth(CHANGE_TOKEN_BALANCE_PERMISSION_ROLE)
    {
        _newTokenBalancePermission(_submitToken, _submitBalance, _challengeToken, _challengeBalance);
    }

    /**
    * @dev Tell delayable related information
    * @param _id Identification number of the delayable being queried
    * @return submitter Address of the delayable submitter
    * @return executableAt Date time when the delayable can be executed
    * @return state Current state of the delayable
    * @return actionId Identification number of the action in the context of the agreement
    * @return script Delayable script to be executed
    */
    function getDelayable(uint256 _id) external view
        returns (
            address submitter,
            uint64 executableAt,
            DelayableState state,
            uint256 actionId,
            bytes script
        )
    {
        Delayable storage delayable = _getDelayable(_id);
        submitter = delayable.submitter;
        executableAt = delayable.executableAt;
        state = delayable.state;
        actionId = delayable.actionId;
        script = delayable.script;
    }

    /**
    * @dev Tell the information related to the custom token balance submitting permission
    * @return submitPermissionToken ERC20 token to be used for custom submitting permissions based on token balance
    * @return submitPermissionBalance Amount of `submitPermissionToken` tokens used for custom submitting permissions
    * @return challengePermissionToken ERC20 token to be used for custom challenge permissions based on token balance
    * @return challengePermissionBalance Amount of `challengePermissionToken` tokens used for custom challenge permissions
    */
    function getTokenBalancePermission() external view
        returns (
            ERC20 submitPermissionToken,
            uint256 submitPermissionBalance,
            ERC20 challengePermissionToken,
            uint256 challengePermissionBalance
        )
    {
        TokenBalancePermission storage submitPermission = submitTokenBalancePermission;
        submitPermissionToken = submitPermission.token;
        submitPermissionBalance = submitPermission.balance;

        TokenBalancePermission storage challengePermission = challengeTokenBalancePermission;
        challengePermissionToken = challengePermission.token;
        challengePermissionBalance = challengePermission.balance;
    }

    /**
    * @dev Tell whether a delayable can be executed or not
    * @param _id Identification number of the delayable being queried
    * @return True if the delayable can be executed, false otherwise
    */
    function canExecute(uint256 _id) public view returns (bool) {
        Delayable storage delayable = _getDelayable(_id);
        return _canExecute(delayable) && _canProceed(delayable.actionId);
    }

    /**
    * @dev Tell whether a delayable can be paused or not
    * @param _id Identification number of the delayable being queried
    * @return True if the delayable can be paused, false otherwise
    */
    function canPause(uint256 _id) public view returns (bool) {
        Delayable storage delayable = _getDelayable(_id);
        return _canPause(delayable);
    }

    /**
    * @dev Tell whether a delayable can be stopped or not
    * @param _id Identification number of the delayable being queried
    * @return True if the delayable can be stopped, false otherwise
    */
    function canStop(uint256 _id) public view returns (bool) {
        Delayable storage delayable = _getDelayable(_id);
        return _canStop(delayable) && _canProceed(delayable.actionId);
    }

    /**
    * @notice Schedule a new delayable
    * @dev IForwarder interface conformance
    * @param _script Action script to be executed
    */
    function forward(bytes _script) public {
        require(canForward(msg.sender, _script), ERROR_CANNOT_FORWARD);
        _schedule(msg.sender, _script, new bytes(0));
    }

    /**
    * @notice Tells whether `_sender` can forward actions or not
    * @dev IForwarder interface conformance
    * @param _sender Address of the account intending to forward an action
    * @return True if the given address can submit actions, false otherwise
    */
    function canForward(address _sender, bytes) public view returns (bool) {
        return _canSubmit(_sender);
    }

    /**
    * @dev Schedule a new delayable
    * @param _submitter Address submitting the delayable
    * @param _script Action script to be executed
    * @param _context Link to a human-readable text giving context for the given delayable
    */
    function _schedule(address _submitter, bytes _script, bytes _context) internal {
        uint256 id = delayables.length++;
        uint256 actionId = _newAction(id, _submitter, _context);

        Delayable storage delayable = delayables[id];
        delayable.submitter = _submitter;
        delayable.executableAt = getTimestamp64().add(delayPeriod);
        delayable.script = _script;
        delayable.state = DelayableState.Scheduled;
        delayable.actionId = actionId;
        emit Scheduled(id);
    }

    /**
    * @dev Challenge a delayable
    * @param _id Identification number of the delayable to be challenged
    * @param _challenger Address challenging the disputable
    */
    function _onDisputableChallenged(uint256 _id, address _challenger) internal {
        require(_canChallenge(_id, _challenger), ERROR_CANNOT_PAUSE_DELAYABLE);

        Delayable storage delayable = _getDelayable(_id);
        delayable.state = DelayableState.Paused;
        emit Paused(_id);
    }

    /**
    * @dev Allow a delayable
    * @param _id Identification number of the delayable to be allowed
    */
    function _onDisputableAllowed(uint256 _id) internal {
        Delayable storage delayable = _getDelayable(_id);
        require(_canFastForward(delayable), ERROR_CANNOT_FAST_FORWARD_DELAYABLE);

        delayable.state = DelayableState.FastForwarded;
        emit FastForwarded(_id);
    }

    /**
    * @dev Reject a delayable
    * @param _id Identification number of the delayable to be rejected
    */
    function _onDisputableRejected(uint256 _id) internal {
        _stopByAgreement(_id);
    }

    /**
    * @dev Void a delayable
    * @param _id Identification number of the delayable to be voided
    */
    function _onDisputableVoided(uint256 _id) internal {
        _stopByAgreement(_id);
    }

    /**
    * @dev Stop a delayable by agreement
    * @param _id Identification number of the delayable to be stopped
    */
    function _stopByAgreement(uint256 _id) internal {
        Delayable storage delayable = _getDelayable(_id);
        require(_isScheduledOrPaused(delayable), ERROR_CANNOT_STOP_DELAYABLE);

        delayable.state = DelayableState.Stopped;
        emit Stopped(_id);
    }

    /**
    * @dev Change delay period
    * @param _delayPeriod Duration in seconds during which an action is delayed before being executed
    */
    function _newDelayPeriod(uint64 _delayPeriod) internal {
        emit DelayPeriodChanged(_delayPeriod);
        delayPeriod = _delayPeriod;
    }

    /**
    * @dev Change Agreement custom token balance permission parameters
    * @param _submitToken ERC20 token to be used for custom submitting permissions based on token balance
    * @param _submitBalance Amount of `_submitBalance` tokens for custom submitting permissions
    * @param _challengeToken ERC20 token to be used for custom challenge permissions based on token balance
    * @param _challengeBalance Amount of `_challengeBalance` tokens for custom challenge permissions
    */
    function _newTokenBalancePermission(ERC20 _submitToken, uint256 _submitBalance, ERC20 _challengeToken, uint256 _challengeBalance) internal {
        submitTokenBalancePermission.token = _submitToken;
        submitTokenBalancePermission.balance = _submitBalance;
        challengeTokenBalancePermission.token = _challengeToken;
        challengeTokenBalancePermission.balance = _challengeBalance;
        emit TokenBalancePermissionChanged(_submitToken, _submitBalance, _challengeToken, _challengeBalance);
    }

    /**
    * @dev Tell whether an address can submit actions or not
    * @param _submitter Address being queried
    * @return True if the given address can submit actions, false otherwise
    */
    function _canSubmit(address _submitter) internal view returns (bool) {
        TokenBalancePermission storage permission = submitTokenBalancePermission;
        ERC20 permissionToken = permission.token;

        return isContract(address(permissionToken))
            ? permissionToken.balanceOf(_submitter) >= permission.balance
            : canPerform(_submitter, SUBMIT_ROLE, arr(_submitter));
    }

    /**
    * @dev Tell whether a delayable can be challenged by an address or not
    * @param _id Identification number of the delayable instance being queried
    * @param _challenger Address challenging the delayable
    * @return True if the delayable can be challenged by the given address, false otherwise
    */
    function _canChallenge(uint256 _id, address _challenger) internal view returns (bool) {
        Delayable storage delayable = _getDelayable(_id);
        if (!_canPause(delayable)) {
            return false;
        }

        TokenBalancePermission storage permission = challengeTokenBalancePermission;
        ERC20 permissionToken = permission.token;

        return isContract(address(permissionToken))
            ? permissionToken.balanceOf(_challenger) >= permission.balance
            : canPerform(_challenger, CHALLENGE_ROLE, arr(_challenger, _id));
    }

    /**
    * @dev Tell whether a delayable can be paused or not
    * @param _delayable Delayable instance being queried
    * @return True if the delayable can be paused, false otherwise
    */
    function _canPause(Delayable storage _delayable) internal view returns (bool) {
        return _delayable.state == DelayableState.Scheduled && getTimestamp64() < _delayable.executableAt;
    }

    /**
    * @dev Tell whether a delayable can be executed or not
    * @param _delayable Delayable instance being queried
    * @return True if the delayable can be executed, false otherwise
    */
    function _canExecute(Delayable storage _delayable) internal view returns (bool) {
        DelayableState state = _delayable.state;
        return state == DelayableState.FastForwarded || (state == DelayableState.Scheduled && getTimestamp64() >= _delayable.executableAt);
    }

    /**
    * @dev Tell whether a delayable can be stopped or not
    * @param _delayable Delayable instance being queried
    * @return True if the delayable can be stopped, false otherwise
    */
    function _canStop(Delayable storage _delayable) internal view returns (bool) {
        DelayableState state = _delayable.state;
        return state == DelayableState.FastForwarded || state == DelayableState.Scheduled;
    }

    /**
    * @dev Tell whether a delayable can be fast-forwarded
    * @param _delayable Delayable instance being queried
    * @return True if the delayable can be fast-forwarded, false otherwise
    */
    function _canFastForward(Delayable storage _delayable) internal view returns (bool) {
        return _delayable.state == DelayableState.Paused;
    }

    /**
    * @dev Tell whether a delayable is scheduled or paused, or not
    * @param _delayable Delayable instance being queried
    * @return True if the delayable is scheduled or paused, false otherwise
    */
    function _isScheduledOrPaused(Delayable storage _delayable) internal view returns (bool) {
        DelayableState state = _delayable.state;
        return state == DelayableState.Scheduled || state == DelayableState.Paused;
    }

    /**
    * @dev Fetch a delayable instance by identification number
    * @param _id Identification number of the delayable being queried
    * @return Delayable instance associated to the given identification number
    */
    function _getDelayable(uint256 _id) internal view returns (Delayable storage) {
        require(_id < delayables.length, ERROR_DELAYABLE_DOES_NOT_EXIST);
        return delayables[_id];
    }
}
