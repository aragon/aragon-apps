/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 *
 * This file requires contract dependencies which are licensed as
 * GPL-3.0-or-later, forcing it to also be licensed as such.
 *
 * This is the only file in your project that requires this license and
 * you are free to choose a different license for the rest of the project.
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/factory/DAOFactory.sol";
import "@aragon/os/contracts/apm/Repo.sol";
import "@aragon/os/contracts/lib/ens/ENS.sol";
import "@aragon/os/contracts/lib/ens/PublicResolver.sol";
import "@aragon/os/contracts/apm/APMNamehash.sol";
import "@aragon/apps-voting/contracts/Voting.sol";
import "@aragon/apps-vault/contracts/Vault.sol";
import "@aragon/apps-token-manager/contracts/TokenManager.sol";
import "@aragon/os/contracts/common/EtherTokenConstant.sol";

import "../TokenRequest.sol";


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

    bytes32 internal VAULT_APP_ID = apmNamehash("vault");
    bytes32 internal VOTING_APP_ID = apmNamehash("voting");
    bytes32 internal FINANCE_APP_ID = apmNamehash("finance");
    bytes32 internal TOKEN_MANAGER_APP_ID = apmNamehash("token-manager");

    MiniMeTokenFactory tokenFactory;
    address root = msg.sender;

    constructor(ENS ens) TemplateBase(DAOFactory(0), ens) public {
        tokenFactory = new MiniMeTokenFactory();
    }

    function newInstance() public {
        Kernel dao = fac.newDAO(this);
        ACL acl = ACL(dao.acl());
        acl.createPermission(this, dao, dao.APP_MANAGER_ROLE(), this);

        bytes32 tokenRequestAppId = keccak256(abi.encodePacked(apmNamehash("open"), keccak256("token-request")));
        bytes32 votingAppId = apmNamehash("voting");
        bytes32 tokenManagerAppId = apmNamehash("token-manager");
        bytes32 vaultAppId = apmNamehash("vault");


        Vault vault = Vault(dao.newAppInstance(vaultAppId, latestVersionAppBase(vaultAppId),new bytes(0),true));
        TokenRequest tokenRequest = TokenRequest(dao.newAppInstance(tokenRequestAppId, latestVersionAppBase(tokenRequestAppId)));
        Voting voting = Voting(dao.newAppInstance(votingAppId, latestVersionAppBase(votingAppId)));
        TokenManager tokenManager = TokenManager(dao.newAppInstance(tokenManagerAppId, latestVersionAppBase(tokenManagerAppId)));


        MiniMeToken token = tokenFactory.createCloneToken(MiniMeToken(0), 0, "Requestable token", 18, "RQT", true);
        token.changeController(tokenManager);
        MiniMeToken testToken = tokenFactory.createCloneToken(MiniMeToken(0), 0, "TestToken", 18, "TST", true);

        // Initialize apps
        initApps(vault, tokenManager, tokenRequest, voting, token, testToken);

        acl.createPermission(tokenManager, voting, voting.CREATE_VOTES_ROLE(), this);
        acl.createPermission(tokenManager, tokenRequest, tokenRequest.SET_TOKEN_MANAGER_ROLE(), root);
        acl.createPermission(tokenManager, tokenRequest, tokenRequest.SET_VAULT_ROLE(), root);
        acl.createPermission(voting, tokenRequest, tokenRequest.FINALISE_TOKEN_REQUEST_ROLE(), root);
        acl.createPermission(this, tokenManager, tokenManager.MINT_ROLE(), this);
        acl.grantPermission(tokenRequest, tokenManager, tokenManager.MINT_ROLE());
        acl.createPermission(this, tokenRequest,tokenRequest.MODIFY_TOKENS_ROLE(), this);
        acl.grantPermission(tokenRequest, voting, voting.CREATE_VOTES_ROLE());

        //acl.createPermission(tokenRequest, tokenManager, tokenManager.MINT_ROLE(), root);

        tokenManager.mint(root, 10e18); // Give ten tokens to root
        createTokenForUser(root, tokenFactory, tokenRequest, testToken);

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


        emit DeployDao(dao);
    }

    function initApps(Vault vault, TokenManager tokenManager, TokenRequest tokenRequest, Voting voting, MiniMeToken token, MiniMeToken testToken) internal {
        vault.initialize();
        tokenManager.initialize(token, true, 0);
        address[] memory tokenList = new address[](2);
        tokenList[0] = address(0);
        tokenList[1] = address(testToken);
        tokenRequest.initialize(tokenManager, vault, tokenList);
        voting.initialize(token, 50 * PCT, 20 * PCT, 1 days);
    }

    function createTokenForUser(address root, MiniMeTokenFactory tokenFactory, TokenRequest tokenRequest, MiniMeToken testToken) internal {
        testToken.generateTokens(root, 300e18);
        testToken.changeController(root);
    }
}
