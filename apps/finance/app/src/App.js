import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import BN from 'bn.js'
import {
  AppBar,
  AppView,
  BaseStyles,
  BreakPoint,
  Button,
  ButtonIcon,
  EmptyStateCard,
  PublicUrl,
  Root,
  SidePanel,
  font,
  observe,
  theme,
} from '@aragon/ui'
import Balances from './components/Balances'
import NewTransferPanelContent from './components/NewTransfer/PanelContent'
import Transfers from './components/Transfers'
import MenuButton from './components/MenuButton/MenuButton'
import { networkContextType } from './lib/provideNetwork'
import { ETHER_TOKEN_FAKE_ADDRESS } from './lib/token-utils'
import { makeEtherscanBaseUrl } from './lib/utils'

import addFundsIcon from './components/assets/add-funds-icon.svg'
import newTransferIcon from './components/assets/new-transfer.svg'

class App extends React.Component {
  static propTypes = {
    app: PropTypes.object.isRequired,
    sendMessageToWrapper: PropTypes.func.isRequired,
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
    const { app, periodDuration, periods } = this.props

    let intentParams
    if (tokenAddress === ETHER_TOKEN_FAKE_ADDRESS) {
      intentParams = { value: amount }
    } else {
      // Get the number of period transitions necessary; we floor because we don't need to
      // transition the current period
      const lastPeriodStart = periods[periods.length - 1].startTime
      const periodTransitions = Math.floor(
        Math.max(Date.now() - lastPeriodStart, 0) / periodDuration
      )

      intentParams = {
        token: { address: tokenAddress, value: amount },
        // While it's generally a bad idea to hardcode gas in intents, in the case of token deposits
        // it prevents metamask from doing the gas estimation and telling the user that their
        // transaction will fail (before the approve is mined).
        // The actual gas cost is around ~180k + 20k per 32 chars of text + 80k per period
        // transition but we do the estimation with some breathing room in case it is being
        // forwarded (unlikely in deposit).
        gas:
          400000 +
          20000 * Math.ceil(reference.length / 32) +
          80000 * periodTransitions,
      }
    }

    app.deposit(tokenAddress, amount, reference, intentParams)
    this.handleNewTransferClose()
  }

  handleMenuPanelOpen = () => {
    this.props.sendMessageToWrapper('menuPanel', true)
  }

  render() {
    const {
      app,
      balances,
      contentPadding,
      transactions,
      tokens,
      proxyAddress,
      userAccount,
    } = this.props
    const { newTransferOpened } = this.state

    return (
      <Root.Provider>
        <PublicUrl.Provider url="./aragon-ui/">
          <BaseStyles />
          <Main>
            <AppView
              padding={contentPadding}
              appBar={
                <AppBar>
                  <BreakPoint to="medium">
                    <AppBarContainer>
                      <Title>
                        <MenuButton onClick={this.handleMenuPanelOpen} />
                        <TitleLabel>Finance</TitleLabel>
                      </Title>
                      <ButtonIcon
                        onClick={this.handleNewTransferOpen}
                        title="New Transfer"
                        css={`
                          width: auto;
                          height: 100%;
                          padding: 0 20px 0 10px;
                          margin-left: 8px;
                        `}
                      >
                        <img src={newTransferIcon} alt="" />
                      </ButtonIcon>
                    </AppBarContainer>
                  </BreakPoint>
                  <BreakPoint from="medium">
                    <AppBarContainer style={{ padding: '0 30px' }}>
                      <Title>
                        <TitleLabel>Finance</TitleLabel>
                      </Title>
                      <Button
                        mode="strong"
                        onClick={this.handleNewTransferOpen}
                      >
                        New Transfer
                      </Button>
                    </AppBarContainer>
                  </BreakPoint>
                </AppBar>
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
              {balances.length === 0 && transactions.length === 0 && (
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
      </Root.Provider>
    )
  }
}

const ResponsiveApp = props => (
  <React.Fragment>
    <BreakPoint to="medium">
      <App {...props} contentPadding={0} />
    </BreakPoint>
    <BreakPoint from="medium">
      <App {...props} contentPadding={30} />
    </BreakPoint>
  </React.Fragment>
)

const AppBarContainer = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  justify-content: space-between;
  align-items: center;
  justify-content: safe;
  flex-wrap: nowrap;
`

const Title = styled.h1`
  display: flex;
  flex: 1 1 auto;
  width: 0;
  align-items: center;
  height: 100%;
`

const TitleLabel = styled.span`
  flex: 0 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 10px;
  ${font({ size: 'xxlarge' })};
`

const Main = styled.div`
  height: 100vh;
  min-width: 320px;
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

// Use this function to sort by ETH and then token symbol
const compareBalancesByEthAndSymbol = (tokenA, tokenB) => {
  if (tokenA.address === ETHER_TOKEN_FAKE_ADDRESS) {
    return -1
  }
  if (tokenB.address === ETHER_TOKEN_FAKE_ADDRESS) {
    return 1
  }
  return tokenA.symbol.localeCompare(tokenB.symbol)
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
            .sort(compareBalancesByEthAndSymbol)
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
        ),

        // Filter out empty balances
        balances: balancesBn.filter(balance => !balance.amount.isZero()),

        transactions: transactionsBn,
      }
    }),
  {}
)(ResponsiveApp)
