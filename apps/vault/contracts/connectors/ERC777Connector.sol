pragma solidity 0.4.18;

import "../VaultBase.sol";
import "./standards/ERC777.sol";


contract ERC777Connector is VaultBase, IVaultConnector, ERC777TokensRecipient {
    function register(address token) external {
        // TODO: Use EIP780 register the vault as conformant to ERC777
    }

    function deposit(address token, address who, uint256 value, bytes how) payable external returns (bool) {
        // require(who == msg.sender); // maybe actual sender wants to signal who sent it

        ERC777(token).operatorSend(who, this, value, how, how);
        // Deposit(token, who, value); will be called in the tokensReceived method

        return true;
    }

    function transfer(address token, address to, uint256 value, bytes how)
             authP(TRANSFER_ROLE, arr(token, to, value))
             external returns (bool)
    {

        ERC777(token).send(to, value, how);

        Transfer(token, to, value);

        return true;
    }

    function tokensReceived(address operator, address from, address to, uint amount, bytes userData, bytes operatorData) public {
        Deposit(msg.sender, from, amount);
    }

    function balance(address token) public view returns (uint256) {
        return ERC777(token).balanceOf(this);
    }
}
