import { useMemo, useCallback } from 'react'
import { useAppState, useApi, useGuiStyle } from '@aragon/api-react'

import { isUnlocked } from '../lib/lock-utils'
import { useNow, useSidePanel } from './utils-hooks'

function useLocks() {
  const { locks } = useAppState()
  const now = useNow()

  const lockStatus = (locks || []).map(lock => isUnlocked(lock.unlockTime, now))
  const lockStatusKey = lockStatus.join('')

  return useMemo(
    () =>
      (locks || []).map((lock, index) => ({
        ...lock,
        unlocked: lockStatus[index],
      })),
    [locks, lockStatusKey] // eslint-disable-line react-hooks/exhaustive-deps
  )
}

export function useWithdrawAction(onDone) {
  const api = useApi()

  return useCallback(
    count => {
      api.withdrawTokens(count).toPromise()
      onDone()
    },
    [api, onDone]
  )
}

export function useAppLogic() {
  const { isSyncing, ready, tokenSymbol } = useAppState()

  const locks = useLocks()
  const panelState = useSidePanel()

  const actions = {
    withdraw: useWithdrawAction(panelState.requestClose),
  }

  return {
    locks,
    panelState,
    isSyncing: isSyncing || !ready,
    tokenSymbol,
    actions,
  }
}

export { useGuiStyle }
