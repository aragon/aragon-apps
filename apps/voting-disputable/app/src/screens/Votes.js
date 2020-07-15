import React, { useMemo } from 'react'
import {
  Bar,
  DropDown,
  Tag,
  GU,
  textStyle,
  useLayout,
  useTheme,
  DateRangePicker,
} from '@aragon/ui'
import EmptyFilteredVotes from '../components/EmptyFilteredVotes'
import VoteCard from '../components/VoteCard/VoteCard'
import VoteCardGroup from '../components/VoteCard/VoteCardGroup'

const sortVotes = (a, b) => {
  const dateDiff = b.data.endDate - a.data.endDate
  // Order by descending voteId if there's no end date difference
  return dateDiff !== 0 ? dateDiff : b.voteId - a.voteId
}

const useVotes = votes => {
  const sortedVotes = votes.sort(sortVotes)
  const openVotes = sortedVotes.filter(vote => vote.data.open)
  const closedVotes = sortedVotes.filter(vote => !openVotes.includes(vote))
  return { openVotes, closedVotes }
}

const Votes = React.memo(function Votes({
  votes,
  selectVote,
  executionTargets,
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
}) {
  const theme = useTheme()
  const { layoutName } = useLayout()
  const { openVotes, closedVotes } = useVotes(filteredVotes)

  const multipleOfTarget = useMemo(
    () =>
      executionTargets.reduce((map, { appAddress }) => {
        map.set(appAddress, map.has(appAddress))
        return map
      }, new Map()),
    [executionTargets]
  )

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
            {voteStatusFilter === 1 && (
              <DropDown
                header="Trend"
                placeholder="Trend"
                selected={voteTrendFilter}
                onChange={handleVoteTrendFilterChange}
                items={['All', 'Will pass', 'Won’t pass']}
                width="128px"
              />
            )}
            {voteStatusFilter !== 1 && (
              <DropDown
                header="Outcome"
                placeholder="Outcome"
                selected={voteOutcomeFilter}
                onChange={handleVoteOutcomeFilterChange}
                items={['All', 'Passed', 'Rejected', 'Enacted', 'Pending']}
                width="128px"
              />
            )}
            <DropDown
              header="App"
              placeholder="App"
              selected={voteAppFilter}
              onChange={handleVoteAppFilterChange}
              items={[
                'All',
                <ThisVoting showTag={multipleOfTarget.get('Voting')} />,
                ...executionTargets.map(
                  ({ appAddress, name, identifier }) =>
                    `${name}${
                      multipleOfTarget.get(appAddress) && identifier
                        ? ` (${identifier})`
                        : ''
                    }`
                ),
                'External',
              ]}
              width="128px"
            />
            <DateRangePicker
              startDate={voteDateRangeFilter.start}
              endDate={voteDateRangeFilter.end}
              onChange={handleVoteDateRangeFilterChange}
              format={'YYYY/MM/DD'}
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

const ThisVoting = ({ showTag }) => (
  <div
    css={`
      display: flex;
      align-items: center;
    `}
  >
    Voting
    {showTag && (
      <Tag
        size="small"
        css={`
          margin-left: ${1 * GU}px;
        `}
      >
        this app
      </Tag>
    )}
  </div>
)

const VoteGroups = React.memo(({ openVotes, closedVotes, onSelectVote }) => {
  const voteGroups = [
    ['Open votes', openVotes],
    ['Closed votes', closedVotes],
  ]

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
