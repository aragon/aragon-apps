pragma solidity 0.4.18;

import "./TokenFactory.sol";
import "@aragon/apps-finance/contracts/Finance.sol";


contract Depositer {
    TokenFactory factory;

    function Depositer(TokenFactory _factory) {
        factory = _factory;
    }

    function pleaseAirdrop(Finance finance, Token token, uint256 many, string why) {
        factory.mint(token, this, many);
        token.approve(finance, many);
        finance.deposit(token, many, why);
    }
}
