# Time Lock Installation Guide

This guide will walk you through everything you need to add Time Lock app to an existing Aragon DAO.

---

## TL;DR

Time Lock app has been published to the following locations:

- Mainnet: `time-lock.aragonpm.eth`
- Rinkeby: `time-lock.aragonpm.eth`

To deploy to an organization you can use the [Aragon CLI](https://hack.aragon.org/docs/cli-intro.html).

```sh
aragon dao install <dao-address> time-lock.aragonpm.eth --app-init-args <token-address> <lock-duration> <lock-amount> <spam-penalty-factor>
```

---

## Detailed Installation Guide

---

### 1. Deploy a fresh DAO

This step is if you don't already have a DAO to install Time Lock app on, or want to test it on a demo first.

First, make sure that you have the [Aragon CLI](https://hack.aragon.org/docs/cli-intro.html) installed. Then run `aragon devchain` in a terminal. This should show you two Ethereum addresses. The first one has the most permissions and is used to execute commands on the Aragon CLI. Import the private key of that account into Metamask. Then head over to the [Rinkeby DAO launcher](rinkeby.aragon.org) and create a DAO with the democracy kit. Make sure that the Metamask account that is active is the first account created by your `aragon devchain`.

Once your Democracy DAO is deployed (the voting params don't matter as you'll be the only one voting right now), go to the settings tab where you will find the addresses for the DAO and its apps. For legibility of subsequent commands will set bash environment variable for these addresses:

```
dao=0x6604f9fe9Db1D3F6a45d8F0ab79e8a4B05968816
tokens=0x7F42cEB659B944cBB9F3D5ED637f66818C1bAcbf
voting=0x41CA57d1e65Cdcd3A68A0e9f8E835F3a1FeDc655
anyEntity=0xffffffffffffffffffffffffffffffffffffffff
```

---

### 2. Install Time Lock app to the DAO

Time Lock app has been published to the APM on Mainnet and Rinkeby at `time-lock.aragonpm.eth`

```sh
aragon dao install $dao time-lock.aragonpm.eth --app-init-args <token-address> <lock-duration> <lock-amount> <spam-penalty-factor> --environment aragon:rinkeby
```

If the installation was executed successfully, you should see in you terminal:
`✔ Installed time-lock.aragonpm.eth at: <time-lock-address>`

The default setup of the democracy DAO is for a vote of the token holders to take place before actions are executed. Head over to the voting app and you will see a new vote.

---

### 3. Set up Permissions

Before the Time Lock app displays in the UI you must set a permission on it. First, get the address of the app

> In the unlikely case the proxy address of the app did not show in the previous step, then do the following:

```sh
dao apps $dao --all --environment aragon:rinkeby
```

> This will list all apps installed in the dao.

Next, copy the proxy address of the app and create another environment variable `timeLock=0x4dA76c5B30b5a289Cb8f673Ba71A1A20bd37a00c`

### The following permissions need to be created for the Time Lock app to function properly:

- CHANGE_DURATION_ROLE
- CHANGE_AMOUNT_ROLE
- CHANGE_SPAM_PENALTY_ROLE
- LOCK_TOKENS_ROLE

After setting one of these roles the Time Lock app will appear in the UI

We're going to grant any account the permission to lock tokens and set the voting app as the controller. Again like the rest of the commands that change state, you must first vote before the action takes affect.

```sh
dao acl create $dao $timeLock LOCK_TOKENS_ROLE $anyEntity $voting --environment aragon:rinkeby
```

In Dandelion Orgs, this role is behind a [Token Balance Oracle](https://github.com/1Hive/token-oracle) to ensure that only members of the organization can submit proposals.

This grants the voting app the permission to change the lock duration.

```sh
dao acl create $dao $timeLock CHANGE_DURATION_ROLE $voting $voting --environment aragon:rinkeby
```

This grants the voting app the permission to change the lock amount.

```sh
dao acl create $dao $timeLock CHANGE_AMOUNT_ROLE $tokens $voting --environment aragon:rinkeby
```

This grants the voting app the permission to change the spam penalty factor.

```sh
dao acl create $dao $timeLock CHANGE_SPAM_PENALTY_ROLE $voting $voting --environment aragon:rinkeby
```

---

### Granting the Time Lock app permissions on other apps

We are going to grant the Time Lock app the permission to create votes in the voting app. This will mean that in order to create a vote, a user will have to first lock some tokens.

dao acl create $dao $voting CREATE_VOTES_ROLE $timeLock $voting --environment aragon:rinkeby

> Notes:
> if for some reason you're not allowed to create a vote try creating it manually via the GUI in the Aragon Client (system / permissions / Add permission)

---

### 4. Testing Time Lock app

If all the steps above were done correctly, you should have Time Lock app all set up.

You can now try to mint some tokens in the tokens app and se how it prompts you to lock tokens before forwarding the action that will create a vote.
