# Aragon Apps <img align="right" src="https://raw.githubusercontent.com/aragon/issues/master/logo.png" height="80px" /> [![Travis branch](https://img.shields.io/travis/aragon/aragon-apps/master.svg?style=for-the-badge)](https://travis-ci.org/aragon/aragon-apps) [![Coveralls branch](https://img.shields.io/coveralls/aragon/aragon-apps/master.svg?style=for-the-badge)](https://coveralls.io/github/aragon/aragon-apps)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Faragon%2Faragon-apps.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Faragon%2Faragon-apps?ref=badge_shield)
## Apps

This repository contains the following apps:

- **[Vault](apps/vault)**: Securely owns and manages tokens on behalf of a DAO.
- **[Finance](apps/finance)**: Send payments and manage expenses with budgeting.
- **[Voting](apps/voting)**: Create votes that execute actions on behalf of token holders.
- **[Token Manager](apps/token-manager)**: Manages organization tokens.

You can read more about the individual apps in [their specifications](https://wiki.aragon.one/dev/apps/) on the Aragon Wiki.

## Coming soon apps

The following apps are still under development, not ready for production deployment yet:

- **[Payroll](future-apps/payroll)**: Manages employees' payrolls.
- **[Fundraising](future-apps/fundraising)**: Manages fundraising campaings.

## Developing

```
npm install
```

This installs global package dependencies and also bootstraps lerna packages.

Running tests on all apps can be done running `npm run test` at the root directory. Running tests of an individual app can be done by running `npm run test` inside the app directory.

By default tests are run in a in-memory instance of testrpc.


## License
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Faragon%2Faragon-apps.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Faragon%2Faragon-apps?ref=badge_large)