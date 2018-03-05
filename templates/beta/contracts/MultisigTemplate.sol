pragma solidity 0.4.18;

import "./BetaTemplateBase.sol";


contract MultisigTemplate is BetaTemplateBase {
    function MultisigTemplate(
        DAOFactory _fac,
        MiniMeTokenFactory _minimeFac,
        APMRegistry _apm,
        EtherToken _etherToken,
        IFIFSResolvingRegistrar _aragonID,
        bytes32[4] _appIds
    )
        BetaTemplateBase(_fac, _minimeFac, _apm, _etherToken, _aragonID, _appIds) public
    {}

    function newToken(string name, string symbol) external returns (MiniMeToken token) {
        token = minimeFac.createCloneToken(
            address(0),
            0,
            name,
            18,
            symbol,
            true
        );
        cacheToken(token, msg.sender);
    }

    function newInstance(string name, address[] signers, uint256 neededSignatures) external {
        uint256[] memory stakes = new uint256[](signers.length);

        for (uint256 i = 0; i < signers.length; i++) {
            stakes[i] = 10**18;
        }

        MiniMeToken token = popTokenCache(msg.sender);
        Voting voting = createDAO(
            name,
            token,
            signers,
            stakes,
            10**18
        );

        uint256 multisigSupport = neededSignatures * 10 ** 18 / signers.length;
        voting.initialize(
            token,
            multisigSupport,
            multisigSupport,
            uint64(157680000) // 5 years
        );
    }
}
