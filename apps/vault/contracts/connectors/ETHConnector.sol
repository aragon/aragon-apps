pragma solidity 0.4.18;

import "../Vault.sol";


contract ETHConnector is Vault, IConnector {
    function () payable {
        Deposit(ETH, msg.sender, msg.value);
    }

    function deposit(address token, address who, uint256 value, bytes how) payable external returns (bool){
        require(token == ETH);
        require(value == msg.value);
        // require(who == msg.sender); // maybe actual sender wants to signal who sent it

        Deposit(ETH, who, value);

        return true;
    }

    function transfer(address token, address to, uint256 value, bytes how)
             authP(TRANSFER_ROLE, arr(ETH, to, value))
             external returns (bool) {

        require(token == ETH);

        require(to.call.value(value)(how));

        Transfer(ETH, to, value);

        return true;
    }

    function balance(address token) public view returns (uint256) {
        return address(this).balance;
    }
}
