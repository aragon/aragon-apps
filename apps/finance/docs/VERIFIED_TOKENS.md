# Verified tokens

The Finance app's frontend currently keeps a list of verified tokens for the Ethereum network that
is used to filter which tokens are shown to be "verified" with converted amounts, etc.

This is a stop-gap measure for now, and will eventually be replaced with [`use-token`](https://github.com/aragon/use-token),
pulling from more dynamic registries (databases, on-chain TCRs, etc).

## Updating this list

We manually update this list every so often, replicating the process MyCrypto uses to generate their
app's verified tokens.

To do so, first run:

```sh
# Go to Finance's frontend directory
cd app/

# Run the sync script
npx parse-eth-tokens --networks eth --output tokens --exclude 0x5a276Aeb77bCfDAc8Ac6f31BBC7416AE1A85eEF2,0x0027449Bf0887ca3E431D263FFDeFb244D95b555

# Now enter a node shell
node
```

In the node shell, run:

```js
const tokens = require('./tokens/eth.json')
tokens.forEach(token => console.log(`['${token.symbol}', '${token.address.toLowerCase()}'],`))
```

Copy the output to `src/lib/verified-tokens.js` and away you go!
