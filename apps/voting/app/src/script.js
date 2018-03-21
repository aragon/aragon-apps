import Aragon from '@aragon/client'
import { combineLatest } from './rxjs'
import voteSettings, { hasLoadedVoteSettings } from './vote-settings'

const app = new Aragon()

// Hook up the script as an aragon.js store
app.store(async (state, { event, returnValues }) => {
  let nextState = {
    ...state,
    // Fetch the app's settings, if we haven't already
    ...(!hasLoadedVoteSettings(state) ? await loadVoteSettings() : {}),
  }

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

  return nextState
})

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
    data: await loadVoteData(voteId),
  })
  return updateState(state, voteId, transform)
}

async function executeVote(state, { voteId }) {
  const transform = vote => ({ ...vote, executed: true })
  return updateState(state, voteId, transform)
}

async function startVote(state, { voteId }) {
  return updateState(state, voteId, vote => vote)
}

/***********************
 *                     *
 *       Helpers       *
 *                     *
 ***********************/

function loadVoteData(voteId) {
  return new Promise(resolve => {
    combineLatest(
      app.call('getVote', voteId),
      app.call('getVoteMetadata', voteId)
    )
      .first()
      .subscribe(([vote, metadata]) => {
        resolve({
          ...marshallVote(vote),
          metadata,
        })
      })
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
            .map(val => (type === 'number' ? parseInt(val, 10) : val))
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

// Apply transmations to a vote received from web3
function marshallVote({
  creator,
  executed,
  minAcceptQuorumPct,
  nay,
  open,
  snapshotBlock,
  startDate,
  totalVoters,
  yea,
}) {
  return {
    creator,
    executed,
    open,
    minAcceptQuorumPct: parseInt(minAcceptQuorumPct, 10),
    nay: parseInt(nay, 10),
    snapshotBlock: parseInt(snapshotBlock, 10),
    startDate: parseInt(startDate, 10),
    totalVoters: parseInt(totalVoters, 10),
    yea: parseInt(yea, 10),
  }
}
