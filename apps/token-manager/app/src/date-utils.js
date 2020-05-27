import React, { useState, useEffect } from 'react'
import { format, formatDistanceStrict } from 'date-fns'

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

export function timePeriod(fromDate, toDate) {
  return formatDistanceStrict(fromDate, toDate)
}
export function formatDate(date) {
  return format(date, 'do MMM yyyy, HH:mm O')
}
