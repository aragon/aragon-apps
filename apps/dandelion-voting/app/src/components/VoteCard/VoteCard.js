import React, { useCallback, useMemo } from 'react'
import styled from 'styled-components'
import { Card, GU, IconCheck, textStyle, useTheme, Timer } from '@aragon/ui'
import { noop } from '../../utils'
import { VOTE_YEA, VOTE_NAY } from '../../vote-types'
import LocalLabelAppBadge from '..//LocalIdentityBadge/LocalLabelAppBadge'
import VoteOptions from './VoteOptions'
import VoteStatus from '../VoteStatus'
import VoteText from '../VoteText'
import You from '../You'
import BlockTimerHelper from '../BlockTimerHelper'
import { getVoteSuccess } from '../../vote-utils'
import { useSettings } from '../../vote-settings-manager'

const VoteCard = ({ vote, onOpen }) => {
  const theme = useTheme()
  const { pctBase } = useSettings()

  const {
    connectedAccountVote,
    data,
    executionTargetData,
    numData,
    voteId,
  } = vote
  const { votingPower, yea, nay } = numData
  const { metadata, description, delayed, closed, transitionAt } = data

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
        <LocalLabelAppBadge
          badgeOnly
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
        {!closed || (delayed && getVoteSuccess(vote, pctBase)) ? (
          transitionAt ? (
            <div
              css={`
                display: flex;
                justify-content: space-between;
              `}
            >
              <Timer end={transitionAt} maxUnits={4} />
              <BlockTimerHelper vote={vote} />
            </div>
          ) : (
            <TimerPlaceholder />
          )
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

const TimerPlaceholder = styled.div`
  background: #f1f3f7;
  height: 20px;
  width: 40%;
  border-radius: 6px;
`

export default VoteCard
