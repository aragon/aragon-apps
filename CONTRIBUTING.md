# Contributing to Aragon

:tada: Thank you for being interested in contributing to Aragon! :tada:

Feel welcome and read the following sections in order to know how to ask questions and how to work on something.

There are many ways to contribute, from writing tutorials or blog posts, improving the documentation, submitting bug reports and feature requests or writing code which can be incorporated into the project.

All members of our community are expected to follow our [Code of Conduct](https://wiki.aragon.org/documentation/Code_of_Conduct/). Please make sure you are welcoming and friendly in all of our spaces.

## Your first contribution

Unsure where to begin contributing to Aragon?

You can start with a [Good First Issue](https://github.com/aragon/aragon-apps/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).

> Good first issues are usually for small features, additional tests, spelling / grammar fixes, formatting changes, or other clean up.

Start small, pick a subject you care about, are familiar with, or want to learn.

If you're not already familiar with git or Github, here are a couple of friendly tutorials: [First Contributions](https://github.com/firstcontributions/first-contributions), [Open Source Guide](https://opensource.guide/), and [How to Contribute to an Open Source Project on GitHub](https://egghead.io/series/how-to-contribute-to-an-open-source-project-on-github).

## How to file an issue or report a bug

If you see a problem, you can report it in our [issue tracker](https://github.com/aragon/aragon-apps/issues) (or the [Aragon client's](https://github.com/aragon/aragon/issues)).

Please take a quick look to see if the issue doesn't already exist before filing yours.

Do your best to include as many details as needed in order for someone else to fix the problem and resolve the issue.

#### If you find a security vulnerability, do NOT open an issue. Email security@aragon.org instead.

In order to determine whether you are dealing with a security issue, ask yourself these two questions:

- Can I access or steal something that's not mine, or access something I shouldn't have access to?
- Can I disable something for other people?

If the answer to either of those two questions are "yes", then you're probably dealing with a security issue. Note that even if you answer "no" to both questions, you may still be dealing with a security issue, so if you're unsure, please send a email.

#### If you're interested in the smart contracts underlying Aragon, a [bug bounty program](https://wiki.aragon.org/dev/bug_bounty/) with payouts up to $50,000 is available for rewarding contributors who find security vulnerabilities.

## Fixing issues

1. [Find an issue](https://github.com/aragon/aragon-apps/issues) that you are interested in.
    - You may want to ask on the issue or in our Spectrum [App development channel](https://spectrum.chat/aragon/app-development) if anyone has already started working on the issue.
1. Fork and clone a local copy of the repository.
1. Make the appropriate changes for the issue you are trying to address or the feature that you want to add.
1. Push the changes to the remote repository.
1. Submit a pull request in Github, explaining any changes and further questions you may have.
1. Wait for the pull request to be reviewed.
1. Make changes to the pull request if the maintainer recommends them.
1. Celebrate your success after your pull request is merged!

It's OK if your pull request is not perfect (no pull request is).
The reviewer will be able to help you fix any problems and improve it!

You can also edit a page directly through your browser by clicking the "EDIT" link in the top-right corner of any page and then clicking the pencil icon in the github copy of the page.

### Tips and Tricks

Windows users may need to install the [windows-build-tools](https://www.npmjs.com/package/windows-build-tools) before installing this project's dependencies.

#### App frontends

Developing the frontends locally can be a bit tricky, due to the frontends' reliance on a properly configured Aragon client.

For now, you can follow [`@bpierre's` gist](https://gist.github.com/bpierre/22572415b90577aa17e5953fa68980eb#developing-the-apps) to start an app's local frontend server and connect it to a locally running Aragon client.

In the future, we will improve this flow to make it much easier to get started.

### Styleguide and development processes

For the frontends, we use [prettier](https://prettier.io/) and [eslint](https://eslint.org/) to automatically lint and format the project.

For the contracts, we use [eth-lint](https://github.com/duaraghav8/Ethlint) to automatically lint the project.

Handy npm scripts (usually `npm run lint`) are provided at all levels to help automate these checks.

We generally avoid adding external dependencies if they can be ported over easily, due to numerous NPM-related security issues in the past (e.g. [`event-stream`](https://blog.npmjs.org/post/180565383195/details-about-the-event-stream-incident)).

### Git branch convention

Due to the unconventional release process of smart contracts, this repo utilizes a slightly different flow of git.

The main problem is that smart contracts should be heavily scrutinized before a release, making the process cumbersome and unlike the release process for "normal" dependencies or apps. [See here](https://forum.aragon.org/t/git-branch-convention-for-aragon-repos/298/3) for a more detailed explanation.

Thus, we use the following convention:

- Any change that can be release immediately, base on [`master`](https://github.com/aragon/aragon-apps/tree/master)
- Any change that should be staged for longer review (e.g. contract functionality changes pending security review), base on [`next`](https://github.com/aragon/aragon-apps/tree/next)

As `next` becomes ready, merge `next` onto `master` with a rebase.

## Community

If you need help, please reach out to Aragon core contributors and community members in our Spectrum [App development channel](https://spectrum.chat/aragon/app-development).  We'd love to hear from you and know what you're working on!
