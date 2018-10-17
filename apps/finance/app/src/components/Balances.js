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
    this.updateConvertedRates(this.props)
  }
  componentWillReceiveProps(nextProps) {
    this.updateConvertedRates(nextProps)
  }
  async updateConvertedRates({ balances }) {
    const symbols = balances.map(({ symbol }) => symbol)

    if (symbols.length) {
      // Uncomment the next line to simulate a delay
      // await new Promise(r => setTimeout(r, 2000))

      const res = await fetch(convertApiUrl(symbols))
      const convertRates = await res.json()
      this.setState({ convertRates })
    }
  }
  render() {
    const { balances } = this.props
    const { convertRates } = this.state
    const balanceItems = balances
      .map(({ numData: { amount, decimals }, symbol }) => {
        const adjustedAmount = amount / Math.pow(10, decimals)
        const convertedAmount = convertRates[symbol]
          ? adjustedAmount / convertRates[symbol]
          : -1
        return {
          symbol,
          amount: round(adjustedAmount, 5),
          convertedAmount: round(convertedAmount, 5),
        }
      })
      .sort(
        (balanceA, balanceB) =>
          balanceB.convertedAmount - balanceA.convertedAmount
      )
    return (
      <section>
        <Title>Token Balances</Title>
        <ScrollView>
          <List>
            {balanceItems.length > 0 ? (
              balanceItems.map(({ amount, convertedAmount, symbol }) => (
                <ListItem key={symbol}>
                  <BalanceToken
                    amount={amount}
                    symbol={symbol}
                    convertedAmount={convertedAmount}
                  />
                </ListItem>
              ))
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
