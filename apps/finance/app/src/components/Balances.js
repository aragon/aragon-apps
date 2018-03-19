import React from 'react'
import styled from 'styled-components'
import { theme } from '@aragon/ui'
import BalanceToken from './BalanceToken'
import { round } from '../lib/math-utils'

const CONVERT_API_BASE = 'https://min-api.cryptocompare.com/data'

const convertApiUrl = symbols =>
  `${CONVERT_API_BASE}/price?fsym=USD&tsyms=${symbols.join(',')}`

class Balances extends React.Component {
  state = {
    convertRates: {},
  }
  componentDidMount() {
    this.updateConvertedRates()
  }
  componentWillReceiveProps() {
    this.updateConvertedRates()
  }
  async updateConvertedRates() {
    const symbols = this.props.balances.map(({ symbol }) => symbol)

    // Uncomment the next line to simulate a delay
    // await new Promise(r => setTimeout(r, 2000))

    const res = await fetch(convertApiUrl(symbols))
    const convertRates = await res.json()
    this.setState({ convertRates })
  }
  render() {
    const { balances } = this.props
    const { convertRates } = this.state
    return (
      <section>
        <Title>Token Balances</Title>
        <ScrollView>
          <List>
            {balances
              .map(({ amount, decimals, ...token }) => ({
                ...token,
                amount: amount / Math.pow(10, decimals),
              }))
              .map(({ amount, symbol }) => ({
                amount,
                symbol,
                convertedAmount: convertRates[symbol]
                  ? amount / convertRates[symbol]
                  : -1,
              }))
              .map(({ amount, convertedAmount, ...balance }) => ({
                ...balance,
                amount: round(amount, 5),
                convertedAmount: round(convertedAmount, 5),
              }))
              .sort(
                (balanceA, balanceB) =>
                  balanceB.convertedAmount - balanceA.convertedAmount
              )
              .map(({ symbol, amount, convertedAmount }) => (
                <ListItem key={symbol}>
                  <BalanceToken
                    symbol={symbol}
                    amount={amount}
                    convertedAmount={convertedAmount}
                  />
                </ListItem>
              ))}
          </List>
        </ScrollView>
      </section>
    )
  }
}

const ScrollView = styled.div`
  overflow-x: auto;
  background: ${theme.contentBackground};
  border: 1px solid ${theme.contentBorder};
  border-radius: 3px;
`

const Title = styled.h1`
  margin-top: 10px;
  margin-bottom: 20px;
  font-weight: 600;
`

const List = styled.ul`
  display: flex;
  list-style: none;
  padding: 0 10px;
`

const ListItem = styled.li`
  padding: 25px;
`

export default Balances
