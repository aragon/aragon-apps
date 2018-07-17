# Aragon Apps <img align="right" src="https://raw.githubusercontent.com/aragon/issues/master/logo.png" height="80px" /> [![Travis branch](https://img.shields.io/travis/aragon/aragon-apps/master.svg?style=for-the-badge)](https://travis-ci.org/aragon/aragon-apps) [![Coveralls branch](https://img.shields.io/coveralls/aragon/aragon-apps/master.svg?style=for-the-badge)](https://coveralls.io/github/aragon/aragon-apps)
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

## Issues

If you come across an issue with one of the apps in this repo, do a search in the [Issues](https://github.com/aragon/aragon-apps/issues?utf8=%E2%9C%93&q=is%3Aissue) tab of this repo to make sure it hasn't been reported before. Follow these steps to help us prevent duplicate issues and unnecessary notifications going to the many people watching this repo:

- If the issue you found has been reported and is still open, and the details match your issue, give a "thumbs up" to the relevant posts in the issue thread to signal that you have the same issue. No further action is required on your part.
- If the issue you found has been reported and is still open, but the issue is missing some details, you can add a comment to the issue thread describing the additional details. 
- If the issue you found has been reported but has been closed, you can comment on the closed issue thread and ask to have the issue reopened because you are still experiencing the issue. Alternatively, you can open a new issue, reference the closed issue by number or link, and state that you are still experiencing the issue. Provide any additional details in your post so we can better understand the issue and how to fix it.
