import Aragon from '@aragon/client'
import tokenSettings, { hasLoadedTokenSettings } from './token-settings'
import { addressesEqual } from './web3-utils'
import tokenAbi from './abi/minimeToken.json'

const app = new Aragon()

// Get the token address to initialize ourselves
app
  .call('token')
  .first()
  .subscribe(initialize)

async function initialize(tokenAddr) {
  const token = app.external(tokenAddr, tokenAbi)
  try {
    const tokenSymbol = await loadTokenSymbol(token)
    app.identify(tokenSymbol)
  } catch (err) {
    console.error(
      `Failed to load token symbol for token at ${tokenAddr} due to:`,
      err
    )
  }

  return createStore(token, tokenAddr)
}

// Hook up the script as an aragon.js store
async function createStore(token, tokenAddr) {
  return app.store(
    async (state, { address, event, returnValues }) => {
      let nextState = {
        ...state,
        // Fetch the app's settings, if we haven't already
        ...(!hasLoadedTokenSettings(state)
          ? await loadTokenSettings(token)
          : {}),
        tokenAddress: tokenAddr,
      }

      if (addressesEqual(address, tokenAddr)) {
        switch (event) {
          case 'ClaimedTokens':
            if (addressesEqual(returnValues._token, tokenAddr)) {
              nextState = await claimedTokens(token, nextState, returnValues)
            }
            break
          case 'Transfer':
            nextState = await transfer(token, nextState, returnValues)
            break
          default:
            break
        }
      } else {
        // TODO: add handlers for the vesting events from token Manager
      }

      return nextState
    },
    // Merge in the token's events into the app's own events for the store
    [token.events()]
  )
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
  const tokenSupply = await loadTokenSupply(token)
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
    addresses.map(
      address =>
        new Promise((resolve, reject) =>
          token
            .balanceOf(address)
            .first()
            .subscribe(balance => resolve({ address, balance }), reject)
        )
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

function loadTokenSupply(token) {
  return new Promise((resolve, reject) =>
    token
      .totalSupply()
      .first()
      .subscribe(resolve, reject)
  )
}

function loadTokenSettings(token) {
  return Promise.all(
    tokenSettings.map(
      ([name, key, type = 'string']) =>
        new Promise((resolve, reject) =>
          token[name]()
            .first()
            .subscribe(value => {
              resolve({ [key]: value })
            }, reject)
        )
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

function loadTokenSymbol(token) {
  return new Promise((resolve, reject) =>
    token
      .symbol()
      .first()
      .subscribe(resolve, reject)
  )
}
