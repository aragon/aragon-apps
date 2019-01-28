import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import BN from 'bn.js'
import {
  AppBar,
  AppView,
  Badge,
  BaseStyles,
  Button,
  PublicUrl,
  Root,
  SidePanel,
  ToastHub,
  font,
  observe,
  breakpoint,
} from '@aragon/ui'
import EmptyState from './screens/EmptyState'
import Holders from './screens/Holders'
import AssignVotePanelContent from './components/Panels/AssignVotePanelContent'
import MenuButton from './components/MenuButton/MenuButton'
import AssignTokensButton from './components/AssignTokensButton/AssignTokensButton'
import { WindowSizeProvider, WindowSize } from './WindowSizeProvider'
import { networkContextType } from './provide-network'
import { hasLoadedTokenSettings } from './token-settings'
import { makeEtherscanBaseUrl } from './utils'
import { addressesEqual } from './web3-utils'

const initialAssignTokensConfig = {
  mode: null,
  holderAddress: '',
}

class App extends React.Component {
  static propTypes = {
    app: PropTypes.object.isRequired,
    sendMessageToWrapper: PropTypes.func.isRequired,
  }
  static defaultProps = {
    appStateReady: false,
    holders: [],
    network: {},
    userAccount: '',
    groupMode: false,
  }
  state = {
    assignTokensConfig: initialAssignTokensConfig,
    sidepanelOpened: false,
  }
  static childContextTypes = {
    network: networkContextType,
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
  getHolderBalance = address => {
    const { holders } = this.props
    const holder = holders.find(holder =>
      addressesEqual(holder.address, address)
    )
    return holder ? holder.balance : new BN('0')
  }
  handleUpdateTokens = ({ amount, holder, mode }) => {
    const { app } = this.props

    if (mode === 'assign') {
      app.mint(holder, amount)
    }
    if (mode === 'remove') {
      app.burn(holder, amount)
    }

    this.handleSidepanelClose()
  }
  handleLaunchAssignTokensNoHolder = () => {
    this.handleLaunchAssignTokens('')
  }
  handleLaunchAssignTokens = address => {
    this.setState({
      assignTokensConfig: { mode: 'assign', holderAddress: address },
      sidepanelOpened: true,
    })
  }
  handleLaunchRemoveTokens = address => {
    this.setState({
      assignTokensConfig: { mode: 'remove', holderAddress: address },
      sidepanelOpened: true,
    })
  }
  handleMenuPanelOpen = () => {
    this.props.sendMessageToWrapper('menuPanel', true)
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
      contentPadding,
      groupMode,
      holders,
      maxAccountTokens,
      numData,
      tokenAddress,
      tokenDecimalsBase,
      tokenName,
      tokenSupply,
      tokenSymbol,
      tokenTransfersEnabled,
      userAccount,
    } = this.props
    const { assignTokensConfig, sidepanelOpened } = this.state
    return (
      <Root.Provider>
        <WindowSizeProvider>
          <ToastHub>
            <PublicUrl.Provider url="./aragon-ui/">
              <BaseStyles />
              <Main>
                <WindowSize>
                  {({ toMedium }) => (
                    <AppView
                      padding={toMedium ? 0 : 30}
                      appBar={
                        <AppBar>
                          <AppBarContainer
                            style={{ padding: toMedium ? '0' : '0 30px' }}
                          >
                            <Title>
                              {toMedium && (
                                <MenuButton
                                  onClick={this.handleMenuPanelOpen}
                                />
                              )}
                              <TitleLabel>Token Manager</TitleLabel>
                              {tokenSymbol && (
                                <Badge.App>{tokenSymbol}</Badge.App>
                              )}
                            </Title>
                            <AssignTokensButton
                              title="Assign Tokens"
                              onClick={this.handleLaunchAssignTokensNoHolder}
                            />
                          </AppBarContainer>
                        </AppBar>
                      }
                    >
                      {appStateReady && holders.length > 0 ? (
                        <Holders
                          holders={holders}
                          groupMode={groupMode}
                          maxAccountTokens={maxAccountTokens}
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
                        <EmptyState
                          onActivate={this.handleLaunchAssignTokensNoHolder}
                        />
                      )}
                    </AppView>
                  )}
                </WindowSize>
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
                      tokenDecimals={numData.tokenDecimals}
                      tokenDecimalsBase={tokenDecimalsBase}
                      onUpdateTokens={this.handleUpdateTokens}
                      getHolderBalance={this.getHolderBalance}
                      maxAccountTokens={maxAccountTokens}
                      {...assignTokensConfig}
                    />
                  )}
                </SidePanel>
              </Main>
            </PublicUrl.Provider>
          </ToastHub>
        </WindowSizeProvider>
      </Root.Provider>
    )
  }
}

const Main = styled.div`
  height: 100vh;
  width: 100vw;
  min-width: 320px;

  ${breakpoint(
    'medium',
    `
      width: auto;
    `
  )};
`

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

      const {
        holders,
        maxAccountTokens,
        tokenDecimals,
        tokenSupply,
        tokenTransfersEnabled,
      } = state

      const tokenDecimalsBase = new BN(10).pow(new BN(tokenDecimals))

      return {
        ...state,
        appStateReady,
        tokenDecimalsBase,
        // Note that numbers in `numData` are not safe for accurate computations
        // (but are useful for making divisions easier)
        numData: {
          tokenDecimals: parseInt(tokenDecimals, 10),
          tokenSupply: parseInt(tokenSupply, 10),
        },
        holders: holders
          ? holders
              .map(holder => ({ ...holder, balance: new BN(holder.balance) }))
              .sort((a, b) => b.balance.cmp(a.balance))
          : [],
        tokenDecimals: new BN(tokenDecimals),
        tokenSupply: new BN(tokenSupply),
        maxAccountTokens: new BN(maxAccountTokens),
        groupMode: tokenTransfersEnabled && maxAccountTokens === '1',
      }
    }),
  {}
)(App)
