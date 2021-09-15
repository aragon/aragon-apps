# Redemptions Installation Guide

This guide will walk you though everything you need to add Redemptions to an existing DAO.

---

## TL;DR

Redemptions has been published to APM on Mainnet and Rinkeby at `redemptions.aragonpm.eth`

To deploy to an organization you can use the [Aragon CLI](https://hack.aragon.org/docs/cli-intro.html).

```sh
aragon dao install <dao-address> redemptions.aragonpm.eth --app-init-args <vault-address> <token-manager-address> ["'<tokenAddress1>', '<tokenAddress2>', ..."].
```

The Redemptions app must have the `TRANSFER_ROLE` permission on `Vault` and the `BURN_ROLE` permission on the `Token Manager`.

---

## Detailed Installation Guide

---

### 1. Deploy a fresh DAO

This step is if don't already have a DAO to install Redemptions on, or want to test it on a demo first.

First, make sure that you have the [Aragon CLI](https://hack.aragon.org/docs/cli-intro.html) installed. Then run `aragon devchain` in a terminal. This should show you two Ethereum addresses. The first one has the most permissions and is used to execute commands on the Aragon CLI. Import the private key of that account into Metamask. Then head over to the [Rinkeby DAO launcher](rinkeby.aragon.org) and create a DAO with the democracy kit. Make sure that the Metamask account that is active is the first account created by your `aragon devchain`.

Once your Democracy DAO is deployed (the voting params don't matter as you'll be the only one voting right now), go to the settings tab where you will find the addresses for the DAO and its apps. For legibility of subsequent commands will set bash environment variable for these addresses:

```
dao=0x6604f9fe9Db1D3F6a45d8F0ab79e8a4B05968816
tokenManager=0x7F42cEB659B944cBB9F3D5ED637f66818C1bAcbf
voting=0x41CA57d1e65Cdcd3A68A0e9f8E835F3a1FeDc655
vault=0x04b46b9e0c1f893cA50Cb35F096d14dD946DEf95
ANY_ADDRESS=0xffffffffffffffffffffffffffffffffffffffff
```

---

### 2. Install Redemptions App

Redemptions has been published to APM on Mainnet and Rinkeby at `redemptions.aragonpm.eth`

```sh
aragon dao install $dao redemptions.aragonpm.eth --app-init-args $vault $tokenManager --environment aragon:rinkeby
```

The default setup of the democracy DAO is for a vote of the token holders to take place before actions are executed. Head over to the voting app and you will see a new vote

---

### 3. Set up Permissions

Before the Redemptions app displays in the UI you must set a permission on it. First, get the address of the Redemptions app

```sh
dao apps $dao --all --environment aragon:rinkeby
```

Next, copy the proxy address of the permissionless app and create another environment variable `redemptions=0x4dA76c5B30b5a289Cb8f673Ba71A1A20bd37a00c`

---

Three permissions need to be created for the Redemptions app to function properly

- `REDEEM_ROLE`
- `ADD_TOKEN_ROLE`
- `REMOVE_TOKEN_ROLE`

After setting one of these roles the Redemptions App will appear in the UI

We're going to grant any account the permission to redeem tokens and set the voting app as the controller. Again like the rest of the commands that change state, you must first vote before the action takes affect. We currently support only direct redemptions which means that granting the permission to a forwarder instead will not work.

```sh
dao acl create $dao $redemptions REDEEM_ROLE $ANY_ADDRESS $voting --environment aragon:rinkeby
```

This grants the voting app the permission to add tokens to the list of redeemable tokens and sets it as the controller

```sh
dao acl create $dao $redemptions ADD_TOKEN_ROLE $voting $voting --environment aragon:rinkeby
```

This grants the voting app the permission to remove tokens from the list of redeemable tokens and sets it as the controller

```sh
dao acl create $dao $redemptions REMOVE_TOKEN_ROLE $voting $voting --environment aragon:rinkeby
```

---

The Redemptions app must also have the `TRANSFER_ROLE` permission on `Vault` and the `BURN_ROLE` permission on the `Token Manager`.

```sh
dao acl create $dao $vault TRANSFER_ROLE $redemptions $voting --environment aragon:rinkeby
```

```sh
dao acl create $dao $tokenManager BURN_ROLE $redemptions $voting --environment aragon:rinkeby
```

> Notes:
> if for some reason you're not allowed to create a vote try creating it manually via the GUI in the Aragon Client (system / permissions / Add permission)
> if you're not able to vote YES on a vote, but your account is the only account with a voting token, try voting NO. If that works, then try creating the vote again. Sometimes it magically works. If not, double check that your Metamask account is still the account that has a voting token in the DAO.

---

### 4. Testing the Redemptions app

Before we test out Redemptions, if you already installed the Redemptions app with a any eligible assets you only need to have a positive balance in the vault for those assets, otherwise we are going to need to request some test tokens through the DAO.

Go back to the settings tab and press the request tokens button a few times. This will deposit some tokens into the vault.

Open the finance app and you will see a number of deposits, you will need the contract address of the tokens you want to add to redemptions.

Choose one of the transactions and view it on etherscan, find the contract address, copy it and head over to the redemptions app.

Click add token and paste in the contract address.

> Note:
> On Rinkeby you can't just add in any old contract. It must be a token contract deployed on Rinkeby. The testing tokens sent to your DAO are deployed on Rinkeby and will work.

---
