import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'

// dayjs plugins
dayjs.extend(relativeTime)
dayjs.extend(duration)

export function timePeriod(fromDate, toDate) {
  const diff = dayjs(fromDate).diff(dayjs(toDate))
  return dayjs.duration(diff).humanize()
}

export function formatDate(date) {
  return dayjs(date).format('YYYY-MM-DD')
}

// Re-export dayjs with the installed plugins
export { dayjs }
