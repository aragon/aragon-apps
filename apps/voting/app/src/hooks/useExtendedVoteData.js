import { useMemo } from 'react'
import { useAragonApi } from '@aragon/api-react'
import { getCanExecute, getCanVote, getUserBalance } from '../vote-utils'
import useTokenContract from './useTokenContract'
import usePromise from './usePromise'

// Get the extended data related to a vote
export default function useExtendedVoteData(vote) {
  const {
    api,
    connectedAccount,
    appState: { tokenDecimals },
  } = useAragonApi()

  const tokenContract = useTokenContract()

  const canExecutePromise = useMemo(() => getCanExecute(vote, api), [api, vote])
  const canExecute = usePromise(
    canExecutePromise,
    [vote && vote.voteId, api],
    false
  )

  const canUserVotePromise = useMemo(
    () => getCanVote(vote, connectedAccount, api),
    [vote, connectedAccount, api]
  )
  const canUserVote = usePromise(
    canUserVotePromise,
    [vote && vote.voteId, connectedAccount, api],
    false
  )

  const userBalancePromise = useMemo(
    () => getUserBalance(vote, connectedAccount, tokenContract, tokenDecimals),
    [connectedAccount, tokenContract, tokenDecimals, vote]
  )
  const userBalance = usePromise(
    userBalancePromise,
    [vote && vote.voteId, connectedAccount, tokenContract, tokenDecimals],
    -1
  )

  return {
    canExecute,
    canUserVote,
    userBalance,
    userBalancePromise,
    canUserVotePromise,
    canExecutePromise,
  }
}
