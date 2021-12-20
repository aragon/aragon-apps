# Aragon Apps <img align="right" src=".github/assets/aragon.svg" height="80px" />

[![Build status](https://img.shields.io/travis/aragon/aragon-apps/master.svg?style=flat-square)](https://travis-ci.com/aragon/aragon-apps)
[![Coveralls branch](https://img.shields.io/coveralls/aragon/aragon-apps/master.svg?style=flat-square)](https://coveralls.io/github/aragon/aragon-apps)

## Apps

This monorepo contains the following apps:

- **[Agent](apps/agent)**: Hold assets and perform actions from Aragon organizations.
- **[Agreement](apps/agreement)**: Govern organizations through a subjective rules.
- **[Finance](apps/finance)**: Send payments and manage expenses with budgeting.
- **[Tokens](apps/token-manager)**: Manages an organization's token supply and distribution.
- **[Vault](apps/vault)**: Securely owns and manages tokens on behalf of a DAO.
- **[Voting](apps/voting)**: Create votes that execute actions on behalf of token holders.
- **[Disputable Voting](apps/voting-disputable)**: Create disputable votes that execute actions on behalf of token holders.
- **[Open Enterprise Apps](https://github.com/AutarkLabs/open-enterprise)**:
    - [Allocations](apps/allocations): Create proposals for financial allocation.
    - [Address books](apps/address-book): Map Ethereum address to human-readable names.
    - [Projects](apps/projects): Allocate funding to Github issues.
    - [Dot Voting](apps/dot-voting): Cast votes for Allocation or Issue Curation proposals.
    - [Rewards](apps/rewards): Distribute payments to token holders.
    - [Standard Bounties](apps/standard-bounties): Issue bounties for tasks.

Each of the individual apps come with a frontend that is intended to be installed and used through the [Aragon client](http://github.com/aragon/aragon).

You can read more about how each of the individual apps work in the [Aragon user guide](https://help.aragon.org/article/16-about-aragon-apps).

## Quick start

`aragon-apps` uses [`yarn workspaces`](https://classic.yarnpkg.com/en/docs/workspaces) and [`lerna`](https://github.com/lerna/lerna) to manage its individual app workspaces.

To bootstrap, run:

```
yarn
```

This will initialize and install each of the individual apps, hoisting their shared dependencies into the root `node_modules/` directory.

> 💡 If you're only interested in bootstrapping one package, you can go to that specific package workspace and use `yarn install --focus`

#### Smart contracts

Running tests on all apps can be done by running `yarn test` at the root directory (note that this can take a significant amount of time!).

Running tests of an individual app can be done by running `yarn test` inside an individual app's directory, or through the selective `yarn test:<app>` scripts.

By default, tests are run on an in-memory instance of testrpc.

#### Frontends

Each app's frontend is encapsulated inside of that app's own `app/` directory.

To work on frontend, you'll need to go into `app/` directory and do another `yarn` installation. For more instructions, you can follow the ["Frontend Setup" guide in the Aragon client](https://github.com/aragon/aragon/blob/master/docs/FRONTEND_SETUP.md). Note that the app itself doesn't need to be bootstrapped if you'd just like to install the frontend.

For example:

```sh
# Starting at this project's root
# Go to the Voting app's directory
cd apps/voting

# Go to the Voting app's frontend directory
cd app/

# Install and start
yarn
yarn start
```

## Contributing

For some introductory information on what an Aragon app is, and how to build one, please read through the [Aragon stack introduction](https://hack.aragon.org/docs/stack) and [Your first Aragon app](https://hack.aragon.org/docs/tutorial). To build Aragon client-compatible apps, the [aragonAPI documentation](https://hack.aragon.org/docs/api-intro) is also available as a reference.

#### 👋 Get started contributing with a [good first issue](https://github.com/aragon/aragon-apps/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).

Don't be shy to contribute even the smallest tweak. 🐲 There are still some dragons to be aware of, but we'll be here to help you get started!

For more details about contributing to Aragon, please check the [contributing guide](./CONTRIBUTING.md).

#### Issues

If you come across an issue with Aragon, do a search in the [Issues](https://github.com/aragon/aragon-apps/issues?utf8=%E2%9C%93&q=is%3Aissue) tab of this repo and the [Aragon client's issues](https://github.com/aragon/client/issues?utf8=%E2%9C%93&q=is%3Aissue) to make sure it hasn't been reported before. Follow these steps to help us prevent duplicate issues and unnecessary notifications going to the many people watching this repo:

- If the issue you found has been reported and is still open, and the details match your issue, give a "thumbs up" to the relevant posts in the issue thread to signal that you have the same issue. No further action is required on your part.
- If the issue you found has been reported and is still open, but the issue is missing some details, you can add a comment to the issue thread describing the additional details.
- If the issue you found has been reported but has been closed, you can comment on the closed issue thread and ask to have the issue reopened because you are still experiencing the issue. Alternatively, you can open a new issue, reference the closed issue by number or link, and state that you are still experiencing the issue. Provide any additional details in your post so we can better understand the issue and how to fix it.

## Help

For help and support, feel free to contact us at any time on our [Discord](https://discord.com/invite/eqQJkdp).
