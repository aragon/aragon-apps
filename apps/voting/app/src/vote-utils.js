import { isBefore } from 'date-fns/esm'
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

export function isVoteOpen(vote, date) {
  const { executed, endDate } = vote.data
  // Open if not executed and date is still before end date
  return !executed && isBefore(date, endDate)
}

export const getQuorumProgress = ({ numData: { yea, totalVoters } }) =>
  yea / totalVoters

export function getVoteStatus(vote, pctBase) {
  if (vote.data.executed) {
    return VOTE_STATUS_EXECUTED
  }
  if (vote.open) {
    return VOTE_STATUS_ONGOING
  }
  return getVoteSuccess(vote, pctBase)
    ? VOTE_STATUS_ACCEPTED
    : VOTE_STATUS_REJECTED
}

export function getVoteSuccess(vote, pctBase) {
  const { yea, nay, minAcceptQuorum, supportRequiredPct } = vote.data

  // Mirror on-chain calculation
  const totalVotes = yea.add(nay)
  if (totalVotes.isZero()) {
    return false
  }
  const yeaPct = yea.mul(pctBase).div(totalVotes)

  // yea / totalVotes > supportRequiredPct
  // yea / totalVotes > minAcceptQuorum
  return yeaPct.gt(supportRequiredPct) && yeaPct.gt(minAcceptQuorum)
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
