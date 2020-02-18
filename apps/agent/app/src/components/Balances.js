import React, { useState, useEffect, useCallback } from 'react'
import throttle from 'lodash.throttle'
import { Box, GU } from '@aragon/ui'
import BalanceToken from './BalanceToken'
import { round } from '../lib/math-utils'

const CONVERT_API_BASE = 'https://min-api.cryptocompare.com/data'
const CONVERT_THROTTLE_TIME = 5000

const convertApiUrl = symbols =>
  `${CONVERT_API_BASE}/price?fsym=USD&tsyms=${symbols.join(',')}`

const Balances = React.memo(function Balances({ balances, compactMode }) {
  const [convertRates, setConvertRates] = useState({})
  const [balanceItems, setBalanceItems] = useState([])

  // Fetches the conversion rate for the verified tokens
  const updateConvertedRates = useCallback(
    throttle(async balances => {
      const verifiedSymbols = balances
        .filter(({ verified }) => verified)
        .map(({ symbol }) => symbol)

      if (!verifiedSymbols.length) {
        return
      }

      const res = await fetch(convertApiUrl(verifiedSymbols))
      const convertRates = await res.json()
      setConvertRates(convertRates)
    }, CONVERT_THROTTLE_TIME),
    []
  )

  useEffect(() => {
    updateConvertedRates(balances)
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
          /*
            * translate3d() fixes an issue on recent Firefox versions where the
            * scrollbar would briefly appear on top of everything (including the
            * sidepanel overlay).
            */
          transform: translate3d(0, 0, 0);
          overflow-x: auto;
        `}
      >
        <ul
          css={`
            min-height: 132px;
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
                css={`
                  display: block;
                  padding: ${3 * GU}px;
                `}
                key={address}
              >
                <div css="display:inline-block;">
                  <BalanceToken
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
