import React, { useCallback, useMemo, useState } from 'react'
import { AragonApi, useApi, useAppState } from '@aragon/api-react'
import appStateReducer from './app-state-reducer'
import { EMPTY_CALLSCRIPT } from './evmscript-utils'
import usePanelState from './hooks/usePanelState'
import useVotes from './hooks/useVotes'
import { noop } from './utils'
import { VOTE_YEA } from './vote-types'

// Get the vote currently selected, or null otherwise.
export function useSelectedVote(votes) {
  const [selectedVoteId, setSelectedVoteId] = useState('-1')
  const { ready } = useAppState()

  // The memoized vote currently selected.
  const selectedVote = useMemo(() => {
    // The `ready` check prevents a vote to be selected
    // until the app state is fully ready.
    if (!ready || selectedVoteId === '-1') {
      return null
    }
    return votes.find(vote => vote.voteId === selectedVoteId) || null
  }, [selectedVoteId, votes, ready])

  return [
    selectedVote,

    // setSelectedVoteId() is exported directly: since `selectedVoteId` is
    // set in the `selectedVote` dependencies, it means that the useMemo()
    // will be updated every time `selectedVoteId` changes.
    setSelectedVoteId,
  ]
}

// Create a new vote
export function useCreateVoteAction(onDone = noop) {
  const api = useApi()
  return useCallback(
    question => {
      if (api) {
        // Don't care about response
        api.newVote(EMPTY_CALLSCRIPT, question).toPromise()
        onDone()
      }
    },
    [api, onDone]
  )
}

// Vote (the action) on a vote
export function useVoteAction(onDone = noop) {
  const api = useApi()
  return useCallback(
    (voteId, voteType, executesIfDecided = true) => {
      // Don't care about response
      api.vote(voteId, voteType === VOTE_YEA, executesIfDecided).toPromise()
      onDone()
    },
    [api, onDone]
  )
}

// Execute a vote
export function useExecuteAction(onDone = noop) {
  const api = useApi()
  return useCallback(
    voteId => {
      // Don't care about response
      api.executeVote(voteId).toPromise()
      onDone()
    },
    [api, onDone]
  )
}

// Handles the main logic of the app.
export function useAppLogic() {
  const { isSyncing, ready } = useAppState()

  const votes = useVotes()
  const [selectedVote, selectVote] = useSelectedVote(votes)
  const newVotePanel = usePanelState()

  const actions = {
    createVote: useCreateVoteAction(newVotePanel.requestClose),
    vote: useVoteAction(),
    execute: useExecuteAction(),
  }

  return {
    actions,
    selectVote,
    selectedVote,
    votes,
    isSyncing: isSyncing || !ready,
    newVotePanel: useMemo(() => newVotePanel, [newVotePanel]),
  }
}

export function AppLogicProvider({ children }) {
  return <AragonApi reducer={appStateReducer}>{children}</AragonApi>
}
