pragma solidity 0.4.18;

import "./BetaTemplateBase.sol";


contract MultisigTemplate is BetaTemplateBase {
    function MultisigTemplate(DAOFactory _fac, MiniMeTokenFactory _minimeFac, APMRegistry _apm, EtherToken _etherToken, bytes32[4] _appIds)
             BetaTemplateBase(_fac, _minimeFac, _apm, _etherToken, _appIds) public {}

    function newInstance(address[] signers, uint256 neededSignatures) {
        uint256[] memory stakes = new uint256[](signers.length);

        for (uint256 i = 0; i < signers.length; i++) {
            stakes[i] = 1;
        }

        MiniMeToken token = minimeFac.createCloneToken(address(0), 0, "Multisig", 0, "MS", true);
        Voting voting = create(token, signers, stakes, 1);
        uint256 multisigSupport = neededSignatures * 10 ** 18 / signers.length;

        voting.initialize(token, multisigSupport, multisigSupport, uint64(-1));
    }
}
