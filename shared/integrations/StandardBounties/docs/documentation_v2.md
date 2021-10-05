# StandardBounties Complete Documentation

`Version 1.0.0`

## Actors
There are several key types of users within a bounty:
- `Bounty Issuers` are a list of addresses who have the power to drain the bounty and edit the details associated with the bounty.
- `Bounty Approvers` are a list of addresses who have the power to accept submissions which are made to the bounty. (*Note: Issuers are not assumed to also be approvers, but may add themselves as such if desired*)
- `Bounty Contributors` are any address which has made a contribution to a given bounty
- `Bounty Fulfillers` are any addresses which are included as contributors to any submission made to a given bounty
- `Bounty Submitters` are any addresses which submit fulfillments, either on their own behalf or for other people

Together, these actors coordinate to deploy capital and shape human behavior with the power of incentives.

## Actions They Can Perform
There are several core actions in the lifecycle of a bounty, which can be performed by certain users:
- **Anyone** may `issue` a bounty, specifying the details of the bounty and anchoring the associated IPFS hash on-chain within the StandardBounties smart contract
- **Anyone** may `contribute` to a bounty, specifying the amount of tokens they'd like to add to the port.
- **Anyone** may `fulfill` a bounty, submitting a list of contributors and an IPFS hash of the details and deliverables.
- **Any of the Bounty's Approvers** may `accept` a fulfillment, submitting the amount of tokens they'd like each contributor to receive.

These actions make up the core life cycle of a bounty, supporting funds flowing into various bounties, and subsequently flowing out as tasks are completed.

There are several additional actions which various users may perform:
- **Any Contributor** may refund their contributions to a bounty, so long as the deadline of the bounty has elapsed and no submissions were accepted.
- **Any Issuer** may refund the contributions of other users if they wish (even if the deadline hasn't elapsed or the bounty has paid out a subset of funds)
- **Any Issuer** may drain the bounty of a subset of the funds in the bounty
- **Anyone** may perform a generalized `action`, submitting the IPFS hash which stores the details of their action (ie commenting, submitting their intention to complete the bounty, etc)
- **Any Submitter** can update their submission, making changes to the submission data or the list of Contributors
- **Any Approver** may simultaneously submit an off-chain fulfillment and accept it, immutably recording the exchange while saving the need to preemptively submit the fulfillments on-chain
- **Any Issuer** may change any of the details of the bounty, **except for the token contract associated with the bounty which may not be changed**.

## Tokens
Each bounty is associated with only one token, whether that's ETH, an ERC20 token, or an ERC721 token. This is specified when the bounty is issued, submitting either 0, 20, or 721 as the `tokenVersion` for those tokens, respectively. The token associated with a bounty may not be changed once it is initialized.

When contributing funds to a bounty:
- if the bounty pays in ETH, the `msg.value` associated with the call of the `contribute` function should equal the amount of Wei that's specified as the contribution amount
- if the bounty pays in an ERC20 or ERC721 token, the user must first call the token's `approve` function submitting the address of the StandardBounties contract, so that the contract may pull in the tokens and include them within the balance of the bounty when the `contribute` call is made

**Please note that you may not contribute 0 tokens to a bounty, nor may you contribute an ERC721 token whose ID is 0**.

## General Details

When making any function call within the StandardBounties contract, the first parameter is always the `_sender`, which should always be the same as the `msg.sender` (who initiates the transaction call).

Instead of having users pay for the gas, applications may wish to employ Meta Transactions to perform the actions associated with the bounty, whereby they can have users sign messages which are decoded by the `BountiesMetaTxRelayer` contract, so the transactions may be submitted by anyone willing to pay for the gas.

## Data Schema

StandardBounties makes heavy use of IPFS to store as much data off-chain as possible. In this way, IPFS hashes are the on-chain anchors which immutably record the existence of the data, without having to pay large gas costs for storing all of the data on-chain.

The JSON objects which store the data associated with  `bounties`, `fulfillments`, and `actions` should adhere to the schemas we describe in the [Schema Documentation](./standardSchemas.md).

## Contract Details

Any application can take advantage of the Bounties Network registry, which is currently deployed on both the Main Ethereum Network and the Rinkeby Testnet.

- On Mainnet, the StandardBounties contract is deployed at `0xe7f69ea2a79521136ee0bf3c50f6b5f1ea0ab0cd`, and the BountiesMetaTxRelayer is deployed at `0x4e51315da4bb947420d8ca3cf2a59ca92ccaa2ad`

- On Rinkeby, the StandardBounties contract is deployed at `0xa53aadb09bd0612ee810ab8b4605c9ee45892169`, and the BountiesMetaTxRelayer is deployed at `0x2b75c32cb715eb2fc559595a4501720ad100e2d9`
