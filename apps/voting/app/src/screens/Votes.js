import React, { useCallback, useState, useEffect } from 'react'
import {
  BackButton,
  Badge,
  Bar,
  DropDown,
  GU,
  textStyle,
  useLayout,
  useTheme,
} from '@aragon/ui'
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import VotingCard from '../components/VotingCard/VotingCard'
import VotingCardGroup from '../components/VotingCard/VotingCardGroup'
import Vote from '../components/Vote'
import EmptyFilteredVotes from '../components/EmptyFilteredVotes'
import DateRangeInput from '../components/DateRange/DateRangeInput'
import {
  VOTE_STATUS_REJECTED,
  VOTE_STATUS_ACCEPTED,
  VOTE_STATUS_ONGOING,
  VOTE_STATUS_EXECUTED,
} from '../vote-types'
import { getVoteStatus, isVoteAction } from '../vote-utils'
import { useSettings } from '../vote-settings-manager'

const sortVotes = (a, b) => {
  const dateDiff = b.data.endDate - a.data.endDate
  // Order by descending voteId if there's no end date difference
  return dateDiff !== 0 ? dateDiff : b.voteId - a.voteId
}

const useFilterVotes = votes => {
  const { pctBase } = useSettings()
  const [filteredVotes, setFilteredVotes] = useState(votes)
  // Status - 0: All, 1: Open, 2: Closed
  const [statusFilter, setStatusFilter] = useState(-1)
  // Trend - 0: All, 1: Will pass, 2: Won't pass, 3: Tied
  const [trendFilter, setTrendFilter] = useState(-1)
  // Outcome - 0: All, 1: Passed, 2: Rejected, 3: Enacted, 4: Pending
  const [outcomeFilter, setOutcomeFilter] = useState(-1)
  // 0: All, 1: Finance, 2: Tokens, 3: Voting
  const [appFilter, setAppFilter] = useState(-1)
  //
  const [dateRangeFilter, setDateRangeFilter] = useState({
    start: null,
    end: null,
  })
  //
  const handleClearFilters = useCallback(() => {
    setStatusFilter(-1)
    setTrendFilter(-1)
    setOutcomeFilter(-1)
    setAppFilter(-1)
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
        data: { open, endDate, startDate: startTimestamp, yea, nay, executed },
      } = vote
      const voteStatus = getVoteStatus(vote, pctBase)
      const { start, end } = dateRangeFilter

      return (
        // status
        (statusFilter === -1 ||
          statusFilter === 0 ||
          ((open && statusFilter === 1) || (!open && statusFilter === 2))) &&
        // trend
        (trendFilter === -1 ||
          trendFilter === 0 ||
          ((open && (trendFilter === 1 && yea.cmp(nay) === 1)) ||
            (trendFilter === 2 && yea.cmp(nay) !== 1))) &&
        // outcome
        (outcomeFilter === -1 ||
          outcomeFilter === 0 ||
          ((!open &&
            (outcomeFilter === 1 &&
              (voteStatus === VOTE_STATUS_ACCEPTED ||
                voteStatus === VOTE_STATUS_EXECUTED))) ||
            (outcomeFilter === 2 && voteStatus === VOTE_STATUS_REJECTED) ||
            (outcomeFilter === 3 && voteStatus === VOTE_STATUS_EXECUTED) ||
            (outcomeFilter === 4 &&
              voteStatus === VOTE_STATUS_ACCEPTED &&
              isVoteAction(vote) &&
              !executed))) &&
        // app
        // date range
        (!(start || end) ||
          isWithinInterval(new Date(startTimestamp), {
            start: startOfDay(start),
            end: endOfDay(end),
          }) ||
          isWithinInterval(endDate, {
            start: startOfDay(start),
            end: endOfDay(end),
          }))
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
        setStatusFilter(!index ? -1 : index)
        setTrendFilter(-1)
      },
      [setStatusFilter, setTrendFilter]
    ),
    voteOutcomeFilter: outcomeFilter,
    handleVoteOutcomeFilterChange: useCallback(
      index => setOutcomeFilter(!index ? -1 : index),
      [setOutcomeFilter]
    ),
    voteTrendFilter: trendFilter,
    handleVoteTrendFilterChange: useCallback(
      index => setTrendFilter(!index ? -1 : index),
      [setTrendFilter]
    ),
    voteAppFilter: appFilter,
    handleVoteAppFilterChange: useCallback(
      index => setAppFilter(!index ? -1 : index),
      [setAppFilter]
    ),
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

const LayoutVotes = React.memo(function LayoutVotes({
  votes,
  selectedVote,
  selectVote,
  onVote,
  onExecute,
}) {
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
  } = useFilterVotes(votes, votes.map(({ voteId }) => voteId))
  const { openVotes, closedVotes } = useVotes(filteredVotes)
  const handleBackClick = () => selectVote(-1)

  return (
    <React.Fragment>
      {selectedVote !== null && (
        <React.Fragment>
          <Bar>
            <BackButton onClick={handleBackClick} />
          </Bar>
          <Vote vote={selectedVote} onVote={onVote} onExecute={onExecute} />
        </React.Fragment>
      )}
      {!selectedVote && (
        <div
          css={`
            & > div > div {
              overflow: unset;
            }
          `}
        >
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
                  selected={voteStatusFilter}
                  onChange={handleVoteStatusFilterChange}
                  label="Status"
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
                        <Badge.Info>{votes.length}</Badge.Info>
                      </span>
                    </div>,
                    'Open',
                    'Closed',
                  ]}
                  width="128px"
                />
                {voteStatusFilter === 1 && (
                  <DropDown
                    label="Trend"
                    selected={voteTrendFilter}
                    onChange={handleVoteTrendFilterChange}
                    items={['All', 'Will pass', 'Won’t pass']}
                    width="128px"
                  />
                )}
                {voteStatusFilter !== 1 && (
                  <DropDown
                    label="Outcome"
                    selected={voteOutcomeFilter}
                    onChange={handleVoteOutcomeFilterChange}
                    items={['All', 'Passed', 'Rejected', 'Enacted', 'Pending']}
                    width="128px"
                  />
                )}
                <DropDown
                  label="App type"
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
            <Votes
              openVotes={openVotes}
              closedVotes={closedVotes}
              onSelectVote={selectVote}
            />
          )}
        </div>
      )}
    </React.Fragment>
  )
})

const Votes = React.memo(({ openVotes, closedVotes, onSelectVote }) => {
  const votingGroups = [
    ['Open votes', openVotes],
    ['Closed votes', closedVotes],
  ]

  return (
    <React.Fragment>
      {votingGroups.map(([groupName, votes]) =>
        votes.length ? (
          <VotingCardGroup
            title={groupName}
            count={votes.length}
            key={groupName}
          >
            {votes.map(vote => (
              <VotingCard key={vote.voteId} vote={vote} onOpen={onSelectVote} />
            ))}
          </VotingCardGroup>
        ) : null
      )}
    </React.Fragment>
  )
})

export default LayoutVotes
