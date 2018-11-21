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
import "@aragon/apps-token-manager/contracts/TokenManager.sol";

import "./Payroll.sol";


contract PPFMock is IFeed {
  function get(address base, address quote) external view returns (uint128 xrt, uint64 when) {
      xrt = 7500000000000000;
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
    uint64 amount = uint64(-1);
    address constant ANY_ENTITY = address(-1);
    address[] allowedTokens;
    uint8[] distribution;

    constructor(ENS ens) KitBase(DAOFactory(0), ens) public {
        tokenFactory = new MiniMeTokenFactory();
    }

    function newInstance()
      public
      returns (Kernel dao, Payroll payroll)
    {
      address root = msg.sender;
      address employer = msg.sender;

      dao = fac.newDAO(this);
      ACL acl = ACL(dao.acl());

      PPFMock priceFeed = new PPFMock();

      MiniMeToken denominationToken = newToken("USD Dolar", "USD");

      acl.createPermission(this, dao, dao.APP_MANAGER_ROLE(), this);

      Vault vault;
      Finance finance;
      (vault, finance, payroll) = deployApps(dao);

      // Setup the permissions for the Finance App
      setFinancePermissions(acl, finance, payroll, root);

      // Setup the permissions for the vault
      setVaultPermissions(acl, vault, finance, root);

      // Payroll permissions
      setPayrollPermissions(acl, payroll, root);

      vault.initialize();
      finance.initialize(vault, financePeriodDuration);
      payroll.initialize(finance, denominationToken, priceFeed, rateExpiryTime);

      // deployTokens(dao, finance, acl, root);
      MiniMeToken token1 = deployAndDepositToken(dao, finance, acl, root, "Token 1", "TK1");
      payroll.addAllowedToken(token1);

      MiniMeToken token2 = deployAndDepositToken(dao, finance, acl, root, "Token 2", "TK2");
      payroll.addAllowedToken(token2);

      MiniMeToken token3 = deployAndDepositToken(dao, finance, acl, root, "Token 3", "TK3");
      payroll.addAllowedToken(token3);

      address(finance).send(10 ether);

      addEmployees(payroll, root);

      // set salary allocation for this then change protofire.aragon.eth address to root so it can be used
      allowedTokens.push(address(token1));
      allowedTokens.push(address(token2));

      distribution.push(uint8(45));
      distribution.push(uint8(55));

      payroll.determineAllocation(allowedTokens, distribution);
      payroll.changeAddressByEmployee(root);

      cleanupDAOPermissions(dao, acl, root);

      emit DeployInstance(dao);
    }

    function deployApps(Kernel dao) internal returns (Vault, Finance, Payroll) {
      bytes32 vaultAppId = apmNamehash("vault");
      bytes32 financeAppId = apmNamehash("finance");
      bytes32 payrollAppId = apmNamehash("payroll");
      bytes32 tokenManagerAppId = apmNamehash("token-manager");

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

    function setFinancePermissions(ACL acl, Finance finance, Payroll payroll, address root) internal {
      acl.createPermission(payroll, finance, finance.CREATE_PAYMENTS_ROLE(), this); // manager is this to allow 2 grants
      acl.grantPermission(root, finance, finance.CREATE_PAYMENTS_ROLE());
      acl.setPermissionManager(root, finance, finance.CREATE_PAYMENTS_ROLE()); // set root as the
    }

    function setPayrollPermissions(ACL acl, Payroll payroll, address root) internal {
      acl.createPermission(this, payroll, payroll.ADD_EMPLOYEE_ROLE(), this);
      acl.grantPermission(root, payroll, payroll.ADD_EMPLOYEE_ROLE());
      acl.setPermissionManager(root, payroll, payroll.ADD_EMPLOYEE_ROLE());

      acl.createPermission(this, payroll, payroll.ALLOWED_TOKENS_MANAGER_ROLE(), this);
      acl.grantPermission(root, payroll, payroll.ALLOWED_TOKENS_MANAGER_ROLE());
      acl.setPermissionManager(root, payroll, payroll.ALLOWED_TOKENS_MANAGER_ROLE());
    }

    function deployTokens(Kernel dao, Finance finance, ACL acl, address root) internal {
      MiniMeToken token1 = deployAndDepositToken(dao, finance, acl, root, "Token 1", "TK1");
      deployAndDepositToken(dao, finance, acl, root, "Token 2", "TK2");
      deployAndDepositToken(dao, finance, acl, root, "Token 3", "TK3");
    }

    function deployAndDepositToken(
        Kernel dao,
        Finance finance,
        ACL acl,
        address root,
        string name,
        string symbol
    ) internal returns (MiniMeToken) {
        TokenManager tokenManager = newTokenManager(dao, acl, root);
        MiniMeToken token = newToken(name, symbol);
        token.changeController(tokenManager);
        tokenManager.initialize(token, true, 0);
        tokenManager.mint(this, amount);
        token.approve(finance, amount);
        finance.deposit(token, amount, "Initial deployment");

        return token;
    }

    function addAllowedToken(MiniMeToken token) internal {

    }


    function newToken(string name, string symbol) internal returns (MiniMeToken token) {
        token = tokenFactory.createCloneToken(MiniMeToken(0), 0, name, 18, symbol, true);
    }

    function newTokenManager(Kernel dao, ACL acl, address root) internal returns (TokenManager tokenManager) {
        bytes32 tokenManagerAppId = apmNamehash("token-manager");
        tokenManager = TokenManager(dao.newAppInstance(tokenManagerAppId, latestVersionAppBase(tokenManagerAppId)));
        emit InstalledApp(tokenManager, tokenManagerAppId);
        setTokenManagerPermissions(acl, tokenManager, root);
    }

    function setTokenManagerPermissions(ACL acl, TokenManager tokenManager, address root) internal {
      acl.createPermission(this, tokenManager, tokenManager.MINT_ROLE(), root);
    }

    function addEmployees(Payroll payroll, address root) internal {
        address account2 = 0x8401Eb5ff34cc943f096A32EF3d5113FEbE8D4Eb;
        address account3 = 0x306469457266CBBe7c0505e8Aad358622235e768;
        uint256 salary1 = 2535047025122316; // 80000
        uint256 salary2 = 2851927903262605; // 90000
        uint256 salary3 = 3168808781402895; // 100000

        payroll.addEmployeeWithNameAndStartDate(this, salary1, 'protofire.aragonid.eth', uint64(now - 172800));
        payroll.addEmployeeWithNameAndStartDate(account2, salary2, 'leolower.protofire.eth', uint64(now- 86400));
        payroll.addEmployeeWithNameAndStartDate(account3, salary3, 'lmcorbalan.protofire.eth',  uint64(now));
    }
}
