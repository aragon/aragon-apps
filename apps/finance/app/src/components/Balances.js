import React from 'react'
import styled from 'styled-components'
import { theme } from '@aragon/ui'
import BalanceToken from './BalanceToken'

const CONVERT_API_BASE = 'https://min-api.cryptocompare.com/data'

const convertApiUrl = tokens =>
  `${CONVERT_API_BASE}/price?fsym=USD&tsyms=${tokens.join(',')}`

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
    const tokens = this.props.balances.map(({ token }) => token)

    // Uncomment the next line to simulate a delay
    await new Promise(r => setTimeout(r, 2000))

    const res = await fetch(convertApiUrl(tokens))
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
              .map(({ token, amount }) => ({
                token,
                amount,
                convertedAmount: convertRates[token]
                  ? amount / convertRates[token]
                  : -1,
              }))
              .sort(
                (balanceA, balanceB) =>
                  balanceB.convertedAmount - balanceA.convertedAmount
              )
              .map(({ token, amount, convertedAmount }) => (
                <ListItem key={token}>
                  <BalanceToken
                    token={token}
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
