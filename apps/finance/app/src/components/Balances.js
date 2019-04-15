import React from 'react'
import styled from 'styled-components'
import throttle from 'lodash.throttle'
import { theme, breakpoint } from '@aragon/ui'
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
    const { balances } = this.props
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
    return (
      <section>
        <Title>Token Balances</Title>
        <ScrollView>
          <List>
            {balanceItems.length > 0 ? (
              balanceItems.map(
                ({ address, amount, convertedAmount, symbol, verified }) => (
                  <ListItem key={address}>
                    <BalanceToken
                      amount={amount}
                      convertedAmount={convertedAmount}
                      symbol={symbol}
                      verified={verified}
                    />
                  </ListItem>
                )
              )
            ) : (
              <EmptyListItem />
            )}
          </List>
        </ScrollView>
      </section>
    )
  }
}

const EmptyListItem = () => (
  <ListItem style={{ opacity: '0' }}>
    <BalanceToken amount={0} convertedAmount={0} />
  </ListItem>
)

const ScrollView = styled.div`
  /*
   * translate3d() fixes an issue on recent Firefox versions where the
   * scrollbar would briefly appear on top of everything (including the
   * sidepanel overlay).
   */
  transform: translate3d(0, 0, 0);
  overflow-x: auto;
  background: ${theme.contentBackground};
  border-top: 1px solid ${theme.contentBorder};

  ${breakpoint(
    'medium',
    `
      border: 1px solid ${theme.contentBorder};
      border-radius: 3px;
    `
  )};
`

const Title = styled.h1`
  margin: 20px 0 20px 20px;
  font-weight: 600;

  ${breakpoint(
    'medium',
    `
      margin: 10px 30px 20px 0;
    `
  )};
`

const List = styled.ul`
  list-style: none;

  ${breakpoint(
    'medium',
    `
      display: flex;
      padding: 0 10px;
    `
  )};
`

const ListItem = styled.li`
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 8px 20px;
  border-bottom: 1px solid ${theme.contentBorder};

  ${breakpoint(
    'medium',
    `
      display: block;
      padding: 25px;
    `
  )};
`

export default Balances
