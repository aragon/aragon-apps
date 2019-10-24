import React, { useCallback, useMemo } from 'react'
import styled from 'styled-components'
import { Card, GU, IconCheck, Timer, textStyle, useTheme } from '@aragon/ui'
import { noop } from '../../utils'
import { VOTE_YEA, VOTE_NAY } from '../../vote-types'
import LocalLabelAppBadge from '..//LocalIdentityBadge/LocalLabelAppBadge'
import VoteOptions from './VoteOptions'
import VoteStatus from '../VoteStatus'
import VoteText from '../VoteText'
import You from '../You'

const VoteCard = ({ vote, onOpen }) => {
  const theme = useTheme()
  const {
    connectedAccountVote,
    data,
    executionTargetData,
    numData,
    voteId,
  } = vote
  const { votingPower, yea, nay } = numData
  const { open, metadata, description, endDate } = data
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
  const youVoted =
    connectedAccountVote === VOTE_YEA || connectedAccountVote === VOTE_NAY
  const handleOpen = useCallback(() => {
    onOpen(voteId)
  }, [voteId, onOpen])

  return (
    <Card
      onClick={handleOpen}
      css={`
        display: grid;
        grid-template-columns: 100%;
        grid-template-rows: auto 1fr auto auto;
        grid-gap: ${1 * GU}px;
        padding: ${3 * GU}px;
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
        {youVoted && (
          <div
            css={`
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: ${2.5 * GU}px;
              height: ${2.5 * GU}px;
              border-radius: 50%;
              background: ${theme.infoSurface.alpha(0.08)};
              color: ${theme.info};
            `}
          >
            <IconCheck size="tiny" />
          </div>
        )}
      </div>
      <VoteText
        disabled
        prefix={<span css="font-weight: bold">#{voteId}: </span>}
        text={description || metadata}
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
        {open ? (
          <Timer end={endDate} maxUnits={4} />
        ) : (
          <VoteStatus vote={vote} />
        )}
      </div>
    </Card>
  )
}

VoteCard.defaultProps = {
  onOpen: noop,
}

const WrapVoteOption = styled.span`
  display: flex;
  align-items: center;
  text-transform: uppercase;
  ${textStyle('label2')};
`

export default VoteCard
