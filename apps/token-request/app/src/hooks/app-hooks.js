import { useCallback, useState, useMemo } from 'react'
import { useAppState, useAragonApi, usePath } from '@aragon/api-react'
import { useSidePanel } from './utils-hooks'


const REQUEST_ID_PATH_RE = /^\/request\/([0-9]+)\/?$/
const NO_REQUEST_ID = '-1'

function requestIdFromPath(path) {
  if (!path) {
    return NO_REQUEST_ID
  }
  const matches = path.match(REQUEST_ID_PATH_RE)
  return matches ? matches[1] : NO_REQUEST_ID
}

// Get the request currently selected, or null otherwise.
export function useSelectedRequest(requests) {
  const [path, requestPath] = usePath()
  const { ready } = useAppState()

  // The memoized request currently selected.
  const selectedRequest = useMemo(() => {
    const requestId = requestIdFromPath(path)
    // The `ready` check prevents a request to be selected
    // until the app state is fully ready.
    if (!ready || requestId === NO_REQUEST_ID) {
      return null
    }
    return requests.find(request => request.requestId === requestId) || null
  }, [path, requests, ready])

  const selectRequest = useCallback(
    requestId => {
      requestPath(String(requestId) === NO_REQUEST_ID ? '' : `/request/${requestId}/`)
    },
    [requestPath]
  )

  return [
    selectedRequest,

    // setSelectedRequestId() is exported directly: since `selectedRequestId` is
    // set in the `selectedRequest` dependencies, it means that the useMemo()
    // will be updated every time `selectedRequestId` changes.
    selectRequest,
  ]
}

export function useRequestAction(onDone) {
  const { api } = useAragonApi()

  return useCallback(
    (depositTokenAddress, depositAmount, requestAmount, reference, intentParams) => {
      try {
        api.createTokenRequest(depositTokenAddress, depositAmount, requestAmount, reference, intentParams).toPromise()

        onDone()
      } catch (error) {
        console.error(error)
      }
    },
    [api, onDone]
  )
}

export function useSubmitAction(onDone) {
  const { api } = useAragonApi()

  return useCallback(
    requestId => {
      try {
        api.finaliseTokenRequest(requestId).toPromise()

        onDone()
      } catch (error) {
        console.error(error)
      }
    },
    [api, onDone]
  )
}

export function useWithdrawAction(onDone) {
  const { api } = useAragonApi()

  return useCallback(
    requestId => {
      try {
        api.refundTokenRequest(requestId).toPromise()

        onDone()
      } catch (error) {
        console.error(error)
      }
    },
    [api, onDone]
  )
}

export function useAppLogic() {
  const { account, token, isSyncing, ready, requests, acceptedTokens = [] } = useAppState()
  const [selectedRequest, selectRequest] = useSelectedRequest(requests)
  const panelState = useSidePanel()

  const actions = {
    request: useRequestAction(panelState.requestClose),
    submit: useSubmitAction(panelState.requestClose),
    withdraw: useWithdrawAction(panelState.requestClose),
  }

  return {
    panelState,
    isSyncing: isSyncing || !ready,
    selectedRequest,
    selectRequest,
    acceptedTokens,
    account,
    token,
    actions,
    requests,
  }
}
