pragma solidity 0.4.18;

import "./BetaTemplateBase.sol";


contract DemocracyTemplate is BetaTemplateBase {
    function DemocracyTemplate(
        DAOFactory _fac,
        MiniMeTokenFactory _minimeFac,
        APMRegistry _apm,
        EtherToken _etherToken,
        IFIFSResolvingRegistrar _aragonID,
        bytes32[4] _appIds
    )
        BetaTemplateBase(_fac, _minimeFac, _apm, _etherToken, _aragonID, _appIds)
        public
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

     function newInstance(
         string name,
         address[] holders,
         uint256[] tokens,
         uint256 supportNeeded,
         uint256 minAcceptanceQuorum,
         uint64 voteDuration
     )
         external
     {
         MiniMeToken token = popTokenCache(msg.sender);
         Voting voting = createDAO(
             name,
             token,
             holders,
             tokens,
             uint256(-1)
         );
         voting.initialize(
             token,
             supportNeeded,
             minAcceptanceQuorum,
             voteDuration
         );
     }
}
