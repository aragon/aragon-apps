pragma solidity 0.4.24;

import "@aragon/apps-vault/contracts/Vault.sol";
import "@aragon/os/contracts/acl/ACL.sol";
import "@aragon/os/contracts/kernel/Kernel.sol";
import "@aragon/os/contracts/kernel/KernelConstants.sol";
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

contract SurveyKit is KernelAppIds, KitBase {
    // bytes32 constant public SURVEY_APP_ID = apmNamehash("survey");
    bytes32 constant public SURVEY_APP_ID = 0x030b2ab880b88e228f2da5a3d19a2a31bc10dbf91fb1143776a6de489389471e; // survey.aragonpm.eth

    event DeployInstance(address dao, address indexed token);

    constructor(DAOFactory _fac, ENS _ens) KitBase(_fac, _ens) public {
        // factory must be set up w/o EVMScript support
        require(address(_fac.regFactory()) == address(0));
    }

    function newInstance(
        MiniMeToken signalingToken,
        address surveyManager,
        address escapeHatchOwner,
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
        survey.initialize(signalingToken, participation, duration);

        // Install a vault to let it be the escape hatch
        Vault vault = Vault(dao.newAppInstance(KERNEL_DEFAULT_VAULT_APP_ID, latestVersionAppBase(KERNEL_DEFAULT_VAULT_APP_ID)));
        vault.initialize();

        // Set survey manager as the entity that can create votes and change participation
        // surveyManager can then give this permission to other entities
        acl.createPermission(surveyManager, survey, survey.CREATE_SURVEYS_ROLE(), surveyManager);
        acl.createPermission(surveyManager, survey, survey.MODIFY_PARTICIPATION_ROLE(), surveyManager);
        acl.createPermission(escapeHatchOwner, vault, vault.TRANSFER_ROLE(), escapeHatchOwner);

        cleanupDAOPermissions(dao, acl, surveyManager);

        emit InstalledApp(survey, SURVEY_APP_ID);
        emit DeployInstance(dao, signalingToken);

        return (dao, survey);
    }
}
