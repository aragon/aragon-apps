pragma solidity 0.4.18;

import "@aragon/os/contracts/apm/APMRegistry.sol";
import "@aragon/os/contracts/factory/DAOFactory.sol";
import "@aragon/os/contracts/kernel/Kernel.sol";
import "@aragon/os/contracts/acl/ACL.sol";
import "@aragon/os/contracts/lib/minime/MiniMeToken.sol";
import "@aragon/os/contracts/lib/ens/ENS.sol";
import "@aragon/os/contracts/lib/ens/PublicResolver.sol";
import "@aragon/os/contracts/common/EtherToken.sol";


import "@aragon/apps-voting/contracts/Voting.sol";
import "@aragon/apps-vault/contracts/Vault.sol";
import "@aragon/apps-token-manager/contracts/TokenManager.sol";
import "@aragon/apps-finance/contracts/Finance.sol";


contract BetaTemplateDev {
    APMRegistry apm;
    DAOFactory fac;
    MiniMeTokenFactory minimeFac;
    EtherToken etherToken;

    // ensure alphabetic order
    enum Apps { Finance, TokenManager, Vault, Voting }

    event DeployInstance(address dao, address token);

    address constant ANY_ENTITY = address(-1);

    function BetaTemplateDev(DAOFactory _fac, MiniMeTokenFactory _minimeFac, APMRegistry _apm, EtherToken _etherToken) {
        apm = _apm;
        fac = _fac;
        minimeFac = _minimeFac;
        etherToken = _etherToken;
    }

    function createInstance(bytes32[4] appIds, string tokenName, string tokenSymbol, uint8 tokenDecimals) {
        Kernel dao = fac.newDAO(this);
        ACL acl = ACL(dao.acl());

        acl.createPermission(this, dao, dao.APP_MANAGER_ROLE(), this);

        Voting voting = Voting(dao.newAppInstance(appIds[uint8(Apps.Voting)], latestVersionAppBase(appIds[uint8(Apps.Voting)])));
        Vault vault = Vault(dao.newAppInstance(appIds[uint8(Apps.Vault)], latestVersionAppBase(appIds[uint8(Apps.Vault)])));
        Finance finance = Finance(dao.newAppInstance(appIds[uint8(Apps.Finance)], latestVersionAppBase(appIds[uint8(Apps.Finance)])));
        TokenManager tokenManager = TokenManager(dao.newAppInstance(appIds[uint8(Apps.TokenManager)], latestVersionAppBase(appIds[uint8(Apps.TokenManager)])));

        MiniMeToken token = minimeFac.createCloneToken(address(0), 0, tokenName, tokenDecimals, tokenSymbol, true);
        token.changeController(tokenManager); // sender has to create tokens

        // permissions
        acl.createPermission(ANY_ENTITY, voting, voting.CREATE_VOTES_ROLE(), voting);
        acl.createPermission(voting, voting, voting.MODIFY_QUORUM_ROLE(), voting);

        acl.createPermission(finance, vault, vault.TRANSFER_ROLE(), voting);
        acl.createPermission(voting, finance, finance.CREATE_PAYMENTS_ROLE(), voting);
        acl.createPermission(voting, finance, finance.EXECUTE_PAYMENTS_ROLE(), voting);
        acl.createPermission(voting, finance, finance.DISABLE_PAYMENTS_ROLE(), voting);
        acl.createPermission(this, tokenManager, tokenManager.MINT_ROLE(), this);

        initVoting(voting, token);
        initTokenManager(tokenManager);
        finance.initialize(vault, etherToken, uint64(-1)); // yuge period

        // permission clean up, in favor of voting
        acl.grantPermission(voting, tokenManager, tokenManager.MINT_ROLE());
        acl.setPermissionManager(voting, tokenManager, tokenManager.MINT_ROLE());
        acl.grantPermission(voting, dao, dao.APP_MANAGER_ROLE());
        acl.setPermissionManager(voting, dao, dao.APP_MANAGER_ROLE());
        acl.grantPermission(voting, acl, acl.CREATE_PERMISSIONS_ROLE());
        acl.setPermissionManager(voting, acl, acl.CREATE_PERMISSIONS_ROLE());

        DeployInstance(dao, token);
    }

    function initVoting(Voting voting, MiniMeToken token) internal {}

    function initTokenManager(TokenManager tokenManager) internal {}

    function ens() internal view returns (AbstractENS) {
        return apm.registrar().ens();
    }

    function latestVersionAppBase(bytes32 appId) internal view returns (address base) {
        Repo repo = Repo(PublicResolver(ens().resolver(appId)).addr(appId));
        (,base,) = repo.getLatest();

        return base;
    }
}
