pragma solidity 0.4.24;


contract ForceSendETH {
  // Truffle doesn't support selfdestructing on constructor:
  // Error: The contract code couldn't be stored, please check your gas amount.

  function sendByDying(address recipient) external payable {
    selfdestruct(recipient);
  }
}