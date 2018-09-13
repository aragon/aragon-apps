pragma solidity 0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/common/EtherTokenConstant.sol";
import "@aragon/os/contracts/lib/token/ERC20.sol";


contract Vault is EtherTokenConstant, AragonApp {
    bytes32 public constant TRANSFER_ROLE = keccak256("TRANSFER_ROLE");

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
    }

    /**
    * @notice Deposit `_value` `_token` to the vault
    * @param _token Address of the token being transferred
    * @param _from Entity that currently owns the tokens
    * @param _value Amount of tokens being transferred
    */
    function deposit(address _token, address _from, uint256 _value) public payable isInitialized {
        require(_value > 0);
        require(msg.sender == _from);

        if (_token == ETH) {
            // Deposit is implicit in this case
            require(msg.value == _value);
        } else {
            require(ERC20(_token).transferFrom(_from, this, _value));
        }

        emit Deposit(_token, _from, _value);
    }

    /*
    * TODO: Function could be brought back when https://github.com/ethereum/solidity/issues/526 is fixed
    * @notice Deposit `_value` `_token` to the vault
    * @param _token Address of the token being transferred
    * @param _from Entity that currently owns the tokens
    * @param _value Amount of tokens being transferred
    * @param _data Extra data associated with the deposit (currently unused)
    function deposit(address _token, address _from, uint256 _value, bytes _data) external isInitialized payable {
        _deposit(_token, _from, _value);
    }
    */

    /**
    * @notice Transfer `_value` `_token` from the Vault to `_to`
    * @param _token Address of the token being transferred
    * @param _to Address of the recipient of tokens
    * @param _value Amount of tokens being transferred
    */
    function transfer(address _token, address _to, uint256 _value)
        external
        authP(TRANSFER_ROLE, arr(_token, _to, _value))
    {
        transfer(_token, _to, _value, new bytes(0));
    }

    /**
    * @notice Transfer `_value` `_token` from the Vault to `_to`
    * @param _token Address of the token being transferred
    * @param _to Address of the recipient of tokens
    * @param _value Amount of tokens being transferred
    * @param _data Extra data associated with the transfer (only used for ETH)
    */
    function transfer(address _token, address _to, uint256 _value, bytes _data)
        public
        authP(TRANSFER_ROLE, arr(_token, _to, _value))
    {
        require(_value > 0);

        if (_token == ETH) {
            require(_to.call.value(_value)(_data));
        } else {
            require(ERC20(_token).transfer(_to, _value));
        }

        emit Transfer(token, to, value);
    }

    function balance(address _token) public view returns (uint256) {
        if (_token == ETH) {
            return address(this).balance;
        } else {
            return ERC20(_token).balanceOf(this);
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
