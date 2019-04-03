import { useState, useEffect } from 'react'
import { useAragonApi } from '@aragon/api-react'

// when `params` are updated, call `fn` and pass the result
function usePromiseResult(fn, params, memoParams, defaultValue) {
  const [result, setResult] = useState(defaultValue)
  useEffect(() => {
    let cancelled = false
    fn(...params).then(value => {
      if (!cancelled) {
        setResult(value)
      }
    })
    return () => {
      cancelled = true
    }
  }, memoParams)
  return result
}

async function getUserBalance(vote, userAccount, tokenContract, tokenDecimals) {
  if (!tokenContract || !userAccount) {
    return -1
  }

  const balance = await tokenContract
    .balanceOfAt(userAccount, vote.data.snapshotBlock)
    .toPromise()

  return Math.floor(parseInt(balance, 10) / Math.pow(10, tokenDecimals))
}

async function getCanVote(vote, userAccount, api) {
  if (!vote) {
    return false
  }

  // If the account is not present, we assume the account is not connected.
  if (!userAccount) {
    return vote.data.open
  }

  return api.call('canVote', vote.voteId, userAccount).toPromise()
}

async function getCanExecute(vote, api) {
  if (!vote) {
    return false
  }
  return api.call('canExecute', vote.voteId).toPromise()
}

export const useCurrentVoteData = (
  vote,
  userAccount,
  tokenContract,
  tokenDecimals
) => {
  const { api } = useAragonApi()
  return {
    canUserVote: usePromiseResult(
      getCanVote,
      [vote, userAccount, api],
      [vote && vote.voteId, userAccount, api],
      false
    ),
    canExecute: usePromiseResult(
      getCanExecute,
      [vote, api],
      [vote && vote.voteId, api],
      false
    ),
    userBalance: usePromiseResult(
      getUserBalance,
      [vote, userAccount, tokenContract, tokenDecimals],
      [vote && vote.voteId, userAccount, tokenContract, tokenDecimals],
      -1
    ),
  }
}
