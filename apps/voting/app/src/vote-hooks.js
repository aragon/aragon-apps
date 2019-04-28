import { useEffect, useMemo, useState } from 'react'
import { useAragonApi, useAppState } from '@aragon/api-react'
import {
  getCanExecute,
  getCanVote,
  getUserBalance,
  isVoteOpen,
} from './vote-utils'
import { useNow, usePromise } from './utils-hooks'
import { VOTE_ABSENT } from './vote-types'
import TOKEN_ABI from './abi/token-balanceOfAt.json'

// Get the votes array ready to be used in the app.
export function useVotes() {
  const { votes, connectedAccountVotes } = useAppState()
  const now = useNow()

  const openedStates = (votes || []).map(v => isVoteOpen(v, now))
  const openedStatesKey = openedStates.join('')

  return useMemo(() => {
    if (!votes) {
      return []
    }
    return votes.map((vote, i) => ({
      ...vote,
      data: {
        ...vote.data,

        metadata: vote.data.metadata || '',
        description: vote.data.description || '',
        open: openedStates[i],
      },
      connectedAccountVote: connectedAccountVotes[vote.voteId] || VOTE_ABSENT,
    }))
  }, [votes, connectedAccountVotes, openedStatesKey])
}

// Load and returns the token contract, or null if not loaded yet.
export function useTokenContract() {
  const { api, appState } = useAragonApi()
  const { tokenAddress } = appState
  const [contract, setContract] = useState(null)

  useEffect(() => {
    // We assume there is never any reason to set the contract back to null.
    if (api && tokenAddress) {
      setContract(api.external(tokenAddress, TOKEN_ABI))
    }
  }, [api, tokenAddress])

  return contract
}

// Get the extended data related to a vote
export function useExtendedVoteData(vote) {
  const {
    api,
    connectedAccount,
    appState: { tokenDecimals },
  } = useAragonApi()

  const tokenContract = useTokenContract()

  const canExecute = usePromise(
    () => getCanExecute(vote, api),
    [vote && vote.voteId, api],
    false
  )

  const canUserVote = usePromise(
    () => getCanVote(vote, connectedAccount, api),
    [vote && vote.voteId, connectedAccount, api],
    false
  )

  const userBalance = usePromise(
    () => getUserBalance(vote, connectedAccount, tokenContract, tokenDecimals),
    [vote && vote.voteId, connectedAccount, tokenContract, tokenDecimals],
    -1
  )

  return { canExecute, canUserVote, userBalance }
}
