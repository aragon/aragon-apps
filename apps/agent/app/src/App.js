import React from 'react'
import { Header, Main, SyncIndicator, useLayout } from '@aragon/ui'
import { useAragonApi } from '@aragon/api-react'
import Balances from './components/Balances'
import InstallFrame from './components/InstallFrame'
import { IdentityProvider } from './components/IdentityManager/IdentityManager'
import Transfers from './components/Transfers'

function App({ api, appState, isSyncing }) {
  const { layoutName } = useLayout()
  const { balances, transactions, tokens } = appState
  const compactMode = layoutName === 'small'
  const handleResolveLocalIdentity = address => {
    return api.resolveAddressIdentity(address).toPromise()
  }
  const handleShowLocalIdentityModal = address => {
    return api.requestAddressIdentityModification(address).toPromise()
  }

  return (
    <IdentityProvider
      onResolve={handleResolveLocalIdentity}
      onShowLocalIdentityModal={handleShowLocalIdentityModal}
    >
      <SyncIndicator visible={isSyncing} shift={50} />
      <Header primary="Agent" />
      <InstallFrame />
      <Balances balances={balances} compactMode={compactMode} />
      <Transfers transactions={transactions} tokens={tokens} />
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
