/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 *
 * This file requires contract dependencies which are licensed as
 * GPL-3.0-or-later, forcing it to also be licensed as such.
 *
 * This is the only file in your project that requires this license and
 * you are free to choose a different license for the rest of the project.
 */

pragma solidity ^0.4.24;


import "@aragon/os/contracts/factory/DAOFactory.sol";
import "@aragon/os/contracts/apm/Repo.sol";
import "@aragon/os/contracts/lib/ens/ENS.sol";
import "@aragon/os/contracts/lib/ens/PublicResolver.sol";
import "@aragon/os/contracts/apm/APMNamehash.sol";
import "@aragon/apps-voting/contracts/Voting.sol";
import "@aragon/apps-vault/contracts/Vault.sol";
import "@aragon/apps-token-manager/contracts/TokenManager.sol";
import "@1hive/oracle-token-balance/contracts/TokenBalanceOracle.sol";
import "../TimeLock.sol";

contract TemplateBase is APMNamehash {
    ENS public ens;
    DAOFactory public fac;

    event DeployDao(address dao);
    event InstalledApp(address appProxy, bytes32 appId);

    constructor(DAOFactory _fac, ENS _ens) public {
        ens = _ens;

        // If no factory is passed, get it from on-chain bare-kit
        if (address(_fac) == address(0)) {
            bytes32 bareKit = apmNamehash("bare-kit");
            fac = TemplateBase(latestVersionAppBase(bareKit)).fac();
        } else {
            fac = _fac;
        }
    }

    function latestVersionAppBase(bytes32 appId) public view returns (address base) {
        Repo repo = Repo(PublicResolver(ens.resolver(appId)).addr(appId));
        (,base,) = repo.getLatest();

        return base;
    }

    function installApp(Kernel dao, bytes32 appId) internal returns (address) {
        address instance = address(dao.newAppInstance(appId, latestVersionAppBase(appId)));
        emit InstalledApp(instance, appId);
        return instance;
    }

    function installDefaultApp(Kernel dao, bytes32 appId) internal returns (address) {
        address instance = address(dao.newAppInstance(appId, latestVersionAppBase(appId), new bytes(0), true));
        emit InstalledApp(instance, appId);
        return instance;
    }
}


contract Template is TemplateBase {

    uint64 constant PCT = 10 ** 16;
    address constant ANY_ENTITY = address(-1);

    uint8 constant ORACLE_PARAM_ID = 203;
    enum Op { NONE, EQ, NEQ, GT, LT, GTE, LTE, RET, NOT, AND, OR, XOR, IF_ELSE }

    bytes32 internal TIME_LOCK_APP_ID = keccak256(abi.encodePacked(apmNamehash("open"), keccak256("time-lock")));
    bytes32 internal TOKEN_BALANCE_ORACLE_APP_ID = keccak256(abi.encodePacked(apmNamehash("open"), keccak256("token-balance-oracle")));
    bytes32 internal TOKEN_MANAGER_APP_ID = apmNamehash("token-manager");
    bytes32 internal VOTING_APP_ID = apmNamehash("voting");

    MiniMeTokenFactory tokenFactory;

    constructor(ENS ens) TemplateBase(DAOFactory(0), ens) public {
        tokenFactory = new MiniMeTokenFactory();
    }

    function newInstance(bool setTokenBalanceOracle) public {
        address root = msg.sender;
        Kernel dao = fac.newDAO(this);
        ACL acl = ACL(dao.acl());
        acl.createPermission(this, dao, dao.APP_MANAGER_ROLE(), this);

        TimeLock timeLock = TimeLock(installApp(dao, TIME_LOCK_APP_ID));
        TokenManager tokenManager = TokenManager(installApp(dao, TOKEN_MANAGER_APP_ID));
        Voting voting = Voting(installApp(dao, VOTING_APP_ID));
        TokenBalanceOracle tokenBalanceOracle;

        MiniMeToken lockToken = tokenFactory.createCloneToken(MiniMeToken(0), 0, "Lock token", 18, "LKT", true);
        lockToken.generateTokens(root, 300e18);
        lockToken.changeController(root);

        MiniMeToken membershipToken = tokenFactory.createCloneToken(MiniMeToken(0), 0, "Bee Token", 18, "BEE", false);
        membershipToken.changeController(tokenManager);

        // Initialize apps
        timeLock.initialize(ERC20(lockToken), 60, 20e18, 100 * PCT);
        tokenManager.initialize(membershipToken, true, 0);
        voting.initialize(membershipToken, 50 * PCT, 20 * PCT, 1 days);

        acl.createPermission(this, tokenManager, tokenManager.MINT_ROLE(), this);
        acl.createPermission(voting, tokenManager, tokenManager.BURN_ROLE(), root);
        tokenManager.mint(root, 1e18); // Give one membership token to root

        acl.createPermission(timeLock, voting, voting.CREATE_VOTES_ROLE(), voting);

        acl.createPermission(root, timeLock, timeLock.CHANGE_DURATION_ROLE(), voting);
        acl.createPermission(root, timeLock, timeLock.CHANGE_AMOUNT_ROLE(), voting);
        acl.createPermission(root, timeLock, timeLock.CHANGE_SPAM_PENALTY_ROLE(), voting);
        acl.createPermission(ANY_ENTITY, timeLock, timeLock.LOCK_TOKENS_ROLE(), this);

        if (setTokenBalanceOracle) {
            tokenBalanceOracle = TokenBalanceOracle(installApp(dao, TOKEN_BALANCE_ORACLE_APP_ID));

            //Require entities locking tokens to be a member of the organization by requiring a minimum balance of 1 BEE token
            tokenBalanceOracle.initialize(membershipToken, 1e18);

            acl.createPermission(root, tokenBalanceOracle, tokenBalanceOracle.SET_TOKEN_ROLE(), voting);
            acl.createPermission(root, tokenBalanceOracle, tokenBalanceOracle.SET_MIN_BALANCE_ROLE(), voting);

            //grant permission to Any account with ACL oracle params
            setOracle(acl, ANY_ENTITY, timeLock, timeLock.LOCK_TOKENS_ROLE(), tokenBalanceOracle);
        }

        // Clean up permissions
        acl.grantPermission(root, dao, dao.APP_MANAGER_ROLE());
        acl.revokePermission(this, dao, dao.APP_MANAGER_ROLE());
        acl.setPermissionManager(root, dao, dao.APP_MANAGER_ROLE());

        acl.grantPermission(root, acl, acl.CREATE_PERMISSIONS_ROLE());
        acl.revokePermission(this, acl, acl.CREATE_PERMISSIONS_ROLE());
        acl.setPermissionManager(root, acl, acl.CREATE_PERMISSIONS_ROLE());

        acl.grantPermission(voting, tokenManager, tokenManager.MINT_ROLE());
        acl.revokePermission(this, tokenManager, tokenManager.MINT_ROLE());
        acl.setPermissionManager(root, tokenManager, tokenManager.MINT_ROLE());

        acl.setPermissionManager(root, timeLock, timeLock.LOCK_TOKENS_ROLE());

        emit DeployDao(dao);

    }

    function setOracle(ACL acl, address who, address where, bytes32 what, address oracle) internal {
        uint256[] memory params = new uint256[](1);
        params[0] = paramsTo256(ORACLE_PARAM_ID, uint8(Op.EQ), uint240(oracle));
        acl.grantPermissionP(who, where, what, params);
    }

    function paramsTo256(uint8 id,uint8 op, uint240 value) internal returns (uint256) {
        return (uint256(id) << 248) + (uint256(op) << 240) + value;
    }
}
