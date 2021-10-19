import React from 'react'
import PropTypes from 'prop-types'
import VoteCardGroup from './VoteCardGroup'
import VotingCard from './VotingCard'

const Votes = ({ app, votes, onSelectVote, userAccount }) => {

  const openedVotes = votes.filter(({ open }) => open)
  const closedVotes = votes.filter(({ open }) => !open)

  const votingGroups = [
    [ 'Open votes', openedVotes ],
    [ 'Closed votes', closedVotes ],
  ]

  return votingGroups.map(([ groupName, votes ]) =>
    !!votes.length && (
      <VoteCardGroup
        title={groupName}
        count={votes.length}
        key={groupName}
      >
        {votes.map(vote => (
          <VotingCard
            key={vote.voteId}
            app={app}
            vote={vote}
            onSelectVote={onSelectVote}
            userAccount={userAccount}
          />
        ))}
      </VoteCardGroup>
    )
  )
}

Votes.propTypes = {
  app: PropTypes.object,
  onSelectVote: PropTypes.func.isRequired,
  votes: PropTypes.arrayOf(PropTypes.object).isRequired,
  userAccount: PropTypes.string.isRequired,
}

export default Votes
