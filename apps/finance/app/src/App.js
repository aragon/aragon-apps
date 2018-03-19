import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { AragonApp, AppBar, Button, SidePanel, observe } from '@aragon/ui'
import Balances from './components/Balances'
import NewTransfer from './components/NewTransfer'
import Transfers from './components/Transfers'
import { networkContextType } from './lib/provideNetwork'

class App extends React.Component {
  static propTypes = {
    app: PropTypes.object.isRequired,
  }
  static defaultProps = {
    balances: [],
    transactions: [],
    network: {
      etherscanBaseUrl: 'https://rinkeby.etherscan.io',
      name: 'rinkeby',
    },
  }
  static childContextTypes = {
    network: networkContextType,
  }
  state = {
    newTransferOpened: false,
  }
  getChildContext() {
    return { network: this.props.network }
  }
  handleNewTransferOpen = () => {
    this.setState({ newTransferOpened: true })
  }
  handleNewTransferClose = () => {
    this.setState({ newTransferOpened: false })
  }
  handleSubmitTransfer = (
    { address: tokenAddress },
    recipient,
    amount,
    reference
  ) => {
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
  }
  render() {
    const { balances, transactions } = this.props
    const { newTransferOpened } = this.state
    const tokens = balances.map(({ address, symbol, decimals }) => ({
      address,
      symbol,
      decimals,
    }))
    return (
      <AragonApp publicUrl="/aragon-ui/">
        <Layout>
          <Layout.FixedHeader>
            <AppBar
              title="Finance"
              endContent={
                <Button mode="strong" onClick={this.handleNewTransferOpen}>
                  New Transfer
                </Button>
              }
            />
          </Layout.FixedHeader>
          <Layout.ScrollWrapper>
            <Content>
              <SpacedBlock>
                <Balances balances={balances} />
              </SpacedBlock>
              <SpacedBlock>
                <Transfers transactions={transactions} tokens={tokens} />
              </SpacedBlock>
            </Content>
          </Layout.ScrollWrapper>
        </Layout>
        <SidePanel
          opened={newTransferOpened}
          onClose={this.handleNewTransferClose}
          title="New Transfer"
        >
          <NewTransfer onTransfer={this.handleSubmitTransfer} tokens={tokens} />
        </SidePanel>
      </AragonApp>
    )
  }
}

const Content = styled.div`
  padding: 30px;
`

const SpacedBlock = styled.div`
  margin-top: 30px;
  &:first-child {
    margin-top: 0;
  }
`

const Layout = styled.div`
  display: flex;
  height: 100vh;
  flex-direction: column;
  align-items: stretch;
  justify-content: stretch;
`

Layout.FixedHeader = styled.div`
  flex-shrink: 0;
`

Layout.ScrollWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  overflow: auto;
  flex-grow: 1;
`

export default observe(
  observable => observable.map(state => ({ ...state })),
  {}
)(App)
