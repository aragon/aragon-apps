import {
  VOTE_ABSENT,
  VOTE_STATUS_ONGOING,
  VOTE_STATUS_REJECTED,
  VOTE_STATUS_ACCEPTED,
} from './vote-types'

export const isVoteOpen = ({ startDate, executed }, voteTime) =>
  Date.now() < startDate + voteTime && !executed

export const getAccountVote = (account, voters) =>
  voters[account] || VOTE_ABSENT

export const getVoteStatus = (vote, supportRequired, tokenSupply, voteTime) => {
  if (vote.executed) {
    return VOTE_STATUS_ACCEPTED
  }

  const voteEnded = !isVoteOpen(vote, voteTime)
  const totalVotes = vote.yea + vote.nay
  const hasSupport = vote.yea / totalVotes >= supportRequired
  const hasMinQuorum = vote.yea / tokenSupply >= vote.minAcceptQuorumPct

  if (!voteEnded) {
    return VOTE_STATUS_ONGOING
  }

  return hasSupport && hasMinQuorum
    ? VOTE_STATUS_ACCEPTED
    : VOTE_STATUS_REJECTED
}
