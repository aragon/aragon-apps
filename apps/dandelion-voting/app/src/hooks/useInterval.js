import { useEffect, useRef } from 'react'

export default function useInterval(callback, delay, runBeforeInterval) {
  const savedCallback = useRef()

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current()
    }
    if (delay !== null) {
      if (runBeforeInterval) tick()
      let id = setInterval(tick, delay)
      return () => clearInterval(id)
    }
  }, [delay, runBeforeInterval])
}
