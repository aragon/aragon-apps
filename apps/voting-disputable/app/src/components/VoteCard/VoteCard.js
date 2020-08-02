import React, { useState, useCallback, useMemo } from 'react'
import { Card, GU, Timer, textStyle, useTheme } from '@aragon/ui'
import { noop } from '../../utils'
import { VOTE_YEA, VOTE_NAY } from '../../vote-types'
import {
  VOTE_STATUS_ACTIVE,
  VOTE_STATUS_PAUSED,
  VOTE_STATUS_CANCELLED,
  VOTE_STATUS_CLOSED,
  DISPUTABLE_VOTE_STATUSES,
} from '../../disputable-vote-statuses'
import DisputableStatusLabel from '../DisputableStatusLabel'
import LocalLabelAppBadge from '../LocalIdentityBadge/LocalLabelAppBadge'
import VoteOptions from './VoteOptions'
import VotedIndicator from './VotedIndicator'
import VoteStatus from '../VoteStatus'
import VoteDescription from '../VoteDescription'
import You from '../You'
import { hexToAscii } from '../../utils'

function getCardBorderColor(status, theme) {
  const borderColor = {
    [VOTE_STATUS_ACTIVE]: theme.surface,
    [VOTE_STATUS_CANCELLED]: theme.disabledContent,
    [VOTE_STATUS_CLOSED]: theme.disabledContent,
    [VOTE_STATUS_PAUSED]: theme.warning,
  }

  return borderColor[status]
}

function VoteCard({ vote, onOpen }) {
  const theme = useTheme()
  const {
    connectedAccountVote,
    data,
    executionTargetData,
    numData,
    voteId,
  } = vote

  const { votingPower, yea, nay } = numData
  const { open, disputable, description, endDate } = data
  const metadata = hexToAscii(disputable.action.context)
  const options = useMemo(
    () => [
      {
        label: (
          <WrapVoteOption>
            <span>Yes</span>
            {connectedAccountVote === VOTE_YEA && <You />}
          </WrapVoteOption>
        ),
        power: yea,
      },
      {
        label: (
          <WrapVoteOption>
            <span>No</span>
            {connectedAccountVote === VOTE_NAY && <You />}
          </WrapVoteOption>
        ),
        power: nay,
        color: theme.negative,
      },
    ],
    [yea, nay, theme, connectedAccountVote]
  )
  const hasConnectedAccountVoted =
    connectedAccountVote === VOTE_YEA || connectedAccountVote === VOTE_NAY

  const handleOpen = useCallback(() => {
    onOpen(voteId)
  }, [voteId, onOpen])
  const handleStartHighlight = useCallback(() => setHighlighted(true), [])
  const handleEndHighlight = useCallback(() => setHighlighted(false), [])

  // “highlighted” means either focused or hovered
  const [highlighted, setHighlighted] = useState(false)

  const disputableStatus = DISPUTABLE_VOTE_STATUSES.get(
    vote.data.disputable.status
  )

  const border = getCardBorderColor(disputableStatus, theme)

  return (
    <Card
      onClick={handleOpen}
      onMouseEnter={handleStartHighlight}
      onMouseLeave={handleEndHighlight}
      onFocus={handleStartHighlight}
      onBlur={handleEndHighlight}
      css={`
        display: grid;
        grid-template-columns: 100%;
        grid-template-rows: auto 1fr auto auto;
        grid-gap: ${1 * GU}px;
        padding: ${3 * GU}px;
        ${border && `border: solid ${border} 1px;`}
      `}
    >
      <div
        css={`
          display: flex;
          justify-content: space-between;
          margin-bottom: ${1 * GU}px;
        `}
      >
        {executionTargetData && (
          <LocalLabelAppBadge
            badgeOnly
            appAddress={executionTargetData.address}
            iconSrc={executionTargetData.iconSrc}
            identifier={executionTargetData.identifier}
            label={executionTargetData.name}
          />
        )}
        {hasConnectedAccountVoted && <VotedIndicator expand={highlighted} />}
      </div>
      <VoteDescription
        disabled
        prefix={<span css="font-weight: bold">#{voteId}: </span>}
        description={description || metadata}
        title={`#${voteId}: ${description || metadata}`}
        css={`
          overflow: hidden;
          ${textStyle('body1')};
          line-height: ${27}px; // 27px = line-height of textstyle('body1')
          height: ${27 * 3}px; // 27px * 3 = line-height * 3 lines
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
        `}
      />
      <VoteOptions options={options} votingPower={votingPower} />
      <div
        css={`
          margin-top: ${2 * GU}px;
        `}
      >
        {disputableStatus === VOTE_STATUS_ACTIVE ? (
          open ? (
            <Timer end={endDate} maxUnits={4} />
          ) : (
            <VoteStatus vote={vote} />
          )
        ) : (
          <DisputableStatusLabel status={disputableStatus} />
        )}
      </div>
    </Card>
  )
}

VoteCard.defaultProps = {
  onOpen: noop,
}

function WrapVoteOption(props) {
  return (
    <span
      css={`
        display: flex;
        align-items: center;
        text-transform: uppercase;
        ${textStyle('label2')};
      `}
      {...props}
    />
  )
}

export default VoteCard
