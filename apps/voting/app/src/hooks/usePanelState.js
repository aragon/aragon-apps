import { useCallback, useMemo, useState } from 'react'

// Handles the state of a panel.
export default function usePanelState() {
  const [visible, setVisible] = useState(false)

  const requestOpen = useCallback(() => {
    setVisible(true)
  }, [])

  const requestClose = useCallback(() => {
    setVisible(false)
  }, [])

  return useMemo(() => ({ requestOpen, requestClose, visible }), [
    requestOpen,
    requestClose,
    visible,
  ])
}
