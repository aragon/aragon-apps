import React from 'react'
import { GU, Help, textStyle, useTheme } from '@aragon/ui'
import { useNetwork } from '@aragon/api-react'
import { tokenIconUrl } from '../lib/icon-utils'
import { formatTokenAmount } from '../lib/utils'

function BalanceToken({
  address = '',
  amount,
  symbol,
  verified,
  convertedAmount = -1,
}) {
  const theme = useTheme()
  const network = useNetwork()

  const [integerAmount, fractionalAmount] = formatTokenAmount(
    amount.toFixed(3)
  ).split('.')

  const [_, notRoundedFractionalAmount] = formatTokenAmount(
    amount,
    false,
    0,
    false,
    {
      rounding: 18,
    }
  ).split('.')

  const amountWasRounded = fractionalAmount !== notRoundedFractionalAmount

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
        {verified && address && (
          <img
            alt=""
            width="20"
            height="20"
            src={tokenIconUrl(address, symbol, network && network.type)}
          />
        )}
        {symbol || '?'}
      </div>
      <div>
        <div
          css={`
            ${textStyle('title2')}
            display:flex;
          `}
        >
          <SplitAmount integer={integerAmount} fractional={fractionalAmount} />
          {amountWasRounded && (
            <div
              css={`
                display: flex;
                align-items: center;
                margin-left: ${GU}px;
              `}
            >
              <Help hint={'This is an approximation, see the complete amount'}>
                {amount}
              </Help>
            </div>
          )}
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

function SplitAmount({ integer, fractional }) {
  return (
    <span>
      <span>{integer}</span>
      {fractional && <span css="font-size: 14px;">.{fractional}</span>}
    </span>
  )
}

export default BalanceToken
