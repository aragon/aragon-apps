import {
  VOTE_STATUS_ACTIVE,
  VOTE_STATUS_PAUSED,
  VOTE_STATUS_CANCELLED,
  VOTE_STATUS_CLOSED,
  CHALLENGE_STATE_WAITING,
  CHALLENGE_STATE_SETTLED,
  CHALLENGE_STATE_DISPUTED,
  CHALLENGE_STATE_REJECTED,
  CHALLENGE_STATE_ACCEPTED,
  CHALLENGE_STATE_VOIDED,
} from './disputable-vote-statuses'

export function getDisputableVoteStatus(vote) {
  if (!vote || !vote.disputable || !vote.disputable.status) {
    return null
  }

  if (vote.disputable.status === 'Paused') {
    return VOTE_STATUS_PAUSED
  }

  if (vote.disputable.status === 'Cancelled') {
    return VOTE_STATUS_CANCELLED
  }

  if (vote.disputable.status === 'Closed') {
    return VOTE_STATUS_CLOSED
  }

  if (vote.disputable.status === 'Active') {
    return VOTE_STATUS_ACTIVE
  }

  return null
}

export function getChallengeState(vote) {
  if (!vote || !vote.disputable || !vote.disputable) {
    return null
  }

  if (vote.disputable.status === 'Waiting') {
    return CHALLENGE_STATE_WAITING
  }

  if (vote.disputable.status === 'Settled') {
    return VOTE_STATUS_SETTLED
  }

  if (vote.disputable.status === 'Disputed') {
    return VOTE_STATUS_DISPUTED
  }

  if (vote.disputable.status === 'Rejected') {
    return CHALLENGE_STATE_REJECTED
  }

  if (vote.disputable.status === 'Accepted') {
    return VOTE_STATUS_ACCEPTED
  }

  if (vote.disputable.status === 'Voided') {
    return VOTE_STATUS_VOIDED
  }

  return null
}
