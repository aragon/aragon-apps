import React, { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'

// dayjs plugins
dayjs.extend(relativeTime)
dayjs.extend(duration)

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
  const diff = dayjs(fromDate).diff(dayjs(toDate))
  return dayjs.duration(diff).humanize()
}

export function formatDate(date) {
  return dayjs(date).format('YYYY-MM-DD, HH:mm')
}
