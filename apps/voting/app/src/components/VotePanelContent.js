import React from 'react'
import styled from 'styled-components'
import Blockies from 'react-blockies'
import {
  Button,
  Info,
  SidePanelSplit,
  SidePanelSeparator,
  Countdown,
  Text,
  theme,
} from '@aragon/ui'
import { VOTE_ABSENT, VOTE_NAY, VOTE_YEA } from '../vote-types'
import VoteSummary from './VoteSummary'
import VoteStatus from './VoteStatus'

class VotePanelContent extends React.Component {
  handleNoClick = () => {
    this.props.onVote(this.props.vote.voteId, VOTE_NAY)
  }
  handleYesClick = () => {
    this.props.onVote(this.props.vote.voteId, VOTE_YEA)
  }
  render() {
    const { vote, user, ready } = this.props
    if (!vote) {
      return null
    }

    const { question, quorum, support, endDate, quorumProgress } = vote
    const { creator, yea, nay, totalVoters } = vote.vote

    const creatorName = 'Robert Johnson' // TODO: get creator name
    const accountVote = VOTE_ABSENT // TODO: detect if the current account voted

    return (
      <div>
        <SidePanelSplit>
          <div>
            <h2>
              <Label>{vote.open ? 'Time Remaining:' : 'Status'}</Label>
            </h2>
            <div>
              {vote.open ? (
                <Countdown end={endDate} />
              ) : (
                <VoteStatus
                  vote={vote}
                  support={support}
                  tokenSupply={totalVoters}
                />
              )}
            </div>
          </div>
          <div>
            <h2>
              <Label>Quorum</Label>
            </h2>
            <div>{quorum * 100}%</div>
          </div>
        </SidePanelSplit>
        <Part>
          <h2>
            <Label>Question:</Label>
          </h2>
          <p>
            <strong>{question}</strong>
          </p>
          <h2>
            <Label>Description:</Label>
          </h2>
          <p>
            Fusce vehicula dolor arcu, sit amet blandit dolor mollis nec. Sed
            sollicitudin ipsum quis nunc sollicitudin ultrices?
          </p>
        </Part>
        <SidePanelSeparator />
        <Part>
          <h2>
            <Label>Created By:</Label>
          </h2>
          <Creator>
            <CreatorImg>
              <Blockies seed={creator} size={8} />
            </CreatorImg>
            <div>
              <p>
                <strong>{creatorName}</strong>
              </p>
              <p>
                <a
                  href={`https://etherscan.io/address/${creator}`}
                  target="_blank"
                >
                  {creator}
                </a>
              </p>
            </div>
          </Creator>
        </Part>
        <SidePanelSeparator />

        <VoteSummary
          votesYea={yea}
          votesNay={nay}
          tokenSupply={totalVoters}
          quorum={quorum}
          quorumProgress={quorumProgress}
          support={support}
          ready={ready}
        />

        {accountVote === VOTE_ABSENT && (
          <div>
            <SidePanelSeparator />
            <VotingButtons>
              <Button
                mode="strong"
                emphasis="positive"
                wide
                onClick={this.handleYesClick}
              >
                Yes
              </Button>
              <Button
                mode="strong"
                emphasis="negative"
                wide
                onClick={this.handleNoClick}
              >
                No
              </Button>
            </VotingButtons>
            <Info title={`You will cast ${user.balance} votes`} />
          </div>
        )}
      </div>
    )
  }
}

const Label = styled(Text).attrs({
  smallcaps: true,
  color: theme.textSecondary,
})`
  display: block;
  margin-bottom: 10px;
`

const Part = styled.div`
  padding: 20px 0;
  h2 {
    margin-top: 20px;
    &:first-child {
      margin-top: 0;
    }
  }
`

const Creator = styled.div`
  display: flex;
  align-items: center;
`
const CreatorImg = styled.div`
  margin-right: 20px;
  canvas {
    display: block;
    border: 1px solid ${theme.contentBorder};
    border-radius: 16px;
  }
  & + div {
    a {
      color: ${theme.accent};
    }
  }
`

const VotingButtons = styled.div`
  display: flex;
  padding: 30px 0 20px;
  & > * {
    width: 50%;
    &:first-child {
      margin-right: 10px;
    }
  }
`

export default VotePanelContent
