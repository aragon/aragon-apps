import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApi } from '@aragon/api-react'
import { noop } from './index'

export function useExternalContract(address, abi) {
  const api = useApi()
  const [contract, setContract] = useState(null)

  useEffect(() => {
    // We assume there is never any reason to set the contract back to null.
    if (api && abi && address) {
      setContract(api.external(address, abi))
    }
  }, [api, abi, address])

  return contract
}

export function useNow(updateEvery = 1000) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, updateEvery)
    return () => {
      clearInterval(timer)
    }
  }, [updateEvery])
  return now
}

export function usePromise(fn, memoParams, defaultValue) {
  const [result, setResult] = useState(defaultValue)
  useEffect(() => {
    let cancelled = false
    fn().then(value => {
      if (!cancelled) {
        setResult(value)
      }
    })
    return () => {
      cancelled = true
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...memoParams, fn])
  return result
}

// Handles the state of a panel.
// Pass `onTransitionEnd` to the same SidePanel prop.
export function usePanelState({ onDidOpen = noop, onDidClose = noop } = {}) {
  const [visible, setVisible] = useState(false)

  // `didOpen` is set to `true` when the opening transition of the panel has
  // ended, `false` otherwise. This is useful to know when to start inner
  // transitions in the panel content.
  const [didOpen, setDidOpen] = useState(false)

  const requestOpen = useCallback(() => {
    setVisible(true)
    setDidOpen(false)
  }, [setVisible, setDidOpen])

  const requestClose = useCallback(() => {
    setVisible(false)
  }, [setVisible])

  // To be passed to the onTransitionEnd prop of SidePanel.
  const onTransitionEnd = useCallback(
    opened => {
      if (opened) {
        onDidOpen()
        setDidOpen(true)
      } else {
        onDidClose()
        setDidOpen(false)
      }
    },
    [onDidClose, onDidOpen, setDidOpen]
  )

  return useMemo(
    () => ({ requestOpen, requestClose, visible, didOpen, onTransitionEnd }),
    [requestOpen, requestClose, visible, didOpen, onTransitionEnd]
  )
}
