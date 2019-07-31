import React, { useCallback, useMemo } from 'react'
import {
  Badge,
  Card,
  GU,
  IconCheck,
  Timer,
  textStyle,
  theme,
  useTheme,
} from '@aragon/ui'
import VotingOptions from './VotingOptions'
import VoteText from '../VoteText'
import VoteStatus from '../VoteStatus'
import { noop } from '../../utils'
import { VOTE_YEA, VOTE_NAY } from '../../vote-types'

function getOptions(yea, nay) {
  return [
    { label: <span>Yes</span>, power: yea },
    { label: <span>No</span>, power: nay, color: theme.negative },
  ]
}

const VotingCard = ({ vote, onOpen }) => {
  const theme = useTheme()
  const { voteId, data, numData, connectedAccountVote } = vote
  const { votingPower, yea, nay } = numData
  const { open, metadata, description, endDate } = data
  const options = useMemo(() => getOptions(yea, nay), [yea, nay])
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
        grid-gap: 8px;
        padding: ${3 * GU}px;
      `}
    >
      <div
        css={`
          display: flex;
          justify-content: space-between;
        `}
      >
        <Badge.App>App Badge</Badge.App>
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
        <VoteText text={description || metadata} />
      </div>
      <VotingOptions options={options} votingPower={votingPower} />
      <div
        css={`
          margin-top: ${2 * GU}px;
        `}
      >
        {open ? (
          <Timer end={endDate} maxUnits={4} />
        ) : (
          <VoteStatus vote={vote} cardStyle />
        )}
      </div>
    </Card>
  )
}

VotingCard.defaultProps = {
  onOpen: noop,
}

export default VotingCard
