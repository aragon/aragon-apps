import React from 'react'
import VotingCard from '../components/VotingCard/VotingCard'
import VotingCardGroup from '../components/VotingCard/VotingCardGroup'

const Votes = React.memo(({ votes, onSelectVote }) => {
  const sortedVotes = votes.sort((a, b) => {
    const dateDiff = b.data.endDate - a.data.endDate
    // Order by descending voteId if there's no end date difference
    return dateDiff !== 0 ? dateDiff : b.voteId - a.voteId
  })

  const openVotes = sortedVotes.filter(vote => vote.data.open)
  const closedVotes = sortedVotes.filter(vote => !openVotes.includes(vote))
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

export default Votes
