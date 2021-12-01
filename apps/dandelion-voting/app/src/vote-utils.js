import {
  VOTE_ABSENT,
  VOTE_YEA,
  VOTE_NAY,
  VOTE_STATUS_UPCOMING,
  VOTE_STATUS_ONGOING,
  VOTE_STATUS_DELAYED,
  VOTE_STATUS_REJECTED,
  VOTE_STATUS_ACCEPTED,
  VOTE_STATUS_PENDING_ENACTMENT,
  VOTE_STATUS_ENACTED,
} from './vote-types'

const EMPTY_SCRIPT = '0x00000001'
const ONE_SECOND = 1000

export function isVoteAction(vote) {
  return vote.data && vote.data.script && vote.data.script !== EMPTY_SCRIPT
}

export function getVoteRemainingBlocks(voteData, currentBlockNumber) {
  const { startBlock, endBlock, executionBlock } = voteData

  // All posible states
  const { closed, delayed, upcoming, open, syncing } = voteData
  let remainingBlocks

  if ((closed && !delayed) || syncing) return 0

  if (upcoming) {
    // upcoming
    remainingBlocks = startBlock - currentBlockNumber
  } else if (open) {
    // open
    remainingBlocks = endBlock - currentBlockNumber
  } // delayed
  else {
    remainingBlocks = executionBlock - currentBlockNumber
  }

  return remainingBlocks
}

export function getVoteTransition(
  vote,
  { number: currentBlockNumber, timestamp: currentBlockTimestamp },
  blockTime
) {
  // Check if the latest block has not loaded yet (in that case assumed all closed)
  if (!currentBlockNumber) return { closed: true }

  const { startBlock, endBlock, executionBlock } = vote.data
  const blockTimeMiliseconds = blockTime * ONE_SECOND
  let state = {}

  if (endBlock <= currentBlockNumber) {
    state.closed = true
    // If not delayed, then just return closed
    if (currentBlockNumber < executionBlock) {
      state.delayed = true
    } else {
      return state
    }
  } else if (currentBlockNumber < startBlock) {
    state.upcoming = true
  } else {
    state.open = true
  }

  const remainingBlocks = getVoteRemainingBlocks(
    { ...vote.data, ...state },
    currentBlockNumber
  )

  // Save the end time for the next state transition
  state.transitionAt = new Date(
    currentBlockTimestamp + remainingBlocks * blockTimeMiliseconds
  )

  return state
}

export const getQuorumProgress = ({ numData: { yea, votingPower } }) =>
  yea / votingPower

export function getVoteStatus(vote, pctBase) {
  if (vote.data.upcoming) return VOTE_STATUS_UPCOMING
  if (vote.data.open) return VOTE_STATUS_ONGOING

  if (!getVoteSuccess(vote, pctBase)) {
    return VOTE_STATUS_REJECTED
  }

  if (vote.data.delayed) return VOTE_STATUS_DELAYED

  // Only if the vote has an action do we consider it possible for enactment
  const hasAction = isVoteAction(vote)
  return hasAction
    ? vote.data.executed
      ? VOTE_STATUS_ENACTED
      : VOTE_STATUS_PENDING_ENACTMENT
    : VOTE_STATUS_ACCEPTED
}

export function getVoteSuccess(vote, pctBase) {
  const { yea, minAcceptQuorum, nay, supportRequired, votingPower } = vote.data

  const totalVotes = yea.add(nay)
  if (totalVotes.isZero()) {
    return false
  }
  const yeaPct = yea.mul(pctBase).div(totalVotes)
  const yeaOfTotalPowerPct = yea.mul(pctBase).div(votingPower)

  // Mirror on-chain calculation
  // yea / votingPower > supportRequired ||
  //   (yea / totalVotes > supportRequired &&
  //    yea / votingPower > minAcceptQuorum)
  return (
    yeaOfTotalPowerPct.gt(supportRequired) ||
    (yeaPct.gt(supportRequired) && yeaOfTotalPowerPct.gt(minAcceptQuorum))
  )
}

// Enums are not supported by the ABI yet:
// https://solidity.readthedocs.io/en/latest/frequently-asked-questions.html#if-i-return-an-enum-i-only-get-integer-values-in-web3-js-how-to-get-the-named-values
export function voteTypeFromContractEnum(value) {
  if (value === '1') {
    return VOTE_YEA
  }
  if (value === '2') {
    return VOTE_NAY
  }
  return VOTE_ABSENT
}

export async function getCanVote(vote, connectedAccount, api) {
  if (!vote) {
    return false
  }

  // If the account is not present, we assume the account is not connected.
  if (!connectedAccount) {
    return vote.data.open
  }

  return api.call('canVote', vote.voteId, connectedAccount).toPromise()
}

export async function getCanExecute(vote, api) {
  if (!vote) {
    return false
  }
  return api.call('canExecute', vote.voteId).toPromise()
}
