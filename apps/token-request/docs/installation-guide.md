# Token Request Installation Guide

This guide will walk you through everything you need to add Token Request to an existing Aragon DAO.

---

## TL;DR

Token Request has been published to the following locations:

- Rinkeby: `token-request.aragonpm.eth`
- Mainnet: `token-request.aragonpm.eth`

To deploy to an organization you can use the [Aragon CLI](https://hack.aragon.org/docs/cli-intro.html).

```sh
aragon dao install <dao-address> token-request.aragonpm.eth --app-init-args <tokens-app-address> <vault-or-agent-app-address> ["'<tokenAddress1>', '<tokenAddress2>', ..."]
```

Token Request must have the `MINT_ROLE` permission on `Tokens app`.

---

## Detailed Installation Guide

---

### 1. Deploy a fresh DAO

This step is if you don't already have a DAO to install Token Request on, or want to test it on a demo first.

First, make sure that you have the [Aragon CLI](https://hack.aragon.org/docs/cli-intro.html) installed. Then run `aragon devchain` in a terminal. This should show you two Ethereum addresses. The first one has the most permissions and is used to execute commands on the Aragon CLI. Import the private key of that account into Metamask. Then head over to the [Rinkeby DAO launcher](rinkeby.aragon.org) and create a DAO with the democracy template. Make sure that the Metamask account that is active is the first account created by your `aragon devchain`.

Once your Democracy DAO is deployed (the voting params don't matter as you'll be the only one voting right now), go to the settings tab where you will find the addresses for the DAO and its apps. For legibility of subsequent commands will set bash environment variable for these addresses:

```
dao=0x6604f9fe9Db1D3F6a45d8F0ab79e8a4B05968816
tokens=0x7F42cEB659B944cBB9F3D5ED637f66818C1bAcbf
voting=0x41CA57d1e65Cdcd3A68A0e9f8E835F3a1FeDc655
vault-or-agent=0x04b46b9e0c1f893cA50Cb35F096d14dD946DEf95
```

---

### 2. Install Token Request to the DAO

Token Request has been published to the APM on Rinkeby at `token-request.aragonpm.eth`

```sh
aragon dao install $dao token-request.aragonpm.eth --app-init-args $tokens $vault-or-agent ["'0x0000000000000000000000000000000000000000'"] --environment aragon:rinkeby
```

If the installation was executed successfully, you should see in you terminal:
`✔ Installed token-request.aragonpm.eth at: <token-request-address>`

> Note: In this example we are setting Ether as the only accepted deposit asset. If you would like to add another ERC20 Token as offered asset, you can add it to the address list or replace the ether address in case you want to support only one accepted asset.

The default setup of the democracy DAO is for a vote of the token holders to take place before actions are executed. Head over to the voting app and you will see a new vote.

---

### 3. Set up Permissions

Before the Token Request displays in the UI you must set a permission on it.

> In the unlikely case the proxy address of the app did not show in the previous step, then do the following:

```sh
dao apps $dao --all --environment aragon:rinkeby
```

> This will list all apps installed in the dao.

Copy the proxy address of the Token Request app and create another environment variable `tokenRequest=<token-request-address>`

Four permissions need to be created for the Token Request to function properly

- `SET_TOKEN_MANAGER_ROLE`
- `SET_VAULT_ROLE`
- `MODIFY_TOKENS_ROLE`
- `FINALISE_TOKEN_REQUEST_ROLE`

After setting one of these roles the Token Request will appear in the UI

We're going to grant the voting app the permission to finalise requests and set it also as the controller. Again like the rest of the commands that change state, you must first vote before the action takes affect.

```sh
dao acl create $dao $tokenRequest FINALISE_TOKEN_REQUEST_ROLE $voting $voting --environment aragon:rinkeby
```

This grants the voting app the permission to add and remove tokens to the list of accepted deposit tokens and sets it as the controller.

```sh
dao acl create $dao $tokenRequest MODIFY_TOKENS_ROLE $voting $voting --environment aragon:rinkeby
```

This grants the voting app the permission to set the tokens app address and sets it as the controller.

```sh
dao acl create $dao $tokenRequest SET_TOKEN_MANAGER_ROLE $voting $voting --environment aragon:rinkeby
```

This grants the voting app the permission to set the vault app address and sets it as the controller.

```sh
dao acl create $dao $tokenRequest SET_VAULT_ROLE $voting $voting --environment aragon:rinkeby
```

### Granting the Token Request app permissions on other apps

The Token Request must also have the `MINT_ROLE` permission on `Tokens` so that it can mint organization tokens to users in the event that a request has been approved.

```sh
dao acl grant $dao $tokens MINT_ROLE $tokenRequest --environment aragon:rinkeby
```

> Notes:
> if for some reason you're not allowed to create a vote try creating it manually via the GUI in the Aragon Client (system / permissions / Add permission)

---

### 4. Testing Token Request

If all the steps above were done correctly, you should have Token Request app all set up.

You can now start creating requests offering assets in exchange for organization tokens.

---
