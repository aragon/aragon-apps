import React, { useCallback } from 'react'
import { useAragonApi } from '@aragon/api-react'
import { Header, Main, SyncIndicator } from '@aragon/ui'
import Balances from './components/Balances'
import { IdentityProvider } from './components/IdentityManager/IdentityManager'
import AgentHelp from './components/AgentHelp'
import Transactions from './components/Transactions'

function App() {
  const { api, appState, guiStyle } = useAragonApi()
  const { balances, isSyncing, transactions, tokens, proxyAddress } = appState

  const { appearance } = guiStyle

  const handleResolveLocalIdentity = useCallback(
    address => {
      return api.resolveAddressIdentity(address).toPromise()
    },
    [api]
  )

  const handleShowLocalIdentityModal = useCallback(
    address => {
      return api.requestAddressIdentityModification(address).toPromise()
    },
    [api]
  )

  return (
    <Main assetsUrl="./aragon-ui" theme={appearance}>
      <IdentityProvider
        onResolve={handleResolveLocalIdentity}
        onShowLocalIdentityModal={handleShowLocalIdentityModal}
      >
        <SyncIndicator visible={isSyncing} shift={50} />
        <Header primary="Agent" />
        <AgentHelp />
        <Balances balances={balances} />
        <Transactions
          agentAddress={proxyAddress}
          transactions={transactions}
          tokens={tokens}
        />
      </IdentityProvider>
    </Main>
  )
}

export default App
