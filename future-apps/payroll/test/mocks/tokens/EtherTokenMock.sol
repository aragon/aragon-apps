pragma solidity 0.4.18;

import "@aragon/os/contracts/lib/erc677/ERC677Token.sol";


contract EtherTokenMock is ERC677Token {

    string public name = "Ether";
    string public symbol = "ETH";
    uint8 public decimals = 18;

    function wrapAndCall(address _receiver, bytes _data) payable public {
    }

}
