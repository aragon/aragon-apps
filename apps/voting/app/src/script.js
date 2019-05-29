import Aragon, { events } from '@aragon/api'
import { addressesEqual } from './web3-utils'
import voteSettings from './vote-settings'
import { voteTypeFromContractEnum } from './vote-utils'
import { EMPTY_CALLSCRIPT } from './evmscript-utils'
import tokenDecimalsAbi from './abi/token-decimals.json'
import tokenSymbolAbi from './abi/token-symbol.json'

const tokenAbi = [].concat(tokenDecimalsAbi, tokenSymbolAbi)

const app = new Aragon()

let connectedAccount

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
    .toPromise()
    .then(initialize)
    .catch(err => {
      console.error(
        'Could not start background script execution due to the contract not loading the token:',
        err
      )
      retry()
    })
})

async function initialize(tokenAddr) {
  return app.store(
    (state, { event, returnValues }) => {
      const nextState = {
        ...state,
      }

      switch (event) {
        case events.ACCOUNTS_TRIGGER:
          return updateConnectedAccount(nextState, returnValues)
        case events.SYNC_STATUS_SYNCING:
          return { ...nextState, isSyncing: true }
        case events.SYNC_STATUS_SYNCED:
          return { ...nextState, isSyncing: false }
        case 'CastVote':
          return castVote(nextState, returnValues)
        case 'ExecuteVote':
          return executeVote(nextState, returnValues)
        case 'StartVote':
          return startVote(nextState, returnValues)
        default:
          return nextState
      }
    },
    { init: initState(tokenAddr) }
  )
}

const initState = tokenAddr => async cachedState => {
  const token = app.external(tokenAddr, tokenAbi)

  let tokenSymbol
  try {
    tokenSymbol = await token.symbol().toPromise()
    const pctBase = parseInt(await app.call('PCT_BASE').toPromise(), 10)
    const supportRequiredPct = parseInt(
      await app.call('supportRequiredPct').toPromise(),
      10
    )
    const supportRequired = Math.round((supportRequiredPct / pctBase) * 100)
    app.identify(`${tokenSymbol} (${supportRequired}%)`)
  } catch (err) {
    console.error(
      `Failed to load information to identify voting app due to:`,
      err
    )
  }

  let tokenDecimals
  try {
    tokenDecimals = (await token.decimals().toPromise()) || '0'
  } catch (err) {
    console.error(
      `Failed to load token decimals for token at ${tokenAddr} due to:`,
      err
    )
    console.error('Defaulting to 0...')
    tokenDecimals = '0'
  }

  const voteSettings = await loadVoteSettings()

  return {
    ...cachedState,
    isSyncing: true,
    tokenDecimals,
    tokenSymbol,
    ...voteSettings,
  }
}

/***********************
 *                     *
 *   Event Handlers    *
 *                     *
 ***********************/

async function updateConnectedAccount(state, { account }) {
  connectedAccount = account
  return {
    ...state,
    // fetch all the votes casted by the connected account
    connectedAccountVotes: state.votes
      ? await getAccountVotes({
          connectedAccount: account,
          votes: state.votes,
        })
      : {},
  }
}

async function castVote(state, { voteId, voter }) {
  const { connectedAccountVotes } = state
  // If the connected account was the one who made the vote, update their voter status
  if (addressesEqual(connectedAccount, voter)) {
    // fetch vote state for the connected account for this voteId
    const { voteType } = await getVoterState({
      connectedAccount,
      voteId,
    })
    connectedAccountVotes[voteId] = voteType
  }

  const transform = async vote => ({
    ...vote,
    data: {
      ...vote.data,
      ...(await loadVoteData(voteId)),
    },
  })

  return updateState({ ...state, connectedAccountVotes }, voteId, transform)
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
// Default votes to an empty array to prevent errors on initial load
async function getAccountVotes({ connectedAccount, votes = [] }) {
  const connectedAccountVotes = await Promise.all(
    votes.map(({ voteId }) => getVoterState({ connectedAccount, voteId }))
  )
    .then(voteStates =>
      voteStates.reduce((states, { voteId, voteType }) => {
        states[voteId] = voteType
        return states
      }, {})
    )
    .catch(console.error)

  return connectedAccountVotes
}

async function getVoterState({ connectedAccount, voteId }) {
  return app
    .call('getVoterState', voteId, connectedAccount)
    .toPromise()
    .then(voteTypeFromContractEnum)
    .then(voteType => ({ voteId, voteType }))
    .catch(console.error)
}

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
  return app
    .call('getVote', voteId)
    .toPromise()
    .then(vote => loadVoteDescription(marshallVote(vote)))
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
    voteSettings.map(([name, key, type = 'string']) =>
      app
        .call(name)
        .toPromise()
        .then(val => (type === 'time' ? marshallDate(val) : val))
        .then(value => ({ [key]: value }))
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
