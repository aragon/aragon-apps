# Tokens template

Used for creating test tokens in test networks.

A Factory can mint unlimited tokens of any of its created tokens.

Results of a deployment are manually saved in `index.js`, which allows the
following:

## Getting test tokens

```
const testTokens = require('@aragon/templates-tokens')
const network = 'rinkeby'

const promisedTickers = testTokens[network].tokens.map(addr => (
    Token.at(addr).symbol.call() // or however the contract is instantiated
))

const tickers = Promise.all(promisedTickers)

```

## Minting tokens

```
const testTokens = require('@aragon/templates-tokens')
const network = 'rinkeby'

factory = TokenFactory.at(testTokens[rinkeby]) // or however the contract is instantiated
await factory.mint(testTokens[network].tokens[0], recipient, 100000)
```

Example mint [tx in rinkeby](https://rinkeby.etherscan.io/tx/0xfc285a827d99bedc46b589843b424dde61bcb40ef3d5991f49e652cc92f958f7)
