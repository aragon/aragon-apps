# Aragon Core Apps

[![Travis](https://img.shields.io/travis/aragon/aragon-apps.svg?style=flat-square)](https://travis-ci.org/aragon/aragon-apps)
[![Coveralls](https://img.shields.io/coveralls/aragon/aragon-apps.svg?style=flat-square)](https://coveralls.io/github/aragon/aragon-apps)

This [monorepo](https://github.com/babel/babel/blob/master/doc/design/monorepo.md) contains the core applications that are bundled with Aragon by default.

## Apps

This repository contains the following apps:

- **[Vault](apps/vault)**: Securely owns and manages tokens on behalf of a DAO.
- **[Finance](apps/finance)**: Send payments and manage expenses with budgeting.
- **[Fundraising](apps/fundraising)**: Create token sales.
- **[Group](apps/group)**: Give a set of entities a shared entity that has its own permissions.
- **[Voting](apps/voting)**: Create votes that execute actions on behalf of token holders.
- **[Token Manager](apps/token-manager)**: Manages organization tokens.

You can read more about the individual apps in [their specifications](https://wiki.aragon.one/dev/apps/) on the Aragon Wiki.

## Developing

```
npm install
npm run bootstrap
```

This installs global package dependencies and also bootstraps lerna packages. 

Running tests on all apps can be done running `npm run test` at the root directory. Running tests of an individual app can be done by running `npm run test` inside the app directory. 

By default tests are run in a in-memory instance of testrpc.
