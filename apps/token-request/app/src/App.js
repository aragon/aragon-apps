import React, { useState, useCallback } from 'react'
import styled from 'styled-components'
import PropTypes from 'prop-types'
import { useAragonApi, useGuiStyle } from '@aragon/api-react'
import { Main, SidePanel, SyncIndicator, Tabs, Header, GU } from '@aragon/ui'
import NewRequest from './components/Panels/NewRequest'
import { useAppLogic } from './hooks/app-hooks'
import requestIcon from './assets/icono.svg'
import { ETHER_TOKEN_FAKE_ADDRESS } from './lib/token-utils'
import Requests from './screens/Requests'
import RequestDetail from './screens/RequestDetail'
import MainButton from './components/MainButton'
import { IdentityProvider } from './identity-manager'

const App = () => {
  const {
    panelState,
    isSyncing,
    acceptedTokens,
    token,
    actions,
    requests,
    selectRequest,
    selectedRequest,
  } = useAppLogic()
  const { appearance } = useGuiStyle()
  const [screenIndex, setScreenIndex] = useState(0)
  const handleBack = useCallback(() => selectRequest(-1), [selectRequest])

  const handleRequest = async (tokenAddress, depositAmount, requestedAmount, reference) => {
    let intentParams
    if (tokenAddress === ETHER_TOKEN_FAKE_ADDRESS) {
      intentParams = { value: depositAmount }
    } else {
      // Get the number of period transitions necessary; we floor because we don't need to
      // transition the current period

      intentParams = {
        token: { address: tokenAddress, value: depositAmount },
        // While it's generally a bad idea to hardcode gas in intents, in the case of token deposits
        // it prevents metamask from doing the gas estimation and telling the user that their
        // transaction will fail (before the approve is mined).
        // The actual gas cost is around ~180k + 20k per 32 chars of text + 80k per period
        // transition but we do the estimation with some breathing room in case it is being
        // forwarded (unlikely in deposit).
        gas: 400000 + 20000 * Math.ceil(requestedAmount.length / 32) + 80000 * 1,
      }
    }
    // Don't care about response1`
    actions.request(tokenAddress, depositAmount, requestedAmount, reference, intentParams)
  }

  const handleSubmit = async requestId => {
    actions.submit(requestId)
  }

  const handleWithdraw = async requestId => {
    actions.withdraw(requestId)
  }

  const handleTabChange = screenIndex => {
    setScreenIndex(screenIndex)
  }

  return (
    <Main theme={appearance}>
      <SyncIndicator visible={isSyncing} />
      <Header
        primary='Token Request'
        secondary={
          !selectedRequest && (
            <MainButton
              label='New Request'
              onClick={panelState.requestOpen}
              icon={<img src={requestIcon} height='30px' alt='' />}
            />
          )
        }
      />
      <>
        {selectedRequest ? (
          <RequestDetail
            request={selectedRequest}
            token={token}
            onBack={handleBack}
            onSubmit={handleSubmit}
            onWithdraw={handleWithdraw}
          />
        ) : (
          <>
            <TabsWrapper>
              <Tabs items={['Requests', 'My Requests']} selected={screenIndex} onChange={handleTabChange} />
            </TabsWrapper>
            <Requests
              requests={requests}
              token={token}
              onSubmit={handleSubmit}
              onWithdraw={handleWithdraw}
              ownRequests={screenIndex === 1}
              onSelectRequest={selectRequest}
            />
          </>
        )}
      </>

      <SidePanel
        title='New request'
        opened={panelState.visible}
        onClose={panelState.requestClose}
        onTransitionEnd={panelState.endTransition}
      >
        <NewRequest
          panelOpened={panelState.opened}
          acceptedTokens={acceptedTokens}
          onRequest={handleRequest}
        ></NewRequest>
      </SidePanel>
    </Main>
  )
}

const TabsWrapper = styled.div`
  margin: 0 -${Main.HORIZONTAL_PADDING}px ${3 * GU}px;
`

export default () => {
  const { api, appState } = useAragonApi()
  return (
    <IdentityProvider>
      <App api={api} {...appState} />
    </IdentityProvider>
  )
}

App.propTypes = {
  api: PropTypes.object,
  appState: PropTypes.object,
}
