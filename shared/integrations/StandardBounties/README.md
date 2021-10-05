# StandardBounties
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/bounties-network/Lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)
[ ![Codeship Status for ConsenSys/StandardBounties](https://app.codeship.com/projects/1e2726c0-ac83-0135-5579-52b4614bface/status?branch=master)](https://app.codeship.com/projects/257018)

`Version 2.0`

To read about `Version 1.0`, please see [the documentation](./docs/documentation_v1.md).

A generalized set of contracts to issue bounties for any task, paying in any ERC20, ERC721, or ETH tokens.

1. [Rationale](#1-rationale)
2. [Implementation](#2-implementation)
3. [Development](#3-development)
4. [Documentation](#4-documentation)

## 1. Rationale

Bounties are the simplest form of an incentive mechanism: giving people tokens for completing a task. The Ethereum blockchain provides a number of benefits to support these incentive mechanisms:
- The ability to inexpensively transact with individuals from across the world
- The ability to lock up funds in an escrow contract (a bounty) which disburses funds when a proof of task completion or deliverable is accepted
- The ability to host these bounties in an open and interoperable manner, so that many different types of applications can be used to create, explore, and complete bounties from a shared liquidity pool (that no one controls)
In this way, StandardBounties enables teams to create bounties through one application (like their DAO), and instantly have the bounty be listed on several bounty marketplaces at once, maximizing the bounty's reach and making the markets more efficient.


## 2. Implementation
There are several key types of users within a bounty:
- `Bounty Issuers` are a list of addresses who have the power to drain the bounty and edit the details associated with the bounty.
- `Bounty Approvers` are a list of addresses who have the power to accept submissions which are made to the bounty. (*Note: Issuers are not assumed to also be approvers, but may add themselves as such if desired*)
- `Bounty Contributors` are any address which has made a contribution to a given bounty
- `Bounty Fulfillers` are any addresses which are included as contributors to any submission made to a given bounty
- `Bounty Submitters` are any addresses which submit fulfillments, either on their own behalf or for other people

Together, these actors coordinate to deploy capital and shape human behavior with the power of incentives.

There are several core actions in the lifecycle of a bounty, which can be performed by certain users:
- *Anyone* may `issue` a bounty, specifying the details of the bounty and anchoring the associated IPFS hash on-chain within the StandardBounties smart contract
- *Anyone* may `contribute` to a bounty, specifying the amount of tokens they'd like to add to the port.
- *Anyone* may `fulfill` a bounty, submitting a list of contributors and an IPFS hash of the details and deliverables.
- *Any of the Bounty's Approvers* may `accept` a fulfillment, submitting the amount of tokens they'd like each contributor to receive.

These actions make up the core life cycle of a bounty, supporting funds flowing into various bounties, and subsequently flowing out as tasks are completed.

There are several additional actions which various users may perform:
- *Any Contributor* may refund their contributions to a bounty, so long as the deadline of the bounty has elapsed and no submissions were accepted.
- *Any Issuer* may refund the contributions of other users if they wish (even if the deadline hasn't elapsed or the bounty has paid out a subset of funds)
- *Any Issuer* may drain the bounty of a subset of the funds in the bounty
- *Anyone* may perform a generalized `action`, submitting the IPFS hash which stores the details of their action (ie commenting, submitting their intention to complete the bounty, etc)
- *Any Submitter* can update their submission, making changes to the submission data or the list of Contributors
- *Any Approver* may simultaneously submit an off-chain fulfillment and accept it, immutably recording the exchange while saving the need to preemptively submit the fulfillments on-chain
- *Any Issuer* may change any of the details of the bounty, *except for the token contract associated with the bounty which may not be changed*.

Alongside the ability to perform any of these actions natively within the StandardBounties contract, we've also deployed a MetaTransactionRelayer contract which decodes signed messages for users and performs actions on their behalf, so that they aren't required to pay gas fees.

## 3. Development

Any application can take advantage of the Bounties Network registry, which is currently deployed on both the Main Ethereum Network and the Rinkeby Testnet.

- On Mainnet, the StandardBounties contract is deployed at `0xe7f69ea2a79521136ee0bf3c50f6b5f1ea0ab0cd`, and the BountiesMetaTxRelayer is deployed at `0x4e51315da4bb947420d8ca3cf2a59ca92ccaa2ad`

- On Rinkeby, the StandardBounties contract is deployed at `0xa53aadb09bd0612ee810ab8b4605c9ee45892169`, and the BountiesMetaTxRelayer is deployed at `0x2b75c32cb715eb2fc559595a4501720ad100e2d9`

## 4. Documentation

For thorough documentation of all functionality, see [the documentation](./docs/documentation_v2.md)
