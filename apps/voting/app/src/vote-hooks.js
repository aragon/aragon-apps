import { useState, useEffect } from 'react'

// when `params` are updated, call `fn` and pass the result
function usePromiseResult(fn, params, defaultValue) {
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
  }, params)
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

export const useUserBalance = (...params) =>
  usePromiseResult(getUserBalance, params, -1)

export const useCanVote = (...params) =>
  usePromiseResult(getCanVote, params, false)

export const useCanExecute = (...params) =>
  usePromiseResult(getCanVote, params, false)

export const useCurrentVoteData = (
  vote,
  userAccount,
  api,
  tokenContract,
  tokenDecimals
) => {
  return {
    canUserVote: useCanVote(
      vote,
      userAccount,
      api,
      tokenContract,
      tokenDecimals
    ),
    canExecute: useCanExecute(vote, api),
    userBalance: useUserBalance(
      vote,
      userAccount,
      tokenContract,
      tokenDecimals
    ),
  }
}
