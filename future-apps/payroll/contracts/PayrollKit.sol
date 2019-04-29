pragma solidity 0.4.24;

import "@aragon/apps-finance/contracts/Finance.sol";
import "@aragon/apps-shared-minime/contracts/MiniMeToken.sol";
import "@aragon/apps-vault/contracts/Vault.sol";
import "@aragon/os/contracts/acl/ACL.sol";
import "@aragon/os/contracts/apm/APMNamehash.sol";
import "@aragon/os/contracts/apm/Repo.sol";
import "@aragon/os/contracts/evmscript/IEVMScriptRegistry.sol";
import "@aragon/os/contracts/factory/DAOFactory.sol";
import "@aragon/os/contracts/kernel/Kernel.sol";
import "@aragon/os/contracts/lib/ens/ENS.sol";
import "@aragon/os/contracts/lib/ens/PublicResolver.sol";
import "@aragon/ppf-contracts/contracts/IFeed.sol";

import "./Payroll.sol";


contract PPFMock is IFeed {
  function get(address base, address quote) external view returns (uint128 xrt, uint64 when) {
      xrt = 1;
      when = uint64(now);
  }
}

contract KitBase is APMNamehash, EVMScriptRegistryConstants {
    ENS public ens;
    DAOFactory public fac;

    event DeployInstance(address dao);
    event InstalledApp(address appProxy, bytes32 appId);

    constructor(DAOFactory _fac, ENS _ens) {
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

contract PayrollKit is KitBase {
    MiniMeTokenFactory tokenFactory;

    uint64 financePeriodDuration = 31557600;
    uint64 rateExpiryTime = 1000;

    constructor(ENS ens) KitBase(DAOFactory(0), ens) public {
        tokenFactory = new MiniMeTokenFactory();
    }

    function newInstance() public returns (Kernel dao, Payroll payroll) {
        address root = msg.sender;
        address employer = msg.sender;

        dao = fac.newDAO(this);
        ACL acl = ACL(dao.acl());

        PPFMock priceFeed = new PPFMock();

        MiniMeToken denominationToken = tokenFactory.createCloneToken(MiniMeToken(0), 0, "US Dollar", 18, "USD", true);

        acl.createPermission(this, dao, dao.APP_MANAGER_ROLE(), this);

        Vault vault;
        Finance finance;
        (vault, finance, payroll) = deployApps(dao);

        finance.initialize(vault, financePeriodDuration);
        payroll.initialize(finance, denominationToken, priceFeed, rateExpiryTime);

        // Payroll permissions
        acl.createPermission(employer, payroll, payroll.ADD_EMPLOYEE_ROLE(), root);
        acl.createPermission(employer, payroll, payroll.TERMINATE_EMPLOYEE_ROLE(), root);
        acl.createPermission(employer, payroll, payroll.ALLOWED_TOKENS_MANAGER_ROLE(), root);
        acl.createPermission(employer, payroll, payroll.SET_EMPLOYEE_SALARY_ROLE(), root);
        acl.createPermission(employer, payroll, payroll.ADD_REIMBURSEMENT_ROLE(), root);
        acl.createPermission(root, payroll, payroll.CHANGE_PRICE_FEED_ROLE(), root);
        acl.createPermission(root, payroll, payroll.MODIFY_RATE_EXPIRY_ROLE(), root);

        // Finance permissions
        acl.createPermission(payroll, finance, finance.CREATE_PAYMENTS_ROLE(), root);

        // Vault permissions
        setVaultPermissions(acl, vault, finance, root);

        // EVMScriptRegistry permissions
        // EVMScriptRegistry reg = EVMScriptRegistry(dao.getApp(dao.APP_ADDR_NAMESPACE(), EVMSCRIPT_REGISTRY_APP_ID));
        // acl.createBurnedPermission(reg, reg.REGISTRY_ADD_EXECUTOR_ROLE());
        // acl.createBurnedPermission(reg, reg.REGISTRY_MANAGER_ROLE());

        cleanupDAOPermissions(dao, acl, root);

        emit DeployInstance(dao);
    }

    function deployApps(Kernel dao) internal returns (Vault, Finance, Payroll) {
        bytes32 vaultAppId = apmNamehash("vault");
        bytes32 financeAppId = apmNamehash("finance");
        bytes32 payrollAppId = apmNamehash("payroll");

        Vault vault = Vault(dao.newAppInstance(vaultAppId, latestVersionAppBase(vaultAppId)));
        Finance finance = Finance(dao.newAppInstance(financeAppId, latestVersionAppBase(financeAppId)));
        Payroll payroll = Payroll(dao.newAppInstance(payrollAppId, latestVersionAppBase(payrollAppId)));

        emit InstalledApp(vault, vaultAppId);
        emit InstalledApp(finance, financeAppId);
        emit InstalledApp(payroll, payrollAppId);

        return (vault, finance, payroll);
    }

    function setVaultPermissions(ACL acl, Vault vault, Finance finance, address root) internal {
        bytes32 vaultTransferRole = vault.TRANSFER_ROLE();
        acl.createPermission(finance, vault, vaultTransferRole, this); // manager is this to allow 2 grants
        acl.grantPermission(root, vault, vaultTransferRole);
        acl.setPermissionManager(root, vault, vaultTransferRole); // set root as the final manager for the role
    }
}
