import React from 'react'
import styled from 'styled-components'
import {
  BadgeNumber,
  // Button,
  colors,
} from '@aragon/ui'
import VotesTable from '../components/VotesTable'

class Votes extends React.Component {
  render() {
    const { votes, onSelectVote } = this.props
    const openedVotes = votes.filter(({ open }) => open)
    const closedVotes = votes.filter(vote => !openedVotes.includes(vote))
    return (
      <Main>
        {openedVotes.length > 0 && (
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
              opened
              votes={openedVotes}
              onSelectVote={onSelectVote}
            />
          </VotesTableWrapper>
        )}

        {closedVotes.length > 0 && (
          <VotesTableWrapper>
            <Title>
              <span>Closed Votes</span>
            </Title>
            <VotesTable
              opened={false}
              votes={closedVotes}
              onSelectVote={onSelectVote}
            />
          </VotesTableWrapper>
        )}

        {/* <SeeMoreWrapper>
          <Button mode="secondary">Show Previous Votes</Button>
        </SeeMoreWrapper> */}
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

// const SeeMoreWrapper = styled.div`
//   display: flex;
//   justify-content: center;
// `

export default Votes
