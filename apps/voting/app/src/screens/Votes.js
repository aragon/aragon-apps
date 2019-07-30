import React, { useState, useEffect } from 'react'
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
import VotingCard from '../components/VotingCard/VotingCard'
import VotingCardGroup from '../components/VotingCard/VotingCardGroup'
import Vote from '../components/Vote'
import DateRangeInput from '../components/DateRange/DateRangeInput'
import { getVoteSuccess } from '../vote-utils'
import { useSettings } from '../vote-settings-manager'
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns'

const sortVotes = (a, b) => {
  const dateDiff = b.data.endDate - a.data.endDate
  // Order by descending voteId if there's no end date difference
  return dateDiff !== 0 ? dateDiff : b.voteId - a.voteId
}

const useFilterVotes = votes => {
  const settings = useSettings()
  const [filteredVotes, setFilteredVotes] = useState(votes)
  // 0: All, 1: Open, 2: Past
  const [openFilter, setOpenFilter] = useState(0)
  // 0: All, 1: Finance, 2: Tokens, 3: Voting
  const [appFilter, setAppFilter] = useState(0)
  // 0: All, 1: Passed, 2: Rejected
  const [statusFilter, setStatusFilter] = useState(0)
  //
  const [dateRangeFilter, setDateRangeFilter] = useState({
    start: null,
    end: null,
  })

  useEffect(() => {
    const filtered = votes.filter(vote => {
      const {
        data: { open, endDate, startDate: startTimestamp },
      } = vote
      const voteSuccess = getVoteSuccess(vote, settings.pctBase)
      const { start, end } = dateRangeFilter

      return (
        // open
        (openFilter === 0 ||
          ((open && openFilter === 1) || (!open && openFilter === 2))) &&
        // type
        // status
        // will remove all items if open filter is "open"
        // as no open votes have a "status"
        (statusFilter === 0 ||
          ((!open && statusFilter === 1 && voteSuccess) ||
            (!open && statusFilter === 2 && !voteSuccess))) &&
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
    votes,
    openFilter,
    appFilter,
    statusFilter,
    dateRangeFilter,
    setFilteredVotes,
  ])

  return {
    filteredVotes,
    voteOpenFilter: openFilter,
    handleVoteOpenFilterChange: setOpenFilter,
    voteAppFilter: appFilter,
    handleVoteAppFilterChange: setAppFilter,
    voteStatusFilter: statusFilter,
    handleVoteStatusFilterChange: setStatusFilter,
    voteDateRangeFilter: dateRangeFilter,
    handleVoteDateRangeFilterChange: setDateRangeFilter,
  }
}

const useVotes = votes => {
  const sortedVotes = votes.sort(sortVotes)
  const openVotes = sortedVotes.filter(vote => vote.data.open)
  const closedVotes = sortedVotes.filter(vote => !openVotes.includes(vote))
  return { openVotes, closedVotes }
}

const LayoutVotes = ({
  votes,
  selectedVote,
  selectVote,
  onVote,
  onExecute,
}) => {
  const theme = useTheme()
  const { layoutName } = useLayout()
  const {
    filteredVotes,
    voteOpenFilter,
    handleVoteOpenFilterChange,
    voteAppFilter,
    handleVoteAppFilterChange,
    voteStatusFilter,
    handleVoteStatusFilterChange,
    voteDateRangeFilter,
    handleVoteDateRangeFilterChange,
  } = useFilterVotes(votes)
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
                  selected={voteOpenFilter}
                  onChange={handleVoteOpenFilterChange}
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
                    'Past',
                  ]}
                  width="128px"
                />
                <DropDown
                  label="Type"
                  selected={voteAppFilter}
                  onChange={handleVoteAppFilterChange}
                  items={['All', 'Finance', 'Tokens', 'Voting']}
                  width="128px"
                />
                <DropDown
                  label="Status"
                  selected={voteStatusFilter}
                  onChange={handleVoteStatusFilterChange}
                  items={['All', 'Passed', 'Rejected']}
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
          <Votes
            openVotes={openVotes}
            closedVotes={closedVotes}
            onSelectVote={selectVote}
          />
        </div>
      )}
    </React.Fragment>
  )
}

const Votes = React.memo(({ openVotes, closedVotes, onSelectVote }) => {
  const votingGroups = [['Open votes', openVotes], ['Past votes', closedVotes]]

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
