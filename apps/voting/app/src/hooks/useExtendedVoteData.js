import { useMemo } from 'react'
import BN from 'bn.js'
import { formatTokenAmount } from '@aragon/ui'
import { useAragonApi } from '@aragon/api-react'
import { getUserBalanceAt, getUserBalanceNow } from '../token-utils'
import { getCanExecute, getCanVote } from '../vote-utils'
import useTokenContract from './useTokenContract'
import usePromise from './usePromise'

// Get the extended data related to a vote
export default function useExtendedVoteData(vote) {
  const {
    api,
    appState: { tokenDecimals },
    connectedAccount,
  } = useAragonApi()

  const tokenContract = useTokenContract()

  const canExecutePromise = useMemo(() => getCanExecute(vote, api), [api, vote])
  const canExecute = usePromise(canExecutePromise, [], false)

  const canUserVotePromise = useMemo(
    () => getCanVote(vote, connectedAccount, api),
    [vote, connectedAccount, api]
  )
  const canUserVote = usePromise(canUserVotePromise, [], false)

  const userBalancePromise = useMemo(
    () =>
      vote
        ? getUserBalanceAt(
            connectedAccount,
            vote.data.snapshotBlock,
            tokenContract
          )
        : Promise.resolve('-1'),
    [connectedAccount, tokenContract, tokenDecimals, vote]
  )
  const userBalanceNowPromise = useMemo(
    () => getUserBalanceNow(connectedAccount, tokenContract, tokenDecimals),
    [connectedAccount, tokenContract, tokenDecimals]
  )

  const userBalanceResolved = usePromise(userBalancePromise, [], '-1')
  const userBalanceNowResolved = usePromise(userBalanceNowPromise, [], '-1')

  const userBalance =
    userBalanceResolved !== '-1'
      ? formatTokenAmount(userBalanceResolved, tokenDecimals)
      : userBalanceResolved

  const userBalanceNow =
    userBalanceNowResolved !== '-1'
      ? formatTokenAmount(userBalanceNowResolved, tokenDecimals)
      : userBalanceNowResolved

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
