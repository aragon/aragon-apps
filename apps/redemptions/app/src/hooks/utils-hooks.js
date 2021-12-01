import { useCallback, useState } from 'react'

export function useSidePanel() {
  const [visible, setVisible] = useState(false)
  const [opened, setOpened] = useState(false)

  const requestOpen = useCallback(() => {
    setVisible(true)
    setOpened(false)
  }, [setVisible, setOpened])

  const endTransition = useCallback(
    opened => {
      if (opened) {
        setOpened(true)
      } else {
        setOpened(false)
      }
    },
    [setOpened]
  )

  const requestClose = useCallback(() => {
    setVisible(false)
    setOpened(false)
  }, [setVisible, setOpened])

  return { visible, opened, requestOpen, endTransition, requestClose }
}
