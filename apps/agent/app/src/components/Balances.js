import React, { useEffect, useMemo, useState } from 'react'
import BN from 'bn.js'
import { Box, GU, textStyle, useTheme, useLayout } from '@aragon/ui'
import BalanceToken from './BalanceToken'

const CONVERT_API_RETRY_DELAY = 2000

function convertRatesUrl(symbolsQuery) {
  return `https://min-api.cryptocompare.com/data/price?fsym=USD&tsyms=${symbolsQuery}`
}

function useConvertRates(symbols) {
  const [rates, setRates] = useState({})

  const symbolsQuery = symbols.join(',')

  useEffect(() => {
    let cancelled = false
    let retryTimer = null

    const update = async () => {
      if (!symbolsQuery) {
        setRates({})
        return
      }

      try {
        const response = await fetch(convertRatesUrl(symbolsQuery))
        const rates = await response.json()
        if (!cancelled) {
          setRates(rates)
        }
      } catch (err) {
        // The !cancelled check is needed in case:
        //  1. The fetch() request is ongoing.
        //  2. The component gets unmounted.
        //  3. An error gets thrown.
        //
        //  Assuming the fetch() request keeps throwing, it would create new
        //  requests even though the useEffect() got cancelled.
        if (!cancelled) {
          retryTimer = setTimeout(update, CONVERT_API_RETRY_DELAY)
        }
      }
    }
    update()

    return () => {
      cancelled = true
      clearTimeout(retryTimer)
    }
  }, [symbolsQuery])

  return rates
}

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
        ? amount.divn(convertRates[symbol])
        : new BN(-1),
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
          padding: ${(layoutName === 'small' ? 1 : 2) * GU}px;
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
