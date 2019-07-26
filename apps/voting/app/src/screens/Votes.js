import React, { useState } from 'react'
import { BackButton, Bar } from '@aragon/ui'
import VotingCard from '../components/VotingCard/VotingCard'
import VotingCardGroup from '../components/VotingCard/VotingCardGroup'
import Vote from '../components/Vote'

const sortVotes = (a, b) => {
  const dateDiff = b.data.endDate - a.data.endDate
  // Order by descending voteId if there's no end date difference
  return dateDiff !== 0 ? dateDiff : b.voteId - a.voteId
}

const useFilterVotes = votes => {
  return { filteredVotes: votes }
}

const useVotes = votes => {
  const sortedVotes = votes.sort(sortVotes)
  const openVotes = sortedVotes.filter(vote => vote.data.open)
  const closedVotes = sortedVotes.filter(vote => !openVotes.includes(vote))
  return { openVotes, closedVotes }
}

const LayoutVotes = ({ votes, selectedVote, selectVote }) => {
  const { filteredVotes } = useFilterVotes(votes)
  const { openVotes, closedVotes } = useVotes(filteredVotes)
  const handleBackClick = () => selectVote(-1)

  return (
    <React.Fragment>
      {selectedVote !== null && (
        <React.Fragment>
          <Bar>
            <BackButton onClick={handleBackClick} />
          </Bar>
          <Vote vote={selectedVote} />
        </React.Fragment>
      )}
      {!selectedVote && (
        <React.Fragment>
          <Bar>Filters</Bar>
          <Votes
            openVotes={openVotes}
            closedVotes={closedVotes}
            onSelectVote={selectVote}
          />
        </React.Fragment>
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
