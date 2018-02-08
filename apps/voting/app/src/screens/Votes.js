import React from 'react'
import styled from 'styled-components'
import { BadgeNumber, Button, colors } from '@aragon/ui'
import VotesTable from '../components/VotesTable'
import { isVoteOpen } from '../vote-utils'

class Votes extends React.Component {
  render() {
    const { votes, onSelectVote, tokenSupply, voteTime } = this.props
    const openedVotes = votes.filter(({ vote }) => isVoteOpen(vote, voteTime))
    const closedVotes = votes.filter(vote => !openedVotes.includes(vote))
    return (
      <Main>
        <VotesTableWrapper>
          <Title>
            <span>Opened Votes</span>
            <BadgeNumber
              background={colors.Rain['Rain Sky']}
              color={colors.Rain.Slate}
              number={openedVotes.length}
              inline
            />
          </Title>
          <VotesTable
            votes={openedVotes}
            voteTime={voteTime}
            opened={true}
            tokenSupply={tokenSupply}
            onSelectVote={onSelectVote}
          />
        </VotesTableWrapper>

        <VotesTableWrapper>
          <Title>
            <span>Closed Votes</span>
          </Title>
          <VotesTable
            title=""
            votes={closedVotes}
            voteTime={voteTime}
            opened={false}
            tokenSupply={tokenSupply}
            onSelectVote={onSelectVote}
          />
        </VotesTableWrapper>

        <SeeMoreWrapper>
          <Button mode="secondary">Show Previous Votes</Button>
        </SeeMoreWrapper>
      </Main>
    )
  }
}

const Main = styled.div`
  min-width: 800px;
`

const Title = styled.h1`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  font-weight: 600;
  font-size: 16px;
  & > span:first-child {
    margin-right: 10px;
  }
`

const VotesTableWrapper = styled.div`
  margin-bottom: 30px;
`

const SeeMoreWrapper = styled.div`
  display: flex;
  justify-content: center;
`

export default Votes
