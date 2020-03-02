import React, { useState, useEffect } from 'react'
import { Box, GU, useLayout } from '@aragon/ui'
import BalanceToken from './BalanceToken'
import { round } from '../lib/math-utils'

const CONVERT_API_BASE = 'https://min-api.cryptocompare.com/data'

const convertApiUrl = symbols =>
  `${CONVERT_API_BASE}/price?fsym=USD&tsyms=${symbols.join(',')}`

const Balances = React.memo(function Balances({ balances }) {
  const [convertRates, setConvertRates] = useState({})
  const [balanceItems, setBalanceItems] = useState([])
  const { layoutName } = useLayout
  const compactMode = layoutName === 'small'

  useEffect(() => {
    let cancelled = false

    // Fetches the conversion rate for the verified tokens
    const updateConvertedRates = async balances => {
      const verifiedSymbols = balances
        .filter(({ verified }) => verified)
        .map(({ symbol }) => symbol)

      if (!verifiedSymbols.length) {
        return
      }

      const res = await fetch(convertApiUrl(verifiedSymbols))
      const convertRates = await res.json()
      if (!cancelled) {
        setConvertRates(convertRates)
      }
    }

    updateConvertedRates(balances)
    return () => {
      cancelled = true
    }
  }, [balances])

  useEffect(() => {
    const balanceItems = balances.map(
      ({ address, numData: { amount, decimals }, symbol, verified }) => {
        const adjustedAmount = amount / Math.pow(10, decimals)
        const convertedAmount =
          verified && convertRates[symbol]
            ? adjustedAmount / convertRates[symbol]
            : -1

        return {
          address,
          symbol,
          verified,
          amount: round(adjustedAmount, 5),
          convertedAmount: round(convertedAmount, 5),
        }
      }
    )
    setBalanceItems(balanceItems)
  }, [balances, convertRates])

  return (
    <Box heading="Token Balances">
      <div
        css={`
          overflow-x: auto;
        `}
      >
        <ul
          css={`
            min-height: ${16.5 * GU}px;
            list-style: none;
            padding: 0;
            margin: 0;
            display: flex;
            ${compactMode && `flex-direction: column;`}
          `}
        >
          {balanceItems.map(
            ({ address, amount, convertedAmount, symbol, verified }) => (
              <li
                key={address}
                css={`
                  display: block;
                  padding: ${3 * GU}px;
                `}
              >
                <div css="display:inline-block;">
                  <BalanceToken
                    address={address}
                    amount={amount}
                    convertedAmount={convertedAmount}
                    symbol={symbol}
                    verified={verified}
                  />
                </div>
              </li>
            )
          )}
        </ul>
      </div>
    </Box>
  )
})

export default Balances
