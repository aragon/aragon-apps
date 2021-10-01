# Dandelion voting <img align="right" src="https://github.com/1Hive/website/blob/master/website/static/img/bee.png" height="80px" />

[![CircleCI](https://circleci.com/gh/1Hive/dandelion-voting-app.svg?style=svg)](https://circleci.com/gh/1Hive/dandelion-voting-app)
[![Coverage Status](https://coveralls.io/repos/github/1Hive/dandelion-voting-app/badge.svg?branch=master)](https://coveralls.io/github/1Hive/dandelion-voting-app?branch=master)

#### 🐲 Project stage: Rinkeby

[Contracts audited](https://diligence.consensys.net/audits/2019/12/dandelion-organizations/) at a 
[previous commit](https://github.com/1Hive/dandelion-voting-app/tree/9f1d2684d193d8c2448c0ae36875a8d97a6a2718). 
Deployed audited version on APM: v1.1.0  

Beware some changes have been made to the contract since this audit. Specifically the contract now implements the 
[TokenManagerHook](https://github.com/1Hive/token-manager-app/blob/master/contracts/TokenManagerHook.sol) to enable the use
of transferable tokens.

#### 🚨 Security review status: Not audited

The Dandelion Voting app is a fork of the Original [Aragon Voting app](https://github.com/aragon/aragon-apps/tree/master/apps/voting).
It serves the same purpose as the original Voting app but also enables organizations to restrict actions to members who have expressed approval in recent votes. It basically means that by voting yes on a proposal you are committing to a decision in the Org.

The main changes that have been implemented which differ from the original Voting app are:

- Removed the ability for a user to change their vote.
- Added a buffer period which determines how much time in blocks must pass between the start of each vote.
- Added an execution delay period in blocks (this means that the `full vote duration` + `full execution delay period` must pass before being able to execute a vote in case it passes).
- Removed the early execution functionality.
- Changed the vote duration to blocks. The main reason for this is that since proposals are queued we do not necessarily know which block number to use for the vote snapshot (since we are not necessarily processing the transaction right when the vote starts).
- Keep track of the latest vote ids users have voted yes on.
- Make the app an [ACL Oracle](https://hack.aragon.org/docs/acl_IACLOracle).


## How does it work?

It has the same funcionality as the regular voting app with some exceptions:

- Proposals are now queued with a minimum number of blocks between the start of each one.
- Users cannot change their decision after they have already voted.
- Votes are delayed a configurable period of time since when they are closed till when they can be executed (in the case they pass).
- Votes cannot be early executed. This means that the `full vote duration` + the `full delay period` has to pass in order to be able to execute a vote (in case it passes).

It also acts as an [ACL Oracle](https://hack.aragon.org/docs/acl_IACLOracle). ACL Oracles are small helper functions that plug in to Aragon's access control list (ACL) to do more sophisticated permission evaluation. This Oracle is intended to restrict actions to members who have expressed approval in recent votes.

The app keeps track of the latest vote ids users have voted yes on. This way when the Oracle function is queried, it can properly evaluate whether a member can perform a certain action or not within the Organization.

In the context of Dandelion Orgs, the redeem functionality will be guarded by a role set behind this ACL Oracle. This means that whenever a user wants to redeem some tokens, it will first call the ACL Oracle function to check whether s/he can perform the action or not.

**Users will be able to redeem tokens if one of this conditions is met:**

- The latest vote in which the user voted yea failed (did not passed) and the execution delay for this vote has already passed.
- The latest vote in which the user voted yea passed and has been executed.
- The latest vote in which the user voted yea passed and the fallback period has passed.

### What's the fallback period ?

The fallback period is intended to ensure users are both locked in for votes they voted yes on, but still have an opportunity to exit before the next vote that they didn't vote yes on gets executed. The idea here is that it gives other members an opportunity to execute the vote before anyone who voted yes on the proposal has the opportunity to exit. It also takes into account the possibility of a vote to fail its execution due to reasons that are outside of the Org's control.

## Initialization

The Dandelion Voting app is initialized with a `MiniMeToken _token`, `uint64 _supportRequiredPct`, `uint64 _minAcceptQuorumPct`, `uint64 _durationBlocks`, `uint64 _bufferBlocks` and `uint64 _executionDelayBlocks`.

- `MiniMeToken _token` refers to the token that will be used to vote
- `uint64 _supportRequiredPct` refers to the support required to pass a vote
- `uint64 _minAcceptQuorumPct` refers to the quorum required to pass a vote
- `uint64 _durationBlocks` refers to the number of blocks that a vote stays open
- `uint64 _bufferBlocks` refers to the minimum number of blocks between the start block of each vote
- `uint64 _executionDelayBlocks` refers to the number of blocks that a vote will be delayed from when is closed to when it actually can be executed (in case it passes).

## Roles

The Dandelion Voting app should implement the following roles:

- **CREATE_VOTES_ROLE**: This allows for changing the Aragon app that can create votes
- **MODIFY_SUPPORT_ROLE**: This allows for changing the amount of support required to pass a vote
- **MODIFY_QUORUM_ROLE**: This allows for changing the quorum required to pass votes
- **MODIFY_BUFFER_BLOCKS_ROLE**: This allows for changing the minimum number of blocks between the start block of each vote
- **MODIFY_EXECUTION_DELAY_ROLE**; This allows for changing the number of blocks that votes are delayed from when they are closed till when they can be executed (in case they pass).

### Interface

The interface is pretty much the same as the original Voting app with the exception that now you can see when future votes will start (upcoming votes).

## How to try Dandelion Voting app immediately

### Template

If you would like to see the Dandelion Voting App in action, we recommend the Dandelion Org template available in the Aragon templates directory. Just go to https://mainnet.aragon.org/, then create a new organization, and choose Dandelion from the template options.

## How to run the Dandelion Voting app locally

Git clone this repo.

```sh
git clone https://github.com/1Hive/dandelion-voting-app.git
```

Navigate into the `dandelion-voting-app` directory.

```sh
cd dandelion-voting-app
```

Install npm dependencies.

```sh
npm i
```

Deploy a dao with Dandelion Voting app installed on your local environment.

```sh
npm run start:template
```

## Aragon DAO Installation
The Dandelion voting app has been published to APM on Mainnet and Rinkeby at `dandelion-voting.aragonpm.eth`

To deploy to an organization you can use the [aragonCLI](https://hack.aragon.org/docs/cli-intro.html).

```sh
aragon dao install <dao-address> dandelion-voting.aragonpm.eth --app-init-args <token-address> <supportRequiredPct> <minAcceptQuorumPct> <durationBlocks> <bufferBlocks> <executionDelayBlocks>
```

## Contributing

We welcome community contributions!

Please check out our [open Issues](https://github.com/1Hive/dandelion-voting-app/issues) to get started.

If you discover something that could potentially impact security, please notify us immediately. The quickest way to reach us is via the #dev channel in our [team Keybase chat](https://keybase.io/team/1hive). Just say hi and that you discovered a potential security vulnerability and we'll DM you to discuss details.
