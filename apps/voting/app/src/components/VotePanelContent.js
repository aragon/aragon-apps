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
import { VOTE_ABSENT } from '../vote-types'
import { isVoteOpen, getAccountVote } from '../vote-utils'
import VoteSummary from './VoteSummary'
import VoteStatus from './VoteStatus'

const VotePanelContent = ({
  vote: { id, vote, endDate, creatorName, metas: { question } },
  user,
  tokenSupply,
  support,
  voteTime,
  ready,
}) => {
  if (!vote) {
    return null
  }

  const { minAcceptQuorumPct: quorum, creator, yea, nay, voters } = vote
  const userVote = getAccountVote(user.address, voters)
  const opened = isVoteOpen(vote, voteTime)

  return (
    <div>
      <SidePanelSplit>
        <div>
          <h2>
            <Label>{opened ? 'Time Remaining:' : 'Status'}</Label>
          </h2>
          <div>
            {opened ? (
              <Countdown end={endDate} />
            ) : (
              <VoteStatus
                vote={userVote}
                support={support}
                tokenSupply={tokenSupply}
                voteTime={voteTime}
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
        tokenSupply={tokenSupply}
        quorum={quorum}
        support={support}
        ready={ready}
      />

      {userVote === VOTE_ABSENT && (
        <div>
          <SidePanelSeparator />
          <VotingButtons>
            <Button mode="strong" emphasis="positive" wide>
              Yes
            </Button>
            <Button mode="strong" emphasis="negative" wide>
              No
            </Button>
          </VotingButtons>
          <Info title={`You will cast ${user.balance} votes`} />
        </div>
      )}
    </div>
  )
}

VotePanelContent.defaultProps = {
  tokenSupply: 0,
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
