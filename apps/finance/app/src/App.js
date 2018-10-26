import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import BN from 'bn.js'
import {
  AppBar,
  AppView,
  AragonApp,
  Button,
  EmptyStateCard,
  SidePanel,
  observe,
} from '@aragon/ui'
import Balances from './components/Balances'
import NewTransferPanelContent from './components/NewTransfer/PanelContent'
import Transfers from './components/Transfers'
import { networkContextType } from './lib/provideNetwork'
import { makeEtherscanBaseUrl } from './lib/utils'

import addFundsIcon from './components/assets/add-funds-icon.svg'

// Address representing ETH (see background script)
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000'

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
    const { app, proxyAddress } = this.props
    app.deposit(tokenAddress, amount, reference, {
      token: { address: tokenAddress, value: amount },
    })
    this.handleNewTransferClose()
  }
  render() {
    const { balances, transactions, tokens, proxyAddress } = this.props
    const { newTransferOpened } = this.state

    return (
      <AragonApp publicUrl="./aragon-ui/">
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
            opened={newTransferOpened}
            tokens={tokens}
            onClose={this.handleNewTransferClose}
            onWithdraw={this.handleWithdraw}
            onDeposit={this.handleDeposit}
            proxyAddress={proxyAddress}
          />
        </SidePanel>
      </AragonApp>
    )
  }
}

const EmptyScreen = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`

const SpacedBlock = styled.div`
  margin-top: 30px;
  &:first-child {
    margin-top: 0;
  }
`

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
            // Always ETH first
            .sort((balanceA, balanceB) => {
              if (balanceA.address === ETH_ADDRESS) {
                return -1
              }
              if (balanceB.address === ETH_ADDRESS) {
                return 1
              }
              return balanceB.convertedAmount - balanceA.convertedAmount
            })
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

        tokens: balancesBn.map(
          ({ address, symbol, numData: { amount, decimals } }) => ({
            address,
            amount,
            decimals,
            symbol,
          })
        ),

        // Filter out empty balances
        balances: balancesBn.filter(balance => !balance.amount.isZero()),

        transactions: transactionsBn,
      }
    }),
  {}
)(App)
