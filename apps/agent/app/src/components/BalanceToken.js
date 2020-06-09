import React from 'react'
import BN from 'bn.js'
import PropTypes from 'prop-types'
import { formatTokenAmount, GU, Help, textStyle, useTheme } from '@aragon/ui'
import { useNetwork } from '@aragon/api-react'
import { tokenIconUrl } from '../lib/icon-utils'


function BalanceToken({
  address = '',
  amount,
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
          {amountWasRounded && '~'}
          <SplitAmount amountFormatted={amountFormattedRounded} />
          {amountWasRounded && (
            <div
              css={`
                display: flex;
                align-items: center;
                margin-left: ${GU}px;
              `}
            >
              <Help hint={"This is an approximation, see the complete amount"}>
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
    </React.Fragment>
  )
}

BalanceToken.defaultProps = {
  convertedAmount: -1,
}

BalanceToken.propTypes = {
  address: PropTypes.string.isRequired,
  amount: PropTypes.instanceOf(BN),
  convertedAmount: PropTypes.instanceOf(BN),
  decimals: PropTypes.instanceOf(BN),
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
          css="font-size: 14px;"
        >
          .{fractional}
        </span>
      )}
    </span>
  )
}

export default BalanceToken
