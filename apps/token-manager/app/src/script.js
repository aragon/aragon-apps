import Aragon from '@aragon/api'
import tokenSettings from './token-settings'
import { addressesEqual } from './web3-utils'
import tokenAbi from './abi/minimeToken.json'

const app = new Aragon()

/*
 * Calls `callback` exponentially, everytime `retry()` is called.
 *
 * Usage:
 *
 * retryEvery(retry => {
 *  // do something
 *
 *  if (condition) {
 *    // retry in 1, 2, 4, 8 seconds… as long as the condition passes.
 *    retry()
 *  }
 * }, 1000, 2)
 *
 */
const retryEvery = (callback, initialRetryTimer = 1000, increaseFactor = 5) => {
  const attempt = (retryTimer = initialRetryTimer) => {
    // eslint-disable-next-line standard/no-callback-literal
    callback(() => {
      console.error(`Retrying in ${retryTimer / 1000}s...`)

      // Exponentially backoff attempts
      setTimeout(() => attempt(retryTimer * increaseFactor), retryTimer)
    })
  }
  attempt()
}

// Get the token address to initialize ourselves
retryEvery(retry => {
  app.call('token').subscribe(initialize, err => {
    console.error(
      'Could not start background script execution due to the contract not loading the token:',
      err
    )
    retry()
  })
})

async function initialize(tokenAddress) {
  const token = app.external(tokenAddress, tokenAbi)

  return app.store(
    async (state, { address, event, returnValues }) => {
      let nextState = {
        ...state,
      }

      if (addressesEqual(address, tokenAddress)) {
        switch (event) {
          case 'ClaimedTokens':
            if (addressesEqual(returnValues._token, tokenAddress)) {
              return claimedTokens(token, nextState, returnValues)
            }
            return nextState
          case 'Transfer':
            return transfer(token, nextState, returnValues)
          default:
            return nextState
        }
      }
      // TODO: add handlers for the vesting events from token Manager

      return nextState
    },
    {
      externals: [token],
      init: initState({ token, tokenAddress }),
    }
  )
}

const initState = ({ token, tokenAddress }) => async () => {
  try {
    const tokenSymbol = await token.symbol().toPromise()
    app.identify(tokenSymbol)
  } catch (err) {
    console.error(
      `Failed to load token symbol for token at ${tokenAddress} due to:`,
      err
    )
  }
  const fetchedTokenSettings = await loadTokenSettings(token)
  const maxAccountTokens = await app.call('maxAccountTokens').toPromise()

  const inititalState = {
    tokenAddress,
    maxAccountTokens,
    ...fetchedTokenSettings,
  }

  return inititalState
}

/***********************
 *                     *
 *   Event Handlers    *
 *                     *
 ***********************/

async function claimedTokens(token, state, { _token, _controller }) {
  const changes = await loadNewBalances(token, _token, _controller)
  return updateState(state, changes)
}

async function transfer(token, state, { _from, _to }) {
  const changes = await loadNewBalances(token, _from, _to)
  // The transfer may have increased the token's total supply, so let's refresh it
  const tokenSupply = await token.totalSupply().toPromise()
  return updateState(
    {
      ...state,
      tokenSupply,
    },
    changes
  )
}

/***********************
 *                     *
 *       Helpers       *
 *                     *
 ***********************/

function updateState(state, changes) {
  const { holders = [] } = state
  return {
    ...state,
    holders: changes
      .reduce(updateHolders, holders)
      // Filter out any addresses that now have no balance
      .filter(({ balance }) => balance > 0),
  }
}

function updateHolders(holders, changed) {
  const holderIndex = holders.findIndex(holder =>
    addressesEqual(holder.address, changed.address)
  )

  if (holderIndex === -1) {
    // If we can't find it, concat
    return holders.concat(changed)
  } else {
    const nextHolders = Array.from(holders)
    nextHolders[holderIndex] = changed
    return nextHolders
  }
}

function loadNewBalances(token, ...addresses) {
  return Promise.all(
    addresses.map(address =>
      token
        .balanceOf(address)
        .toPromise()
        .then(balance => ({ address, balance }))
    )
  ).catch(err => {
    console.error(
      `Failed to load new balances for ${addresses.join(', ')} due to:`,
      err
    )
    // Return an empty object to avoid changing any state
    // TODO: ideally, this would actually cause the UI to show "unknown" for the address
    return {}
  })
}

function loadTokenSettings(token) {
  return Promise.all(
    tokenSettings.map(([name, key]) =>
      token[name]()
        .toPromise()
        .then(value => ({ [key]: value }))
    )
  )
    .then(settings =>
      settings.reduce((acc, setting) => ({ ...acc, ...setting }), {})
    )
    .catch(err => {
      console.error("Failed to load token's settings", err)
      // Return an empty object to try again later
      return {}
    })
}
