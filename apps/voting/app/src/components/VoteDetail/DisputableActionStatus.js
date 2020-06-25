import React from 'react'
import {
  Box,
  GU,
  IconLock,
  Info,
  Link,
  textStyle,
  Timer,
  useTheme,
} from '@aragon/ui'
import { format } from 'date-fns'
import DisputableActions from './DisputableActions'
import DisputableStatusLabel from '../DisputableStatusLabel'
import { getAgreement } from '../../agreementsMockData'
import { DISPUTABLE_VOTE_STATUSES } from '../../disputable-vote-statuses'

const formatDate = date => `${format(date, 'yyyy-MM-dd, HH:mm')}`

function hasDispute(vote) {
  return (
    vote.disputable &&
    vote.disputable.action &&
    vote.disputable.action.challenge
  )
}

function DisputableActionStatus({ vote }) {
  //TODO: get agreement and vote real data
  const theme = useTheme()
  const agreement = getAgreement()

  const { challengeAmount, collateralToken } = vote.disputable.action.collateral
  const disputableStatus =
    vote.disputable && DISPUTABLE_VOTE_STATUSES.get(vote.disputable.status)

  return (
    <Box heading="Disputable Action Status">
      <Item>
        <Label>Status</Label>
        <DisputableStatusLabel vote={vote} />
      </Item>
      <Item>
        <Label>Action collateral locked</Label>
        <div
          css={`
            display: flex;
            align-items: center;
          `}
        >
          {vote.disputable.action.collateral.challengeAmount}{' '}
          {vote.disputable.action.collateral.collateralToken}
          <span
            css={`
              padding-left: ${1 * GU}px;
            `}
          >
            {challengeAmount} {collateralToken}
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
        <Item label="Challenge period">
          {new Date().getTime() > vote.disputable.action.endDate ? (
            formatDate(vote.disputable.action.endDate)
          ) : (
            <div
              css={`
                display: inline-flex;
              `}
            >
              <Timer end={new Date(vote.disputable.action.endDate)} />{' '}
              <div
                css={`
                  padding-left: ${1 * GU}px;
                  color: ${theme.contentSecondary};
                `}
              >
                (48h)
              </div>
            </div>
          )}
        </Item>
        <Item label="Agreement">
          <Link>{agreement.agreementTitle}</Link>
        </Item>
        {hasDispute(vote) && (
          <Item label="Dispute">
            <Link
              href={`https://court.aragon.org/disputes/${vote.disputable.action.challenge.disputeId}`}
            >
              Dispute #{vote.disputable.action.currentChallengeId}
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
          <DisputableActions vote={vote} />
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
        margin-bottom: ${3 * GU}px;
        list-style-type: none;
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
