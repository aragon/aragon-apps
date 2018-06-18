pragma solidity 0.4.18;

import "@aragon/os/contracts/apm/APMRegistry.sol";
import "@aragon/os/contracts/factory/DAOFactory.sol";
import "@aragon/os/contracts/kernel/Kernel.sol";
import "@aragon/os/contracts/acl/ACL.sol";
import "@aragon/os/contracts/lib/ens/ENS.sol";
import "@aragon/os/contracts/lib/ens/PublicResolver.sol";

import "@aragon/apps-finance/contracts/Finance.sol";
import "@aragon/apps-vault/contracts/Vault.sol";
import "@aragon/apps-payroll/contracts/Payroll.sol";


contract DevTemplate {
    APMRegistry apm;
    DAOFactory fac;    

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
        address vaultBase,
        bytes vaultContentURI,
        address payrollBase,
        bytes payrollContentURI
    ) {
        createRepo("finance", financeBase, financeContentURI);        
        createRepo("vault", vaultBase, vaultContentURI);
        createRepo("payroll", payrollBase, payrollContentURI);
    }

    function createInstance() {
        Kernel dao = fac.newDAO(ANY_ENTITY);
        ACL acl = ACL(dao.acl());

        acl.createPermission(ANY_ENTITY, dao, dao.APP_MANAGER_ROLE(), msg.sender);

        Finance finance = Finance(dao.newAppInstance(financeAppId(), latestVersionAppBase(financeAppId())));        
        Vault vault = Vault(dao.newAppInstance(vaultAppId(), latestVersionAppBase(vaultAppId())));
        Payroll payroll = Payroll(dao.newAppInstance(payrollAppId(), latestVersionAppBase(payrollAppId())));
        

        // vault initialization
        Vault vaultBase = Vault(latestVersionAppBase(vaultAppId()));
        vault.initialize(vaultBase.erc20ConnectorBase(), vaultBase.ethConnectorBase()); // init with trusted connectors

        // finance initialization
        finance.initialize(IVaultConnector(vault), uint64(-1) - uint64(now));

        // payroll initialization        
        payroll.initialize(........);
        
        // finance permissions
        acl.createPermission(ANY_ENTITY, finance, finance.CREATE_PAYMENTS_ROLE(), msg.sender);
        acl.createPermission(ANY_ENTITY, finance, finance.CHANGE_PERIOD_ROLE(), msg.sender);
        acl.createPermission(ANY_ENTITY, finance, finance.CHANGE_BUDGETS_ROLE(), msg.sender);
        acl.createPermission(ANY_ENTITY, finance, finance.EXECUTE_PAYMENTS_ROLE(), msg.sender);
        acl.createPermission(ANY_ENTITY, finance, finance.DISABLE_PAYMENTS_ROLE(), msg.sender);
        InstalledApp(finance, financeAppId());



        // payroll manager permissions
        acl.createPermission(ANY_ENTITY, payroll, payroll.ADD_EMPLOYEE_ROLE(), msg.sender);
        acl.createPermission(ANY_ENTITY, payroll, payroll.REMOVE_EMPLOYEE_ROLE(), msg.sender);
        acl.createPermission(ANY_ENTITY, payroll, payroll.ALLOWED_TOKENS_MANAGER_ROLE(), msg.sender);
        acl.createPermission(ANY_ENTITY, payroll, payroll.ORACLE_ROLE(), msg.sender);
        InstalledApp(payroll, payrollAppId());



        // vault permissions
        acl.createPermission(finance, vault, vault.TRANSFER_ROLE(), this);
        acl.grantPermission(voting, vault, vault.TRANSFER_ROLE());
        acl.setPermissionManager(msg.sender, vault, vault.TRANSFER_ROLE());
        InstalledApp(vault, vaultAppId());


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

    function payrollAppId() public view returns (bytes32) {
        return keccak256(apm.registrar().rootNode(), keccak256("payroll"));
    }

    function vaultAppId() public view returns (bytes32) {
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
