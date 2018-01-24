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
import { VOTE_UNKNOWN } from '../vote-types'
import VotingSummary from './VotingSummary'

const VotePanelContent = ({ vote, tokensCount, ready }) => {
  if (!vote) {
    return null
  }

  const {
    endDate,
    question,
    quorum,
    creatorAddress,
    creatorName,
    votesYes,
    votesNo,
    userVote,
  } = vote

  return (
    <div>
      <SidePanelSplit>
        <div>
          <h2>
            <Label>Time Remaining:</Label>
          </h2>
          <div>
            <Countdown end={endDate} />
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
            <Blockies seed={creatorAddress} size={8} />
          </CreatorImg>
          <div>
            <p>
              <strong>{creatorName}</strong>
            </p>
            <p>
              <a
                href={`https://etherscan.io/address/${creatorAddress}`}
                target="_blank"
              >
                {creatorAddress}
              </a>
            </p>
          </div>
        </Creator>
      </Part>
      <SidePanelSeparator />
      {userVote === VOTE_UNKNOWN ? (
        <div>
          <VotingButtons>
            <Button mode="strong" emphasis="positive" wide>
              Yes
            </Button>
            <Button mode="strong" emphasis="negative" wide>
              No
            </Button>
          </VotingButtons>
          <Info title="You will cast 389273724 votes" />
        </div>
      ) : (
        <VotingSummary
          votesNo={ready ? votesNo / tokensCount : 0}
          votesYes={ready ? votesYes / tokensCount : 0}
          quorum={ready ? quorum : 0}
        />
      )}
    </div>
  )
}

VotePanelContent.defaultProps = {
  tokensCount: 0,
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
