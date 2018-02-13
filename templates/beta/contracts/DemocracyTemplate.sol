pragma solidity 0.4.18;

import "./BetaTemplateBase.sol";


contract DemocracyTemplate is BetaTemplateBase {
    function DemocracyTemplate(DAOFactory _fac, MiniMeTokenFactory _minimeFac, APMRegistry _apm, EtherToken _etherToken, bytes32[4] _appIds)
             BetaTemplateBase(_fac, _minimeFac, _apm, _etherToken, _appIds) public {}

    function newInstance(string name, address[] holders, uint256[] tokens, uint256 supportNeeded, uint256 minAcceptanceQuorum, uint64 voteDuration) {
        MiniMeToken token = minimeFac.createCloneToken(address(0), 0, name, 18, name, true);
        Voting voting = create(token, holders, tokens, uint256(-1));
        voting.initialize(token, supportNeeded, minAcceptanceQuorum, voteDuration);
    }
}
