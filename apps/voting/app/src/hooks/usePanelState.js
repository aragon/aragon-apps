import { useCallback, useMemo, useState } from 'react'
import { noop } from '../utils'

// Handles the state of a panel.
// Pass `onTransitionEnd` to the same SidePanel prop.
export default function usePanelState({
  onDidOpen = noop,
  onDidClose = noop,
} = {}) {
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
