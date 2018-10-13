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

class App extends React.Component {
  static propTypes = {
    app: PropTypes.object.isRequired,
  }
  static defaultProps = {
    tokenDecimals: null,
    tokenSupply: null,
    tokenSymbol: null,
    tokenAddress: '',
    holders: [],
    userAccount: '',
  }
  state = {
    assignTokensConfig: { mode: null },
    sidepanelOpened: false,
    tokenSettingsLoaded: false,
  }
  componentWillReceiveProps(nextProps) {
    const { tokenSettingsLoaded } = this.state
    // Is this the first time we've loaded the token settings?
    if (!tokenSettingsLoaded && hasLoadedTokenSettings(nextProps)) {
      this.setState({
        tokenSettingsLoaded: true,
      })
    }
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
  render() {
    const {
      tokenAddress,
      tokenSymbol,
      tokenName,
      tokenSupply,
      tokenDecimalsBase,
      tokenTransfersEnabled,
      holders,
      userAccount,
    } = this.props
    const {
      assignTokensConfig,
      sidepanelOpened,
      tokenSettingsLoaded,
    } = this.state
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
              {tokenSettingsLoaded && holders.length > 0 ? (
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
        >
          <AssignVotePanelContent
            opened={sidepanelOpened}
            tokenDecimalsBase={tokenDecimalsBase}
            onUpdateTokens={this.handleUpdateTokens}
            {...assignTokensConfig}
          />
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
      const { tokenSupply, holders, tokenDecimals } = state
      const tokenDecimalsBase = new BN(10).pow(new BN(tokenDecimals))
      return {
        ...state,
        tokenSupply: new BN(tokenSupply),
        tokenDecimalsBase,
        holders: holders
          .map(holder => ({ ...holder, balance: new BN(holder.balance) }))
          .sort((a, b) => b.balance.cmp(a.balance)),
      }
    }),
  {}
)(App)
