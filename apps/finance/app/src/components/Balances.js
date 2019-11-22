import React from 'react'
import throttle from 'lodash.throttle'
import { Box, GU, textStyle, useTheme } from '@aragon/ui'
import BalanceToken from './BalanceToken'
import { round } from '../lib/math-utils'

const CONVERT_API_BASE = 'https://min-api.cryptocompare.com/data'
const CONVERT_THROTTLE_TIME = 5000

const convertApiUrl = symbols =>
  `${CONVERT_API_BASE}/price?fsym=USD&tsyms=${symbols.join(',')}`

const keyFromBalances = balances =>
  balances
    .filter(({ verified }) => verified)
    .sort(({ addressA, addressB }) => addressA - addressB)
    .map(({ address, numData: { amount } }) => `${address}:${amount}`)
    .join(',')

const areSameBalances = (balancesA, balancesB) => {
  const keyA = keyFromBalances(balancesA)
  const keyB = keyFromBalances(balancesB)
  return keyA === keyB
}

class Balances extends React.Component {
  state = {
    convertRates: {},
  }
  componentDidMount() {
    this.updateConvertedRates(this.props)
  }
  componentDidUpdate(prevProps) {
    if (!areSameBalances(prevProps.balances, this.props.balances)) {
      this.updateConvertedRates(this.props)
    }
  }
  updateConvertedRates = throttle(async ({ balances }) => {
    const verifiedSymbols = balances
      .filter(({ verified }) => verified)
      .map(({ symbol }) => symbol)

    if (!verifiedSymbols.length) {
      return
    }

    const res = await fetch(convertApiUrl(verifiedSymbols))
    const convertRates = await res.json()
    this.setState({ convertRates })
  }, CONVERT_THROTTLE_TIME)

  render() {
    const { compactMode, balances, theme } = this.props
    const { convertRates } = this.state
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
    const noBalances = balanceItems.length === 0

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
            ${noBalances
              ? `
                display: flex;
                justify-content: center;
                align-items: center;
              `
              : ''}
          `}
        >
          {noBalances ? (
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
                ({ address, amount, convertedAmount, symbol, verified }) => (
                  <li
                    key={address}
                    css={`
                      display: block;
                      min-width: ${20 * GU}px;
                      ${compactMode ? `margin-bottom: ${3 * GU}px;` : ''}
                      &:last-of-type {
                        min-width: unset;
                        margin-bottom: 0;
                      }
                    `}
                  >
                    <BalanceToken
                      amount={amount}
                      compact={compactMode}
                      convertedAmount={convertedAmount}
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
}

export default props => {
  const theme = useTheme()
  return <Balances {...props} theme={theme} />
}
