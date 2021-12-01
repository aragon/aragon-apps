<br />

## What is the Redemptions app?

Redemptions is an Aragon app that enables users to redeem an organization's native token for a percentage of the tokens in that organization's vault.

Example:

- your organization has 5 members
- you create a DAO to manage your governance and finances
- your DAO has 1 ETH, 1000 DAI, and 300 ANT in the [Vault](https://wiki.aragon.org/dev/apps/vault/)
- you then mint 1000 EXAMPLE tokens using the [Token Manger](https://wiki.aragon.org/dev/apps/token-manager/)
- each organization member is given 100 EXAMPLE tokens, and the rest are staked to open bounties via the [Projects App](https://www.autark.xyz/apps)
- you then add the Redemptions app to your DAO, making EXAMPLE tokens redeemable for the organization's underlying assets (tokens in the Vault)
- if any member of the community disagrees with a governance decision or wants to leave, they can now "rage quit" and withdraw their portion of the organization
- by staking EXAMPLE tokens to open Issues on the Projects App, people who contribute value to the org will be rewarded with a say in governance decisions and/or a percentage of the organization's value

<br />

## Using Redemptions

The redemptions app allows organizations to add and remove tokens from a list of eligible tokens. When a user chooses to redeem tokens they will receive a proportional share of all eligible tokens in the `Vault`.

The tokens you can add to the Redemptions app are dependent on the blockchain you're on. If you're on the Ethereum mainnet you can add ETH or any erc-20 token contract. If you're on a local testnet you can add any token contracts that have been deployed locally.
Who/what is allowed to control the Redemptions app is determined by the DAO's permissions. You can check the permissions for your DAO in the `Permissions` tab of the Aragon client. Every app currently installed should be listed. Click on an app to view it's permissions.

- Note: the section you're looking for is "Permissions set on this app", not the permissions available or permissions granted. The "Permissions set on this app" section will tell you who/what can do stuff with the app currently.

<p align="center">
    <img src="./resources/permissions.gif" width="600" />
</p>

### Adding tokens:

The default recommendation is for the Voting app to control adding and removing tokens from the Redemptions app. This way your community can collectively manage the state of Redemptions. Adding tokens to Redemptions via the voting app requires two steps:

- creating a vote to add the token to the Redemptions app
- approving the vote to add the token to the Redemptions app

<p align="center">
    <img src="./resources/add-token.gif" width="600" />
</p>

### Removing tokens:

To remove a token from the Redemptions app UI, open the Redemptions app in your DAO. Then hover your cursor over the token symbol you would like to remove. You should see the name and amount of the token turn red and display the word "Remove." If you have the Voting app configured to manage token removals (and we recommend this), clicking "Remove" will create a vote to remove the token from Redemptions app UI. Your community will then need to approve this change for it to pass.

- Note: Redemptions app is NOT the Vault. More details on the Aragon Vault app can be found [here](ttps://wiki.aragon.org/dev/apps/vault/). TL;DR: The vault holds the tokens. If you remove a token from the Redemptions app UI with the process above, you will not remove tokens from the Vault. At any time you can add the token contract back to the Redemptions app to display that tokens balance. This feature is to prevent tokens with very small balances from polluting the Redemptions token list.

<p align="center">
    <img src="./resources/remove-token.gif" width="600" />
</p>

### Redeeming tokens:

To redeem tokens, click on the "Redeem" button, then use the slider to select how many tokens you would like to redeem. When satisfied with the amount, click redeem to confirm. You will be prompted to sign two messages: one to confirm the transaction and one to send that transaction to the network to be processed.

<p align="center">
    <img src="./resources/redeem-tokens.gif" width="600" />
</p>

<br />
