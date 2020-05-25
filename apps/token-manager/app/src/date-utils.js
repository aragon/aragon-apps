import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'

// Update `now` at a given interval.
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

export function formatDate(date) {
  return format(date, 'do MMM yyyy, HH:mm O')
}
