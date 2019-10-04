import React, { useState, useCallback, useMemo } from 'react'
import styled from 'styled-components'
import { Card, GU, IconCheck, Timer, textStyle, useTheme } from '@aragon/ui'
import { noop } from '../../utils'
import { VOTE_YEA, VOTE_NAY } from '../../vote-types'
import LocalLabelAppBadge from '..//LocalIdentityBadge/LocalLabelAppBadge'
import VoteOptions from './VoteOptions'
import VoteStatus from '../VoteStatus'
import VoteText from '../VoteText'
import You from '../You'

function useHoverAnimation() {
  const [animate, setAnimate] = useState(false)
  const onMouseOver = () => {
    setAnimate(true)
  }
  const onMouseOut = () => {
    setAnimate(false)
  }

  return { animate, onMouseOver, onMouseOut }
}

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
  const { animate, onMouseOver, onMouseOut } = useHoverAnimation()

  return (
    <Card
      onClick={handleOpen}
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
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
        <LocalLabelAppBadge
          badgeOnly
          appAddress={executionTargetData.address}
          iconSrc={executionTargetData.iconSrc}
          identifier={executionTargetData.identifier}
          label={executionTargetData.name}
        />
        <AnimatedVoted youVoted={youVoted} animate={animate} />
      </div>
      <div
        css={`
          ${textStyle('body1')};
          /* lines per font size per line height */
          /* shorter texts align to the top */
          height: 84px;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
          overflow: hidden;
        `}
      >
        <span css="font-weight: bold;">#{voteId}:</span>{' '}
        <VoteText disabled text={description || metadata} />
      </div>
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

function AnimatedVoted({ youVoted, animate }) {
  const theme = useTheme()

  if (!youVoted) {
    return null
  }

  return (
    <div
      css={`
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 20px;
        height: 20px;
        border-radius: 10px;
        background: ${theme.infoSurface.alpha(0.08)};
        color: ${theme.info};
      `}
    >
      <IconCheck size="tiny" />
      <div
        css={`
          display: inline-block;
          transition: ${animate
            ? 'width 300ms ease-in-out, opacity 150ms 275ms ease-in'
            : 'width 250ms ease-in-out 75ms, opacity 75ms ease-in'};
          width: ${animate ? `${4.5 * GU}px` : 0};
          opacity: ${Number(animate)};
          ${textStyle('label3')};
        `}
      >
        voted
      </div>
    </div>
  )
}

const WrapVoteOption = styled.span`
  display: flex;
  align-items: center;
  text-transform: uppercase;
  ${textStyle('label2')};
`

export default VoteCard
