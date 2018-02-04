pragma solidity 0.4.18;

import "@aragon/os/contracts/apm/APMRegistry.sol";
import "@aragon/os/contracts/factory/DAOFactory.sol";
import "@aragon/os/contracts/kernel/Kernel.sol";
import "@aragon/os/contracts/acl/ACL.sol";
import "@aragon/os/contracts/lib/minime/MiniMeToken.sol";
import "@aragon/os/contracts/lib/ens/ENS.sol";
import "@aragon/os/contracts/lib/ens/PublicResolver.sol";

import "@aragon/apps-voting/contracts/Voting.sol";
import "@aragon/apps-vault/contracts/Vault.sol";


contract DevTemplate {
    APMRegistry apm;
    DAOFactory fac;

    address constant ANY_ENTITY = address(-1);

    event DeployInstance(address dao);

    function DevTemplate(DAOFactory _fac, APMRegistry _apm, address votingBase, bytes votingContentURI, address vaultBase, bytes vaultContentURI) {
        apm = _apm;
        fac = _fac;

        createRepo("voting", votingBase, votingContentURI);
        createRepo("vault", vaultBase, vaultContentURI);
    }

    function createInstance() {
        Kernel dao = fac.newDAO(ANY_ENTITY);
        ACL acl = ACL(dao.acl());

        acl.createPermission(ANY_ENTITY, dao, dao.APP_MANAGER_ROLE(), msg.sender);

        Voting voting = Voting(dao.newAppInstance(votingAppId(), latestVersionAppBase(votingAppId())));
        Vault vault = Vault(dao.newAppInstance(vaultAppId(), latestVersionAppBase(vaultAppId())));
        MiniMeToken token = new MiniMeToken(address(0), address(0), 0, "DevToken", 18, "XDT", true);

        token.changeController(msg.sender); // sender has to create tokens

        uint256 pct = 10 ** 16;
        // 50% support, 15% accept quorum, 1 hour vote duration
        voting.initialize(token, 50 * pct, 15 * pct, 1 hours);

        // voting app permissions
        acl.createPermission(ANY_ENTITY, voting, voting.CREATE_VOTES_ROLE(), msg.sender);
        acl.createPermission(ANY_ENTITY, voting, voting.MODIFY_QUORUM_ROLE(), msg.sender);

        acl.createPermission(voting, vault, vault.TRANSFER_ROLE(), msg.sender);

        DeployInstance(dao);
    }

    function createRepo(string name, address votingBase, bytes votingContentURI) internal {
        uint16[3] memory firstVersion;
        firstVersion[0] = 1;

        apm.newRepoWithVersion(name, ANY_ENTITY, firstVersion, votingBase, votingContentURI);
    }

    function votingAppId() internal view returns (bytes32) {
        return keccak256(apm.registrar().rootNode(), keccak256("voting"));
    }

    function vaultAppId() internal view returns (bytes32) {
        return keccak256(apm.registrar().rootNode(), keccak256("vault"));
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
