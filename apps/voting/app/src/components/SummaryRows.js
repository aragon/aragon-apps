import React from 'react'
import styled from 'styled-components'
import { GU, textStyle, useTheme } from '@aragon/ui'
import You from './You'
import { formatNumber } from '../math-utils'
import { VOTE_NAY, VOTE_YEA } from '../vote-types'

function SummaryRows({ yea, nay, symbol, connectedAccountVote }) {
  const theme = useTheme()
  return (
    <div
      css={`
        ${textStyle('body2')};
        display: inline-block;
      `}
    >
      <SummaryRow
        color={theme.positive}
        label="Yes"
        pct={yea.pct}
        token={{ amount: yea.amount, symbol }}
        youVoted={connectedAccountVote === VOTE_YEA}
      />
      <SummaryRow
        color={theme.negative}
        label="No"
        pct={nay.pct}
        token={{ amount: nay.amount, symbol }}
        youVoted={connectedAccountVote === VOTE_NAY}
      />
    </div>
  )
}

function SummaryRow({ color, label, pct, token, youVoted }) {
  const theme = useTheme()
  return (
    <div
      css={`
        display: flex;
        width: 100%;
        margin-bottom: ${1 * GU}px;
        align-items: center;
        justify-content: space-between;
        white-space: nowrap;
      `}
    >
      <div
        css={`
          display: flex;
          align-items: center;
        `}
      >
        <Bullet color={color} />
        <div
          css={`
            width: ${4 * GU}px;
            color: ${theme.surfaceContentSecondary};
          `}
        >
          {label}
        </div>
        <div>{pct}%</div>
        {youVoted && <You />}
      </div>
      <div
        css={`
          color: ${theme.surfaceContentSecondary};
          margin-left: ${2 * GU}px;
        `}
      >
        {formatNumber(token.amount, 5)} {token.symbol}
      </div>
    </div>
  )
}

const Bullet = styled.div`
  flex-shrink: 0;
  display: block;
  width: ${1 * GU}px;
  height: ${1 * GU}px;
  margin-right: ${2 * GU}px;
  border-radius: 50%;
  background: ${({ color }) => color};
`

export default React.memo(SummaryRows)
