import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AragonApi,
  useAragonApi,
  useApi,
  useAppState,
  useConnectedAccount,
} from '@aragon/api-react'
import {
  getCanExecute,
  getCanVote,
  getUserBalance,
  isVoteOpen,
  voteTypeFromContractEnum,
} from './vote-utils'
import { noop } from './utils'
import appStateReducer from './app-state-reducer'
import { useNow, usePromise } from './utils-hooks'
import TOKEN_ABI from './abi/token-balanceOfAt.json'
import { VOTE_YEA } from './vote-types'
import { EMPTY_CALLSCRIPT } from './evmscript-utils'

// Get the voting state of the connected account for every vote.
export function useConnectedAccountVotes() {
  const api = useApi()
  const { votes } = useAppState()
  const connectedAccount = useConnectedAccount()
  const [connectedAccountVotes, setConnectedAccountVotes] = useState(new Map())

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

// Get the votes array ready to be used in the app.
export function useVotes(renderVoteText) {
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

        open: isVoteOpen(vote, now),

        // Render text fields
        descriptionNode: renderVoteText(vote.data.description),
        metadataNode: renderVoteText(vote.data.metadata),
      },
      userAccountVote: connectedAccountVotes.get(vote.voteId),
    }))
  }, [votes, connectedAccountVotes, now, renderVoteText])
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

// Load and returns the token contract, or null if not loaded yet.
export function useTokenContract() {
  const api = useApi()
  const { tokenAddress } = useAppState()
  const [contract, setContract] = useState(null)

  useEffect(() => {
    // We assume there is never any reason to set the contract back to null.
    if (api && tokenAddress) {
      setContract(api.external(tokenAddress, TOKEN_ABI))
    }
  }, [api, tokenAddress])

  return contract
}

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
export function useCreateVoteAction(onDone) {
  const api = useApi()
  return useCallback(
    question => {
      if (api) {
        api.newVote(EMPTY_CALLSCRIPT, question)
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
      api.vote(voteId, voteType === VOTE_YEA, executesIfDecided)
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
      api.executeVote(voteId)
      onDone()
    },
    [api, onDone]
  )
}

// Handles the state of a panel.
export function usePanelState({ onDidOpen = noop, onDidClose = noop } = {}) {
  const [visible, setVisible] = useState(false)

  // `didOpen` is set to `true` when the opening transition of the panel has
  // ended, `false` otherwise. This is useful to know when to start inner
  // transitions in the panel content.
  const [didOpen, setDidOpen] = useState(false)

  const requestOpen = useCallback(() => {
    setVisible(true)
    setDidOpen(false)
  }, [setVisible, setDidOpen])

  const requestClose = useCallback(() => {
    setVisible(false)
  }, [setVisible])

  // To be passed to the onTransitionEnd prop of SidePanel.
  const onTransitionEnd = useCallback(
    opened => {
      if (opened) {
        onDidOpen()
        setDidOpen(true)
      } else {
        onDidClose()
        setDidOpen(false)
      }
    },
    [onDidClose, onDidOpen, setDidOpen]
  )

  return { requestOpen, requestClose, visible, didOpen, onTransitionEnd }
}

// Handles the state of the selected vote panel.
export function useSelectedVotePanel(selectedVote, selectVote) {
  const selectedVoteId = selectedVote ? selectedVote.voteId : '-1'

  // Only deselect the current vote when the panel is fully closed, so that
  // the panel doesn’t appear empty while being closed.
  const onDidClose = useCallback(() => {
    selectVote('-1')
  }, [selectVote])

  const selectedVotePanel = usePanelState({ onDidClose })

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
export function useAppLogic({ renderVoteText }) {
  const votes = useVotes(renderVoteText)
  const [selectedVote, selectVote] = useSelectedVote(votes)
  const newVotePanel = usePanelState()
  const selectedVotePanel = useSelectedVotePanel(selectedVote, selectVote)

  const actions = {
    createVote: useCreateVoteAction(() => {
      newVotePanel.close()
    }),
    vote: useVoteAction(() => {
      selectedVotePanel.close()
    }),
    execute: useExecuteAction(() => {
      selectedVotePanel.close()
    }),
  }

  return {
    votes,
    selectVote,
    selectedVote,
    actions,

    newVotePanel: {
      ...newVotePanel,
      // ensure there is only one panel opened at a time
      visible: newVotePanel.visible && !selectedVotePanel.visible,
    },
    selectedVotePanel: {
      ...selectedVotePanel,
      visible: selectedVotePanel.visible && !newVotePanel.visible,
    },
  }
}

export function AppLogicProvider({ children }) {
  return <AragonApi reducer={appStateReducer}>{children}</AragonApi>
}
