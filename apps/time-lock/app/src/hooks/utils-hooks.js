import { useState, useEffect, useCallback } from 'react'

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

  return { opened, visible, requestOpen, endTransition, requestClose }
}
