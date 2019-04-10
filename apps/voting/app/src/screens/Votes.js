import React from 'react'
import styled from 'styled-components'
import { Badge, theme } from '@aragon/ui'
import VotingCard from '../components/VotingCard/VotingCard'
import VotingCardGroup from '../components/VotingCard/VotingCardGroup'
import VoteStatus from '../components/VoteStatus'
import VoteText from '../components/VoteText'
import { VOTE_YEA, VOTE_NAY } from '../vote-types'

class Votes extends React.PureComponent {
  optionLabel(label, vote, voteType) {
    return (
      <span>
        <span>{label}</span>
        {vote.userAccountVote === voteType && <You />}
      </span>
    )
  }
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
              {votes.map(vote => {
                const { voteId } = vote
                const { votingPower, yea, nay } = vote.numData
                const { endDate, open, metadata, description } = vote.data
                return (
                  <VotingCard
                    key={voteId}
                    id={voteId}
                    status={open ? null : <VoteStatus vote={vote} cardStyle />}
                    endDate={endDate}
                    open={open}
                    label={<VoteText text={metadata || description} />}
                    votingPower={votingPower}
                    onOpen={onSelectVote}
                    options={[
                      {
                        label: this.optionLabel('Yes', vote, VOTE_YEA),
                        power: yea,
                      },
                      {
                        label: this.optionLabel('No', vote, VOTE_NAY),
                        power: nay,
                        color: theme.negative,
                      },
                    ]}
                  />
                )
              })}
            </VotingCardGroup>
          ) : null
        )}
      </React.Fragment>
    )
  }
}

const You = styled(Badge.Identity).attrs({ children: 'Your vote' })`
  margin-left: 5px;
  font-size: 9px;
  text-transform: uppercase;
`

export default Votes
