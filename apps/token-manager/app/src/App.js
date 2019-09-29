import React from 'react'
import PropTypes from 'prop-types'
import BN from 'bn.js'
import {
  Button,
  GU,
  Header,
  IconPlus,
  SidePanel,
  SyncIndicator,
  Tag,
  textStyle,
  useLayout,
  useTheme,
} from '@aragon/ui'
import { useAragonApi } from '@aragon/api-react'
import { IdentityProvider } from './components/IdentityManager/IdentityManager'
import TokenPanelContent from './components/Panels/TokenPanelContent'
import EmptyState from './screens/EmptyState'
import Holders from './screens/Holders'
import { addressesEqual } from './web3-utils'

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
    return holder ? holder.balance : new BN('0')
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
      layoutName,
      maxAccountTokens,
      numData,
      theme,
      tokenAddress,
      tokenDecimalsBase,
      tokenName,
      tokenSupply,
      tokenSymbol,
      tokenTransfersEnabled,
    } = this.props

    const { assignTokensConfig, sidepanelOpened } = this.state

    return (
      <IdentityProvider
        onResolve={this.handleResolveLocalIdentity}
        onShowLocalIdentityModal={this.handleShowLocalIdentityModal}
      >
        <SyncIndicator visible={isSyncing} />

        {!isSyncing && appStateReady && holders.length === 0 && (
          <EmptyState onAssignHolder={this.handleLaunchAssignTokensNoHolder} />
        )}
        {appStateReady && holders.length !== 0 && (
          <React.Fragment>
            <Header
              primary={
                <div
                  css={`
                    display: flex;
                    align-items: center;
                  `}
                >
                  <h1
                    css={`
                      ${textStyle(
                        layoutName === 'small' ? 'title3' : 'title2'
                      )};
                      color: ${theme.content};
                      margin-right: ${1 * GU}px;
                    `}
                  >
                    Tokens
                  </h1>
                  {tokenSymbol && <Tag mode="identifier">{tokenSymbol}</Tag>}
                </div>
              }
              secondary={
                <Button
                  mode="strong"
                  onClick={this.handleLaunchAssignTokensNoHolder}
                  label="Add tokens"
                  icon={<IconPlus />}
                  display={layoutName === 'small' ? 'icon' : 'label'}
                />
              }
            />
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
              onAssignTokens={this.handleLaunchAssignTokens}
              onRemoveTokens={this.handleLaunchRemoveTokens}
            />
          </React.Fragment>
        )}

        <SidePanel
          title={
            assignTokensConfig.mode === 'assign'
              ? 'Add tokens'
              : 'Remove tokens'
          }
          opened={sidepanelOpened}
          onClose={this.handleSidepanelClose}
          onTransitionEnd={this.handleSidepanelTransitionEnd}
        >
          {appStateReady && (
            <TokenPanelContent
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
    )
  }
}

export default () => {
  const { api, appState } = useAragonApi()
  const theme = useTheme()
  const { layoutName } = useLayout()

  return <App api={api} layoutName={layoutName} theme={theme} {...appState} />
}
