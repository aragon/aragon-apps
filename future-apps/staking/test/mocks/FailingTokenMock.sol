pragma solidity ^0.4.11;

import "@aragon/os/contracts/lib/zeppelin/token/StandardToken.sol";


// mock class using StandardToken
contract FailingTokenMock is StandardToken {

    function FailingTokenMock(address initialAccount, uint256 initialBalance) public {
        balances[initialAccount] = initialBalance;
        totalSupply_ = initialBalance;
    }

    function transfer(address to, uint256 amount) public returns(bool) {
        return false;
    }
}
