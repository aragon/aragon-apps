import React, { useCallback, useEffect, useMemo, useState }  from 'react'
import PropTypes from 'prop-types'
import Votes from './components/Votes'
import { isBefore } from 'date-fns'
import { useAragonApi } from './api-react'
import { useAppLogic } from './app-logic'
import {
  BackButton,
  Bar,
  DropDown,
  GU,
  Tag,
  textStyle,
  useLayout,
  useTheme,
} from '@aragon/ui'
import VoteDetails from './components/VoteDetails'
import { getVoteStatus } from './utils/vote-utils'
import Empty from './components/EmptyFilteredVotes'
import {
  VOTE_STATUS_EXECUTED,
  VOTE_STATUS_FAILED,
  VOTE_STATUS_SUCCESSFUL,
} from './utils/vote-types'

const NULL_FILTER_STATE = -1
const STATUS_FILTER_OPEN = 1
const STATUS_FILTER_CLOSED = 2
const OUTCOME_FILTER_PASSED = 1
const OUTCOME_FILTER_REJECTED = 2
const OUTCOME_FILTER_ENACTED = 3
const OUTCOME_FILTER_PENDING = 4
const APP_FILTER_ALLOCATIONS = 1
const APP_FILTER_PROJECTS = 2

const useFilterVotes = (votes, voteTime) => {
  const { appState: { globalMinQuorum = 0 } } = useAragonApi()
  const [ filteredVotes, setFilteredVotes ] = useState(votes)
  const [ statusFilter, setStatusFilter ] = useState(NULL_FILTER_STATE)
  const [ outcomeFilter, setOutcomeFilter ] = useState(NULL_FILTER_STATE)
  const [ appFilter, setAppFilter ] = useState(NULL_FILTER_STATE)

  const handleClearFilters = useCallback(() => {
    setStatusFilter(NULL_FILTER_STATE)
    setOutcomeFilter(NULL_FILTER_STATE)
    setAppFilter(NULL_FILTER_STATE)
  }, [
    setStatusFilter,
    setOutcomeFilter,
    setAppFilter,
  ])

  useEffect(() => {
    const now = new Date()
    const filtered = votes.filter(vote => {

      const endDate = new Date(vote.data.startDate + voteTime)
      const open = isBefore(now, endDate)
      const type = vote.data.type
      const voteStatus = getVoteStatus(vote, globalMinQuorum)

      if (statusFilter !== NULL_FILTER_STATE) {
        if (statusFilter === STATUS_FILTER_OPEN && !isBefore(now, endDate)) return false
        if (statusFilter === STATUS_FILTER_CLOSED && isBefore(now, endDate)) return false
      }

      if (appFilter !== NULL_FILTER_STATE) {
        if (appFilter === APP_FILTER_ALLOCATIONS &&
          type !== 'allocation'
        ) return false
        if (appFilter === APP_FILTER_PROJECTS &&
          type !== 'curation'
        ) return false
      }

      if (outcomeFilter !== NULL_FILTER_STATE) {
        if (open) return false
        if (outcomeFilter === OUTCOME_FILTER_PASSED &&
          !(voteStatus === VOTE_STATUS_SUCCESSFUL ||
            voteStatus === VOTE_STATUS_EXECUTED)
        ) return false
        if (outcomeFilter === OUTCOME_FILTER_REJECTED &&
          voteStatus !== VOTE_STATUS_FAILED
        ) return false
        if (outcomeFilter === OUTCOME_FILTER_ENACTED &&
          voteStatus !== VOTE_STATUS_EXECUTED
        ) return false
        if (outcomeFilter === OUTCOME_FILTER_PENDING &&
          voteStatus !== VOTE_STATUS_SUCCESSFUL
        ) return false
      }
      return true
    })

    setFilteredVotes(filtered)
  }, [
    statusFilter,
    outcomeFilter,
    appFilter,
    setFilteredVotes,
    votes,
  ])

  return {
    filteredVotes,
    voteStatusFilter: statusFilter,
    handleVoteStatusFilterChange: useCallback(
      index => {
        setStatusFilter(index || NULL_FILTER_STATE)
        if (index === STATUS_FILTER_OPEN) {
          setOutcomeFilter(NULL_FILTER_STATE)
        }
      },
      [setStatusFilter]
    ),
    voteOutcomeFilter: outcomeFilter,
    handleVoteOutcomeFilterChange: useCallback(
      index => setOutcomeFilter(index || NULL_FILTER_STATE),
      [setOutcomeFilter]
    ),
    voteAppFilter: appFilter,
    handleVoteAppFilterChange: useCallback(
      index => setAppFilter(index || NULL_FILTER_STATE),
      [setAppFilter]
    ),
    handleClearFilters,
  }
}

const Decisions = () => {
  const { api: app, appState, connectedAccount } = useAragonApi()
  const { decorateVote, selectVote, selectedVote, votes, voteTime } = useAppLogic()
  const { layoutName } = useLayout()
  const theme = useTheme()

  const handleVote = useCallback(async (voteId, supports) => {
    await app.vote(voteId, supports).toPromise()
    selectVote(-1) // is this correct?
  }, [app])
  const handleBackClick = useCallback(() => {
    selectVote(-1)
  }, [])
  const handleVoteOpen = useCallback(voteId => {
    const exists = votes.some(vote => voteId === vote.voteId)
    if (!exists) return
    selectVote(voteId)
  }, [votes])

  const {
    filteredVotes,
    voteStatusFilter,
    handleVoteStatusFilterChange,
    voteOutcomeFilter,
    handleVoteOutcomeFilterChange,
    voteAppFilter,
    handleVoteAppFilterChange,
    handleClearFilters,
  } = useFilterVotes(votes, voteTime)

  const currentVote =
      selectedVote === '-1'
        ? null
        : decorateVote(
          filteredVotes.find(vote => vote.voteId === selectedVote)
        )

  if (currentVote) {
    return (
      <React.Fragment>
        <Bar>
          <BackButton onClick={handleBackClick} />
        </Bar>
        <VoteDetails vote={currentVote} onVote={handleVote} />
      </React.Fragment>
    )
  }

  const preparedVotes = filteredVotes.map(decorateVote)
    .sort((a, b) => b.data.startDate - a.data.startDate)

  return (
    <React.Fragment>
      {layoutName !== 'small' && (
        <Bar>
          <div
            css={`
            height: ${8 * GU}px;
            display: grid;
            grid-template-columns: auto auto auto 1fr;
            grid-gap: ${1 * GU}px;
            align-items: center;
            padding-left: ${3 * GU}px;
          `}
          >
            <DropDown
              header="Status"
              placeholder="Status"
              selected={voteStatusFilter}
              onChange={handleVoteStatusFilterChange}
              items={[
                // eslint-disable-next-line react/jsx-key
                <div>
                All
                  <span
                    css={`
                    margin-left: ${1.5 * GU}px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    color: ${theme.info};
                    ${textStyle('label3')};
                  `}
                  >
                    <Tag limitDigits={4} label={votes.length} size="small" />
                  </span>
                </div>,
                'Open',
                'Closed',
              ]}
              width="128px"
            />
            {voteStatusFilter !== STATUS_FILTER_OPEN && (
              <DropDown
                header="Outcome"
                placeholder="Outcome"
                selected={voteOutcomeFilter}
                onChange={handleVoteOutcomeFilterChange}
                items={[ 'All', 'Passed', 'Rejected', 'Enacted', 'Pending' ]}
                width="128px"
              />
            )}
            <DropDown
              header="App"
              placeholder="App"
              selected={voteAppFilter}
              onChange={handleVoteAppFilterChange}
              items={[ 'All', 'Allocations', 'Projects' ]}
              width="128px"
            />
          </div>
        </Bar>
      )}

      {!preparedVotes.length
        ? <Empty onClear={handleClearFilters} />
        : (
          <Votes
            votes={preparedVotes}
            onSelectVote={handleVoteOpen}
            app={app}
            userAccount={connectedAccount}
          />
        )
      }
    </React.Fragment>
  )
}

export default Decisions
