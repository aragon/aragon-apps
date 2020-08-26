import React from 'react'
import {
  Box,
  Button,
  GU,
  IconAttention,
  IconCoin,
  RADIUS,
  Tag,
  textStyle,
  useTheme,
} from '@aragon/ui'
import { addressesEqual } from '../../web3-utils'
import {
  DISPUTABLE_VOTE_STATUSES,
  VOTE_STATUS_PAUSED,
  CHALLENGE_STATE_SETTLED,
  DISPUTABLE_CHALLENGE_STATES,
} from '../../disputable-vote-statuses'

function getAttributes(status, theme, mode) {
  const attributes = {
    [VOTE_STATUS_ACTIVE]: {
      label: 'Scheduled',
      Icon: IconClock,
    },
    [VOTE_STATUS_CANCELLED]: {
      background: theme.surfaceUnde,
      label: 'Cancelled',
      Icon: IconClose,
      color: theme.disabledContent,
    },
    [VOTE_STATUS_CLOSED]: {
      background: theme.surfaceUnder,
      label: 'Closed',
      Icon: IconInfo,
      color: theme.disabledContent,
    },
    [VOTE_STATUS_PAUSED]: {
      background: theme.warningSurface,
      label: 'Challenged',
      Icon: IconAttention,
      color: theme.warningSurfaceContent,
    },
  }

  return attributes[status]
}

function FeedbackModule({ vote, connectedAccount }) {
  const theme = useTheme()

  const voteStatus = DISPUTABLE_VOTE_STATUSES.get(vote.data.disputable.status)
  const challengeState = DISPUTABLE_CHALLENGE_STATES.get(
    vote.data.disputable.action.challenge.state
  )

  let mode = null

  if (
    vote.data.disputable.action &&
    vote.data.disputable.action.challenge &&
    addressesEqual(
      vote.data.disputable.action.challenge.challenger,
      connectedAccount
    )
  ) {
    mode = 'challenger'
  }

  if (
    vote.data.disputable.action &&
    addressesEqual(vote.data.disputable.action.submitter, connectedAccount)
  ) {
    mode = 'submitter'
  }

  if (!mode) {
    return <div></div>
  }

  const { Icon, background, color, label } = getAttributes(
    voteStatus,
    theme,
    mode
  )

  return (
    <div
      css={`
        border-radius: ${RADIUS}px;
        background: ${theme.background};
        padding: ${3.5 * GU}px ${10 * GU}px;
        text-align: center;
      `}
    >
      <div
        css={`
          display: inline-grid;
          grid-template-columns: auto 1fr;
          grid-gap: ${3 * GU}px;
          align-items: center;
          text-align: left;
        `}
      >
        <div
          css={`
            color: ${mode === 'challenger' ? theme.warning : theme.info};
          `}
        >
          {mode === 'challenger' ? (
            <IconAttention size="large" />
          ) : (
            <IconCoin size="large" />
          )}
        </div>
        <div>
          <div
            css={`
                ${textStyle('body1')}
                margin-bottom: ${0.5 * GU}px;
              `}
          >
            {mode === 'challenger'
              ? 'You have challenged this vote'
              : 'You have accepted the settlement offer'}
          </div>
          <div
            css={`
                ${textStyle('body2')}
                color: ${theme.surfaceContentSecondary};
                `}
          >
            {mode === 'challenger' ? (
              <span>
                You challenged this action on{' '}
                <Bold>2020/03/20, 5:30 PM (CET)</Bold> and locked{' '}
                <Bold>100 ANT</Bold> as the action challenge collateral. You can
                manage your deposit balances in Stake Management.
              </span>
            ) : (
              <span>
                You acccepted the setttlement offer on on{' '}
                <Bold>2020/03/20, 5:30 PM (CET)</Bold>
                and your action collateral has been slashed{' '}
                <Bold>-100 ANT</Bold>. You can manage your deposit balances in
                Stake Management.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Bold({ children }) {
  const theme = useTheme()

  return (
    <span
      css={`
        color: ${theme.surfaceContent};
        font-weight: 600;
      `}
    >
      {children}
    </span>
  )
}

export default FeedbackModule
