pragma solidity 0.4.24;

import "@aragon/os/contracts/acl/ACL.sol";
import "@aragon/os/contracts/kernel/Kernel.sol";
import "@aragon/os/contracts/apm/Repo.sol";
import "@aragon/os/contracts/apm/APMNamehash.sol";
import "@aragon/os/contracts/factory/DAOFactory.sol";
import "@aragon/os/contracts/lib/ens/ENS.sol";
import "@aragon/os/contracts/lib/ens/PublicResolver.sol";
import "@aragon/apps-shared-minime/contracts/MiniMeToken.sol";

import "../Survey.sol";


contract KitBase is APMNamehash, EVMScriptRegistryConstants {
    ENS public ens;
    DAOFactory public fac;

    event DeployInstance(address dao);
    event InstalledApp(address appProxy, bytes32 appId);

    constructor(DAOFactory _fac, ENS _ens) public {
        ens = _ens;

        // If no factory is passed, get it from on-chain bare-kit
        if (address(_fac) == address(0)) {
            bytes32 bareKit = apmNamehash("bare-kit");
            fac = KitBase(latestVersionAppBase(bareKit)).fac();
        } else {
            fac = _fac;
        }
    }

    function latestVersionAppBase(bytes32 appId) public view returns (address base) {
        Repo repo = Repo(PublicResolver(ens.resolver(appId)).addr(appId));
        (,base,) = repo.getLatest();

        return base;
    }

    function cleanupDAOPermissions(Kernel dao, ACL acl, address root) internal {
        // Kernel permission clean up
        cleanupPermission(acl, root, dao, dao.APP_MANAGER_ROLE());

        // ACL permission clean up
        cleanupPermission(acl, root, acl, acl.CREATE_PERMISSIONS_ROLE());
    }

    function cleanupPermission(ACL acl, address root, address app, bytes32 permission) internal {
        acl.grantPermission(root, app, permission);
        acl.revokePermission(this, app, permission);
        acl.setPermissionManager(root, app, permission);
    }
}

contract SurveyKit is APMNamehash, KitBase {
    bytes32 constant public SURVEY_APP_ID = apmNamehash("survey"); // survey.aragonpm.eth

    constructor(ENS ens) KitBase(DAOFactory(0), ens) public {}

    function newInstance(
        MiniMeToken signalingToken,
        address surveyManager,
        address escapeHatch,
        uint64 duration,
        uint64 participation
    )
        public
        returns (Kernel, Survey)
    {
        Kernel dao = fac.newDAO(this);
        ACL acl = ACL(dao.acl());

        acl.createPermission(this, dao, dao.APP_MANAGER_ROLE(), this);

        Survey survey = Survey(dao.newAppInstance(SURVEY_APP_ID, latestVersionAppBase(SURVEY_APP_ID)));

        // Set escapeHatch address as the default vault, in case a token rescue is required
        dao.setApp(dao.APP_BASES_NAMESPACE(), dao.recoveryVaultAppId(), escapeHatch);

        survey.initialize(signalingToken, participation, duration);

        // Set survey manager as the entity that can create votes and change participation
        // surveyManager can then give this permission to other entities
        acl.createPermission(surveyManager, survey, survey.CREATE_SURVEYS_ROLE(), surveyManager);
        acl.createPermission(surveyManager, survey, survey.MODIFY_PARTICIPATION_ROLE(), surveyManager);
        acl.grantPermission(surveyManager, dao, dao.APP_MANAGER_ROLE());
        acl.setPermissionManager(surveyManager, dao, dao.APP_MANAGER_ROLE());

        cleanupDAOPermissions(dao, acl, surveyManager);

        emit DeployInstance(dao);
        emit InstalledApp(survey, SURVEY_APP_ID);

        return (dao, survey);
    }
}
