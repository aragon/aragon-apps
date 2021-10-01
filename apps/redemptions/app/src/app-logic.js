import React, { useCallback, useState } from 'react'
import { AragonApi, useAppState, useApi, useGuiStyle } from '@aragon/api-react'

import { useSidePanel } from './hooks/utils-hooks'
import appStateReducer from './app-state-reducer'
import { MODE } from './mode-types'

export function useRequestMode(requestPanelOpen) {
  const [requestMode, setRequestMode] = useState(MODE.UPDATE_TOKENS)

  const updateMode = useCallback(
    newMode => {
      setRequestMode(newMode)
      requestPanelOpen()
    },
    [requestPanelOpen]
  )

  return [requestMode, updateMode]
}

// Requests to set new mode and open side panel
export function useRequestActions(request) {
  const updateTokens = useCallback(() => {
    request(MODE.UPDATE_TOKENS)
  }, [request])

  const redeemTokens = useCallback(() => {
    request(MODE.REDEEM_TOKENS)
  }, [request])

  return { updateTokens, redeemTokens }
}

export function useUpdateTokens(onDone) {
  const api = useApi()

  return useCallback(
    (updateMode, address) => {
      if (updateMode === 'add') api.addRedeemableToken(address).toPromise()
      if (updateMode === 'remove') api.removeRedeemableToken(address).toPromise()
      onDone()
    },
    [api, onDone]
  )
}

export function useRedeemTokens(onDone) {
  const api = useApi()

  return useCallback(
    amount => {
      api.redeem(amount).toPromise()
      onDone()
    },
    [api, onDone]
  )
}

export function useAppLogic() {
  const { ready, isSyncing, burnableToken, tokens = [] } = useAppState()

  const panelState = useSidePanel()
  const [mode, setMode] = useRequestMode(panelState.requestOpen)

  const actions = {
    updateTokens: useUpdateTokens(panelState.requestClose),
    redeemTokens: useRedeemTokens(panelState.requestClose),
  }

  const requests = useRequestActions(setMode)

  return {
    actions,
    requests,
    isSyncing: isSyncing || !ready,
    burnableToken,
    tokens,
    panelState,
    mode,
  }
}

export function AppLogicProvider({ children }) {
  return <AragonApi reducer={appStateReducer}>{children}</AragonApi>
}

export { useGuiStyle }
