import Aragon from '@aragon/client'
import { of } from './rxjs'
import voteSettings, { hasLoadedVoteSettings } from './vote-settings'
import { EMPTY_CALLSCRIPT } from './vote-utils'
import tokenDecimalsAbi from './abi/token-decimals.json'
import tokenSymbolAbi from './abi/token-symbol.json'

const INITIALIZATION_TRIGGER = Symbol('INITIALIZATION_TRIGGER')

const tokenAbi = [].concat(tokenDecimalsAbi, tokenSymbolAbi)

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
  app
    .call('token')
    .first()
    .subscribe(initialize, err => {
      console.error(
        'Could not start background script execution due to the contract not loading the token:',
        err
      )
      retry()
    })
})

async function initialize(tokenAddr) {
  const token = app.external(tokenAddr, tokenAbi)

  let tokenSymbol
  try {
    tokenSymbol = await loadTokenSymbol(token)
    app.identify(tokenSymbol)
  } catch (err) {
    console.error(
      `Failed to load token symbol for token at ${tokenAddr} due to:`,
      err
    )
  }

  let tokenDecimals
  try {
    tokenDecimals = await loadTokenDecimals(token)
  } catch (err) {
    console.err(
      `Failed to load token decimals for token at ${tokenAddr} due to:`,
      err
    )
    console.err('Defaulting to 18...')
    tokenDecimals = '18'
  }

  return createStore(token, { decimals: tokenDecimals, symbol: tokenSymbol })
}

// Hook up the script as an aragon.js store
async function createStore(token, tokenSettings) {
  const { decimals: tokenDecimals, symbol: tokenSymbol } = tokenSettings
  return app.store(
    async (state, { event, returnValues }) => {
      let nextState = {
        ...state,
        // Fetch the app's settings, if we haven't already
        ...(!hasLoadedVoteSettings(state) ? await loadVoteSettings() : {}),
      }

      if (event === INITIALIZATION_TRIGGER) {
        nextState = {
          ...nextState,
          tokenDecimals,
          tokenSymbol,
        }
      } else {
        switch (event) {
          case 'CastVote':
            nextState = await castVote(nextState, returnValues)
            break
          case 'ExecuteVote':
            nextState = await executeVote(nextState, returnValues)
            break
          case 'StartVote':
            nextState = await startVote(nextState, returnValues)
            break
          default:
            break
        }
      }

      return nextState
    },
    [
      // Always initialize the store with our own home-made event
      of({ event: INITIALIZATION_TRIGGER }),
    ]
  )
}

/***********************
 *                     *
 *   Event Handlers    *
 *                     *
 ***********************/

async function castVote(state, { voteId }) {
  // Let's just reload the entire vote again,
  // cause do we really want more than one source of truth with a blockchain?
  const transform = async vote => ({
    ...vote,
    data: {
      ...vote.data,
      ...(await loadVoteData(voteId)),
    },
  })
  return updateState(state, voteId, transform)
}

async function executeVote(state, { voteId }) {
  const transform = ({ data, ...vote }) => ({
    ...vote,
    data: { ...data, executed: true },
  })
  return updateState(state, voteId, transform)
}

async function startVote(state, { creator, metadata, voteId }) {
  return updateState(state, voteId, vote => ({
    ...vote,
    data: {
      ...vote.data,
      creator,
      metadata,
    },
  }))
}

/***********************
 *                     *
 *       Helpers       *
 *                     *
 ***********************/

async function loadVoteDescription(vote) {
  if (!vote.script || vote.script === EMPTY_CALLSCRIPT) {
    return vote
  }

  const path = await app.describeScript(vote.script).toPromise()
  vote.description = path
    ? path
        .map(step => {
          const identifier = step.identifier ? ` (${step.identifier})` : ''
          const app = step.name ? `${step.name}${identifier}` : `${step.to}`

          return `${app}: ${step.description || 'No description'}`
        })
        .join('\n')
    : ''

  return vote
}

function loadVoteData(voteId) {
  return new Promise(resolve => {
    app
      .call('getVote', voteId)
      .first()
      .subscribe(vote => resolve(loadVoteDescription(marshallVote(vote))))
  })
}

async function updateVotes(votes, voteId, transform) {
  const voteIndex = votes.findIndex(vote => vote.voteId === voteId)

  if (voteIndex === -1) {
    // If we can't find it, load its data, perform the transformation, and concat
    return votes.concat(
      await transform({
        voteId,
        data: await loadVoteData(voteId),
      })
    )
  } else {
    const nextVotes = Array.from(votes)
    nextVotes[voteIndex] = await transform(nextVotes[voteIndex])
    return nextVotes
  }
}

async function updateState(state, voteId, transform) {
  const { votes = [] } = state

  return {
    ...state,
    votes: await updateVotes(votes, voteId, transform),
  }
}

function loadVoteSettings() {
  return Promise.all(
    voteSettings.map(
      ([name, key, type = 'string']) =>
        new Promise((resolve, reject) =>
          app
            .call(name)
            .first()
            .map(val => {
              if (type === 'time') {
                return marshallDate(val)
              }
              return val
            })
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
      console.error('Failed to load Vote settings', err)
      // Return an empty object to try again later
      return {}
    })
}

function loadTokenDecimals(tokenContract) {
  return new Promise((resolve, reject) => {
    tokenContract
      .decimals()
      .first()
      .subscribe(resolve, reject)
  })
}

function loadTokenSymbol(tokenContract) {
  return new Promise((resolve, reject) => {
    tokenContract
      .symbol()
      .first()
      .subscribe(resolve, reject)
  })
}

// Apply transformations to a vote received from web3
// Note: ignores the 'open' field as we calculate that locally
function marshallVote({
  executed,
  minAcceptQuorum,
  nay,
  snapshotBlock,
  startDate,
  supportRequired,
  votingPower,
  yea,
  script,
}) {
  return {
    executed,
    minAcceptQuorum,
    nay,
    script,
    supportRequired,
    votingPower,
    yea,
    // Like times, blocks should be safe to represent as real numbers
    snapshotBlock: parseInt(snapshotBlock, 10),
    startDate: marshallDate(startDate, 10),
  }
}

function marshallDate(date) {
  // Represent dates as real numbers, as it's very unlikely they'll hit the limit...
  // Adjust for js time (in ms vs s)
  return parseInt(date, 10) * 1000
}
