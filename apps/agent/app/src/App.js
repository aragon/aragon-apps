import React, { useCallback } from 'react'
import { useAragonApi } from '@aragon/api-react'
import { Header, Main, SyncIndicator, useLayout } from '@aragon/ui'
import Balances from './components/Balances'
import { IdentityProvider } from './components/IdentityManager/IdentityManager'
import InstallFrame from './components/InstallFrame'
import Transactions from './components/Transactions'

function App({ api, appState, isSyncing }) {
  const { layoutName } = useLayout()
  const { balances, transactions, tokens, proxyAddress } = appState
  const compactMode = layoutName === 'small'

  const handleResolveLocalIdentity = useCallback(address => {
    return api.resolveAddressIdentity(address).toPromise()
  }, [])

  const handleShowLocalIdentityModal = useCallback(address => {
    return api.requestAddressIdentityModification(address).toPromise()
  }, [])

  return (
    <IdentityProvider
      onResolve={handleResolveLocalIdentity}
      onShowLocalIdentityModal={handleShowLocalIdentityModal}
    >
      <SyncIndicator visible={isSyncing} shift={50} />
      <Header primary="Agent" />
      <InstallFrame />
      <Balances balances={balances} compactMode={compactMode} />
      <Transactions
        agentAddress={proxyAddress}
        transactions={transactions}
        tokens={tokens}
      />
    </IdentityProvider>
  )
}

export default () => {
  const { api, appState, guiStyle } = useAragonApi()
  const { appearance } = guiStyle
  return (
    <Main assetsUrl="./aragon-ui" theme={appearance}>
      <App api={api} appState={appState} isSyncing={appState.isSyncing} />
    </Main>
  )
}
