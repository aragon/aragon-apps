import React, { useCallback } from 'react'
import PropTypes from 'prop-types'
import {
  Badge,
  Card,
  GU,
  IconCheck,
  Timer,
  textStyle,
  useTheme,
} from '@aragon/ui'
import VotingOptions from './VotingOptions'
import VoteStatus from './VoteStatus'
import LocalLabelAppBadge from './LocalIdentityBadge/LocalLabelAppBadge'
import useUserVoteStats from '../utils/useUserVoteStats'

function noop() {}

const VotingCard = ({ vote, onSelectVote }) => {
  const theme = useTheme()
  const { voteWeights } = useUserVoteStats(vote)
  const { description, endDate, open, totalSupport, voteId, support } = vote
  const { executionTargetData, options, totalVoters } = vote.data

  const handleOpen = useCallback(() => {
    onSelectVote(voteId)
  }, [ voteId, onSelectVote ])

  let youVoted = voteWeights.length > 0

  return (
    <Card
      onClick={handleOpen}
      css={`
        height 320px;
        display: grid;
        grid-template-columns: 1fr;
        grid-template-rows: 28px 60px auto 24px;
        grid-gap: 12px;
        padding: ${3 * GU}px;
        align-items: start;
      `}
    >
      <div
        css={`
          display: flex;
          justify-content: space-between;
        `}
      >
        <LocalLabelAppBadge
          appAddress={executionTargetData.address}
          iconSrc={executionTargetData.iconSrc}
          identifier={executionTargetData.identifier}
          label={executionTargetData.name}
        />

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
          height: ${28 * 2}px;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
        `}
      >
        {description}
      </div>

      <div>
        <VotingOptions
          fontSize="xsmall"
          options={options.slice(0, 2)}
          totalSupport={totalSupport}
          color={`${theme.accent}`}
          voteWeights={voteWeights}
        />

        {options.length > 2 && (
          <div css="text-align: center; width: 100%; margin-top: 10px">
            <Badge
              foreground={theme.surfaceContentSecondary}
              background={theme.surfaceUnder}
              uppercase={false}
              css={`
                cursor: pointer;
                padding: 2px 8px;
                pointer-events: auto;
              `}
            >
              {' + ' + (options.length - 2) + ' more'}
            </Badge>
          </div>
        )}
      </div>

      <div>
        {open ? (
          <Timer end={endDate} maxUnits={4} />
        ) : (
          <VoteStatus
            vote={vote}
            support={support}
            tokenSupply={totalVoters}
          />
        )}
      </div>
    </Card>
  )
}

VotingCard.propTypes = {
  vote: PropTypes.object.isRequired,
  onSelectVote: PropTypes.func.isRequired,
}

VotingCard.defaultProps = {
  onSelectVote: noop,
}

export default VotingCard
