import React from 'react'
import styled from 'styled-components'
import { BadgeNumber, Button, colors } from '@aragon/ui'

import VotingsTable from '../components/VotingsTable'

class Votings extends React.Component {
  render() {
    const { votes, onSelectVote, tokensCount } = this.props
    const now = Date.now()
    const openedVotes = votes.filter(vote => vote.endDate > now)
    const closedVotes = votes.filter(vote => !openedVotes.includes(vote))
    return (
      <Main>
        <VotingsTableWrapper>
          <Title>
            <span>Open Votings</span>
            <BadgeNumber
              background={colors.Rain['Rain Sky']}
              color={colors.Rain.Slate}
              number={openedVotes.length}
              inline
            />
          </Title>
          <VotingsTable
            votes={openedVotes}
            opened={true}
            tokensCount={tokensCount}
            onSelectVote={onSelectVote}
          />
        </VotingsTableWrapper>

        <VotingsTableWrapper>
          <Title>
            <span>Past Votings</span>
          </Title>
          <VotingsTable
            title=""
            votes={closedVotes}
            tokensCount={tokensCount}
            opened={false}
          />
        </VotingsTableWrapper>

        <SeeMoreWrapper>
          <Button mode="secondary">Show Older Votings</Button>
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

const VotingsTableWrapper = styled.div`
  margin-bottom: 30px;
`

const SeeMoreWrapper = styled.div`
  display: flex;
  justify-content: center;
`

export default Votings
