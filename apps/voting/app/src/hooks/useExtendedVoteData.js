import { useMemo } from 'react'
import { useAragonApi } from '@aragon/api-react'
import { getUserBalanceAt, getUserBalanceNow, formatBalance } from '../token-utils'
import { getCanExecute, getCanVote } from '../vote-utils'
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
  const canExecute = usePromise(canExecutePromise, [], false)

  const canUserVotePromise = useMemo(
    () => getCanVote(vote, connectedAccount, api),
    [vote, connectedAccount, api]
  )
  const canUserVote = usePromise(canUserVotePromise, [], false)

  const userBalancePromise = useMemo(() => {
    if (!vote) {
      return -1
    }
    const userBalance =  getUserBalanceAt(
      connectedAccount,
      vote.data.snapshotBlock,
      tokenContract,
    )
    
    return formatBalance(userBalance, tokenDecimals)

  }, [connectedAccount, tokenContract, tokenDecimals, vote])
  const userBalance = usePromise(userBalancePromise, [], -1)

  const userBalanceNowPromise = useMemo(
    () => getUserBalanceNow(connectedAccount, tokenContract, tokenDecimals),
    [connectedAccount, tokenContract, tokenDecimals]
  )
  const userBalanceNow = usePromise(userBalanceNowPromise, [], -1)

  return {
    canExecute,
    canUserVote,
    userBalance,
    userBalancePromise,
    userBalanceNow,
    userBalanceNowPromise,
    canUserVotePromise,
    canExecutePromise,
  }
}
