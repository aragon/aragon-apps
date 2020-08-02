import React from 'react'
import {
  Box,
  formatTokenAmount,
  GU,
  IconLock,
  Info,
  Link,
  textStyle,
  useTheme,
} from '@aragon/ui'
import {
  DISPUTABLE_VOTE_STATUSES,
  VOTE_STATUS_PAUSED,
} from '../../disputable-vote-statuses'
import { getAgreement } from '../../agreementsMockData'
import DisputableActions from './DisputableActions'
import DisputablePeriod from './DisputablePeriod'
import DisputableStatusLabel from '../DisputableStatusLabel'

function hasDispute(vote) {
  return (
    vote.data.disputable &&
    vote.data.disputable.action &&
    vote.data.disputable.action.challenge
  )
}

function DisputableActionStatus({ vote }) {
  //TODO: get agreement and vote real data
  const agreement = getAgreement()

  const {
    actionAmount,
    decimals,
    symbol,
  } = vote.data.disputable.action.collateral
  const disputableStatus =
    vote.data.disputable &&
    DISPUTABLE_VOTE_STATUSES.get(vote.data.disputable.status)

  const challenged = disputableStatus === VOTE_STATUS_PAUSED

  return (
    <Box heading="Disputable Action Status">
      <ul>
        <Item label="Status">
          {disputableStatus && (
            <DisputableStatusLabel status={disputableStatus} />
          )}
        </Item>
        <Item label="Action collateral locked">
          <div
            css={`
              display: flex;
              align-items: center;
            `}
          >
            {formatTokenAmount(actionAmount, decimals, { symbol: symbol })}
            <span
              css={`
                display: inline-flex;
                padding-left: ${1 * GU}px;
              `}
            >
              <IconLock size="small" />
            </span>
          </div>
        </Item>
        <Item label={challenged ? 'Settlement period' : 'Challenge period'}>
          <DisputablePeriod
            startDate={
              challenged
                ? vote.data.disputable.pausedAt
                : new Date(vote.data.startDate).getTime()
            }
          />
        </Item>
        <Item label="Agreement">
          <Link>{agreement.agreementTitle}</Link>
        </Item>
        {hasDispute(vote) && (
          <Item label="Dispute">
            <Link
              href={`https://court.aragon.org/disputes/${vote.data.disputable.action.challenge.disputeId}`}
            >
              Dispute #{vote.data.disputable.action.currentChallengeId}
            </Link>
          </Item>
        )}
        <Item>
          <Info>
            Exceeding reaction chamber thermal limit. We have begun power-supply
            calibration. Force fields have been established on all turbo lifts
            and crawlways. Warp drive within normal parameters. I read an ion
            trail.
          </Info>
        </Item>
        <Item>
          {disputableStatus && (
            <DisputableActions
              status={disputableStatus}
              submitter={vote.data.disputable.action.submitter}
            />
          )}
        </Item>
      </ul>
    </Box>
  )
}

function Item({ label, children }) {
  const theme = useTheme()
  return (
    <li
      css={`
        list-style-type: none;
        & + li {
          margin-top: ${3 * GU}px;
        }
      `}
    >
      {label && (
        <label
          css={`
            ${textStyle('label2')};
            color: ${theme.surfaceContentSecondary};
            display: block;
            margin-bottom: ${1 * GU}px;
          `}
        >
          {label}
        </label>
      )}
      {children}
    </li>
  )
}

export default DisputableActionStatus
