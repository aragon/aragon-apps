pragma solidity 0.4.18;

import "@aragon/os/contracts/apm/APMRegistry.sol";
import "@aragon/os/contracts/factory/DAOFactory.sol";
import "@aragon/os/contracts/kernel/Kernel.sol";
import "@aragon/os/contracts/acl/ACL.sol";
import "@aragon/os/contracts/lib/minime/MiniMeToken.sol";
import "@aragon/os/contracts/common/EtherToken.sol";

import "@aragon/id/contracts/IFIFSResolvingRegistrar.sol";

import "@aragon/apps-voting/contracts/Voting.sol";
import "@aragon/apps-vault/contracts/Vault.sol";
import "@aragon/apps-token-manager/contracts/TokenManager.sol";
import "@aragon/apps-finance/contracts/Finance.sol";


contract BetaTemplateBase {
    APMRegistry public apm;
    DAOFactory public fac;
    MiniMeTokenFactory public minimeFac;
    EtherToken public etherToken;
    IFIFSResolvingRegistrar public aragonID;
    bytes32[4] public appIds;

    mapping (address => address) tokenCache;

    // ensure alphabetic order
    enum Apps { Finance, TokenManager, Vault, Voting }

    event DeployToken(address token, address indexed cacheOwner);
    event DeployInstance(address dao, address indexed token);
    event InstalledApp(address appProxy, bytes32 appId);

    address constant ANY_ENTITY = address(-1);

    function BetaTemplateBase(
        DAOFactory _fac,
        MiniMeTokenFactory _minimeFac,
        APMRegistry _apm,
        EtherToken _etherToken,
        IFIFSResolvingRegistrar _aragonID,
        bytes32[4] _appIds
    )
        public
    {
        apm = _apm;
        fac = _fac;
        minimeFac = _minimeFac;
        etherToken = _etherToken;
        aragonID = _aragonID;
        appIds = _appIds;
    }

    function createDAO(
        string name,
        MiniMeToken token,
        address[] holders,
        uint256[] stakes,
        uint256 _maxTokens
    )
        internal
        returns (Voting)
    {
        Kernel dao = fac.newDAO(this);

        ACL acl = ACL(dao.acl());

        acl.createPermission(
            this,
            dao,
            dao.APP_MANAGER_ROLE(),
            this
        );

        Voting voting = Voting(dao.newAppInstance(appIds[uint8(Apps.Voting)], latestVersionAppBase(appIds[uint8(Apps.Voting)])));
        InstalledApp(voting, appIds[uint8(Apps.Voting)]);
        Vault vault = Vault(dao.newAppInstance(appIds[uint8(Apps.Vault)], latestVersionAppBase(appIds[uint8(Apps.Vault)])));
        InstalledApp(vault, appIds[uint8(Apps.Vault)]);
        Finance finance = Finance(dao.newAppInstance(appIds[uint8(Apps.Finance)], latestVersionAppBase(appIds[uint8(Apps.Finance)])));
        InstalledApp(finance, appIds[uint8(Apps.Finance)]);
        TokenManager tokenManager = TokenManager(dao.newAppInstance(appIds[uint8(Apps.TokenManager)], latestVersionAppBase(appIds[uint8(Apps.TokenManager)])));
        InstalledApp(tokenManager, appIds[uint8(Apps.TokenManager)]);

        token.changeController(tokenManager); // sender has to create tokens

        // permissions
        acl.createPermission(ANY_ENTITY, voting, voting.CREATE_VOTES_ROLE(), voting);
        acl.createPermission(voting, voting, voting.MODIFY_QUORUM_ROLE(), voting);

        acl.createPermission(finance, vault, vault.TRANSFER_ROLE(), voting);
        acl.createPermission(voting, finance, finance.CREATE_PAYMENTS_ROLE(), voting);
        acl.createPermission(voting, finance, finance.EXECUTE_PAYMENTS_ROLE(), voting);
        acl.createPermission(voting, finance, finance.DISABLE_PAYMENTS_ROLE(), voting);
        acl.createPermission(voting, tokenManager, tokenManager.ASSIGN_ROLE(), voting);
        acl.createPermission(voting, tokenManager, tokenManager.REVOKE_VESTINGS_ROLE(), voting);

        require(holders.length == stakes.length);

        acl.createPermission(this, tokenManager, tokenManager.MINT_ROLE(), this);

        tokenManager.initialize(token, _maxTokens > 1, _maxTokens, true);

        for (uint256 i = 0; i < holders.length; i++) {
            tokenManager.mint(holders[i], stakes[i]);
        }

        // inits
        finance.initialize(vault, etherToken, uint64(-1) - uint64(now)); // yuge period

        // clean-up
        acl.grantPermission(voting, dao, dao.APP_MANAGER_ROLE());
        acl.setPermissionManager(voting, dao, dao.APP_MANAGER_ROLE());
        acl.grantPermission(voting, acl, acl.CREATE_PERMISSIONS_ROLE());
        acl.setPermissionManager(voting, acl, acl.CREATE_PERMISSIONS_ROLE());
        acl.grantPermission(voting, tokenManager, tokenManager.MINT_ROLE());
        acl.setPermissionManager(voting, tokenManager, tokenManager.MINT_ROLE());
        // no revokes to save gas as factory can't do anything to orgs (clutters acl representation)

        registerAragonID(name, dao);
        DeployInstance(dao, token);

        // voting is returned so init can happen later
        return voting;
    }

    function cacheToken(MiniMeToken token, address owner) internal {
        tokenCache[owner] = token;
        DeployToken(token, owner);
    }

    function popTokenCache(address owner) internal returns (MiniMeToken) {
        require(tokenCache[owner] != address(0));
        MiniMeToken token = MiniMeToken(tokenCache[owner]);
        delete tokenCache[owner];

        return token;
    }

    function registerAragonID(string name, address owner) internal {
        aragonID.register(keccak256(name), owner);
    }

    /* solium-disable-next-line */
    function latestVersionAppBase(bytes32 appId) public view returns (address base) {
        Repo repo = Repo(PublicResolver(ens().resolver(appId)).addr(appId));
        (,base,) = repo.getLatest();

        return base;
    }

    function ens() internal view returns (AbstractENS) {
        return apm.registrar().ens();
    }
}
