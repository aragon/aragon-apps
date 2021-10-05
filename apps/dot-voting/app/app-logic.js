import React, { useCallback, useMemo } from 'react'
import { AragonApi, useAppState, usePath } from '@aragon/api-react'
import PropTypes from 'prop-types'
import appStateReducer from './app-state-reducer'
import { isBefore } from 'date-fns'
import { getTotalSupport } from './utils/vote-utils'
import { safeDiv } from './utils/math-utils'


const VOTE_ID_PATH_RE = /^\/vote\/([0-9]+)\/?$/
const NO_VOTE_ID = '-1'

function voteIdFromPath(path) {
  if (!path) {
    return NO_VOTE_ID
  }
  const matches = path.match(VOTE_ID_PATH_RE)
  return matches ? matches[1] : NO_VOTE_ID
}

// Get the vote currently selected, or null otherwise.
export function useSelectedVote(votes) {
  const [ path, requestPath ] = usePath()

  // The memoized vote currently selected.
  const selectedVote = useMemo(() => {
    const voteId = voteIdFromPath(path)
    return (votes.findIndex(vote => vote.voteId === voteId) !== -1) ? voteId : NO_VOTE_ID
  }, [ path, votes ])

  const selectVote = useCallback(
    voteId => {
      requestPath(String(voteId) === NO_VOTE_ID ? '' : `/vote/${voteId}/`)
    },
    [requestPath]
  )

  return [ selectedVote, selectVote ]
}


// Handles the main logic of the app.
export function useAppLogic() {
  const { isSyncing = true, votes = [], voteTime = 0, pctBase = 0 } = useAppState()
  const [ selectedVote, selectVote ] = useSelectedVote(votes)
  const decorateVote = useCallback(vote => {
    const endDate = new Date(vote.data.startDate + voteTime)
    return {
      ...vote,
      endDate,
      open: isBefore(new Date(), endDate),
      quorum: safeDiv(vote.data.minAcceptQuorum, pctBase),
      description: vote.data.metadata,
      totalSupport: getTotalSupport(vote.data),
      type: vote.data.type,
    }
  }, [ voteTime, pctBase ])

  return {
    decorateVote,
    selectVote,
    selectedVote,
    votes,
    voteTime,
    pctBase,
    isSyncing
  }
}


export const AppLogicProvider = ({ children }) => {
  return <AragonApi reducer={appStateReducer}>{children}</AragonApi>
}

AppLogicProvider.propTypes = {
  children: PropTypes.node.isRequired,
}
