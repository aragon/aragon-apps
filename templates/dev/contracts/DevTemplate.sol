pragma solidity 0.4.18;

import "@aragon/os/contracts/apm/APMRegistry.sol";
import "@aragon/os/contracts/factory/DAOFactory.sol";
import "@aragon/os/contracts/kernel/Kernel.sol";
import "@aragon/os/contracts/acl/ACL.sol";
import "@aragon/os/contracts/lib/minime/MiniMeToken.sol";
import "@aragon/os/contracts/lib/ens/ENS.sol";
import "@aragon/os/contracts/lib/ens/PublicResolver.sol";

import "@aragon/apps-voting/contracts/Voting.sol";


contract DevTemplate {
    APMRegistry apm;
    DAOFactory fac;

    address constant ANY_ENTITY = address(-1);

    function DevTemplate(DAOFactory _fac, APMRegistry _apm, address votingBase, bytes votingContentURI) {
        apm = _apm;
        fac = _fac;

        createVotingRepo(votingBase, votingContentURI);
    }

    function createInstance() {
        Kernel dao = fac.newDAO(ANY_ENTITY);
        ACL acl = ACL(dao.acl());

        acl.createPermission(ANY_ENTITY, dao, dao.APP_MANAGER_ROLE(), this);

        bytes32 appId = votingAppId();
        Voting voting = Voting(dao.newAppInstance(appId, latestVersionAppBase(appId)));
    }

    function createVotingRepo(address votingBase, bytes votingContentURI) internal {
        uint16[3] memory firstVersion;
        firstVersion[0] = 1;

        apm.newRepoWithVersion('voting', ANY_ENTITY, firstVersion, votingBase, votingContentURI);
    }

    function votingAppId() internal view returns (bytes32) {
        return keccak256(apm.registrar().rootNode(), keccak256('voting'));
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
