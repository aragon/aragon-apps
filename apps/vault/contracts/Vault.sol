pragma solidity 0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/common/DepositableStorage.sol";
import "@aragon/os/contracts/common/EtherTokenConstant.sol";
import "@aragon/os/contracts/lib/token/ERC20.sol";


contract Vault is EtherTokenConstant, AragonApp, DepositableStorage {
    bytes32 constant public TRANSFER_ROLE = keccak256("TRANSFER_ROLE");

    event Transfer(address indexed token, address indexed to, uint256 amount);
    event Deposit(address indexed token, address indexed sender, uint256 amount);

    /**
    * @dev On a normal send() or transfer() this fallback is never executed as it will be
    * intercepted by the Proxy (see aragonOS#281)
    */
    function () external payable {
        require(msg.data.length == 0);
        deposit(ETH, msg.sender, msg.value);
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
    * @notice Deposit `value` `token` to the vault
    * @param token Address of the token being transferred
    * @param from Entity that currently owns the tokens
    * @param value Amount of tokens being transferred
    */
    function deposit(address token, address from, uint256 value) public payable {
        require(isDepositable());
        require(value > 0);
        require(msg.sender == from);

        if (token == ETH) {
            // Deposit is implicit in this case
            require(msg.value == value);
        } else {
            require(ERC20(token).transferFrom(from, this, value));
        }

        emit Deposit(token, from, value);
    }

    /*
    TODO: Function could be brought back when https://github.com/ethereum/solidity/issues/526 is fixed
    * @notice Deposit `value` `token` to the vault
    * @param token Address of the token being transferred
    * @param from Entity that currently owns the tokens
    * @param value Amount of tokens being transferred
    * @param data Extra data associated with the deposit (currently unused)
    function deposit(address token, address from, uint256 value, bytes data) payable external {
        deposit(token, from, value);
    }
    */

    /**
    * @notice Transfer `value` `token` from the Vault to `to`
    * @param token Address of the token being transferred
    * @param to Address of the recipient of tokens
    * @param value Amount of tokens being transferred
    */
    /* solium-disable function-order */
    function transfer(address token, address to, uint256 value)
        external
        authP(TRANSFER_ROLE, arr(token, to, value))
    {
        transfer(token, to, value, new bytes(0));
    }

    /**
    * @notice Transfer `value` `token` from the Vault to `to`
    * @param token Address of the token being transferred
    * @param to Address of the recipient of tokens
    * @param value Amount of tokens being transferred
    * @param data Extra data associated with the transfer (only used for ETH)
    */
    function transfer(address token, address to, uint256 value, bytes data)
        public
        authP(TRANSFER_ROLE, arr(token, to, value))
    {
        require(value > 0);

        if (token == ETH) {
            require(to.call.value(value)(data));
        } else {
            require(ERC20(token).transfer(to, value));
        }

        emit Transfer(token, to, value);
    }

    function balance(address token) public view returns (uint256) {
        if (token == ETH) {
            return address(this).balance;
        } else {
            return ERC20(token).balanceOf(this);
        }
    }

    /**
    * @dev Disable recovery escape hatch, as it could be used
    *      maliciously to transfer funds away from the vault
    */
    function allowRecoverability(address) public view returns (bool) {
        return false;
    }
}
