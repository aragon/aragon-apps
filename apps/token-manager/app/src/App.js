import React from 'react'
import PropTypes from 'prop-types'
import BN from 'bn.js'
import { Main, SyncIndicator } from '@aragon/ui'
import { useAragonApi } from '@aragon/api-react'
import AppHeader from './components/AppHeader'
import { IdentityProvider } from './components/IdentityManager/IdentityManager'
import UpdateTokenPanel from './components/UpdateTokenPanel/UpdateTokenPanel'
import EmptyState from './screens/EmptyState'
import Details from './screens/Details'
import Holders from './screens/Holders'
import { addressesEqual } from './web3-utils'
import { useAppLogic } from './app-logic'

const initialAssignTokensConfig = {
  mode: null,
  holderAddress: '',
}

class App extends React.PureComponent {
  static propTypes = {
    api: PropTypes.object,
    isSyncing: PropTypes.bool,
  }
  static defaultProps = {
    appStateReady: false,
    isSyncing: true,
    holders: [],
    vestings: [],
    groupMode: false,
  }
  state = {
    assignTokensConfig: initialAssignTokensConfig,
    sidepanelOpened: false,
  }
  getHolderBalance = address => {
    const { holders } = this.props
    const holder = holders.find(holder =>
      addressesEqual(holder.address, address)
    )
    return holder ? holder.balance : new BN(0)
  }
  handleUpdateTokens = ({ amount, holder, mode }) => {
    const { api } = this.props

    // Don't care about responses
    if (mode === 'assign') {
      api.mint(holder, amount).toPromise()
    }
    if (mode === 'remove') {
      api.burn(holder, amount).toPromise()
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
  handleSidepanelClose = () => {
    this.setState({ sidepanelOpened: false })
  }
  handleSidepanelTransitionEnd = open => {
    if (!open) {
      this.setState({ assignTokensConfig: initialAssignTokensConfig })
    }
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
    const {
      appStateReady,
      groupMode,
      holders,
      isSyncing,
      maxAccountTokens,
      numData,
      selectedHolder,
      selectHolder,
      tokenAddress,
      tokenDecimals,
      tokenDecimalsBase,
      tokenName,
      tokenSupply,
      tokenSymbol,
      tokenTransfersEnabled,
      vestings,
    } = this.props

    const { assignTokensConfig, sidepanelOpened } = this.state

    return (
      <IdentityProvider
        onResolve={this.handleResolveLocalIdentity}
        onShowLocalIdentityModal={this.handleShowLocalIdentityModal}
      >
        <SyncIndicator visible={isSyncing} shift={50} />

        {!isSyncing && appStateReady && holders.length === 0 && (
          <EmptyState onAssignHolder={this.handleLaunchAssignTokensNoHolder} />
        )}
        {!isSyncing && appStateReady && holders.length !== 0 && (
          <React.Fragment>
            <AppHeader
              onAssignHolder={this.handleLaunchAssignTokensNoHolder}
              tokenSymbol={tokenSymbol}
            />
            {selectedHolder && selectedHolder.address ? (
              <Details
                tokenSymbol={tokenSymbol}
                tokenDecimals={tokenDecimals}
              />
            ) : (
              <Holders
                holders={holders}
                vestings={vestings}
                groupMode={groupMode}
                maxAccountTokens={maxAccountTokens}
                tokenAddress={tokenAddress}
                tokenDecimals={tokenDecimals}
                tokenDecimalsBase={tokenDecimalsBase}
                tokenName={tokenName}
                tokenSupply={tokenSupply}
                tokenSymbol={tokenSymbol}
                tokenTransfersEnabled={tokenTransfersEnabled}
                onAssignTokens={this.handleLaunchAssignTokens}
                onRemoveTokens={this.handleLaunchRemoveTokens}
                selectHolder={selectHolder}
              />
            )}
          </React.Fragment>
        )}

        {appStateReady && (
          <UpdateTokenPanel
            getHolderBalance={this.getHolderBalance}
            holderAddress={assignTokensConfig.holderAddress}
            maxAccountTokens={maxAccountTokens}
            mode={assignTokensConfig.mode}
            onClose={this.handleSidepanelClose}
            onTransitionEnd={this.handleSidepanelTransitionEnd}
            onUpdateTokens={this.handleUpdateTokens}
            opened={sidepanelOpened}
            tokenDecimals={numData.tokenDecimals}
            tokenDecimalsBase={tokenDecimalsBase}
            tokenSymbol={tokenSymbol}
          />
        )}
      </IdentityProvider>
    )
  }
}

export default () => {
  const { api, appState, guiStyle } = useAragonApi()
  const { appearance } = guiStyle
  const { selectHolder, selectedHolder } = useAppLogic()

  return (
    <Main assetsUrl="./aragon-ui" theme={appearance}>
      <App
        api={api}
        selectHolder={selectHolder}
        selectedHolder={selectedHolder}
        {...appState}
      />
    </Main>
  )
}
