import React, { useCallback, useState, useEffect } from 'react'
import {
  Bar,
  DropDown,
  GU,
  Tag,
  textStyle,
  useLayout,
  useTheme,
} from '@aragon/ui'
import { startOfDay, endOfDay, isAfter, isBefore } from 'date-fns'
import DateRangeInput from '../components/DateRange/DateRangeInput'
import EmptyFilteredVotes from '../components/EmptyFilteredVotes'
import VoteCard from '../components/VoteCard/VoteCard'
import VoteCardGroup from '../components/VoteCard/VoteCardGroup'
import { useSettings } from '../vote-settings-manager'
import {
  VOTE_STATUS_ONGOING,
  VOTE_STATUS_REJECTED,
  VOTE_STATUS_ACCEPTED,
  VOTE_STATUS_PENDING_ENACTMENT,
  VOTE_STATUS_ENACTED,
} from '../vote-types'
import { getVoteStatus } from '../vote-utils'

const NULL_FILTER_STATE = -1
const STATUS_FILTER_OPEN = 1
const STATUS_FILTER_CLOSED = 2
const TREND_FILTER_WILL_PASS = 1
const TREND_FILTER_WILL_NOT_PASS = 2
const OUTCOME_FILTER_PASSED = 1
const OUTCOME_FILTER_REJECTED = 2
const OUTCOME_FILTER_ENACTED = 3
const OUTCOME_FILTER_PENDING = 4

const sortVotes = (a, b) => {
  const dateDiff = b.data.endDate - a.data.endDate
  // Order by descending voteId if there's no end date difference
  return dateDiff !== 0 ? dateDiff : b.voteId - a.voteId
}

const useFilterVotes = votes => {
  const { pctBase } = useSettings()
  const [filteredVotes, setFilteredVotes] = useState(votes)
  const [statusFilter, setStatusFilter] = useState(NULL_FILTER_STATE)
  const [trendFilter, setTrendFilter] = useState(NULL_FILTER_STATE)
  const [outcomeFilter, setOutcomeFilter] = useState(NULL_FILTER_STATE)
  // 0: All, 1: Finance, 2: Tokens, 3: Voting
  const [appFilter, setAppFilter] = useState(NULL_FILTER_STATE)
  //
  const [dateRangeFilter, setDateRangeFilter] = useState({
    start: null,
    end: null,
  })
  //
  const handleClearFilters = useCallback(() => {
    setStatusFilter(NULL_FILTER_STATE)
    setTrendFilter(NULL_FILTER_STATE)
    setOutcomeFilter(NULL_FILTER_STATE)
    setAppFilter(NULL_FILTER_STATE)
    setDateRangeFilter({ start: null, end: null })
  }, [
    setStatusFilter,
    setTrendFilter,
    setOutcomeFilter,
    setAppFilter,
    setDateRangeFilter,
  ])

  useEffect(() => {
    const filtered = votes.filter(vote => {
      const {
        data: { endDate, startDate, yea, nay },
      } = vote
      const voteStatus = getVoteStatus(vote, pctBase)
      const { start, end } = dateRangeFilter

      return (
        // status
        (statusFilter === NULL_FILTER_STATE ||
          ((statusFilter === STATUS_FILTER_OPEN &&
            voteStatus === VOTE_STATUS_ONGOING) ||
            (statusFilter === STATUS_FILTER_CLOSED &&
              voteStatus !== VOTE_STATUS_ONGOING))) &&
        // trend
        (trendFilter === NULL_FILTER_STATE ||
          ((open && (trendFilter === TREND_FILTER_WILL_PASS && yea.gt(nay))) ||
            (trendFilter === TREND_FILTER_WILL_NOT_PASS && yea.lte(nay)))) &&
        // outcome
        (outcomeFilter === NULL_FILTER_STATE ||
          ((outcomeFilter === OUTCOME_FILTER_PASSED &&
            (voteStatus === VOTE_STATUS_ACCEPTED ||
              voteStatus === VOTE_STATUS_PENDING_ENACTMENT ||
              voteStatus === VOTE_STATUS_ENACTED)) ||
            (outcomeFilter === OUTCOME_FILTER_REJECTED &&
              voteStatus === VOTE_STATUS_REJECTED) ||
            (outcomeFilter === OUTCOME_FILTER_ENACTED &&
              voteStatus === VOTE_STATUS_ENACTED) ||
            (outcomeFilter === OUTCOME_FILTER_PENDING &&
              voteStatus === VOTE_STATUS_PENDING_ENACTMENT))) &&
        // app
        // date range
        ((!start || isAfter(startDate, startOfDay(start))) &&
          (!end || isBefore(endDate, endOfDay(end))))
      )
    })
    setFilteredVotes(filtered)
  }, [
    statusFilter,
    outcomeFilter,
    trendFilter,
    appFilter,
    dateRangeFilter,
    pctBase,
    setFilteredVotes,
    votes,
  ])

  return {
    filteredVotes,
    voteStatusFilter: statusFilter,
    handleVoteStatusFilterChange: useCallback(
      index => {
        setStatusFilter(index || NULL_FILTER_STATE)
        setTrendFilter(NULL_FILTER_STATE)
      },
      [setStatusFilter, setTrendFilter]
    ),
    voteOutcomeFilter: outcomeFilter,
    handleVoteOutcomeFilterChange: useCallback(
      index => setOutcomeFilter(index || NULL_FILTER_STATE),
      [setOutcomeFilter]
    ),
    voteTrendFilter: trendFilter,
    handleVoteTrendFilterChange: useCallback(
      index => setTrendFilter(index || NULL_FILTER_STATE),
      [setTrendFilter]
    ),
    voteAppFilter: appFilter,
    handleVoteAppFilterChange: useCallback(index => setAppFilter(index), [
      setAppFilter,
    ]),
    voteDateRangeFilter: dateRangeFilter,
    handleVoteDateRangeFilterChange: setDateRangeFilter,
    handleClearFilters,
  }
}

const useVotes = votes => {
  const sortedVotes = votes.sort(sortVotes)
  const openVotes = sortedVotes.filter(vote => vote.data.open)
  const closedVotes = sortedVotes.filter(vote => !openVotes.includes(vote))
  return { openVotes, closedVotes }
}

const Votes = React.memo(function Votes({ votes, selectVote }) {
  const theme = useTheme()
  const { layoutName } = useLayout()
  const {
    filteredVotes,
    voteStatusFilter,
    handleVoteStatusFilterChange,
    voteOutcomeFilter,
    handleVoteOutcomeFilterChange,
    voteTrendFilter,
    handleVoteTrendFilterChange,
    voteAppFilter,
    handleVoteAppFilterChange,
    voteDateRangeFilter,
    handleVoteDateRangeFilterChange,
    handleClearFilters,
  } = useFilterVotes(votes)
  const { openVotes, closedVotes } = useVotes(filteredVotes)

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
              placeholder="Status"
              selected={voteStatusFilter}
              onChange={handleVoteStatusFilterChange}
              items={[
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
                    <Tag>{votes.length > 9999 ? '9999+' : votes.length}</Tag>
                  </span>
                </div>,
                'Open',
                'Closed',
              ]}
              width="128px"
            />
            {voteStatusFilter === 1 && (
              <DropDown
                placeholder="Trend"
                selected={voteTrendFilter}
                onChange={handleVoteTrendFilterChange}
                items={['All', 'Will pass', 'Won’t pass']}
                width="128px"
              />
            )}
            {voteStatusFilter !== 1 && (
              <DropDown
                placeholder="Outcome"
                selected={voteOutcomeFilter}
                onChange={handleVoteOutcomeFilterChange}
                items={['All', 'Passed', 'Rejected', 'Enacted', 'Pending']}
                width="128px"
              />
            )}
            <DropDown
              placeholder="App type"
              selected={voteAppFilter}
              onChange={handleVoteAppFilterChange}
              items={['All', 'Finance', 'Tokens', 'Voting']}
              width="128px"
            />
            <DateRangeInput
              startDate={voteDateRangeFilter.start}
              endDate={voteDateRangeFilter.end}
              onChange={handleVoteDateRangeFilterChange}
            />
          </div>
        </Bar>
      )}
      {!filteredVotes.length ? (
        <EmptyFilteredVotes onClear={handleClearFilters} />
      ) : (
        <VoteGroups
          openVotes={openVotes}
          closedVotes={closedVotes}
          onSelectVote={selectVote}
        />
      )}
    </React.Fragment>
  )
})

const VoteGroups = React.memo(({ openVotes, closedVotes, onSelectVote }) => {
  const voteGroups = [['Open votes', openVotes], ['Closed votes', closedVotes]]

  return (
    <React.Fragment>
      {voteGroups.map(([groupName, votes]) =>
        votes.length ? (
          <VoteCardGroup title={groupName} count={votes.length} key={groupName}>
            {votes.map(vote => (
              <VoteCard key={vote.voteId} vote={vote} onOpen={onSelectVote} />
            ))}
          </VoteCardGroup>
        ) : null
      )}
    </React.Fragment>
  )
})

export default Votes
