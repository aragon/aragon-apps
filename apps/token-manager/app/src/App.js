import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import {
  AragonApp,
  AppBar,
  Button,
  Badge,
  SidePanel,
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
    holders: [],
  }
  state = {
    assignTokensConfig: {},
    sidepanelOpened: false,
    tokenSettingsLoaded: false,
  }
  componentWillReceiveProps(nextProps) {
    const { tokenSettingsLoaded } = this.state
    // Is this the first time we've loaded the token settings?
    if (!tokenSettingsLoaded && hasLoadedTokenSettings(nextProps)) {
      this.setState({
        tokenDecimalsBase: Math.pow(10, nextProps.tokenDecimals),
        tokenSettingsLoaded: true,
      })
    }
  }
  handleAssignTokens = ({ amount, recipient }) => {
    const { app } = this.props
    const { tokenDecimalsBase } = this.state
    app.mint(recipient, amount * tokenDecimalsBase)
  }
  handleAppBarLaunchAssignTokens = () => this.handleLaunchAssignTokens()
  handleLaunchAssignTokens = recipient => {
    this.setState({
      assignTokensConfig: { recipient },
      sidepanelOpened: true,
    })
  }
  handleSidepanelClose = () => {
    this.setState({
      assignTokensConfig: {},
      sidepanelOpened: false,
    })
  }
  render() {
    const { tokenSymbol, tokenSupply, holders } = this.props
    const { tokenDecimalsBase } = this.state
    const {
      assignTokensConfig,
      sidepanelOpened,
      tokenSettingsLoaded,
    } = this.state
    return (
      <AragonApp publicUrl="/aragon-ui/">
        <AppLayout>
          <AppLayout.Header>
            <AppBar
              title={
                <Title>
                  <span>Token</span>
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
                  onAssignTokens={this.handleLaunchAssignTokens}
                  tokenDecimalsBase={tokenDecimalsBase}
                  tokenSupply={tokenSupply}
                />
              ) : (
                <EmptyState onActivate={this.handleLaunchAssignTokens} />
              )}
            </AppLayout.Content>
          </AppLayout.ScrollWrapper>
        </AppLayout>
        <SidePanel
          title="Assign Tokens"
          opened={sidepanelOpened}
          onClose={this.handleSidepanelClose}
        >
          <AssignVotePanelContent
            onAssignTokens={this.handleAssignTokens}
            opened={sidepanelOpened}
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
  & > span:first-child {
    margin-right: 10px;
  }
`

export default observe(
  observable => observable.map(state => ({ ...state })),
  {}
)(App)
