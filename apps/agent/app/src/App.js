import React, { useState } from 'react'
import PropTypes from 'prop-types'
import {
  Box,
  GU,
  DataView,
  Header,
  Info,
  Layout,
  Main,
  SyncIndicator,
  useViewport,
} from '@aragon/ui'
import { compareDesc } from 'date-fns'
import { useAragonApi } from '@aragon/api-react'
import Balances from './components/Balances'
import Transfers from './components/Transfers'
import InstallFrame from './components/InstallFrame'
import { IdentityProvider } from './components/IdentityManager/IdentityManager'

function App({ api, appState, isSyncing, compactMode }) {
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
        <Layout>
          <Header primary="Agent" />
          <InstallFrame />
          <Balances balances={balances} compactMode={compactMode} />
          <Transfers
            transactions={transactions}
            dao={proxyAddress}
            tokens={tokens}
            compactMode={compactMode}
          />
        </Layout>
      </div>
    </IdentityProvider>
  )
}

export default () => {
  const { api, appState } = useAragonApi()
  const { below } = useViewport()
  const compactMode = below('medium')

  return (
    <App
      api={api}
      appState={appState}
      isSyncing={appState.isSyncing}
      compactMode={compactMode}
    />
  )
}
