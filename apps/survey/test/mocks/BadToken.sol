pragma solidity 0.4.18;

import "@aragon/os/contracts/lib/minime/MiniMeToken.sol";


contract BadToken is MiniMeToken {
    function BadToken(
        MiniMeTokenFactory _tokenFactory,
        MiniMeToken _parentToken,
        uint _parentSnapShotBlock,
        string _tokenName,
        uint8 _decimalUnits,
        string _tokenSymbol,
        bool _transfersEnabled
    ) public
        MiniMeToken(_tokenFactory, _parentToken, _parentSnapShotBlock,
                    _tokenName, _decimalUnits, _tokenSymbol, _transfersEnabled)
    {

    }

    function totalSupplyAt(uint _blockNumber) public constant returns(uint) {
        return 1;
    }
}
