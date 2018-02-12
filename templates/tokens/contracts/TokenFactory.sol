pragma solidity 0.4.18;

import "./MintableToken.sol";

contract Token is MintableToken {
    string public name;
    string public symbol;
    uint8 public decimals = 18;

    function Token(string _name, string _symbol) public {
        name = _name;
        symbol = _symbol;
    }
}

contract TokenFactory {
    event DeployToken(address token);

    function newToken(string name, string symbol) public returns (Token) {
        Token token = new Token(name, symbol);

        DeployToken(token);

        return token;
    }

    function mint(Token token, address receiver, uint256 amount) public {
        token.mint(receiver, amount);
    }
}
