import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import BN from 'bn.js'
import {
  AppBar,
  AppView,
  BaseStyles,
  Button,
  EmptyStateCard,
  PublicUrl,
  SidePanel,
  observe,
} from '@aragon/ui'
import Balances from './components/Balances'
import NewTransferPanelContent from './components/NewTransfer/PanelContent'
import Transfers from './components/Transfers'
import { networkContextType } from './lib/provideNetwork'
import { ETHER_TOKEN_FAKE_ADDRESS } from './lib/token-utils'
import { makeEtherscanBaseUrl } from './lib/utils'

import addFundsIcon from './components/assets/add-funds-icon.svg'

class App extends React.Component {
  static propTypes = {
    app: PropTypes.object.isRequired,
    proxyAddress: PropTypes.string,
  }
  static defaultProps = {
    balances: [],
    transactions: [],
    tokens: [],
    network: {},
    userAccount: '',
  }
  static childContextTypes = {
    network: networkContextType,
  }
  state = {
    newTransferOpened: false,
  }
  getChildContext() {
    const { network } = this.props
    return {
      network: {
        etherscanBaseUrl: makeEtherscanBaseUrl(network.type),
        type: network.type,
      },
    }
  }
  handleNewTransferOpen = () => {
    this.setState({ newTransferOpened: true })
  }
  handleNewTransferClose = () => {
    this.setState({ newTransferOpened: false })
  }
  handleWithdraw = (tokenAddress, recipient, amount, reference) => {
    // Immediate, one-time payment
    this.props.app.newPayment(
      tokenAddress,
      recipient,
      amount,
      0, // initial payment time
      0, // interval
      1, // max repeats
      reference
    )
    this.handleNewTransferClose()
  }
  handleDeposit = async (tokenAddress, amount, reference) => {
    const { app } = this.props

    const intentParams =
      tokenAddress === ETHER_TOKEN_FAKE_ADDRESS
        ? { value: amount }
        : {
            token: { address: tokenAddress, value: amount },
            // Generally a bad idea to hardcode gas in intents, but it prevents metamask from doing
            // the gas estimation and telling the user that their transaction will fail (before approve is mined).
            // The actual gas cost is around ~180k + 20k per 32 chars of text.
            // Estimation with some breathing room in case it is being forwarded (unlikely in deposit)
            gas: 400000 + 20000 * Math.ceil(reference.length / 32),
          }

    app.deposit(tokenAddress, amount, reference, intentParams)
    this.handleNewTransferClose()
  }
  render() {
    const {
      app,
      balances,
      transactions,
      tokens,
      proxyAddress,
      userAccount,
    } = this.props
    const { newTransferOpened } = this.state

    return (
      <PublicUrl.Provider url="./aragon-ui/">
        <BaseStyles />
        <Main>
          <AppView
            appBar={
              <AppBar
                title="Finance"
                endContent={
                  <Button mode="strong" onClick={this.handleNewTransferOpen}>
                    New Transfer
                  </Button>
                }
              />
            }
          >
            {balances.length > 0 && (
              <SpacedBlock>
                <Balances balances={balances} />
              </SpacedBlock>
            )}
            {transactions.length > 0 && (
              <SpacedBlock>
                <Transfers transactions={transactions} tokens={tokens} />
              </SpacedBlock>
            )}
            {balances.length === 0 &&
              transactions.length === 0 && (
                <EmptyScreen>
                  <EmptyStateCard
                    icon={<img src={addFundsIcon} alt="" />}
                    title="Add funds to your organization"
                    text="There are no funds yet - add funds easily"
                    actionText="Add funds"
                    onActivate={this.handleNewTransferOpen}
                  />
                </EmptyScreen>
              )}
          </AppView>
          <SidePanel
            opened={newTransferOpened}
            onClose={this.handleNewTransferClose}
            title="New Transfer"
          >
            <NewTransferPanelContent
              app={app}
              opened={newTransferOpened}
              tokens={tokens}
              onWithdraw={this.handleWithdraw}
              onDeposit={this.handleDeposit}
              proxyAddress={proxyAddress}
              userAccount={userAccount}
            />
          </SidePanel>
        </Main>
      </PublicUrl.Provider>
    )
  }
}

const Main = styled.div`
  height: 100vh;
`

const EmptyScreen = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-grow: 1;
`

const SpacedBlock = styled.div`
  margin-top: 30px;
  &:first-child {
    margin-top: 0;
  }
`

// Use this function to sort by ETH
const compareTokenAddresses = (addressA, addressB) => {
  if (addressA === ETHER_TOKEN_FAKE_ADDRESS) {
    return -1
  }
  if (addressB === ETHER_TOKEN_FAKE_ADDRESS) {
    return 1
  }
  return 0
}

export default observe(
  observable =>
    observable.map(state => {
      const { balances, transactions } = state || {}

      const balancesBn = balances
        ? balances
            .map(balance => ({
              ...balance,
              amount: new BN(balance.amount),
              decimals: new BN(balance.decimals),
              // Note that numbers in `numData` are not safe for accurate
              // computations (but are useful for making divisions easier).
              numData: {
                amount: parseInt(balance.amount, 10),
                decimals: parseInt(balance.decimals, 10),
              },
            }))
            .sort((balanceA, balanceB) =>
              compareTokenAddresses(balanceA.address, balanceB.address)
            )
        : []

      const transactionsBn = transactions
        ? transactions.map(transaction => ({
            ...transaction,
            amount: new BN(transaction.amount),
            numData: {
              amount: parseInt(transaction.amount, 10),
            },
          }))
        : []

      return {
        ...state,

        tokens: balancesBn
          .map(
            ({
              address,
              name,
              symbol,
              numData: { amount, decimals },
              verified,
            }) => ({
              address,
              amount,
              decimals,
              name,
              symbol,
              verified,
            })
          )
          .sort(
            (tokenA, tokenB) =>
              compareTokenAddresses(tokenA.address, tokenB.address) ||
              tokenA.symbol.localeCompare(tokenB.symbol)
          ),

        // Filter out empty balances
        balances: balancesBn.filter(balance => !balance.amount.isZero()),

        transactions: transactionsBn,
      }
    }),
  {}
)(App)
