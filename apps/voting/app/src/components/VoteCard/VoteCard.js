import React, { useCallback, useMemo } from 'react'
import { Card, GU, IconCheck, Timer, textStyle, useTheme } from '@aragon/ui'
import VoteOptions from './VoteOptions'
import AppBadge from '../AppBadge'
import VoteText from '../VoteText'
import VoteStatus from '../VoteStatus'
import { noop } from '../../utils'
import { VOTE_YEA, VOTE_NAY } from '../../vote-types'

const VoteCard = ({ vote, onOpen }) => {
  const theme = useTheme()
  const { voteId, data, numData, connectedAccountVote } = vote
  const { votingPower, yea, nay } = numData
  const { open, metadata, description, endDate } = data
  const options = useMemo(
    () => [
      { label: <span>Yes</span>, power: yea },
      { label: <span>No</span>, power: nay, color: theme.negative },
    ],
    [yea, nay, theme]
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
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr auto auto;
        grid-gap: ${1 * GU}px;
        padding: ${3 * GU}px;
      `}
    >
      <div
        css={`
          display: flex;
          justify-content: space-between;
        `}
      >
        <AppBadge>App Badge</AppBadge>
        {youVoted && (
          <div
            css={`
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: ${theme.infoSurface.alpha(0.08)};
              color: ${theme.info};
            `}
          >
            <IconCheck size="tiny" />
          </div>
        )}
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
        <VoteText text={description || metadata} />
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

export default VoteCard
