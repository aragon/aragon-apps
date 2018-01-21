import React from 'react'
import styled from 'styled-components'
import Blockies from 'react-blockies'
import {
  Button,
  SidePanelSplit,
  SidePanelSeparator,
  Countdown,
  Text,
  theme,
} from '@aragon/ui'

const VotePanelContent = ({ vote }) => {
  if (!vote) {
    return null
  }
  const { endDate, question, quorum, creatorAddress, creatorName } = vote
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
          <Label>Created By</Label>
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
      <VotingButtons>
        <Button mode="strong" emphasis="positive" wide>
          Yes
        </Button>
        <Button mode="strong" emphasis="negative" wide>
          No
        </Button>
      </VotingButtons>
    </div>
  )
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
  padding-top: 30px;
  & > * {
    width: 50%;
    &:first-child {
      margin-right: 10px;
    }
  }
`

export default VotePanelContent
