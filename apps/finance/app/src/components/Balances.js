import React, { useEffect, useMemo, useRef, useState } from 'react'
import BN from 'bn.js'
import { Box, GU, textStyle, useTheme } from '@aragon/ui'
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

function Balances({ balances, compactMode }) {
  const theme = useTheme()
  const balanceItems = useBalanceItems(balances)

  return (
    <Box heading="Token Balances">
      <div
        css={`
          /*
            * translate3d() fixes an issue on recent Firefox versions where the
            * scrollbar would briefly appear on top of everything (including the
            * sidepanel overlay).
            */
          min-height: 112px;
          transform: translate3d(0, 0, 0);
          overflow-x: auto;
          ${balanceItems.length === 0
            ? `
                display: flex;
                justify-content: center;
                align-items: center;
              `
            : ''}
        `}
      >
        {balanceItems.length === 0 ? (
          <div
            css={`
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
              ${compactMode
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
                    padding-right: ${3 * GU}px;
                    ${compactMode ? `margin-bottom: ${3 * GU}px;` : ''}
                    &:last-of-type {
                      min-width: unset;
                      margin-bottom: 0;
                    }
                  `}
                >
                  <BalanceToken
                    address={address}
                    amount={amount}
                    compact={compactMode}
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
    </Box>
  )
}

export default Balances
