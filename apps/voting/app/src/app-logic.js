import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AragonApi, useApi, useAppState, usePath } from '@aragon/api-react'
import appStateReducer from './app-state-reducer'
import { usePanelState } from './utils-hooks'
import { useVotes } from './vote-hooks'
import { VOTE_YEA } from './vote-types'
import { EMPTY_CALLSCRIPT } from './evmscript-utils'

function voteIdFromPath(path) {
  const matches = path.match(/^\/vote\/([0-9]+)\/?$/)
  return matches ? matches[1] : '-1'
}

// Get the vote currently selected, or null otherwise.
export function useSelectedVote(votes) {
  const [path, requestPath] = usePath()
  const [setSelectedVoteId] = useState('-1')
  const { ready } = useAppState()

  // The memoized vote currently selected.
  const selectedVote = useMemo(() => {
    const voteId = voteIdFromPath(path)

    // The `ready` check prevents a vote to be
    // selected until the app state is fully ready.
    if (!ready || voteId === '-1') {
      return null
    }

    return votes.find(vote => vote.voteId === voteId) || null
  }, [path, ready, votes])

  const selectVote = useCallback(
    voteId => {
      if (!voteId) {
        return
      }
      requestPath(voteId === '-1' ? '/' : `/vote/${voteId}`)
    },
    [requestPath]
  )

  return [selectedVote, selectVote]
}

// Create a new vote
export function useCreateVoteAction(onDone) {
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
export function useVoteAction(onDone) {
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
export function useExecuteAction(onDone) {
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

// Handles the state of the selected vote panel.
export function useSelectedVotePanel(selectedVote, selectVote) {
  const selectedVoteId = selectedVote ? selectedVote.voteId : '-1'

  const onWillClose = useCallback(() => {
    selectVote('-1')
  }, [selectVote])

  const selectedVotePanel = usePanelState({ onWillClose })

  // This is to help the React Hooks linter.
  const { requestOpen, didOpen } = selectedVotePanel

  // When the selected vote changes, open the selected vote panel.
  useEffect(() => {
    if (selectedVoteId !== '-1' && !didOpen) {
      requestOpen()
    }
  }, [selectedVoteId, requestOpen, didOpen])

  return selectedVotePanel
}

// Handles the main logic of the app.
export function useAppLogic() {
  const { isSyncing, ready } = useAppState()
  const [path, requestPath] = usePath()

  const votes = useVotes()
  const [selectedVote, selectVote] = useSelectedVote(votes)

  const newVotePanel = usePanelState()
  const selectedVotePanel = useSelectedVotePanel(selectedVote, selectVote)

  useEffect(() => {
    console.log('selectedVote?', selectedVote)
    if (selectedVote === null) {
      selectedVotePanel.requestClose(true)
    }
  }, [selectedVote])

  const actions = {
    createVote: useCreateVoteAction(newVotePanel.requestClose),
    vote: useVoteAction(selectedVotePanel.requestClose),
    execute: useExecuteAction(selectedVotePanel.requestClose),
  }

  return {
    isSyncing: isSyncing || !ready,
    votes,
    selectVote,
    selectedVote,
    actions,
    newVotePanel: useMemo(
      () => ({
        ...newVotePanel,
        // ensure there is only one panel opened at a time
        visible: newVotePanel.visible && !selectedVotePanel.visible,
      }),
      [newVotePanel, selectedVotePanel.visible]
    ),
    selectedVotePanel: useMemo(
      () => ({
        ...selectedVotePanel,
        visible: selectedVotePanel.visible && !newVotePanel.visible,
      }),
      [selectedVotePanel, newVotePanel.visible]
    ),
  }
}

export function AppLogicProvider({ children }) {
  return <AragonApi reducer={appStateReducer}>{children}</AragonApi>
}
