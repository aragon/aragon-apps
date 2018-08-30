pragma solidity 0.4.24;

import "@aragon-apps/minime/contracts/MiniMeToken.sol";


contract BadToken is MiniMeToken {
    constructor(
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

    function totalSupplyAt(uint _blockNumber) public view returns(uint) {
        return _blockNumber - _blockNumber + 1;
    }
}
