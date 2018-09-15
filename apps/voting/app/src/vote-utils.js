import { safeDiv } from './math-utils'
import {
  VOTE_ABSENT,
  VOTE_YEA,
  VOTE_NAY,
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

export const getQuorumProgress = ({ yea, totalVoters }) =>
  safeDiv(yea, totalVoters)
