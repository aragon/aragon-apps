import React from 'react'
import styled from 'styled-components'
import { Badge, theme } from '@aragon/ui'
import VotingCard from '../components/VotingCard/VotingCard'
import VotingCardGroup from '../components/VotingCard/VotingCardGroup'
import VoteStatus from '../components/VoteStatus'
import { shortenAddress, transformAddresses } from '../web3-utils'
import { VOTE_YEA, VOTE_NAY } from '../vote-types'

class Votes extends React.Component {
  getQuestionLabel({ metadata = '', description = '' }) {
    return transformAddresses(
      [metadata, description].join(' '),
      (part, isAddress, index) =>
        isAddress ? (
          <span title={part} key={index}>
            {shortenAddress(part)}
          </span>
        ) : (
          <span key={index}>{part}</span>
        )
    )
  }
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
    const sortedVotes = votes.sort(
      (a, b) => (a.data.endDate > b.data.endDate ? -1 : 1)
    )

    const openVotes = sortedVotes.filter(vote => vote.data.open)
    const closedVotes = sortedVotes.filter(vote => !openVotes.includes(vote))
    const votingGroups = [
      ['Open votes', openVotes],
      ['Past votes', closedVotes],
    ]
    return (
      <React.Fragment>
        {votingGroups.map(
          ([groupName, votes]) =>
            votes.length ? (
              <VotingCardGroup
                title={groupName}
                count={votes.length}
                key={groupName}
              >
                {votes.map(vote => (
                  <VotingCard
                    key={vote.voteId}
                    id={vote.voteId}
                    status={
                      vote.open ? null : <VoteStatus vote={vote} cardStyle />
                    }
                    endDate={vote.data.endDate}
                    open={vote.data.open}
                    question={this.getQuestionLabel(vote.data)}
                    description={vote.data.description}
                    votingPower={vote.numData.votingPower}
                    onOpen={onSelectVote}
                    options={[
                      {
                        label: this.optionLabel('Yes', vote, VOTE_YEA),
                        power: vote.numData.yea,
                      },
                      {
                        label: this.optionLabel('No', vote, VOTE_NAY),
                        power: vote.numData.nay,
                        color: theme.negative,
                      },
                    ]}
                  />
                ))}
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
