import React from 'react'
import PropTypes from 'prop-types'
import BN from 'bn.js'
import { map } from 'rxjs/operators'
import { Badge, Main, SidePanel, observe } from '@aragon/ui'
import EmptyState from './screens/EmptyState'
import Holders from './screens/Holders'
import AssignVotePanelContent from './components/Panels/AssignVotePanelContent'
import AssignTokensIcon from './components/AssignTokensIcon'
import AppLayout from './components/AppLayout'
import { networkContextType } from './provide-network'
import { hasLoadedTokenSettings } from './token-settings'
import { addressesEqual } from './web3-utils'
import { IdentityProvider } from './components/IdentityManager/IdentityManager'

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
  handleResolveLocalIdentity = address => {
    return this.props.app.resolveAddressIdentity(address).toPromise()
  }
  handleShowLocalIdentityModal = address => {
    return this.props.app
      .requestAddressIdentityModification(address)
      .toPromise()
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
      <Main assetsUrl="./aragon-ui">
        <div css="min-width: 320px">
          <IdentityProvider
            onResolve={this.handleResolveLocalIdentity}
            onShowLocalIdentityModal={this.handleShowLocalIdentityModal}
          >
            <AppLayout
              title="Token Manager"
              afterTitle={tokenSymbol && <Badge.App>{tokenSymbol}</Badge.App>}
              onMenuOpen={this.handleMenuPanelOpen}
              mainButton={{
                label: 'Assign tokens',
                icon: <AssignTokensIcon />,
                onClick: this.handleLaunchAssignTokensNoHolder,
              }}
              smallViewPadding={0}
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
                  tokenDecimals={numData.tokenDecimals}
                  tokenDecimalsBase={tokenDecimalsBase}
                  onUpdateTokens={this.handleUpdateTokens}
                  getHolderBalance={this.getHolderBalance}
                  maxAccountTokens={maxAccountTokens}
                  {...assignTokensConfig}
                />
              )}
            </SidePanel>
          </IdentityProvider>
        </div>
      </Main>
    )
  }
}

export default observe(
  // Convert tokenSupply and holders balances to BNs,
  // and calculate tokenDecimalsBase.
  observable =>
    observable.pipe(
      map(state => {
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
      })
    ),
  {}
)(App)
