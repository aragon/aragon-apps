import React from 'react'
import VotingCard from '../components/VotingCard/VotingCard'
import VotingCardGroup from '../components/VotingCard/VotingCardGroup'

class Votes extends React.PureComponent {
  render() {
    const { votes, onSelectVote } = this.props
    const sortedVotes = votes.sort((a, b) =>
      a.data.endDate > b.data.endDate ? -1 : 1
    )

    const openVotes = sortedVotes.filter(vote => vote.data.open)
    const closedVotes = sortedVotes.filter(vote => !openVotes.includes(vote))
    const votingGroups = [
      ['Open votes', openVotes],
      ['Past votes', closedVotes],
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
                <VotingCard
                  key={vote.voteId}
                  vote={vote}
                  onOpen={onSelectVote}
                />
              ))}
            </VotingCardGroup>
          ) : null
        )}
      </React.Fragment>
    )
  }
}

export default Votes
