pragma solidity 0.4.18;

import "@aragon/os/contracts/apm/APMRegistry.sol";
import "@aragon/os/contracts/factory/DAOFactory.sol";
import "@aragon/os/contracts/kernel/Kernel.sol";
import "@aragon/os/contracts/acl/ACL.sol";
import "@aragon/os/contracts/common/EtherToken.sol";
import "@aragon/os/contracts/lib/minime/MiniMeToken.sol";
import "@aragon/os/contracts/lib/ens/ENS.sol";
import "@aragon/os/contracts/lib/ens/PublicResolver.sol";

import "@aragon/apps-finance/contracts/Finance.sol";
import "@aragon/apps-token-manager/contracts/TokenManager.sol";
import "@aragon/apps-vault/contracts/Vault.sol";
import "@aragon/apps-voting/contracts/Voting.sol";


contract DevTemplate {
    APMRegistry apm;
    DAOFactory fac;
    MiniMeTokenFactory minimeFac;

    address constant ANY_ENTITY = address(-1);

    event DeployInstance(address dao);
    event InstalledApp(address appProxy, bytes32 appId);

    function DevTemplate(DAOFactory _fac, MiniMeTokenFactory _minimeFac, APMRegistry _apm) {
        apm = _apm;
        fac = _fac;
        minimeFac = _minimeFac;
    }

    function apmInit(
        address financeBase,
        bytes financeContentURI,
        address tokenManagerBase,
        bytes tokenManagerContentURI,
        address vaultBase,
        bytes vaultContentURI,
        address votingBase,
        bytes votingContentURI
    ) {
        createRepo("finance", financeBase, financeContentURI);
        createRepo("token-manager", tokenManagerBase, tokenManagerContentURI);
        createRepo("vault", vaultBase, vaultContentURI);
        createRepo("voting", votingBase, votingContentURI);
    }

    function createInstance() {
        Kernel dao = fac.newDAO(ANY_ENTITY);
        ACL acl = ACL(dao.acl());

        acl.createPermission(ANY_ENTITY, dao, dao.APP_MANAGER_ROLE(), msg.sender);

        Finance finance = Finance(dao.newAppInstance(financeAppId(), latestVersionAppBase(financeAppId())));
        TokenManager tokenManager = TokenManager(dao.newAppInstance(tokenManagerAppId(), latestVersionAppBase(tokenManagerAppId())));
        Vault vault = Vault(dao.newAppInstance(vaultAppId(), latestVersionAppBase(vaultAppId())));
        Voting voting = Voting(dao.newAppInstance(votingAppId(), latestVersionAppBase(votingAppId())));
        MiniMeToken token = minimeFac.createCloneToken(address(0), 0, "DevToken", 18, "XDT", true);

        // finance initialization
        finance.initialize(vault, EtherToken(0), uint64(-1) - uint64(now));

        // token manager initialization
        token.changeController(tokenManager); // token manager has to create tokens
        tokenManager.initialize(token, true, 0, true);

        // voting initialization
        uint256 pct = 10 ** 16;
        // 50% support, 15% accept quorum, 1 hour vote duration
        voting.initialize(token, 50 * pct, 15 * pct, 1 hours);

        // finance permissions
        acl.createPermission(ANY_ENTITY, finance, finance.CREATE_PAYMENTS_ROLE(), msg.sender);
        acl.createPermission(ANY_ENTITY, finance, finance.CHANGE_PERIOD_ROLE(), msg.sender);
        acl.createPermission(ANY_ENTITY, finance, finance.CHANGE_BUDGETS_ROLE(), msg.sender);
        acl.createPermission(ANY_ENTITY, finance, finance.EXECUTE_PAYMENTS_ROLE(), msg.sender);
        acl.createPermission(ANY_ENTITY, finance, finance.DISABLE_PAYMENTS_ROLE(), msg.sender);
        InstalledApp(finance, financeAppId());

        // token manager permissions
        acl.createPermission(ANY_ENTITY, tokenManager, tokenManager.MINT_ROLE(), msg.sender);
        acl.createPermission(ANY_ENTITY, tokenManager, tokenManager.ISSUE_ROLE(), msg.sender);
        acl.createPermission(ANY_ENTITY, tokenManager, tokenManager.ASSIGN_ROLE(), msg.sender);
        acl.createPermission(ANY_ENTITY, tokenManager, tokenManager.REVOKE_VESTINGS_ROLE(), msg.sender);
        InstalledApp(tokenManager, tokenManagerAppId());

        // vault permissions
        acl.createPermission(finance, vault, vault.TRANSFER_ROLE(), msg.sender);
        acl.createPermission(voting, vault, vault.TRANSFER_ROLE(), msg.sender);
        InstalledApp(vault, vaultAppId());

        // voting permissions
        acl.createPermission(ANY_ENTITY, voting, voting.CREATE_VOTES_ROLE(), msg.sender);
        acl.createPermission(ANY_ENTITY, voting, voting.MODIFY_QUORUM_ROLE(), msg.sender);
        InstalledApp(voting, votingAppId());

        DeployInstance(dao);
    }

    function createRepo(string name, address votingBase, bytes votingContentURI) internal {
        uint16[3] memory firstVersion;
        firstVersion[0] = 1;

        apm.newRepoWithVersion(name, ANY_ENTITY, firstVersion, votingBase, votingContentURI);
    }

    function financeAppId() public view returns (bytes32) {
        return keccak256(apm.registrar().rootNode(), keccak256("finance"));
    }

    function tokenManagerAppId() public view returns (bytes32) {
        return keccak256(apm.registrar().rootNode(), keccak256("token-manager"));
    }

    function vaultAppId() public view returns (bytes32) {
        return keccak256(apm.registrar().rootNode(), keccak256("vault"));
    }

    function votingAppId() public view returns (bytes32) {
        return keccak256(apm.registrar().rootNode(), keccak256("voting"));
    }

    function ens() internal view returns (AbstractENS) {
        return apm.registrar().ens();
    }

    function latestVersionAppBase(bytes32 appId) internal view returns (address base) {
        Repo repo = Repo(PublicResolver(ens().resolver(appId)).addr(appId));
        (,base,) = repo.getLatest();

        return base;
    }
}
