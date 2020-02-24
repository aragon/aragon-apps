pragma solidity 0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/common/DepositableStorage.sol";
import "@aragon/os/contracts/common/EtherTokenConstant.sol";
import "@aragon/os/contracts/common/SafeERC20.sol";
import "@aragon/os/contracts/lib/token/ERC20.sol";


contract Vault is EtherTokenConstant, AragonApp, DepositableStorage {
    using SafeERC20 for ERC20;

    bytes32 public constant TRANSFER_ROLE = keccak256("TRANSFER_ROLE");

    string private constant ERROR_DATA_NON_ZERO = "VAULT_DATA_NON_ZERO";
    string private constant ERROR_NOT_DEPOSITABLE = "VAULT_NOT_DEPOSITABLE";
    string private constant ERROR_DEPOSIT_VALUE_ZERO = "VAULT_DEPOSIT_VALUE_ZERO";
    string private constant ERROR_TRANSFER_VALUE_ZERO = "VAULT_TRANSFER_VALUE_ZERO";
    string private constant ERROR_SEND_REVERTED = "VAULT_SEND_REVERTED";
    string private constant ERROR_VALUE_MISMATCH = "VAULT_VALUE_MISMATCH";
    string private constant ERROR_TOKEN_TRANSFER_FROM_REVERTED = "VAULT_TOKEN_TRANSFER_FROM_REVERT";
    string private constant ERROR_TOKEN_TRANSFER_REVERTED = "VAULT_TOKEN_TRANSFER_REVERTED";

    event VaultTransfer(address indexed token, address indexed to, uint256 amount);
    event VaultDeposit(address indexed token, address indexed sender, uint256 amount);

    /**
    * @dev On a normal send() or transfer() this fallback is never executed as it will be
    *      intercepted by the Proxy (see aragonOS#281)
    */
    function () external payable isInitialized {
        require(msg.data.length == 0, ERROR_DATA_NON_ZERO);
        _deposit(ETH, msg.value);
    }

    /**
    * @notice Initialize Vault app
    * @dev As an AragonApp it needs to be initialized in order for roles (`auth` and `authP`) to work
    */
    function initialize() external onlyInit {
        initialized();
        setDepositable(true);
    }

    /**
    * @notice Deposit `_value` `_token` to the vault
    * @param _token Address of the token being transferred
    * @param _value Amount of tokens being transferred
    */
    function deposit(address _token, uint256 _value) external payable isInitialized {
        _deposit(_token, _value);
    }

    /**
    * @notice Transfer `_value` `_token` from the Vault to `_to`
    * @param _token Address of the token being transferred
    * @param _to Address of the recipient of tokens
    * @param _value Amount of tokens being transferred
    */
    /* solium-disable-next-line function-order */
    function transfer(address _token, address _to, uint256 _value)
        external
        authP(TRANSFER_ROLE, arr(_token, _to, _value))
    {
        require(_value > 0, ERROR_TRANSFER_VALUE_ZERO);

        if (_token == ETH) {
            require(_to.send(_value), ERROR_SEND_REVERTED);
        } else {
            require(ERC20(_token).safeTransfer(_to, _value), ERROR_TOKEN_TRANSFER_REVERTED);
        }

        emit VaultTransfer(_token, _to, _value);
    }

    function balance(address _token) public view returns (uint256) {
        if (_token == ETH) {
            return address(this).balance;
        } else {
            return ERC20(_token).staticBalanceOf(address(this));
        }
    }

    /**
    * @dev Disable recovery escape hatch, as it could be used
    *      maliciously to transfer funds away from the vault
    */
    function allowRecoverability(address) public view returns (bool) {
        return false;
    }

    function _deposit(address _token, uint256 _value) internal {
        require(isDepositable(), ERROR_NOT_DEPOSITABLE);
        require(_value > 0, ERROR_DEPOSIT_VALUE_ZERO);

        if (_token == ETH) {
            // Deposit is implicit in this case
            require(msg.value == _value, ERROR_VALUE_MISMATCH);
        } else {
            require(
                ERC20(_token).safeTransferFrom(msg.sender, address(this), _value),
                ERROR_TOKEN_TRANSFER_FROM_REVERTED
            );
        }

        emit VaultDeposit(_token, msg.sender, _value);
    }
}
