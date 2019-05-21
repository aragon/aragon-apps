import { useRef, useEffect, useCallback } from 'react'

export function useClickOutside(cb, existingRef) {
  const ref = existingRef || useRef()
  const handleClick = useCallback(
    e => {
      if (!ref.current.contains(e.target)) {
        cb()
      }
    },
    [cb, ref]
  )

  useEffect(() => {
    document.addEventListener('click', handleClick, true)
    return () => {
      document.removeEventListener('click', handleClick, true)
    }
  }, [handleClick])

  return { ref }
}

export function useOnBlur(cb, existingRef) {
  const ref = existingRef || useRef()
  const handleBlur = useCallback(
    e => {
      if (!ref.current.contains(e.relatedTarget)) {
        cb()
      }
    },
    [cb, ref]
  )

  return { ref, handleBlur }
}
