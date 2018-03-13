pragma solidity 0.4.18;

import "@aragon/os/contracts/common/DelegateProxy.sol";
import "@aragon/os/contracts/apps/AragonApp.sol";

import "@aragon/os/contracts/lib/zeppelin/token/ERC20.sol";
import "@aragon/os/contracts/lib/misc/Migrations.sol";

contract Vault is AragonApp {
    event Transfer(address indexed token, address indexed receiver, uint256 amount);
    event Deposit(address indexed token, address indexed sender, uint256 amount);

    mapping (address => address) connectors;

    bytes32 constant public REQUEST_ALLOWANCES_ROLE = keccak256("REQUEST_ALLOWANCES_ROLE");
    bytes32 constant public TRANSFER_ROLE = keccak256("TRANSFER_ROLE");

    address constant ETH = 0x0;
    bytes32 constant erc777Identifier = keccak256('erc777');
    bytes32 constant erc20Identifier = keccak256('erc20');

    function initialize(address defaultConnector, address erc777connector, address ethConnector) onlyInit {
      initialized();

    }

    /**
    * @notice Transfer `_amount` `_token` from the Vault to `_receiver`
    * @dev This function should be used as little as possible, in favor of using allowances
    * @param _token Address of the token being transferred
    * @param _receiver Address of the recipient of tokens
    * @param _amount Amount of tokens being transferred
    */
    function transfer(ERC20 _token, address _receiver, uint256 _amount) authP(TRANSFER_ROLE, arr(address(_token), _receiver, _amount)) external {
        assert(_token.transfer(_receiver, _amount));
        TokenTransfer(_token, _receiver, _amount);
    }

    function () payable {
        require(msg.value > 0);
        Deposit(ETH, msg.sender, msg.value);
    }
      /*
        if (msg.value > 0) {

        } else {
            address connector = connectors[msg.sender];
            require(connector != address(0) && msg.data.length > 0);

            delegatedFwd(msg.data);
        }
    */
}
