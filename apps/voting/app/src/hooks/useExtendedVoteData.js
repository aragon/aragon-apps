import { useMemo } from 'react'
import { useAragonApi } from '@aragon/api-react'
import { getUserBalanceAt, getUserBalanceNow, formatBalance } from '../token-utils'
import { getCanExecute, getCanVote } from '../vote-utils'
import useTokenContract from './useTokenContract'
import usePromise from './usePromise'
import BN from 'bn.js'

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
    
    return userBalance

  }, [connectedAccount, tokenContract, tokenDecimals, vote])
  const userBalanceResolved = usePromise(userBalancePromise, [], -1)


  const userBalanceBN = new BN(userBalanceResolved)
  const tokenDecimalsBase = new BN(10).pow(new BN(tokenDecimals))

  const userBalance = userBalanceResolved != -1 ? formatBalance(userBalanceBN, tokenDecimalsBase) : userBalanceResolved

  const userBalanceNowPromise = useMemo(
    () => getUserBalanceNow(connectedAccount, tokenContract, tokenDecimals),
    [connectedAccount, tokenContract, tokenDecimals]
  )
  const userBalanceNowResolved = usePromise(userBalanceNowPromise, [], -1)
  const userBalanceNowBN = new BN(userBalanceResolved)

  const userBalanceNow = userBalanceNowResolved != -1 ?  formatBalance(userBalanceNowBN, tokenDecimalsBase) : userBalanceNowResolved

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
