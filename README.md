# Aragon Apps <img align="right" src="https://raw.githubusercontent.com/aragon/design/master/readme-logo.png" height="80px" /> [![Travis branch](https://img.shields.io/travis/aragon/aragon-apps/master.svg?style=for-the-badge)](https://travis-ci.com/aragon/aragon-apps) [![Coveralls branch](https://img.shields.io/coveralls/aragon/aragon-apps/master.svg?style=for-the-badge)](https://coveralls.io/github/aragon/aragon-apps)

## Apps

This repository contains the following apps:

- **[Finance](apps/finance)**: Send payments and manage expenses with budgeting.
- **[Survey](apps/survey)**: Create polls to gauge community opinions.
- **[Tokens](apps/token-manager)**: Manages organization tokens.
- **[Vault](apps/vault)**: Securely owns and manages tokens on behalf of a DAO.
- **[Voting](apps/voting)**: Create votes that execute actions on behalf of token holders.

Each of the individual apps come with a frontend that is intended to be installed and used through the [Aragon client](http://github.com/aragon/aragon).

You can read more about how each of the individual apps work in the [Aragon user guide](https://help.aragon.org/category/15-aragon-apps).

## Coming soon apps

The following apps are still under development, and not ready for production deployment yet:

- **[Payroll](future-apps/payroll)**: Manages employees' payrolls.

## Quick start

```
npm install
```

This installs global package dependencies and also bootstraps the entire monorepo through [`lerna`](https://github.com/lerna/lerna).

> **Note**: the monorepo is set up in such a way that you **must** install it through a `lerna bootstrap` (done automatically after an `npm install`).
>
> If you're only interested in the contract dependencies, and not the frontends, you can use `INSTALL_FRONTEND=false npm install` instead.
>
> If you're only interested in bootstrapping one package, you can use `npx lerna bootstrap --scope @aragon/<package> --include-filtered-dependencies`

Running tests on all apps can be done by running `npm run test` at the root directory (note that running all of the tests can take a significant amount of time!).

Running tests of an individual app can be done by running `npm run test` inside an individual app's directory, or through the selective `npm run test:<app>` scripts.

By default, tests are run on an in-memory instance of testrpc.

## Contributing

For some introductory information on what an Aragon app is, and how to build one, please read through the [Aragon stack introduction](https://hack.aragon.org/docs/stack) and [Your first Aragon app](https://hack.aragon.org/docs/tutorial). The [aragonAPI documentation](https://hack.aragon.org/docs/api-intro) is also available as a reference.

#### 👋 Get started contributing with a [good first issue](https://github.com/aragon/aragon-apps/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).

Don't be shy to contribute even the smallest tweak. 🐲 There are still some dragons to be aware of, but we'll be here to help you get started!

For more details about contributing to Aragon, please check the [contributing guide](./CONTRIBUTING.md).

#### Issues

If you come across an issue with Aragon, do a search in the [Issues](https://github.com/aragon/aragon-apps/issues?utf8=%E2%9C%93&q=is%3Aissue) tab of this repo and the [Aragon client's issues](https://github.com/aragon/aragon/issues?utf8=%E2%9C%93&q=is%3Aissue) to make sure it hasn't been reported before. Follow these steps to help us prevent duplicate issues and unnecessary notifications going to the many people watching this repo:

- If the issue you found has been reported and is still open, and the details match your issue, give a "thumbs up" to the relevant posts in the issue thread to signal that you have the same issue. No further action is required on your part.
- If the issue you found has been reported and is still open, but the issue is missing some details, you can add a comment to the issue thread describing the additional details.
- If the issue you found has been reported but has been closed, you can comment on the closed issue thread and ask to have the issue reopened because you are still experiencing the issue. Alternatively, you can open a new issue, reference the closed issue by number or link, and state that you are still experiencing the issue. Provide any additional details in your post so we can better understand the issue and how to fix it.
