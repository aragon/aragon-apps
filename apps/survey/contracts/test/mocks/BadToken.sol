pragma solidity 0.4.24;

import "@aragon/apps-shared-minime/contracts/MiniMeToken.sol";


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

    // should be changed to view when MiniMe is updated
    function totalSupplyAt(uint) public view returns(uint) {
        return 1;
    }
}
