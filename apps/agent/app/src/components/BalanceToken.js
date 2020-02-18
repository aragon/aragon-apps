import React from 'react'
import { textStyle, tokenIconUrl, useTheme } from '@aragon/ui'
import { formatTokenAmount } from '../lib/utils'

const splitAmount = amount => {
  const [integer, fractional] = formatTokenAmount(amount).split('.')
  return (
    <span>
      <span>{integer}</span>
      {fractional && <span css="font-size: 14px;">.{fractional}</span>}
    </span>
  )
}

const BalanceToken = ({
  address = '',
  amount,
  symbol,
  verified,
  convertedAmount = -1,
}) => {
  const theme = useTheme()
  console.log('address token', address, tokenIconUrl(address))
  return (
    <React.Fragment>
      <div
        title={symbol || 'Unknown symbol'}
        css={`
          display: flex;
          align-items: center;
          text-transform: uppercase;
          img {
            margin-right: 10px;
          }
          color: ${theme.surfaceContentSecondary};
          ${textStyle('body2')}
        `}
      >
        {verified && symbol && (
          <img alt="" width="20" height="20" src={tokenIconUrl(address)} />
        )}
        {symbol || '?'}
      </div>
      <div>
        <div
          css={`
            ${textStyle('title2')}
          `}
        >
          {splitAmount(amount.toFixed(3))}
        </div>
        <div
          css={`
            color: ${theme.surfaceContentSecondary};
            ${textStyle('body2')}
          `}
        >
          {convertedAmount >= 0
            ? `$${formatTokenAmount(convertedAmount.toFixed(2))}`
            : '−'}
        </div>
      </div>
    </React.Fragment>
  )
}

export default BalanceToken
