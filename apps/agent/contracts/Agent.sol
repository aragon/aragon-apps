/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "./SignatureValidator.sol";
import "./standards/IERC165.sol";
import "./standards/ERC1271.sol";
import "./standards/IERC721Receiver.sol";

import "@aragon/apps-vault/contracts/Vault.sol";

import "@aragon/os/contracts/common/IForwarder.sol";


contract Agent is IERC165, IERC721Receiver, ERC1271Bytes, IForwarder, IsContract, Vault {
    /* Hardcoded constants to save gas
    bytes32 public constant EXECUTE_ROLE = keccak256("EXECUTE_ROLE");
    bytes32 public constant SAFE_EXECUTE_ROLE = keccak256("SAFE_EXECUTE_ROLE");
    bytes32 public constant ADD_PROTECTED_TOKEN_ROLE = keccak256("ADD_PROTECTED_TOKEN_ROLE");
    bytes32 public constant REMOVE_PROTECTED_TOKEN_ROLE = keccak256("REMOVE_PROTECTED_TOKEN_ROLE");
    bytes32 public constant ADD_PRESIGNED_HASH_ROLE = keccak256("ADD_PRESIGNED_HASH_ROLE");
    bytes32 public constant DESIGNATE_SIGNER_ROLE = keccak256("DESIGNATE_SIGNER_ROLE");
    bytes32 public constant RUN_SCRIPT_ROLE = keccak256("RUN_SCRIPT_ROLE");
    */

    bytes32 public constant EXECUTE_ROLE = 0xcebf517aa4440d1d125e0355aae64401211d0848a23c02cc5d29a14822580ba4;
    bytes32 public constant SAFE_EXECUTE_ROLE = 0x0a1ad7b87f5846153c6d5a1f761d71c7d0cfd122384f56066cd33239b7933694;
    bytes32 public constant ADD_PROTECTED_TOKEN_ROLE = 0x6eb2a499556bfa2872f5aa15812b956cc4a71b4d64eb3553f7073c7e41415aaa;
    bytes32 public constant REMOVE_PROTECTED_TOKEN_ROLE = 0x71eee93d500f6f065e38b27d242a756466a00a52a1dbcd6b4260f01a8640402a;
    bytes32 public constant ADD_PRESIGNED_HASH_ROLE = 0x0b29780bb523a130b3b01f231ef49ed2fa2781645591a0b0a44ca98f15a5994c;
    bytes32 public constant DESIGNATE_SIGNER_ROLE = 0x23ce341656c3f14df6692eebd4757791e33662b7dcf9970c8308303da5472b7c;
    bytes32 public constant RUN_SCRIPT_ROLE = 0xb421f7ad7646747f3051c50c0b8e2377839296cd4973e27f63821d73e390338f;

    uint256 public constant PROTECTED_TOKENS_CAP = 10;

    bytes4 private constant ERC165_INTERFACE_ID = 0x01ffc9a7;
    bytes4 private constant ERC721_RECEIVED_INTERFACE_ID = 0x150b7a02; // bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))

    string private constant ERROR_TARGET_PROTECTED = "AGENT_TARGET_PROTECTED";
    string private constant ERROR_PROTECTED_TOKENS_MODIFIED = "AGENT_PROTECTED_TOKENS_MODIFIED";
    string private constant ERROR_PROTECTED_BALANCE_LOWERED = "AGENT_PROTECTED_BALANCE_LOWERED";
    string private constant ERROR_TOKENS_CAP_REACHED = "AGENT_TOKENS_CAP_REACHED";
    string private constant ERROR_TOKEN_NOT_ERC20 = "AGENT_TOKEN_NOT_ERC20";
    string private constant ERROR_TOKEN_ALREADY_PROTECTED = "AGENT_TOKEN_ALREADY_PROTECTED";
    string private constant ERROR_TOKEN_NOT_PROTECTED = "AGENT_TOKEN_NOT_PROTECTED";
    string private constant ERROR_DESIGNATED_TO_SELF = "AGENT_DESIGNATED_TO_SELF";
    string private constant ERROR_CAN_NOT_FORWARD = "AGENT_CAN_NOT_FORWARD";

    mapping (bytes32 => bool) public isPresigned;
    address public designatedSigner;
    address[] public protectedTokens;

    event SafeExecute(address indexed sender, address indexed target, bytes data);
    event Execute(address indexed sender, address indexed target, uint256 ethValue, bytes data);
    event AddProtectedToken(address indexed token);
    event RemoveProtectedToken(address indexed token);
    event PresignHash(address indexed sender, bytes32 indexed hash);
    event SetDesignatedSigner(address indexed sender, address indexed oldSigner, address indexed newSigner);
    event ReceiveERC721(address indexed token, address indexed operator, address indexed from, uint256 tokenId, bytes data);

    /**
    * @notice Execute '`@radspec(_target, _data)`' on `_target``_ethValue == 0 ? '' : ' (Sending ' + @tokenAmount(0x0000000000000000000000000000000000000000, _ethValue) + ')'`
    * @param _target Address where the action is being executed
    * @param _ethValue Amount of ETH from the contract that is sent with the action
    * @param _data Calldata for the action
    * @return Exits call frame forwarding the return data of the executed call (either error or success data)
    */
    function execute(address _target, uint256 _ethValue, bytes _data)
        external // This function MUST always be external as the function performs a low level return, exiting the Agent app execution context
        authP(EXECUTE_ROLE, arr(_target, _ethValue, uint256(_getSig(_data)))) // bytes4 casted as uint256 sets the bytes as the LSBs
    {
        bool result = _target.call.value(_ethValue)(_data);

        if (result) {
            emit Execute(msg.sender, _target, _ethValue, _data);
        }

        assembly {
            let ptr := mload(0x40)
            returndatacopy(ptr, 0, returndatasize)

            // revert instead of invalid() bc if the underlying call failed with invalid() it already wasted gas.
            // if the call returned error data, forward it
            switch result case 0 { revert(ptr, returndatasize) }
            default { return(ptr, returndatasize) }
        }
    }

    /**
    * @notice Execute '`@radspec(_target, _data)`' on `_target`, ensuring that protected tokens can't be spent
    * @param _target Address where the action is being executed
    * @param _data Calldata for the action
    * @return Exits call frame forwarding the return data of the executed call (either error or success data)
    */
    function safeExecute(address _target, bytes _data)
        external // This function MUST always be external as the function performs a low level return, exiting the Agent app execution context
        authP(SAFE_EXECUTE_ROLE, arr(_target, uint256(_getSig(_data)))) // bytes4 casted as uint256 sets the bytes as the LSBs
    {
        uint256 protectedTokensLength = protectedTokens.length;
        address[] memory protectedTokens_ = new address[](protectedTokensLength);
        uint256[] memory balances = new uint256[](protectedTokensLength);

        for (uint256 i = 0; i < protectedTokensLength; i++) {
            address token = protectedTokens[i];
            require(_target != token, ERROR_TARGET_PROTECTED);
            // we copy the protected tokens array to check whether the storage array has been modified during the underlying call
            protectedTokens_[i] = token;
            // we copy the balances to check whether they have been modified during the underlying call
            balances[i] = balance(token);
        }

        bool result = _target.call(_data);

        bytes32 ptr;
        uint256 size;
        assembly {
            size := returndatasize
            ptr := mload(0x40)
            mstore(0x40, add(ptr, returndatasize))
            returndatacopy(ptr, 0, returndatasize)
        }

        if (result) {
            // if the underlying call has succeeded, we check that the protected tokens
            // and their balances have not been modified and return the call's return data
            require(protectedTokens.length == protectedTokensLength, ERROR_PROTECTED_TOKENS_MODIFIED);
            for (uint256 j = 0; j < protectedTokensLength; j++) {
                require(protectedTokens[j] == protectedTokens_[j], ERROR_PROTECTED_TOKENS_MODIFIED);
                require(balance(protectedTokens[j]) >= balances[j], ERROR_PROTECTED_BALANCE_LOWERED);
            }

            emit SafeExecute(msg.sender, _target, _data);

            assembly {
                return(ptr, size)
            }
        } else {
            // if the underlying call has failed, we revert and forward returned error data
            assembly {
                revert(ptr, size)
            }
        }
    }

    /**
    * @notice Add `_token.symbol(): string` to the list of protected tokens
    * @param _token Address of the token to be protected
    */
    function addProtectedToken(address _token) external authP(ADD_PROTECTED_TOKEN_ROLE, arr(_token)) {
        require(protectedTokens.length < PROTECTED_TOKENS_CAP, ERROR_TOKENS_CAP_REACHED);
        require(_isERC20(_token), ERROR_TOKEN_NOT_ERC20);
        require(!_tokenIsProtected(_token), ERROR_TOKEN_ALREADY_PROTECTED);

        _addProtectedToken(_token);
    }

    /**
    * @notice Remove `_token.symbol(): string` from the list of protected tokens
    * @param _token Address of the token to be unprotected
    */
    function removeProtectedToken(address _token) external authP(REMOVE_PROTECTED_TOKEN_ROLE, arr(_token)) {
        require(_tokenIsProtected(_token), ERROR_TOKEN_NOT_PROTECTED);

        _removeProtectedToken(_token);
    }

    /**
    * @notice Pre-sign hash `_hash`
    * @param _hash Hash that will be considered signed regardless of the signature checked with 'isValidSignature()'
    */
    function presignHash(bytes32 _hash)
        external
        authP(ADD_PRESIGNED_HASH_ROLE, arr(_hash))
    {
        isPresigned[_hash] = true;

        emit PresignHash(msg.sender, _hash);
    }

    /**
    * @notice Set `_designatedSigner` as the designated signer of the app, which will be able to sign messages on behalf of the app
    * @param _designatedSigner Address that will be able to sign messages on behalf of the app
    */
    function setDesignatedSigner(address _designatedSigner)
        external
        authP(DESIGNATE_SIGNER_ROLE, arr(_designatedSigner))
    {
        // Prevent an infinite loop by setting the app itself as its designated signer.
        // An undetectable loop can be created by setting a different contract as the
        // designated signer which calls back into `isValidSignature`.
        // Given that `isValidSignature` is always called with just 50k gas, the max
        // damage of the loop is wasting 50k gas.
        require(_designatedSigner != address(this), ERROR_DESIGNATED_TO_SELF);

        address oldDesignatedSigner = designatedSigner;
        designatedSigner = _designatedSigner;

        emit SetDesignatedSigner(msg.sender, oldDesignatedSigner, _designatedSigner);
    }

    function onERC721Received(address _operator, address _from, uint256 _tokenId, bytes _data) external returns (bytes4) {
        emit ReceiveERC721(msg.sender, _operator, _from, _tokenId, _data);

        return ERC721_RECEIVED_INTERFACE_ID;
    }

    // Forwarding fns

    /**
    * @notice Tells whether the Agent app is a forwarder or not
    * @dev IForwarder interface conformance
    * @return Always true
    */
    function isForwarder() external pure returns (bool) {
        return true;
    }

    /**
     * @notice Tells whether this contract supports a given ERC-165 interface
     * @dev Implements conformance to ERC-165
     * @param _interfaceId Interface bytes to check
     * @return True if this contract supports the interface
     */
    function supportsInterface(bytes4 _interfaceId) external pure returns (bool) {
        return
            _interfaceId == ERC1271_INTERFACE_ID ||
            _interfaceId == ERC721_RECEIVED_INTERFACE_ID ||
            _interfaceId == ERC165_INTERFACE_ID;
    }

    /**
    * @notice Execute the script as the Agent app
    * @dev IForwarder interface conformance. Forwards any token holder action.
    * @param _evmScript Script being executed
    */
    function forward(bytes _evmScript) public {
        require(canForward(msg.sender, _evmScript), ERROR_CAN_NOT_FORWARD);

        bytes memory input = ""; // no input
        address[] memory blacklist = new address[](0); // no addr blacklist, can interact with anything
        runScript(_evmScript, input, blacklist);
        // We don't need to emit an event here as EVMScriptRunner will emit ScriptResult if successful
    }

    /**
    * @notice Tells whether `_sender` can forward actions or not
    * @dev IForwarder interface conformance
    * @param _sender Address of the account intending to forward an action
    * @return True if the given address can run scripts, false otherwise
    */
    function canForward(address _sender, bytes _evmScript) public view returns (bool) {
        // Note that `canPerform()` implicitly does an initialization check itself
        return canPerform(_sender, RUN_SCRIPT_ROLE, arr(_getScriptACLParam(_evmScript)));
    }

    // ERC-1271 conformance

    /**
     * @notice Tells whether a signature is seen as valid by this contract through ERC-1271
     * @param _hash Arbitrary length data signed on the behalf of address (this)
     * @param _signature Signature byte array associated with _data
     * @return The ERC-1271 magic value if the signature is valid
     */
    function isValidSignature(bytes32 _hash, bytes _signature) public view returns (bytes4) {
        // Short-circuit in case the hash was presigned. Optimization as performing calls
        // and ecrecover is more expensive than an SLOAD.
        if (isPresigned[_hash]) {
            return returnIsValidSignatureMagicNumber(true);
        }

        bool isValid;
        if (designatedSigner == address(0)) {
            isValid = false;
        } else {
            isValid = SignatureValidator.isValidSignature(_hash, designatedSigner, _signature);
        }

        return returnIsValidSignatureMagicNumber(isValid);
    }

    // Getters

    function getProtectedTokensLength() public view isInitialized returns (uint256) {
        return protectedTokens.length;
    }

    // Internal fns

    function _addProtectedToken(address _token) internal {
        protectedTokens.push(_token);

        emit AddProtectedToken(_token);
    }

    function _removeProtectedToken(address _token) internal {
        protectedTokens[_protectedTokenIndex(_token)] = protectedTokens[protectedTokens.length - 1];
        protectedTokens.length--;

        emit RemoveProtectedToken(_token);
    }

    function _isERC20(address _token) internal view returns (bool) {
        if (!isContract(_token)) {
            return false;
        }

        // Throwaway sanity check to make sure the token's `balanceOf()` does not error (for now)
        balance(_token);

        return true;
    }

    function _protectedTokenIndex(address _token) internal view returns (uint256) {
        for (uint i = 0; i < protectedTokens.length; i++) {
            if (protectedTokens[i] == _token) {
              return i;
            }
        }

        revert(ERROR_TOKEN_NOT_PROTECTED);
    }

    function _tokenIsProtected(address _token) internal view returns (bool) {
        for (uint256 i = 0; i < protectedTokens.length; i++) {
            if (protectedTokens[i] == _token) {
                return true;
            }
        }

        return false;
    }

    function _getScriptACLParam(bytes _evmScript) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(_evmScript)));
    }

    function _getSig(bytes _data) internal pure returns (bytes4 sig) {
        if (_data.length < 4) {
            return;
        }

        assembly { sig := mload(add(_data, 0x20)) }
    }
}
