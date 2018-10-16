import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import BN from 'bn.js'
import {
  AragonApp,
  AppBar,
  Button,
  Badge,
  SidePanel,
  font,
  observe,
} from '@aragon/ui'
import EmptyState from './screens/EmptyState'
import Holders from './screens/Holders'
import AppLayout from './components/AppLayout'
import AssignVotePanelContent from './components/Panels/AssignVotePanelContent'
import { hasLoadedTokenSettings } from './token-settings'

const initialAssignTokensConfig = { mode: null }

class App extends React.Component {
  static propTypes = {
    app: PropTypes.object.isRequired,
  }
  static defaultProps = {
    appStateReady: false,
    holders: [],
    userAccount: '',
  }
  state = {
    assignTokensConfig: initialAssignTokensConfig,
    sidepanelOpened: false,
  }
  handleUpdateTokens = ({ mode, amount, holder }) => {
    const { app, tokenDecimalsBase } = this.props
    const amountRounded = Math.floor(parseFloat(amount) * tokenDecimalsBase)
    const amountValue = new BN(`${amountRounded}`, 10).toString()

    if (mode === 'assign') {
      app.mint(holder, amountValue)
    }
    if (mode === 'remove') {
      app.burn(holder, amountValue)
    }

    this.handleSidepanelClose()
  }
  handleAppBarLaunchAssignTokens = () => {
    this.handleLaunchAssignTokens('')
  }
  handleLaunchAssignTokens = holder => {
    this.setState({
      assignTokensConfig: { mode: 'assign', holder },
      sidepanelOpened: true,
    })
  }
  handleLaunchRemoveTokens = holder => {
    this.setState({
      assignTokensConfig: { mode: 'remove', holder },
      sidepanelOpened: true,
    })
  }
  handleSidepanelClose = () => {
    this.setState({ sidepanelOpened: false })
  }
  handleSidepanelTransitionEnd = open => {
    if (!open) {
      this.setState({ assignTokensConfig: initialAssignTokensConfig })
    }
  }
  render() {
    const {
      appStateReady,
      holders,
      tokenAddress,
      tokenSymbol,
      tokenName,
      tokenSupply,
      tokenDecimalsBase,
      tokenTransfersEnabled,
      userAccount,
    } = this.props
    const { assignTokensConfig, sidepanelOpened } = this.state
    return (
      <AragonApp publicUrl="./aragon-ui/">
        <AppLayout>
          <AppLayout.Header>
            <AppBar
              title={
                <Title>
                  <TitleLabel>Token</TitleLabel>
                  {tokenSymbol && <Badge.App>{tokenSymbol}</Badge.App>}
                </Title>
              }
              endContent={
                <Button
                  mode="strong"
                  onClick={this.handleAppBarLaunchAssignTokens}
                >
                  Assign Tokens
                </Button>
              }
            />
          </AppLayout.Header>
          <AppLayout.ScrollWrapper>
            <AppLayout.Content>
              {appStateReady && holders.length > 0 ? (
                <Holders
                  holders={holders}
                  tokenAddress={tokenAddress}
                  tokenDecimalsBase={tokenDecimalsBase}
                  tokenName={tokenName}
                  tokenSupply={tokenSupply}
                  tokenSymbol={tokenSymbol}
                  tokenTransfersEnabled={tokenTransfersEnabled}
                  userAccount={userAccount}
                  onAssignTokens={this.handleLaunchAssignTokens}
                  onRemoveTokens={this.handleLaunchRemoveTokens}
                />
              ) : (
                <EmptyState onActivate={this.handleLaunchAssignTokens} />
              )}
            </AppLayout.Content>
          </AppLayout.ScrollWrapper>
        </AppLayout>
        <SidePanel
          title={
            assignTokensConfig.mode === 'assign'
              ? 'Assign tokens'
              : 'Remove tokens'
          }
          opened={sidepanelOpened}
          onClose={this.handleSidepanelClose}
          onTransitionEnd={this.handleSidepanelTransitionEnd}
        >
          {appStateReady && (
            <AssignVotePanelContent
              opened={sidepanelOpened}
              tokenDecimalsBase={tokenDecimalsBase}
              onUpdateTokens={this.handleUpdateTokens}
              {...assignTokensConfig}
            />
          )}
        </SidePanel>
      </AragonApp>
    )
  }
}

const Title = styled.span`
  display: flex;
  align-items: center;
`

const TitleLabel = styled.span`
  margin-right: 10px;
  ${font({ size: 'xxlarge' })};
`

export default observe(
  // Convert tokenSupply and holders balances to BNs,
  // and calculate tokenDecimalsBase.
  observable =>
    observable.map(state => {
      const appStateReady = hasLoadedTokenSettings(state)
      if (!appStateReady) {
        return {
          ...state,
          appStateReady,
        }
      }
      const { tokenSupply, holders, tokenDecimals } = state
      const tokenDecimalsBase = new BN(10).pow(new BN(tokenDecimals))
      return {
        ...state,
        appStateReady,
        tokenDecimalsBase,
        tokenSupply: new BN(tokenSupply),
        holders: holders
          ? holders
              .map(holder => ({ ...holder, balance: new BN(holder.balance) }))
              .sort((a, b) => b.balance.cmp(a.balance))
          : [],
      }
    }),
  {}
)(App)
