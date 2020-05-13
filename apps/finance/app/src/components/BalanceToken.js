import React from 'react'
import {
  formatNumber,
  formatTokenAmount,
  GU,
  textStyle,
  useTheme,
} from '@aragon/ui'
import { useNetwork } from '@aragon/api-react'
import { tokenIconUrl } from '../lib/icon-utils'

const splitAmount = (amount, decimals) => {
  const [integer, fractional] = formatTokenAmount(amount, decimals).split('.')
  return (
    <span>
      <span>{integer}</span>
      {fractional && (
        <span
          css={`
            ${textStyle('body3')}
          `}
        >
          .{fractional}
        </span>
      )}
    </span>
  )
}

const BalanceToken = ({
  address,
  amount,
  compact,
  decimals,
  symbol,
  verified,
  convertedAmount = -1,
}) => {
  const theme = useTheme()
  const network = useNetwork()

  return (
    <div css="display: inline-block">
      <div
        title={symbol || 'Unknown symbol'}
        css={`
          display: flex;
          align-items: center;
          color: ${theme.surfaceContentSecondary};
          ${textStyle('body2')}
          text-transform: uppercase;
        `}
      >
        {verified && address && (
          <img
            alt=""
            width="20"
            height="20"
            src={tokenIconUrl(address, symbol, network && network.type)}
            css={`
              margin-right: ${0.75 * GU}px;
            `}
          />
        )}
        {symbol || '?'}
      </div>
      <div>
        <div
          css={`
            ${textStyle('title2')}
            margin: ${(compact ? 1 : 1.5) * GU}px 0;
          `}
        >
          {splitAmount(amount, decimals)}
        </div>
        <div
          css={`
            color: ${theme.surfaceContentSecondary};
            ${textStyle('body2')}
          `}
        >
          {convertedAmount >= 0 ? `$${formatNumber(convertedAmount)}` : '−'}
        </div>
      </div>
    </div>
  )
}

export default BalanceToken
