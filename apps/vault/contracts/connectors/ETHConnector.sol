pragma solidity 0.4.18;

import "../Vault.sol";


contract ETHConnector is Vault, IConnector {
    function deposit(address token, address who, uint256 value, bytes how) payable external returns (bool){
        require(token == ETH);
        require(value == msg.value);
        // require(who == msg.sender); // maybe actual sender wants to signal who sent it

        Deposit(ETH, who, value);
    }

    function transfer(address token, address to, uint256 value, bytes how) external returns (bool) {
        require(token == ETH);

        require(to.call.value(value)(how));

        Transfer(ETH, to, value);
    }

    function balance(address token) public view returns (uint256) {
        return address(this).balance;
    }
}
