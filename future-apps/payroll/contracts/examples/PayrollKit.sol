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

import "../Payroll.sol";


contract PPFMock is IFeed {
  function get(address, address) external view returns (uint128 xrt, uint64 when) {
      xrt = 7500000000000000; // 1 ETH = ~133USD
      when = uint64(now);
  }
}


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


contract PayrollKit is KitBase {
    MiniMeTokenFactory tokenFactory;

    uint64 internal constant FINANCE_PERIOD_DURATION = 31557600;
    uint64 internal constant RATE_EXPIRY_TIME = 1000;
    uint64 internal constant MAX_UINT64 = uint64(-1);

    constructor(ENS ens) KitBase(DAOFactory(0), ens) public {
        tokenFactory = new MiniMeTokenFactory();
    }

    function newInstance()
        public
        returns (Kernel dao, Payroll payroll)
    {
        address root = msg.sender;

        dao = fac.newDAO(this);
        ACL acl = ACL(dao.acl());

        // Payroll prerequisites
        PPFMock priceFeed = new PPFMock();
        MiniMeToken denominationToken = newToken("USD Dolar", "USD");

        // Allow this contract to install new apps for now
        acl.createPermission(this, dao, dao.APP_MANAGER_ROLE(), this);

        Vault vault;
        Finance finance;
        (vault, finance) = installBaseApps(dao, acl, root);
        payroll = installPayroll(dao, acl, root, finance, denominationToken, priceFeed);

        // Deploy payroll tokens
        MiniMeToken token1 = installManagedToken(dao, acl, root, finance, "Token 1", "TK1");
        payroll.setAllowedToken(token1, true);

        MiniMeToken token2 = installManagedToken(dao, acl, root, finance, "Token 2", "TK2");
        payroll.setAllowedToken(token2, true);

        MiniMeToken token3 = installManagedToken(dao, acl, root, finance, "Token 3", "TK3");
        payroll.setAllowedToken(token3, true);

        // Add employees to payroll
        addEmployees(payroll, root, token1, token2);

        // Clean up
        cleanupDAOPermissions(dao, acl, root);
        cleanupPermission(acl, root, payroll, payroll.MANAGE_ALLOWED_TOKENS_ROLE());
        cleanupPermission(acl, root, payroll, payroll.ADD_EMPLOYEE_ROLE());

        emit DeployInstance(dao);
    }

    function installBaseApps(Kernel dao, ACL acl, address root) internal returns (Vault, Finance) {
        bytes32 vaultAppId = apmNamehash("vault");
        bytes32 financeAppId = apmNamehash("finance");

        Vault vault = Vault(dao.newAppInstance(vaultAppId, latestVersionAppBase(vaultAppId)));
        emit InstalledApp(vault, vaultAppId);

        Finance finance = Finance(dao.newAppInstance(financeAppId, latestVersionAppBase(financeAppId)));
        emit InstalledApp(finance, financeAppId);

        vault.initialize();
        finance.initialize(vault, FINANCE_PERIOD_DURATION);
        acl.createPermission(finance, vault, vault.TRANSFER_ROLE(), root);

        return (vault, finance);
    }

    function installPayroll(
        Kernel dao,
        ACL acl,
        address root,
        Finance finance,
        MiniMeToken denominationToken,
        IFeed priceFeed
    )
        internal
        returns (Payroll)
    {
        bytes32 payrollAppId = apmNamehash("payroll");

        Payroll payroll = Payroll(dao.newAppInstance(payrollAppId, latestVersionAppBase(payrollAppId)));
        emit InstalledApp(payroll, payrollAppId);

        payroll.initialize(finance, denominationToken, priceFeed, RATE_EXPIRY_TIME);
        acl.createPermission(payroll, finance, finance.CREATE_PAYMENTS_ROLE(), root);
        acl.createPermission(root, payroll, payroll.TERMINATE_EMPLOYEE_ROLE(), root);

        // Allow this contract to add tokens to Payroll for now
        acl.createPermission(this, payroll, payroll.MANAGE_ALLOWED_TOKENS_ROLE(), this);

        // Allow this contract to add employees to Payroll for now
        acl.createPermission(this, payroll, payroll.ADD_EMPLOYEE_ROLE(), this);

        return payroll;
    }

    function installManagedToken(
        Kernel dao,
        ACL acl,
        address root,
        Finance finance,
        string name,
        string symbol
    )
        internal
        returns (MiniMeToken)
    {
        bytes32 tokenManagerAppId = apmNamehash("token-manager");

        MiniMeToken token = newToken(name, symbol);
        TokenManager tokenManager = TokenManager(dao.newAppInstance(tokenManagerAppId, latestVersionAppBase(tokenManagerAppId)));
        emit InstalledApp(tokenManager, tokenManagerAppId);

        token.changeController(tokenManager);
        tokenManager.initialize(token, true, 0);

        // Allow this contract to mint tokens for now
        acl.createPermission(this, tokenManager, tokenManager.MINT_ROLE(), this);

        // Add some of the tokens to the Finance app
        tokenManager.mint(this, MAX_UINT64);
        token.approve(finance, MAX_UINT64);
        finance.deposit(token, MAX_UINT64, "Initial deposit");

        // Clean up permissions
        cleanupPermission(acl, root, tokenManager, tokenManager.MINT_ROLE());

        return token;
    }

    function newToken(string name, string symbol) internal returns (MiniMeToken token) {
        token = tokenFactory.createCloneToken(MiniMeToken(0), 0, name, 18, symbol, true);
    }

    function addEmployees(Payroll payroll, address root, MiniMeToken token1, MiniMeToken token2) internal {
        address account2 = 0x8401Eb5ff34cc943f096A32EF3d5113FEbE8D4Eb;
        address account3 = 0x306469457266CBBe7c0505e8Aad358622235e768;
        address account4 = 0xd873F6DC68e3057e4B7da74c6b304d0eF0B484C7;
        address account5 = 0xDcC5dD922fb1D0fd0c450a0636a8cE827521f0eD;

        uint256 salary1 = 2535047025122316; // 80000
        uint256 salary2 = 2851927903262605; // 90000
        uint256 salary3 = 3168808781402895; // 100000
        uint256 salary4 = 2218166146982026; // 70000
        uint256 salary5 = 1901285268841737; // 60000

        // Set up first user; use this contract as the account so we can set up the initial distribution
        payroll.addEmployee(this, salary1, uint64(now - 86400), "CEO");

        address[] memory allowedTokens = new address[](2);
        allowedTokens[0] = address(token1);
        allowedTokens[1] = address(token2);

        uint256[] memory distribution = new uint256[](2);
        distribution[0] = 45;
        distribution[1] = 55;

        payroll.determineAllocation(allowedTokens, distribution);
        payroll.changeAddressByEmployee(root); // Set account to root

        // Create more users
        payroll.addEmployee(account2, salary2, uint64(now - 86400), "Project Manager");
        payroll.addEmployee(account3, salary3, uint64(now - 172800), "Developer");
        payroll.addEmployee(account4, salary4, uint64(now - 172800), "Developer");
        payroll.addEmployee(account5, salary5, uint64(now - 172800), "Developer");
    }
}
