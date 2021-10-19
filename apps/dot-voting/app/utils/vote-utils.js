import {
  VOTE_STATUS_EXECUTED,
  VOTE_STATUS_FAILED,
  VOTE_STATUS_SUCCESSFUL
} from './vote-types'

export const EMPTY_CALLSCRIPT = '0x00000001'

export const getVoteStatus = (vote, globalMinQuorum) => {
  if (vote.data.executed) return VOTE_STATUS_EXECUTED

  const hasMinParticipation =
    vote.data.participationPct >= (globalMinQuorum / 10 ** 16)

  return hasMinParticipation
    ? VOTE_STATUS_SUCCESSFUL
    : VOTE_STATUS_FAILED
}

export const getTotalSupport = ({ options }) => {
  let totalSupport = 0
  options.forEach(option => {
    totalSupport = totalSupport + parseFloat(option.value, 10)
  })
  return totalSupport
}
