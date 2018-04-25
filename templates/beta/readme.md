# Aragon 0.5 beta templates

## Description

In both templates, a Voting app is created that has power over all important
functionality in the organization.

The difference between them is how the Voting app is configured and the token
distribution.

## Install local environment

- Install [Docker CE](https://docs.docker.com/install/)
- `cd templates/beta && npm run docker:run`
- Outputted ENS address has to be provided to the client
- That's really it 🦅🚀

## Usage

Both templates require 2 transactions to completely set up an organization.
One to create the token (which is cached in the template) and one to create the
organization and finish the setup.

- Both transactions have to be done by the same sender (cache reasons).
- Thanks to account nonces, we can prompt the user to sign and broadcast both
transactions without requiring the user to wait for the first one to be mined,
and we can be sure that they will be mined in order.
Metamask will probably tell the user the second transaction will fail, but that's
because they don't know better (they don't calculate the state as if the first
transaction was already mined).
- Addresses for deployed templates can be found in `index.js`.

### 1. Token creation

- `demTemp.newToken(name, symbol)`
- `msTemp.newToken(name)`

On success it will emit a `DeployToken(token, cacheOwner)` event.

### 2. Organization creation

- On success it will emit a `DeployInstance(dao, token)` event.
- Requires `cacheOwner` to send this transaction too.

#### Democracy Template

```
demTemp.newInstance(name, holders, stakes, supportNeeded, minAcceptanceQuorum, voteDuration)
```

- `name`: Name for org, will assign `[name].aragonid.eth` (check capitalization).
- `holders`: Array of token holder addresses.
- `stakes`: Array of token stakes for holders (token has 18 decimals, multiply token amount `* 10^18`)
- `supportNeeded, minAcceptanceQuorum, voteDuration`: Check [Voting app spec]
(https://wiki.aragon.one/dev/apps/voting/).


#### Multisig Template

```
msTemp.newInstance(name, signers, neededSignatures)
```

- `name`: Name for org, will assign `[name].aragonid.eth` (check capitalization).
- `signers`: Array of addresses that are the multisig signatoires
(they will be issued 1 token).
- `neededSignatures`: Number of signers that need to sign to execute an action
(parametrized Voting app under the hood).

## ENS, APM and aragonID

Our fake ENS instance that we use across the entire system can also be found in
`index.js`.

Using it as the ENS registry, we can find everything else by using ENS.

- `APM` -> `ens.addr('aragonpm.eth')`
- `AragonID` -> `ens.owner('aragonid.eth')` (notice it is owner and not addr)

## aragonID

After fetching AragonID's from the ENS, registering a name for an address can be done:

```
aragonID.register(keccak256(name), addr)
```

Note that if the name already exists, the transaction will revert (see gotchas).

## APM

The deployed APM Registry has a pretty tight governance mechanism which only allows
certain individuals (Aragon core team) to create new repos and different repos
are managed by different team members.

Templates will deploy the last version of the apps according to their APM repos,
this will allow us to update the apps without the need to update templates.

For our Rinkeby deployment we are using a custom ENS deployment. This is fairly
trustful as an account we control is the ENS root.

```
ENS: 0xaa0ccb537289d226941745c4dd7a819a750897d0
APM: 0x8da0fe11ece85f48723d45c3d6767db9bd4f0b29
```

Repos can be found by resolving the repo appId in ENS (e.g. `ens.resolve('voting.aragonpm.eth')`).
New versions have to be submitted directly to the repo address. If you don't
have permission to do so, please ask the permission manager (aka Jorge).

## Gotchas

- Because of aragonID registration, trying to create an organization with the
name of an existing one will fail. For the client, an easy way to check is
whether `[name].aragonid.eth` owner's is `0x00...00`

## Gas costs

As of Feb 14th (❤️) the costs of deploying a fully working organization are:

- `template.newToken(...)`: ~2.4m gas
- `template.newInstance(...)`: ~6.08m gas

Which total in 106% of a mainnet block worth of gas, making deploying an Aragon org
cheaper than $100 at given current gas and ETH prices.

## Deploying templates

After deploying ENS, APM and AragonID. Change `index.js` ENS address for the
deployment network.

Then just:

```
npm run deploy:rinkeby
```
