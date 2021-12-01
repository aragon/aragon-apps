# Token Request <img align="right" src="https://github.com/1Hive/website/blob/master/website/static/img/bee.png" height="80px" />

[![CircleCI](https://circleci.com/gh/1Hive/token-request-app.svg?style=svg)](https://circleci.com/gh/1Hive/token-request-app)
[![Coverage Status](https://coveralls.io/repos/github/1Hive/token-request-app/badge.svg?branch=master&service=github)](https://coveralls.io/github/1Hive/token-request-app?branch=master&service=github)

1Hive's Token Request app allows users to create a vote which requests an Organization's tokens in exchange for payment. For example a user may request minting 100 organization tokens in exchange for 100 DAI. The request would require a vote to approve, if the vote is rejected the user would receive their payment back and if it is approved the payment would be deposited in the organization's vault.

#### 🚨 Security review status: [Contracts audited](https://diligence.consensys.net/audits/2019/12/dandelion-organizations/)

## How does it work

The Token Request App should be granted the `Create Votes` permission on an instance of the Aragon `Voting` app. When a user makes a request they should transfer the payment to the Token Request app which will hold them in escrow while the vote is created and executed. If the vote duration passes and the payment is still in the Token Request app, the user should be able to claim **their** tokens. If the vote passes then executing the vote should transfer the users tokens from the Token Request app to the organizations vault, and mint tokens from the token manager for the user.

### Initialization

The token request app is initialized by passing the address of a `token manager` instance, the address of a `_vault` instance, and an array of addresses `_acceptedDepositTokens`. The `_acceptedDepositTokens` array **MUST** be less than the `MAX_ACCEPTED_DEPOSIT_TOKENS` variable which is set to 100 and must be in ascending order (otherwise the installation will fail).

### Roles

The Token Request application should implement the following roles:

- Finalise token requests
- Change Vault Address
- Change Token Manager Address
- Add/remove offered tokens to/from the accepted offered token list

### Interface

We do not need to provide an interface for changing parameters as this can be done by power users using the aragonCLI.

The interface allows users to request tokens, where they would specify the amount and the associated payment.
It also allows for withdrawing their requests at any time.

For a detailed view of the flow of the app check out our [user-guide](./docs/user-guide.md)

## How to run Token Request app locally

First make sure that you have node, npm, and the aragonCLI installed and working. Instructions on how to set that up can be found [here](https://hack.aragon.org/docs/cli-intro.html). You'll also need to have [Metamask](https://metamask.io) or some kind of web wallet enabled to sign transactions in the browser.

Git clone this repo.

```sh
git clone https://github.com/1Hive/token-request-app.git
```

Navigate into the `token-request-app` directory.

```sh
cd token-request-app
```

Install npm dependencies.

```sh
npm i
```

Deploy a dao with Lock app installed on your local environment.

```sh
npm run start:template
```

## How to deploy to an organization

Token Request app has been published to APM on Mainnet and Rinkeby at `token-request.aragonpm.eth`

To deploy to an Aragon DAO you can use the [Aragon CLI](https://hack.aragon.org/docs/cli-intro.html).

```
aragon dao install <dao-address> token-request.aragonpm.eth --app-init-args <vault-address> <token-manager-address>
```

<br />

## Contributing

We welcome community contributions!

Please check out our [open Issues]() to get started.

If you discover something that could potentially impact security, please notify us immediately. The quickest way to reach us is via the #dev channel in our [team Keybase chat](https://keybase.io/team/1hive). Just say hi and that you discovered a potential security vulnerability and we'll DM you to discuss details.

<br />
