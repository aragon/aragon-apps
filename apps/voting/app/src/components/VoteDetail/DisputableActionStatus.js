import React from 'react'
import {
  Box,
  Button,
  GU,
  IconLock,
  Info,
  Link,
  textStyle,
  Timer,
  useTheme,
} from '@aragon/ui'
import { format } from 'date-fns'
import { getAgreement } from '../../agreementsMockData'
import { addressesEqual } from '../../web3-utils'

const formatDate = date => `${format(date, 'yyyy-MM-dd, HH:mm')}`

function DisputableActionStatus({ vote, connectedAccount }) {
  //TODO: get agreement and vote real data
  const theme = useTheme()
  const agreement = getAgreement()
  return (
    <Box heading="Disputable Action Status">
      <Item>
        <Label>Status</Label>
        <div>DisputableStatusTag</div>
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
              display: inline-flex;
              padding-left: ${1 * GU}px;
            `}
          >
            <IconLock size="small" />
          </span>
        </div>
      </Item>
      <Item>
        <Label>Challenge period</Label>
        {new Date().getTime() > vote.disputable.action.endDate ? (
          formatDate(vote.disputable.action.endDate)
        ) : (
          <Timer end={new Date(vote.disputable.action.endDate)} />
        )}
      </Item>
      <Item>
        <Label>Agreement</Label>
        <Link
          css={`
            ${textStyle('body2')};
          `}
        >
          {agreement.agreementTitle}
        </Link>
      </Item>
      {vote.disputable && vote.disputable.action && (
        <Item>
          <Label>Dispute</Label>
          <Link
            css={`
              ${textStyle('body2')};
            `}
            href={`https://court.aragon.org/disputes/${vote.disputable.action.currentChallengeId}`}
          >
            Dispute #{vote.disputable.action.currentChallengeId}
          </Link>
        </Item>
      )}
      <Item>
        <Info>
          Exceeding reaction chamber thermal limit. We have begun power-supply
          calibration. Force fields have been established on all turbo lifts and
          crawlways. Warp drive within normal parameters. I read an ion trail.
        </Info>
      </Item>
    </Box>
  )
}

function Item({ children }) {
  return (
    <div
      css={`
        margin-bottom: ${3 * GU}px;
      `}
    >
      {children}
    </div>
  )
}

function Label({ children }) {
  const theme = useTheme()

  return (
    <label
      css={`
        ${textStyle('label2')};
        color: ${theme.surfaceContentSecondary};
        display: block;
        margin-bottom: ${1 * GU}px;
      `}
    >
      {children}
    </label>
  )
}

export default DisputableActionStatus
