import React, { useMemo } from 'react'
import BN from 'bn.js'
import { Box, GU, textStyle, useTheme, useLayout } from '@aragon/ui'
import BalanceToken from './BalanceToken'
import { getConvertedAmount } from '../lib/conversion-utils'
import { useConvertRates } from './useConvertRates'

// Prepare the balances for the BalanceToken component
function useBalanceItems(balances) {
  const verifiedSymbols = balances
    .filter(({ verified }) => verified)
    .map(({ symbol }) => symbol)

  const convertRates = useConvertRates(verifiedSymbols)

  const balanceItems = useMemo(() => {
    return balances.map(({ address, amount, decimals, symbol, verified }) => ({
      address,
      amount,
      convertedAmount: convertRates[symbol]
        ? getConvertedAmount(amount, convertRates[symbol])
        : new BN('-1'),
      decimals,
      symbol,
      verified,
    }))
  }, [balances, convertRates])
  return balanceItems
}

function Balances({ balances }) {
  const theme = useTheme()
  const { layoutName } = useLayout()
  const balanceItems = useBalanceItems(balances)

  const compact = layoutName === 'small'

  return (
    <Box heading="Token Balances" padding={0}>
      <div
        css={`
          padding: ${(compact ? 1 : 2) * GU}px;
        `}
      >
        <div
          css={`
            display: flex;
            align-items: center;
            min-height: ${14 * GU}px;
            overflow-x: auto;
            padding: ${1 * GU}px;
          `}
        >
          {balanceItems.length === 0 ? (
            <div
              css={`
                display: flex;
                width: 100%;
                justify-content: center;
                ${textStyle('body1')};
                color: ${theme.content};
              `}
            >
              No token balances yet.
            </div>
          ) : (
            <ul
              css={`
                list-style: none;
                display: flex;
                ${compact
                  ? `
                    flex-direction: column;
                    padding: ${1 * GU}px 0;
                  `
                  : ''}
              `}
            >
              {balanceItems.map(
                ({
                  address,
                  amount,
                  convertedAmount,
                  decimals,
                  symbol,
                  verified,
                }) => (
                  <li
                    key={address}
                    css={`
                      flex-shrink: 0;
                      display: block;
                      min-width: ${20 * GU}px;
                      padding-right: ${4 * GU}px;
                      ${compact ? `margin-bottom: ${3 * GU}px;` : ''}
                      &:last-of-type {
                        min-width: unset;
                        margin-bottom: 0;
                      }
                    `}
                  >
                    <BalanceToken
                      address={address}
                      amount={amount}
                      compact={compact}
                      convertedAmount={convertedAmount}
                      decimals={decimals}
                      symbol={symbol}
                      verified={verified}
                    />
                  </li>
                )
              )}
            </ul>
          )}
        </div>
      </div>
    </Box>
  )
}

export default Balances
