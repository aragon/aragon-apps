import React from 'react'
import PropTypes from 'prop-types'
import BN from 'bn.js'
import { GU, Help, formatTokenAmount, textStyle, useTheme } from '@aragon/ui'
import { useNetwork } from '@aragon/api-react'
import { tokenIconUrl } from '../lib/icon-utils'

function BalanceToken({
  address,
  amount,
  compact,
  convertedAmount,
  decimals,
  symbol,
  verified,
}) {
  const theme = useTheme()
  const network = useNetwork()

  const amountFormatted = formatTokenAmount(amount, decimals, {
    digits: decimals,
  })

  const amountFormattedRounded = formatTokenAmount(amount, decimals, {
    digits: 3,
  })

  const amountWasRounded = amountFormatted !== amountFormattedRounded

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
            display: flex;
          `}
        >
          {amountWasRounded && '~'}
          <SplitAmount amountFormatted={amountFormattedRounded} />
          {amountWasRounded && (
            <div
              css={`
                display: flex;
                align-items: center;
                margin-left: ${1 * GU}px;
              `}
            >
              <Help hint="This is an approximation, see the complete amount">
                Total: {amountFormatted} {symbol}
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
          {convertedAmount.isNeg()
            ? '−'
            : `$${formatTokenAmount(convertedAmount, decimals)}`}
        </div>
      </div>
    </div>
  )
}

BalanceToken.defaultProps = {
  convertedAmount: new BN(-1),
}

BalanceToken.propTypes = {
  address: PropTypes.string.isRequired,
  amount: PropTypes.instanceOf(BN).isRequired,
  compact: PropTypes.bool.isRequired,
  convertedAmount: PropTypes.instanceOf(BN),
  decimals: PropTypes.instanceOf(BN).isRequired,
  symbol: PropTypes.string.isRequired,
  verified: PropTypes.bool.isRequired,
}

function SplitAmount({ amountFormatted }) {
  const [integer, fractional] = amountFormatted.split('.')
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

export default BalanceToken
