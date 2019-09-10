import React from 'react'
import { Header, Layout, SyncIndicator, useLayout } from '@aragon/ui'
import { useAragonApi } from '@aragon/api-react'
import InstallFrame from './components/InstallFrame'
import { IdentityProvider } from './components/IdentityManager/IdentityManager'
import ComingSoon from './components/ComingSoon'

function App({ api, appState, isSyncing }) {
  const { layoutName } = useLayout()
  const compactMode = layoutName === 'small'
  const { balances, transactions, tokens, proxyAddress } = appState
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
      <div css="min-width: 320px">
        <SyncIndicator visible={isSyncing} />
        <Header primary="Agent" />
        <InstallFrame />
        <ComingSoon />
      </div>
    </IdentityProvider>
  )
}

export default () => {
  const { api, appState } = useAragonApi()

  return (
    <Layout>
      <App api={api} appState={appState} isSyncing={appState.isSyncing} />
    </Layout>
  )
}
