import { safeDiv } from './math-utils'
import {
  VOTE_ABSENT,
  VOTE_STATUS_ONGOING,
  VOTE_STATUS_REJECTED,
  VOTE_STATUS_ACCEPTED,
} from './vote-types'

export const EMPTY_CALLSCRIPT = '0x00000001'

export const getAccountVote = (account, voters) =>
  voters[account] || VOTE_ABSENT

export const getVoteStatus = (vote, support, quorum) => {
  if (vote.executed) {
    return VOTE_STATUS_ACCEPTED
  }

  const totalVotes = vote.yea + vote.nay
  const hasSupport = vote.yea / totalVotes >= support
  const hasMinQuorum = getQuorumProgress(vote) >= quorum

  if (vote.open) {
    return VOTE_STATUS_ONGOING
  }

  return hasSupport && hasMinQuorum
    ? VOTE_STATUS_ACCEPTED
    : VOTE_STATUS_REJECTED
}

export const getQuorumProgress = ({ yea, totalVoters }) =>
  safeDiv(yea, totalVoters)
