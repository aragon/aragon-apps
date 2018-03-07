import Aragon from '@aragon/client'
import { combineLatest } from 'rxjs/operators/combineLatest'
import { Subject } from 'rxjs/Subject'
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
      nextState = executeVote(nextState, returnValues)
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
  return updateVotesState(state, voteId, transform)
}

async function executeVote(state, { voteId }) {
  const transform = vote => Promise.resolve({ ...vote, executed: true })
  return updateVotesState(state, voteId, transform)
}

async function startVote(state, { voteId }) {
  const { votes = [] } = state
  const vote = {
    voteId,
    data: await loadVoteData(voteId),
  }
  return {
    ...state,
    votes: votes.concat(vote),
  }
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

async function updateVotes(votes, index, transform) {
  const nextVotes = Array.from(votes)
  nextVotes[index] = await transform(nextVotes[index])
  return nextVotes
}

async function updateVotesState(state, voteId, transform) {
  const { votes = [] } = state
  const voteIndex = votes.findIndex(vote => vote.id === voteId)

  // If we can't find it... let's just ignore it :)
  return voteIndex === -1
    ? state
    : {
        ...state,
        vote: await updateVotes(votes, voteIndex, transform),
      }
}

function loadVoteSettings() {
  return new Promise(resolve => {
    // app.call() creates a hot observable, so it's hard to merge.
    // Instead, we use a Subject
    const settings$ = new Subject().scan(
      (settings, setting) => ({ ...settings, ...setting }),
      {}
    )
    settings$.connect()

    voteSettings.forEach(([name, key]) => {
      app
        .call(name)
        .first()
        .map(val => parseInt(val, 10))
        .subscribe(value => {
          settings$.next({ [key]: value })
        })
    })

    settings$.first(hasLoadedVoteSettings).subscribe(resolve)
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
