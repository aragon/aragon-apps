import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { EmptyStateCard, Main, SidePanel } from '@aragon/ui'
import { useAragonApi } from '@aragon/api-react'
import Balances from './components/Balances'
import NewTransferPanelContent from './components/NewTransfer/PanelContent'
import Transfers from './components/Transfers'
import AppLayout from './components/AppLayout'
import NewTransferIcon from './components/NewTransferIcon'
import { ETHER_TOKEN_FAKE_ADDRESS } from './lib/token-utils'
import { IdentityProvider } from './components/IdentityManager/IdentityManager'

import addFundsIcon from './components/assets/add-funds-icon.svg'

class App extends React.Component {
  static propTypes = {
    api: PropTypes.object,
    appState: PropTypes.object,
  }
  static defaultProps = {
    balances: [],
    transactions: [],
    tokens: [],
  }
  state = {
    newTransferOpened: false,
  }
  handleNewTransferOpen = () => {
    this.setState({ newTransferOpened: true })
  }
  handleNewTransferClose = () => {
    this.setState({ newTransferOpened: false })
  }
  handleWithdraw = (tokenAddress, recipient, amount, reference) => {
    // Immediate, one-time payment
    this.props.api.newImmediatePayment(
      tokenAddress,
      recipient,
      amount,
      reference
    )
    this.handleNewTransferClose()
  }
  handleDeposit = async (tokenAddress, amount, reference) => {
    const { api, appState } = this.props
    const { periodDuration, periods } = appState

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

    api.deposit(tokenAddress, amount, reference, intentParams)
    this.handleNewTransferClose()
  }

  handleResolveLocalIdentity = address => {
    return this.props.api.resolveAddressIdentity(address).toPromise()
  }
  handleShowLocalIdentityModal = address => {
    return this.props.api
      .requestAddressIdentityModification(address)
      .toPromise()
  }

  render() {
    const { appState } = this.props
    const { newTransferOpened } = this.state
    const { balances, transactions, tokens, proxyAddress } = appState

    return (
      <Main assetsUrl="./aragon-ui">
        <div css="min-width: 320px">
          <IdentityProvider
            onResolve={this.handleResolveLocalIdentity}
            onShowLocalIdentityModal={this.handleShowLocalIdentityModal}
          >
            <AppLayout
              title="Finance"
              mainButton={{
                label: 'New transfer',
                icon: <NewTransferIcon />,
                onClick: this.handleNewTransferOpen,
              }}
              smallViewPadding={0}
            >
              {balances.length > 0 && (
                <SpacedBlock>
                  <Balances balances={balances} />
                </SpacedBlock>
              )}
              {transactions.length > 0 && (
                <SpacedBlock>
                  <Transfers
                    dao={proxyAddress}
                    transactions={transactions}
                    tokens={tokens}
                  />
                </SpacedBlock>
              )}
              {balances.length === 0 && transactions.length === 0 && (
                <EmptyScreen>
                  <EmptyStateCard
                    icon={<img src={addFundsIcon} alt="" />}
                    title="There are no funds yet"
                    text="Create a new transfer to get started."
                    actionText="New transfer"
                    onActivate={this.handleNewTransferOpen}
                  />
                </EmptyScreen>
              )}
            </AppLayout>
            <SidePanel
              opened={newTransferOpened}
              onClose={this.handleNewTransferClose}
              title="New transfer"
            >
              <NewTransferPanelContent
                opened={newTransferOpened}
                tokens={tokens}
                onWithdraw={this.handleWithdraw}
                onDeposit={this.handleDeposit}
                proxyAddress={proxyAddress}
              />
            </SidePanel>
          </IdentityProvider>
        </div>
      </Main>
    )
  }
}

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

export default () => {
  const { api, appState } = useAragonApi()
  return <App api={api} appState={appState} />
}
