import { useEffect, useMemo, useState } from 'react'
import { useAragonApi, useAppState } from '@aragon/api-react'
import {
  getCanExecute,
  getCanVote,
  getUserBalance,
  isVoteOpen,
  voteTypeFromContractEnum,
} from './vote-utils'
import { useNow, usePromise } from './utils-hooks'
import { VOTE_ABSENT } from './vote-types'
import TOKEN_ABI from './abi/token-balanceOfAt.json'

// Get the votes array ready to be used in the app.
export function useVotes() {
  const { votes } = useAppState()
  const now = useNow()
  const connectedAccountVotes = useConnectedAccountVotes()

  return useMemo(() => {
    if (!votes) {
      return []
    }
    return votes.map(vote => ({
      ...vote,
      data: {
        ...vote.data,

        metadata: vote.data.metadata || '',
        description: vote.data.description || '',
        open: isVoteOpen(vote, now),
      },
      connectedAccountVote:
        connectedAccountVotes.get(vote.voteId) || VOTE_ABSENT,
    }))
  }, [votes, connectedAccountVotes, now])
}

// Get the voting state of the connected account for every vote.
export function useConnectedAccountVotes() {
  const { api, appState, connectedAccount } = useAragonApi()
  const [connectedAccountVotes, setConnectedAccountVotes] = useState(new Map())

  const { votes } = appState

  useEffect(() => {
    if (!connectedAccount || !votes) {
      setConnectedAccountVotes(new Map())
      return
    }

    let cancelled = false
    Promise.all(
      votes.map(({ voteId }) =>
        api
          .call('getVoterState', voteId, connectedAccount)
          .toPromise()
          .then(voteTypeFromContractEnum)
          .then(voteType => [voteId, voteType])
      )
    ).then(voteStates => {
      if (!cancelled) {
        setConnectedAccountVotes(new Map(voteStates))
      }
    })

    return () => {
      cancelled = true
    }
  }, [api, votes, connectedAccount])

  return connectedAccountVotes
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
