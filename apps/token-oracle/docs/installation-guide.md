# Token Oracle Installation Guide

This guide will walk you through everything you need to add Token Oracle to an existing Aragon DAO.

---

## TL;DR

Token Oracle has been published to the following locations:

- Rinkeby token-balance-oracle.aragonpm.eth
- Mainnet -

To deploy to an organization you can use the [Aragon CLI](https://hack.aragon.org/docs/cli-intro.html).

```sh
aragon dao install <dao-address> token-balance-oracle.open.aragonpm.eth --app-init-args <token-address> <minimum-required-balance>
```

We recommend setting the following permissions:

- `SET_TOKEN_ROLE` => Voting app
- `SET_MIN_BALANCE_ROLE` => Voting app

---

## Detailed Installation Guide

---

### 1. Install Token Oracle to your DAO

Token Oracle app has been published to the APM on Rinkeby at `token-balance-oracle.open.aragonpm.eth`

```sh
aragon dao install $dao token-balance-oracle.open.aragonpm.eth --app-init-args $token_address $minimum_balance --environment aragon:rinkeby
```

In case you have a democracy DAO setHead over to the voting app and you will see a new vote.

---

### 2. Set up Permissions

```sh
dao apps $dao --all --environment aragon:rinkeby
```

Next, copy the proxy address of the permissionless app and create an environment variable `tokenOracle=0x4dA76c5B30b5a289Cb8f673Ba71A1A20bd37a00c`

---

The Token Oracle app does not have a UI. It's only meant as a back-end helper function for Aragon applications to perform more sophisticated permissions evaluation.
However, you can still check if it has installed successfully by checking in the DAO's permissions section.

Before, you have to create one of the following permissions: (If no permissions were created yet, you should see an `unknown app` installed).

- `SET_TOKEN_ROLE`
- `SET_MIN_BALANCE_ROLE`

After setting one of these roles the app will appear in the permissions section.

This grants the voting app the permission to set the token address that the oracle is to track.

```sh
dao acl create $dao $tokenOracle SET_TOKEN_ROLE $voting $voting --environment aragon:rinkeby
```

This grants the voting app the permission to set the minimum required balance.

```sh
dao acl create $dao $tokenOracle SET_MIN_BALANCE_ROLE $voting $voting --environment aragon:rinkeby
```

---

### 3. Creating a permission and setting the ACL Oracle.

In order to use this ACL Oracle by an Aragon app, we will use the [Aragon CLI](https://hack.aragon.org/docs/cli-intro.html) to grant a permission with params.

```sh
dao acl grant $dao $app SOME_ROLE $ANY_ENTITY "ORACLE_PARAM_ID,EQ,$oracleAddress"
```

To give an example, in the context of Dandelion orgs we use this token oracle with the [Time Lock app](https://github.com/1Hive/time-lock-app/) where we ensure that only members can create proposals. This is done by granting the Time Lock app the permission to create votes. Before users can create proposals, they have to lock tokens and the function that locks tokens and forwards the intent is protected with a role (`LOCK_TOKENS_ROLE`) which is behind this ACL Oracle. \

In consequence, each time someone tries to create a proposal, they will have to Lock some tokens, and they can do so only if the ACL Oracle check passes (`canPerform` function is called) where it checks if the user trying to create said proposal is a member fo the DAO (`token` address is the token of the DAO and `minBalance` is set to 1).
