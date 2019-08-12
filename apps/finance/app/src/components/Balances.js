import React from 'react'
import throttle from 'lodash.throttle'
import { Box, GU, textStyle, useTheme } from '@aragon/ui'
import BalanceToken from './BalanceToken'
import { round } from '../lib/math-utils'

const CONVERT_API_BASE = 'https://min-api.cryptocompare.com/data'
const CONVERT_THROTTLE_TIME = 5000

const convertApiUrl = symbols =>
  `${CONVERT_API_BASE}/price?fsym=USD&tsyms=${symbols.join(',')}`

class Balances extends React.Component {
  state = {
    convertRates: {},
  }
  componentDidMount() {
    this.updateConvertedRates(this.props)
  }
  componentWillReceiveProps(nextProps) {
    this.updateConvertedRates(nextProps)
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

    if (!balanceItems.length) {
      return (
        <Box heading="Token Balances">
          <div
            css={`
              margin: ${5 * GU}px auto;
              text-align: center;
              ${textStyle('body1')};
              color: ${theme.content};
            `}
          >
            No token balances yet.
          </div>
        </Box>
      )
    }

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
  }
}

export default props => {
  const theme = useTheme()
  return <Balances {...props} theme={theme} />
}
