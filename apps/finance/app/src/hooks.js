import { useRef, useEffect, useCallback, useState } from 'react'

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

  useEffect(
    () => {
      document.addEventListener('click', handleClick, true)
      return () => {
        document.removeEventListener('click', handleClick, true)
      }
    },
    [handleClick]
  )

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

export function useArrowKeysFocus(query, ref = useRef()) {
  const [index, setIndex] = useState(-1)

  const reset = () => setIndex(-1)
  const cycleFocus = useCallback(
    change => {
      if (!ref.current) {
        setIndex(-1)
        return
      }
      const elements = document.querySelectorAll(query)
      let next = index + change
      if (next > elements.length - 1) {
        next = 0
      }
      if (next < 0) {
        next = elements.length - 1
      }
      if (!elements[next]) {
        next = -1
      }
      setIndex(next)
    },
    [index]
  )
  const handleKeyDown = useCallback(
    ({ keyCode }) =>
      keyCode === 38 ? cycleFocus(-1) : keyCode === 40 ? cycleFocus(1) : null,
    [cycleFocus]
  )

  const { handleBlur } = useOnBlur(reset, ref)
  useEffect(
    () => {
      if (index === -1) {
        return
      }
      const elements = document.querySelectorAll(query)
      if (!elements[index]) {
        return
      }
      elements[index].focus()
    },
    [index]
  )
  useEffect(
    () => {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    },
    [handleKeyDown]
  )

  return { ref, handleBlur }
}
