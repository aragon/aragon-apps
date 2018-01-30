pragma solidity 0.4.18;

import "@aragon/os/contracts/lib/erc677/ERC677Token.sol";


contract ERC677GenToken is ERC677Token {
    string public name;                //The Token's name: e.g. DigixDAO Tokens
    uint8 public decimals;             //Number of decimals of the smallest unit
    string public symbol;              //An identifier: e.g. REP

////////////////
// Constructor
////////////////

    /// @notice Constructor to create a ERC677GenToken
    /// @param _tokenName Name of the new token
    /// @param _decimalUnits Number of decimals of the new token
    /// @param _tokenSymbol Token Symbol for the new token
    function ERC677GenToken(
        string _tokenName,
        uint8 _decimalUnits,
        string _tokenSymbol
    )  public
    {
        name = _tokenName;                                 // Set the name
        decimals = _decimalUnits;                          // Set the decimals
        symbol = _tokenSymbol;                             // Set the symbol
    }

    /// @notice Generates `_amount` tokens that are assigned to `_owner`
    /// @param _owner The address that will be assigned the new tokens
    /// @param _amount The quantity of tokens generated
    /// @return True if the tokens are generated correctly
    function generateTokens(address _owner, uint _amount) public returns (bool) {
        require(totalSupply + _amount >= totalSupply); // Check for overflow
        uint previousBalanceTo = balanceOf(_owner);
        require(previousBalanceTo + _amount >= previousBalanceTo); // Check for overflow
        totalSupply += _amount;
        balances[_owner] += _amount;

        Transfer(0, _owner, _amount);

        return true;
    }
}
