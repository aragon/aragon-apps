import { safeDiv } from './math-utils'
import {
  VOTE_ABSENT,
  VOTE_YEA,
  VOTE_NAY,
  VOTE_STATUS_ONGOING,
  VOTE_STATUS_REJECTED,
  VOTE_STATUS_ACCEPTED,
  VOTE_STATUS_EXECUTED,
} from './vote-types'

export const EMPTY_CALLSCRIPT = '0x00000001'

export const getAccountVote = (account, voters) =>
  voters[account] || VOTE_ABSENT

export function getVoteStatus(vote) {
  if (vote.executed) {
    return VOTE_STATUS_EXECUTED
  }
  if (vote.open) {
    return VOTE_STATUS_ONGOING
  }
  return getVoteSuccess(vote) ? VOTE_STATUS_ACCEPTED : VOTE_STATUS_REJECTED
}

export function getVoteSuccess(vote) {
  const { support, quorum } = vote
  const { yea, nay } = vote.data

  const totalVotes = yea + nay
  const hasSupport = yea / totalVotes > support
  const hasMinQuorum = getQuorumProgress(vote) > quorum

  return hasSupport && hasMinQuorum
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

export const getQuorumProgress = ({ data: { yea, totalVoters } }) =>
  safeDiv(yea, totalVoters)
